"""Checkpoint factory for convenient checkpoint creation."""

from typing import Any, Dict, Optional

from app.logger import training_logger
from app.checkpoint.checkpoint_manager import CheckpointManager, checkpoint_manager
from app.checkpoint.schemas import CheckpointConfig, CheckpointType, RetentionPolicy


class CheckpointFactory:
    """
    Factory for creating checkpoints with preset configurations.
    """

    def __init__(self, checkpoint_manager: Optional[CheckpointManager] = None):
        """
        Initialize checkpoint factory.
        
        Args:
            checkpoint_manager: Optional CheckpointManager instance
        """
        self.logger = training_logger
        self.checkpoint_manager = checkpoint_manager or checkpoint_manager

    def create_epoch_checkpoint(
        self,
        job_id: str,
        trainer_state: Dict[str, Any],
        epoch: int,
        global_step: int,
    ) -> tuple:
        """
        Create epoch checkpoint.
        
        Args:
            job_id: Job identifier
            trainer_state: Trainer state
            epoch: Current epoch
            global_step: Global step
            
        Returns:
            Tuple of (checkpoint_id, metadata)
        """
        return self.checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EPOCH,
            epoch=epoch,
            global_step=global_step,
        )

    def create_step_checkpoint(
        self,
        job_id: str,
        trainer_state: Dict[str, Any],
        global_step: int,
    ) -> tuple:
        """
        Create step checkpoint.
        
        Args:
            job_id: Job identifier
            trainer_state: Trainer state
            global_step: Global step
            
        Returns:
            Tuple of (checkpoint_id, metadata)
        """
        return self.checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.STEP,
            global_step=global_step,
        )

    def create_best_checkpoint(
        self,
        job_id: str,
        trainer_state: Dict[str, Any],
        global_step: int,
        eval_loss: float,
        epoch: Optional[int] = None,
    ) -> tuple:
        """
        Create best model checkpoint.
        
        Args:
            job_id: Job identifier
            trainer_state: Trainer state
            global_step: Global step
            eval_loss: Evaluation loss
            epoch: Optional epoch
            
        Returns:
            Tuple of (checkpoint_id, metadata)
        """
        return self.checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.BEST,
            epoch=epoch,
            global_step=global_step,
            eval_loss=eval_loss,
        )

    def create_manual_checkpoint(
        self,
        job_id: str,
        trainer_state: Dict[str, Any],
        global_step: int,
        tags: Optional[list] = None,
        metadata: Optional[Dict] = None,
    ) -> tuple:
        """
        Create manual checkpoint.
        
        Args:
            job_id: Job identifier
            trainer_state: Trainer state
            global_step: Global step
            tags: Optional tags
            metadata: Optional metadata
            
        Returns:
            Tuple of (checkpoint_id, metadata)
        """
        return self.checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            global_step=global_step,
            tags=tags,
            metadata=metadata,
        )

    def get_default_config(self) -> CheckpointConfig:
        """
        Get default checkpoint configuration.
        
        Returns:
            Default CheckpointConfig
        """
        return CheckpointConfig(
            save_dir="./checkpoints",
            checkpoint_type=CheckpointType.AUTOMATIC,
            save_interval=500,
            save_epochs=1,
            keep_last_n=3,
            keep_best_n=2,
            auto_resume=True,
            validate_on_save=True,
        )

    def get_default_retention_policy(self) -> RetentionPolicy:
        """
        Get default retention policy.
        
        Returns:
            Default RetentionPolicy
        """
        return RetentionPolicy(
            keep_last_n=3,
            keep_best_n=2,
            keep_manual_checkpoints=True,
            keep_epoch_checkpoints=True,
        )


# Global instance
checkpoint_factory = CheckpointFactory()
