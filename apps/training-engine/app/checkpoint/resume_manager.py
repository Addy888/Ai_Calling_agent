"""Resume manager for restoring training from checkpoints."""

import random
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch

from app.events import event_bus
from app.logger import training_logger
from app.checkpoint.checkpoint_registry import CheckpointRegistry, checkpoint_registry
from app.checkpoint.checkpoint_storage import CheckpointStorage, checkpoint_storage
from app.checkpoint.checkpoint_validator import (
    CheckpointValidator,
    checkpoint_validator,
)
from app.checkpoint.exceptions import CheckpointRestoreError, ResumeException
from app.checkpoint.schemas import (
    CheckpointMetadata,
    CheckpointState,
    RecoveryStrategy,
)


class ResumeManager:
    """
    Manages training resumption from checkpoints.
    
    Handles loading and restoring all training state.
    """

    def __init__(
        self,
        storage: Optional[CheckpointStorage] = None,
        registry: Optional[CheckpointRegistry] = None,
        validator: Optional[CheckpointValidator] = None,
    ):
        """
        Initialize resume manager.
        
        Args:
            storage: Optional CheckpointStorage instance
            registry: Optional CheckpointRegistry instance
            validator: Optional CheckpointValidator instance
        """
        self.logger = training_logger
        self.storage = storage or checkpoint_storage
        self.registry = registry or checkpoint_registry
        self.validator = validator or checkpoint_validator

    def can_resume(self, job_id: str) -> bool:
        """
        Check if job can be resumed.
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if checkpoints exist for job
        """
        checkpoints = self.registry.list_by_job(job_id)
        return len(checkpoints) > 0

    def resume_from_latest(
        self, job_id: str
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Resume from latest checkpoint.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Tuple of (success, restored_state, checkpoint_metadata)
        """
        self.logger.info(f"Resuming from latest checkpoint for job: {job_id}")

        # Get latest checkpoint
        checkpoint_state = self.registry.get_latest(job_id)
        
        if not checkpoint_state:
            self.logger.warning(f"No checkpoint found for job: {job_id}")
            return False, None, None

        return self._resume_from_checkpoint(checkpoint_state)

    def resume_from_best(
        self, job_id: str
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Resume from best checkpoint.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Tuple of (success, restored_state, checkpoint_metadata)
        """
        self.logger.info(f"Resuming from best checkpoint for job: {job_id}")

        # Get best checkpoint
        checkpoint_state = self.registry.get_best(job_id)
        
        if not checkpoint_state:
            self.logger.warning(f"No best checkpoint found for job: {job_id}")
            return False, None, None

        return self._resume_from_checkpoint(checkpoint_state)

    def resume_from_specific(
        self, checkpoint_id: str
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Resume from specific checkpoint.
        
        Args:
            checkpoint_id: Checkpoint identifier
            
        Returns:
            Tuple of (success, restored_state, checkpoint_metadata)
        """
        self.logger.info(f"Resuming from specific checkpoint: {checkpoint_id}")

        # Get checkpoint
        checkpoint_state = self.registry.get(checkpoint_id)
        
        if not checkpoint_state:
            self.logger.error(f"Checkpoint not found: {checkpoint_id}")
            return False, None, None

        return self._resume_from_checkpoint(checkpoint_state)

    def resume(
        self,
        job_id: str,
        strategy: RecoveryStrategy = RecoveryStrategy.LATEST,
        checkpoint_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Resume training with specified strategy.
        
        Args:
            job_id: Job identifier
            strategy: Recovery strategy
            checkpoint_id: Specific checkpoint ID (for SPECIFIC strategy)
            
        Returns:
            Tuple of (success, restored_state, checkpoint_metadata)
        """
        self.logger.info(
            f"Resuming job {job_id} with strategy: {strategy.value}"
        )

        # Emit event
        event_bus.emit(
            "resume_started",
            {
                "job_id": job_id,
                "strategy": strategy.value,
                "checkpoint_id": checkpoint_id,
            },
        )

        try:
            if strategy == RecoveryStrategy.LATEST:
                success, state, metadata = self.resume_from_latest(job_id)
            elif strategy == RecoveryStrategy.BEST:
                success, state, metadata = self.resume_from_best(job_id)
            elif strategy == RecoveryStrategy.SPECIFIC:
                if not checkpoint_id:
                    raise ResumeException(
                        "checkpoint_id required for SPECIFIC strategy"
                    )
                success, state, metadata = self.resume_from_specific(checkpoint_id)
            else:
                raise ResumeException(f"Unknown strategy: {strategy.value}")

            if success:
                # Emit success event
                event_bus.emit(
                    "resume_completed",
                    {
                        "job_id": job_id,
                        "checkpoint_id": metadata.checkpoint_id if metadata else None,
                        "global_step": metadata.global_step if metadata else 0,
                    },
                )

            return success, state, metadata

        except Exception as e:
            self.logger.error(f"Resume failed: {str(e)}")
            raise ResumeException(f"Resume failed: {str(e)}")

    def _resume_from_checkpoint(
        self, checkpoint_state: CheckpointState
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Resume from checkpoint state.
        
        Args:
            checkpoint_state: Checkpoint state to restore
            
        Returns:
            Tuple of (success, restored_state, checkpoint_metadata)
        """
        checkpoint_id = checkpoint_state.checkpoint_id
        checkpoint_path = Path(checkpoint_state.file_path)

        self.logger.info(
            f"Restoring checkpoint: {checkpoint_id} "
            f"(step={checkpoint_state.global_step})"
        )

        try:
            # Validate checkpoint
            is_valid, errors = self.validator.validate_checkpoint(checkpoint_path)
            if not is_valid:
                self.logger.error(
                    f"Checkpoint validation failed: {errors}"
                )
                return False, None, None

            # Load checkpoint
            checkpoint_data = self.storage.load_checkpoint(checkpoint_path)

            # Restore RNG states
            if "rng_state" in checkpoint_data:
                self._restore_rng_state(checkpoint_data["rng_state"])

            # Create metadata
            metadata = CheckpointMetadata(
                checkpoint_id=checkpoint_state.checkpoint_id,
                job_id=checkpoint_state.job_id,
                checkpoint_type=checkpoint_state.checkpoint_type,
                status=checkpoint_state.status,
                epoch=checkpoint_state.epoch,
                global_step=checkpoint_state.global_step,
                eval_loss=checkpoint_state.metadata.get("eval_loss"),
                learning_rate=checkpoint_data.get("learning_rate", 0.0),
                file_path=str(checkpoint_path),
                file_size_mb=checkpoint_state.file_size_bytes / (1024 * 1024),
                metadata=checkpoint_state.metadata,
            )

            self.logger.info(
                f"Checkpoint restored: {checkpoint_id} "
                f"(step={checkpoint_state.global_step})"
            )

            return True, checkpoint_data, metadata

        except Exception as e:
            self.logger.error(f"Failed to restore checkpoint: {str(e)}")
            raise CheckpointRestoreError(f"Checkpoint restore failed: {str(e)}")

    def _restore_rng_state(self, rng_state: Dict[str, Any]) -> None:
        """
        Restore random number generator states.
        
        Args:
            rng_state: RNG states to restore
        """
        try:
            if "python" in rng_state:
                random.setstate(rng_state["python"])

            if "numpy" in rng_state:
                np.random.set_state(rng_state["numpy"])

            if "torch" in rng_state:
                torch.set_rng_state(rng_state["torch"])

            if "cuda" in rng_state and torch.cuda.is_available():
                torch.cuda.set_rng_state_all(rng_state["cuda"])

            self.logger.info("RNG states restored")

        except Exception as e:
            self.logger.warning(f"Failed to restore RNG states: {str(e)}")

    def get_resume_info(self, job_id: str) -> Dict[str, Any]:
        """
        Get resume information for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Resume information dictionary
        """
        can_resume = self.can_resume(job_id)
        
        info = {
            "can_resume": can_resume,
            "job_id": job_id,
        }

        if can_resume:
            latest = self.registry.get_latest(job_id)
            best = self.registry.get_best(job_id)
            
            if latest:
                info["latest_checkpoint"] = {
                    "checkpoint_id": latest.checkpoint_id,
                    "global_step": latest.global_step,
                    "epoch": latest.epoch,
                }
            
            if best:
                info["best_checkpoint"] = {
                    "checkpoint_id": best.checkpoint_id,
                    "global_step": best.global_step,
                    "eval_loss": best.metadata.get("eval_loss"),
                }

        return info


# Global instance
resume_manager = ResumeManager()
