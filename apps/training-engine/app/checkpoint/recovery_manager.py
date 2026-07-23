"""Recovery manager for crash recovery and fault tolerance."""

import time
from typing import Any, Dict, List, Optional, Tuple

from app.events import event_bus
from app.logger import training_logger
from app.checkpoint.checkpoint_registry import checkpoint_registry
from app.checkpoint.resume_manager import ResumeManager, resume_manager
from app.checkpoint.exceptions import RecoveryException
from app.checkpoint.schemas import CheckpointMetadata, RecoveryStrategy


class RecoveryManager:
    """
    Manages crash recovery and fault tolerance.
    
    Provides automatic recovery after interruptions.
    """

    def __init__(self, resume_manager: Optional[ResumeManager] = None):
        """
        Initialize recovery manager.
        
        Args:
            resume_manager: Optional ResumeManager instance
        """
        self.logger = training_logger
        self.resume_manager = resume_manager or resume_manager

    def attempt_recovery(
        self,
        job_id: str,
        auto_strategy: RecoveryStrategy = RecoveryStrategy.LATEST,
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[CheckpointMetadata]]:
        """
        Attempt automatic recovery.
        
        Args:
            job_id: Job identifier
            auto_strategy: Automatic recovery strategy
            
        Returns:
            Tuple of (success, recovered_state, checkpoint_metadata)
        """
        self.logger.info(f"Attempting recovery for job: {job_id}")
        
        start_time = time.time()

        # Emit event
        event_bus.emit(
            "recovery_started",
            {
                "job_id": job_id,
                "strategy": auto_strategy.value,
            },
        )

        try:
            # Check if can resume
            if not self.resume_manager.can_resume(job_id):
                self.logger.warning(f"No checkpoints available for recovery: {job_id}")
                return False, None, None

            # Attempt resume
            success, state, metadata = self.resume_manager.resume(
                job_id=job_id,
                strategy=auto_strategy,
            )

            recovery_time = time.time() - start_time

            if success:
                self.logger.info(
                    f"Recovery successful for job {job_id} "
                    f"in {recovery_time:.2f}s"
                )

                # Emit success event
                event_bus.emit(
                    "recovery_completed",
                    {
                        "job_id": job_id,
                        "checkpoint_id": metadata.checkpoint_id if metadata else None,
                        "recovery_time_seconds": recovery_time,
                        "restored_step": metadata.global_step if metadata else 0,
                    },
                )
            else:
                self.logger.error(f"Recovery failed for job: {job_id}")

            return success, state, metadata

        except Exception as e:
            self.logger.error(f"Recovery attempt failed: {str(e)}")
            raise RecoveryException(f"Recovery failed: {str(e)}")

    def get_recovery_options(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get available recovery options.
        
        Args:
            job_id: Job identifier
            
        Returns:
            List of recovery options
        """
        checkpoints = checkpoint_registry.list_by_job(job_id)
        
        options = []
        for cp in checkpoints:
            options.append({
                "checkpoint_id": cp.checkpoint_id,
                "checkpoint_type": cp.checkpoint_type.value,
                "global_step": cp.global_step,
                "epoch": cp.epoch,
                "file_size_mb": cp.file_size_bytes / (1024 * 1024),
                "created_at": cp.created_at.isoformat(),
            })
        
        return options

    def recover_from_crash(
        self, job_id: str
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Recover from unexpected crash.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Tuple of (success, recovered_state)
        """
        self.logger.info(f"Crash recovery for job: {job_id}")
        
        success, state, metadata = self.attempt_recovery(
            job_id=job_id,
            auto_strategy=RecoveryStrategy.LATEST,
        )
        
        return success, state


# Global instance
recovery_manager = RecoveryManager()
