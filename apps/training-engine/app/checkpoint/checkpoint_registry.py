"""Checkpoint registry for tracking checkpoint history."""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.logger import training_logger
from app.checkpoint.exceptions import CheckpointNotFoundError
from app.checkpoint.schemas import CheckpointState, CheckpointStatus, CheckpointType


class CheckpointRegistry:
    """
    Maintains checkpoint history and metadata.
    
    Tracks all checkpoints with their status, metadata, and relationships.
    """

    def __init__(self, registry_path: Optional[Path] = None):
        """
        Initialize checkpoint registry.
        
        Args:
            registry_path: Path to registry file
        """
        self.logger = training_logger
        self.registry_path = registry_path or Path("./checkpoints/registry.json")
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._checkpoints: Dict[str, CheckpointState] = {}
        self._load_registry()

    def register(self, checkpoint: CheckpointState) -> None:
        """
        Register a checkpoint.
        
        Args:
            checkpoint: Checkpoint state to register
        """
        self.logger.info(f"Registering checkpoint: {checkpoint.checkpoint_id}")
        
        self._checkpoints[checkpoint.checkpoint_id] = checkpoint
        self._save_registry()
        
        self.logger.info(
            f"Checkpoint registered: {checkpoint.checkpoint_id} "
            f"(step={checkpoint.global_step})"
        )

    def unregister(self, checkpoint_id: str) -> None:
        """
        Unregister a checkpoint.
        
        Args:
            checkpoint_id: Checkpoint ID
        """
        if checkpoint_id in self._checkpoints:
            del self._checkpoints[checkpoint_id]
            self._save_registry()
            self.logger.info(f"Checkpoint unregistered: {checkpoint_id}")

    def get(self, checkpoint_id: str) -> Optional[CheckpointState]:
        """
        Get checkpoint by ID.
        
        Args:
            checkpoint_id: Checkpoint ID
            
        Returns:
            Checkpoint state or None
        """
        return self._checkpoints.get(checkpoint_id)

    def exists(self, checkpoint_id: str) -> bool:
        """
        Check if checkpoint exists.
        
        Args:
            checkpoint_id: Checkpoint ID
            
        Returns:
            True if exists
        """
        return checkpoint_id in self._checkpoints

    def list_by_job(self, job_id: str) -> List[CheckpointState]:
        """
        List all checkpoints for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            List of checkpoint states
        """
        checkpoints = [
            cp for cp in self._checkpoints.values()
            if cp.job_id == job_id
        ]
        
        # Sort by global step descending
        return sorted(checkpoints, key=lambda x: x.global_step, reverse=True)

    def get_latest(self, job_id: str) -> Optional[CheckpointState]:
        """
        Get latest checkpoint for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Latest checkpoint state or None
        """
        checkpoints = self.list_by_job(job_id)
        
        # Filter only completed checkpoints
        completed = [
            cp for cp in checkpoints
            if cp.status == CheckpointStatus.COMPLETED
        ]
        
        return completed[0] if completed else None

    def get_best(self, job_id: str) -> Optional[CheckpointState]:
        """
        Get best checkpoint for a job (lowest eval loss).
        
        Args:
            job_id: Job identifier
            
        Returns:
            Best checkpoint state or None
        """
        checkpoints = self.list_by_job(job_id)
        
        # Filter checkpoints with eval loss
        with_loss = [
            cp for cp in checkpoints
            if cp.status == CheckpointStatus.COMPLETED
            and cp.metadata.get("eval_loss") is not None
        ]
        
        if not with_loss:
            return None
        
        # Return checkpoint with lowest eval loss
        return min(with_loss, key=lambda x: x.metadata.get("eval_loss", float("inf")))

    def get_by_type(self, job_id: str, checkpoint_type: CheckpointType) -> List[CheckpointState]:
        """
        Get checkpoints by type.
        
        Args:
            job_id: Job identifier
            checkpoint_type: Checkpoint type
            
        Returns:
            List of checkpoints of specified type
        """
        checkpoints = self.list_by_job(job_id)
        return [cp for cp in checkpoints if cp.checkpoint_type == checkpoint_type]

    def get_by_epoch(self, job_id: str, epoch: int) -> Optional[CheckpointState]:
        """
        Get checkpoint for specific epoch.
        
        Args:
            job_id: Job identifier
            epoch: Epoch number
            
        Returns:
            Checkpoint state or None
        """
        checkpoints = self.list_by_job(job_id)
        
        for cp in checkpoints:
            if cp.epoch == epoch and cp.status == CheckpointStatus.COMPLETED:
                return cp
        
        return None

    def update_status(self, checkpoint_id: str, status: CheckpointStatus) -> None:
        """
        Update checkpoint status.
        
        Args:
            checkpoint_id: Checkpoint ID
            status: New status
        """
        if checkpoint_id in self._checkpoints:
            self._checkpoints[checkpoint_id].status = status
            self._save_registry()
            self.logger.info(f"Checkpoint status updated: {checkpoint_id} -> {status.value}")

    def update_metadata(self, checkpoint_id: str, metadata: Dict) -> None:
        """
        Update checkpoint metadata.
        
        Args:
            checkpoint_id: Checkpoint ID
            metadata: Metadata to update
        """
        if checkpoint_id in self._checkpoints:
            self._checkpoints[checkpoint_id].metadata.update(metadata)
            self._save_registry()

    def get_stats(self, job_id: Optional[str] = None) -> Dict:
        """
        Get registry statistics.
        
        Args:
            job_id: Optional job ID to filter
            
        Returns:
            Statistics dictionary
        """
        if job_id:
            checkpoints = self.list_by_job(job_id)
        else:
            checkpoints = list(self._checkpoints.values())
        
        total_size = sum(cp.file_size_bytes for cp in checkpoints)
        
        stats = {
            "total_checkpoints": len(checkpoints),
            "completed": sum(1 for cp in checkpoints if cp.status == CheckpointStatus.COMPLETED),
            "failed": sum(1 for cp in checkpoints if cp.status == CheckpointStatus.FAILED),
            "total_size_gb": total_size / (1024 ** 3),
        }
        
        if job_id:
            stats["job_id"] = job_id
            latest = self.get_latest(job_id)
            if latest:
                stats["latest_step"] = latest.global_step
        
        return stats

    def _save_registry(self) -> None:
        """Save registry to disk."""
        try:
            registry_data = {
                checkpoint_id: {
                    "checkpoint_id": cp.checkpoint_id,
                    "job_id": cp.job_id,
                    "checkpoint_type": cp.checkpoint_type.value,
                    "status": cp.status.value,
                    "epoch": cp.epoch,
                    "global_step": cp.global_step,
                    "file_path": str(cp.file_path),
                    "file_size_bytes": cp.file_size_bytes,
                    "hash": cp.hash,
                    "created_at": cp.created_at.isoformat(),
                    "metadata": cp.metadata,
                }
                for checkpoint_id, cp in self._checkpoints.items()
            }
            
            with open(self.registry_path, "w") as f:
                json.dump(registry_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to save registry: {str(e)}")

    def _load_registry(self) -> None:
        """Load registry from disk."""
        if not self.registry_path.exists():
            return
        
        try:
            with open(self.registry_path, "r") as f:
                registry_data = json.load(f)
            
            for checkpoint_id, data in registry_data.items():
                self._checkpoints[checkpoint_id] = CheckpointState(
                    checkpoint_id=data["checkpoint_id"],
                    job_id=data["job_id"],
                    checkpoint_type=CheckpointType(data["checkpoint_type"]),
                    status=CheckpointStatus(data["status"]),
                    epoch=data.get("epoch"),
                    global_step=data["global_step"],
                    file_path=data["file_path"],
                    file_size_bytes=data["file_size_bytes"],
                    hash=data.get("hash"),
                    created_at=datetime.fromisoformat(data["created_at"]),
                    metadata=data.get("metadata", {}),
                )
            
            self.logger.info(f"Loaded {len(self._checkpoints)} checkpoints from registry")
            
        except Exception as e:
            self.logger.error(f"Failed to load registry: {str(e)}")


# Global instance
checkpoint_registry = CheckpointRegistry()
