"""Enterprise checkpoint manager - main orchestrator."""

import random
import uuid
from datetime import datetime
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
from app.checkpoint.exceptions import CheckpointException, CheckpointSaveError
from app.checkpoint.schemas import (
    CheckpointConfig,
    CheckpointMetadata,
    CheckpointState,
    CheckpointStatus,
    CheckpointType,
)


class CheckpointManager:
    """
    Main checkpoint orchestrator.
    
    Coordinates checkpoint creation, validation, and management.
    """

    def __init__(
        self,
        storage: Optional[CheckpointStorage] = None,
        registry: Optional[CheckpointRegistry] = None,
        validator: Optional[CheckpointValidator] = None,
    ):
        """
        Initialize checkpoint manager.
        
        Args:
            storage: Optional CheckpointStorage instance
            registry: Optional CheckpointRegistry instance
            validator: Optional CheckpointValidator instance
        """
        self.logger = training_logger
        self.storage = storage or checkpoint_storage
        self.registry = registry or checkpoint_registry
        self.validator = validator or checkpoint_validator

    def create_checkpoint(
        self,
        job_id: str,
        trainer_state: Dict[str, Any],
        checkpoint_type: CheckpointType = CheckpointType.AUTOMATIC,
        epoch: Optional[int] = None,
        global_step: int = 0,
        eval_loss: Optional[float] = None,
        tags: Optional[list] = None,
        metadata: Optional[Dict] = None,
    ) -> Tuple[str, CheckpointMetadata]:
        """
        Create a checkpoint.
        
        Args:
            job_id: Job identifier
            trainer_state: Complete trainer state
            checkpoint_type: Type of checkpoint
            epoch: Current epoch
            global_step: Current global step
            eval_loss: Evaluation loss (for best checkpoint)
            tags: Optional tags
            metadata: Additional metadata
            
        Returns:
            Tuple of (checkpoint_id, checkpoint_metadata)
        """
        checkpoint_id = f"checkpoint_{uuid.uuid4().hex[:8]}"
        
        self.logger.info(
            f"Creating checkpoint: {checkpoint_id} (job={job_id}, "
            f"step={global_step}, type={checkpoint_type.value})"
        )

        # Emit event
        event_bus.emit(
            "checkpoint_started",
            {
                "checkpoint_id": checkpoint_id,
                "job_id": job_id,
                "checkpoint_type": checkpoint_type.value,
                "global_step": global_step,
            },
        )

        try:
            # Prepare checkpoint state
            checkpoint_data = self._prepare_checkpoint_data(
                checkpoint_id=checkpoint_id,
                job_id=job_id,
                trainer_state=trainer_state,
                epoch=epoch,
                global_step=global_step,
                eval_loss=eval_loss,
                metadata=metadata or {},
            )

            # Save checkpoint
            checkpoint_path = self.storage.save_checkpoint(
                checkpoint_id=checkpoint_id,
                state_dict=checkpoint_data,
                job_id=job_id,
            )

            # Get file size
            file_size = self.storage.get_checkpoint_size(checkpoint_path)

            # Compute hash
            checkpoint_hash = self.storage.compute_checksum(checkpoint_path)

            # Create checkpoint state
            checkpoint_state = CheckpointState(
                checkpoint_id=checkpoint_id,
                job_id=job_id,
                checkpoint_type=checkpoint_type,
                status=CheckpointStatus.COMPLETED,
                epoch=epoch,
                global_step=global_step,
                file_path=str(checkpoint_path),
                file_size_bytes=file_size,
                hash=checkpoint_hash,
                metadata={
                    **(metadata or {}),
                    "eval_loss": eval_loss,
                    "tags": tags or [],
                },
            )

            # Validate checkpoint
            if True:  # Always validate
                is_valid, errors = self.validator.validate_checkpoint(checkpoint_path)
                if not is_valid:
                    checkpoint_state.status = CheckpointStatus.FAILED
                    self.logger.error(f"Checkpoint validation failed: {errors}")
                else:
                    checkpoint_state.status = CheckpointStatus.VALIDATED

            # Register checkpoint
            self.registry.register(checkpoint_state)

            # Create metadata response
            checkpoint_metadata = CheckpointMetadata(
                checkpoint_id=checkpoint_id,
                job_id=job_id,
                checkpoint_type=checkpoint_type,
                status=checkpoint_state.status,
                epoch=epoch,
                global_step=global_step,
                training_loss=trainer_state.get("training_loss"),
                eval_loss=eval_loss,
                learning_rate=trainer_state.get("learning_rate", 0.0),
                file_path=str(checkpoint_path),
                file_size_mb=file_size / (1024 * 1024),
                tags=tags or [],
                metadata=metadata or {},
            )

            # Emit completion event
            event_bus.emit(
                "checkpoint_completed",
                {
                    "checkpoint_id": checkpoint_id,
                    "job_id": job_id,
                    "global_step": global_step,
                    "file_size_mb": checkpoint_metadata.file_size_mb,
                },
            )

            self.logger.info(
                f"Checkpoint created successfully: {checkpoint_id} "
                f"({checkpoint_metadata.file_size_mb:.2f} MB)"
            )

            return checkpoint_id, checkpoint_metadata

        except Exception as e:
            self.logger.error(f"Failed to create checkpoint: {str(e)}")
            
            # Emit failure event
            event_bus.emit(
                "checkpoint_failed",
                {
                    "checkpoint_id": checkpoint_id,
                    "job_id": job_id,
                    "error": str(e),
                },
            )
            
            raise CheckpointSaveError(f"Checkpoint creation failed: {str(e)}")

    def _prepare_checkpoint_data(
        self,
        checkpoint_id: str,
        job_id: str,
        trainer_state: Dict[str, Any],
        epoch: Optional[int],
        global_step: int,
        eval_loss: Optional[float],
        metadata: Dict,
    ) -> Dict[str, Any]:
        """
        Prepare complete checkpoint data.
        
        Args:
            checkpoint_id: Checkpoint ID
            job_id: Job ID
            trainer_state: Trainer state
            epoch: Current epoch
            global_step: Global step
            eval_loss: Eval loss
            metadata: Additional metadata
            
        Returns:
            Complete checkpoint data dictionary
        """
        checkpoint_data = {
            "checkpoint_metadata": {
                "checkpoint_id": checkpoint_id,
                "job_id": job_id,
                "epoch": epoch,
                "global_step": global_step,
                "eval_loss": eval_loss,
                "created_at": datetime.utcnow().isoformat(),
                **metadata,
            },
            # Trainer state
            **trainer_state,
            # RNG states
            "rng_state": self._capture_rng_state(),
        }

        return checkpoint_data

    def _capture_rng_state(self) -> Dict[str, Any]:
        """
        Capture random number generator states.
        
        Returns:
            RNG states dictionary
        """
        rng_state = {
            "python": random.getstate(),
            "numpy": np.random.get_state(),
            "torch": torch.get_rng_state(),
        }

        if torch.cuda.is_available():
            rng_state["cuda"] = torch.cuda.get_rng_state_all()

        return rng_state

    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """
        Delete a checkpoint.
        
        Args:
            checkpoint_id: Checkpoint ID
            
        Returns:
            True if deleted successfully
        """
        self.logger.info(f"Deleting checkpoint: {checkpoint_id}")

        try:
            # Get checkpoint state
            checkpoint_state = self.registry.get(checkpoint_id)
            if not checkpoint_state:
                self.logger.warning(f"Checkpoint not found: {checkpoint_id}")
                return False

            # Delete file
            checkpoint_path = Path(checkpoint_state.file_path)
            self.storage.delete_checkpoint(checkpoint_path)

            # Unregister
            self.registry.unregister(checkpoint_id)

            # Emit event
            event_bus.emit(
                "checkpoint_deleted",
                {
                    "checkpoint_id": checkpoint_id,
                    "job_id": checkpoint_state.job_id,
                },
            )

            self.logger.info(f"Checkpoint deleted: {checkpoint_id}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to delete checkpoint: {str(e)}")
            raise CheckpointException(f"Checkpoint deletion failed: {str(e)}")

    def list_checkpoints(self, job_id: str) -> list:
        """
        List all checkpoints for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            List of checkpoint states
        """
        return self.registry.list_by_job(job_id)

    def get_checkpoint(self, checkpoint_id: str) -> Optional[CheckpointState]:
        """
        Get checkpoint by ID.
        
        Args:
            checkpoint_id: Checkpoint ID
            
        Returns:
            Checkpoint state or None
        """
        return self.registry.get(checkpoint_id)

    def get_latest_checkpoint(self, job_id: str) -> Optional[CheckpointState]:
        """
        Get latest checkpoint for job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Latest checkpoint state or None
        """
        return self.registry.get_latest(job_id)

    def get_best_checkpoint(self, job_id: str) -> Optional[CheckpointState]:
        """
        Get best checkpoint for job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Best checkpoint state or None
        """
        return self.registry.get_best(job_id)


# Global instance
checkpoint_manager = CheckpointManager()
