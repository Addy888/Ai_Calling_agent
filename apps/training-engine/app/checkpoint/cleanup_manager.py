"""Cleanup manager for checkpoint retention and rotation."""

from datetime import datetime, timedelta
from typing import List, Optional

from app.logger import training_logger
from app.checkpoint.checkpoint_manager import CheckpointManager, checkpoint_manager
from app.checkpoint.checkpoint_registry import checkpoint_registry
from app.checkpoint.schemas import CheckpointType, RetentionPolicy


class CleanupManager:
    """
    Manages checkpoint cleanup and retention policies.
    
    Implements automatic rotation and cleanup strategies.
    """

    def __init__(self, checkpoint_manager: Optional[CheckpointManager] = None):
        """
        Initialize cleanup manager.
        
        Args:
            checkpoint_manager: Optional CheckpointManager instance
        """
        self.logger = training_logger
        self.checkpoint_manager = checkpoint_manager or checkpoint_manager

    def apply_retention_policy(
        self,
        job_id: str,
        policy: RetentionPolicy,
    ) -> int:
        """
        Apply retention policy to checkpoints.
        
        Args:
            job_id: Job identifier
            policy: Retention policy
            
        Returns:
            Number of checkpoints deleted
        """
        self.logger.info(f"Applying retention policy for job: {job_id}")
        
        checkpoints = checkpoint_registry.list_by_job(job_id)
        
        if not checkpoints:
            return 0
        
        to_delete = []
        
        # Separate checkpoint types
        manual_checkpoints = [
            cp for cp in checkpoints
            if cp.checkpoint_type == CheckpointType.MANUAL
        ]
        
        epoch_checkpoints = [
            cp for cp in checkpoints
            if cp.checkpoint_type == CheckpointType.EPOCH
        ]
        
        regular_checkpoints = [
            cp for cp in checkpoints
            if cp.checkpoint_type not in [CheckpointType.MANUAL, CheckpointType.EPOCH]
        ]
        
        # Apply keep_last_n policy
        if policy.keep_last_n > 0 and len(regular_checkpoints) > policy.keep_last_n:
            # Sort by step descending
            sorted_checkpoints = sorted(
                regular_checkpoints,
                key=lambda x: x.global_step,
                reverse=True,
            )
            to_delete.extend(sorted_checkpoints[policy.keep_last_n:])
        
        # Apply keep_best_n policy
        if policy.keep_best_n > 0:
            # Get checkpoints with eval loss
            checkpoints_with_loss = [
                cp for cp in checkpoints
                if cp.metadata.get("eval_loss") is not None
            ]
            
            if checkpoints_with_loss:
                # Sort by eval loss ascending
                sorted_by_loss = sorted(
                    checkpoints_with_loss,
                    key=lambda x: x.metadata.get("eval_loss", float("inf")),
                )
                
                # Keep best N
                best_checkpoints = sorted_by_loss[:policy.keep_best_n]
                best_ids = {cp.checkpoint_id for cp in best_checkpoints}
                
                # Don't delete best checkpoints
                to_delete = [cp for cp in to_delete if cp.checkpoint_id not in best_ids]
        
        # Apply max_age_days policy
        if policy.max_age_days is not None:
            cutoff_date = datetime.utcnow() - timedelta(days=policy.max_age_days)
            
            for cp in checkpoints:
                if cp.created_at < cutoff_date:
                    if cp not in to_delete:
                        # Don't delete if it's manual or epoch and policy says keep
                        if cp.checkpoint_type == CheckpointType.MANUAL and policy.keep_manual_checkpoints:
                            continue
                        if cp.checkpoint_type == CheckpointType.EPOCH and policy.keep_epoch_checkpoints:
                            continue
                        to_delete.append(cp)
        
        # Delete checkpoints
        deleted_count = 0
        for cp in to_delete:
            try:
                self.checkpoint_manager.delete_checkpoint(cp.checkpoint_id)
                deleted_count += 1
            except Exception as e:
                self.logger.error(
                    f"Failed to delete checkpoint {cp.checkpoint_id}: {str(e)}"
                )
        
        self.logger.info(
            f"Retention policy applied: deleted {deleted_count} checkpoints"
        )
        
        return deleted_count

    def cleanup_old_checkpoints(
        self,
        job_id: str,
        keep_last_n: int = 3,
    ) -> int:
        """
        Cleanup old checkpoints, keeping only N most recent.
        
        Args:
            job_id: Job identifier
            keep_last_n: Number of checkpoints to keep
            
        Returns:
            Number of checkpoints deleted
        """
        policy = RetentionPolicy(
            keep_last_n=keep_last_n,
            keep_best_n=2,
            keep_manual_checkpoints=True,
            keep_epoch_checkpoints=True,
        )
        
        return self.apply_retention_policy(job_id, policy)

    def cleanup_by_age(
        self,
        job_id: str,
        max_age_days: int,
    ) -> int:
        """
        Cleanup checkpoints older than specified days.
        
        Args:
            job_id: Job identifier
            max_age_days: Maximum age in days
            
        Returns:
            Number of checkpoints deleted
        """
        policy = RetentionPolicy(
            keep_last_n=3,
            keep_best_n=2,
            max_age_days=max_age_days,
            keep_manual_checkpoints=True,
        )
        
        return self.apply_retention_policy(job_id, policy)

    def get_cleanup_stats(self, job_id: Optional[str] = None) -> dict:
        """
        Get cleanup statistics.
        
        Args:
            job_id: Optional job identifier
            
        Returns:
            Cleanup statistics
        """
        if job_id:
            checkpoints = checkpoint_registry.list_by_job(job_id)
        else:
            # Get all checkpoints
            checkpoints = []
            stats = checkpoint_registry.get_stats()
            return stats
        
        total_size = sum(cp.file_size_bytes for cp in checkpoints)
        
        return {
            "job_id": job_id,
            "total_checkpoints": len(checkpoints),
            "total_size_gb": total_size / (1024 ** 3),
            "oldest_checkpoint": (
                min(checkpoints, key=lambda x: x.created_at).created_at.isoformat()
                if checkpoints else None
            ),
            "newest_checkpoint": (
                max(checkpoints, key=lambda x: x.created_at).created_at.isoformat()
                if checkpoints else None
            ),
        }


# Global instance
cleanup_manager = CleanupManager()
