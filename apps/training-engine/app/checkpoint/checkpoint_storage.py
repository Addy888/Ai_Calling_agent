"""Checkpoint storage management."""

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

import torch

from app.logger import training_logger
from app.checkpoint.exceptions import StorageException, StorageQuotaExceededError


class CheckpointStorage:
    """
    Manages checkpoint file storage operations.
    
    Handles saving, loading, and managing checkpoint files on disk.
    """

    def __init__(self, base_dir: Optional[str] = None):
        """
        Initialize checkpoint storage.
        
        Args:
            base_dir: Base directory for checkpoints
        """
        self.logger = training_logger
        self.base_dir = Path(base_dir) if base_dir else Path("./checkpoints")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_checkpoint(
        self,
        checkpoint_id: str,
        state_dict: Dict[str, Any],
        job_id: str,
    ) -> Path:
        """
        Save checkpoint to disk.
        
        Args:
            checkpoint_id: Checkpoint identifier
            state_dict: State dictionary to save
            job_id: Job identifier
            
        Returns:
            Path to saved checkpoint
        """
        self.logger.info(f"Saving checkpoint: {checkpoint_id}")

        try:
            # Create job directory
            job_dir = self.base_dir / job_id
            job_dir.mkdir(parents=True, exist_ok=True)

            # Checkpoint path
            checkpoint_path = job_dir / f"{checkpoint_id}.pt"

            # Save checkpoint
            torch.save(state_dict, checkpoint_path)

            # Save metadata separately
            metadata_path = job_dir / f"{checkpoint_id}_metadata.json"
            metadata = {
                "checkpoint_id": checkpoint_id,
                "job_id": job_id,
                "files": ["model.pt"],
            }
            
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

            file_size = checkpoint_path.stat().st_size
            self.logger.info(
                f"Checkpoint saved: {checkpoint_path} ({file_size / 1024 / 1024:.2f} MB)"
            )

            return checkpoint_path

        except Exception as e:
            self.logger.error(f"Failed to save checkpoint: {str(e)}")
            raise StorageException(f"Checkpoint save failed: {str(e)}")

    def load_checkpoint(self, checkpoint_path: Path) -> Dict[str, Any]:
        """
        Load checkpoint from disk.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            Loaded state dictionary
        """
        self.logger.info(f"Loading checkpoint: {checkpoint_path}")

        try:
            if not checkpoint_path.exists():
                raise StorageException(f"Checkpoint not found: {checkpoint_path}")

            # Load checkpoint
            state_dict = torch.load(checkpoint_path, map_location="cpu")

            self.logger.info(f"Checkpoint loaded: {checkpoint_path}")

            return state_dict

        except Exception as e:
            self.logger.error(f"Failed to load checkpoint: {str(e)}")
            raise StorageException(f"Checkpoint load failed: {str(e)}")

    def delete_checkpoint(self, checkpoint_path: Path) -> bool:
        """
        Delete checkpoint from disk.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            True if deleted successfully
        """
        self.logger.info(f"Deleting checkpoint: {checkpoint_path}")

        try:
            if checkpoint_path.exists():
                checkpoint_path.unlink()

                # Delete metadata if exists
                metadata_path = checkpoint_path.parent / f"{checkpoint_path.stem}_metadata.json"
                if metadata_path.exists():
                    metadata_path.unlink()

                self.logger.info(f"Checkpoint deleted: {checkpoint_path}")
                return True

            return False

        except Exception as e:
            self.logger.error(f"Failed to delete checkpoint: {str(e)}")
            raise StorageException(f"Checkpoint deletion failed: {str(e)}")

    def checkpoint_exists(self, checkpoint_path: Path) -> bool:
        """
        Check if checkpoint exists.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            True if checkpoint exists
        """
        return checkpoint_path.exists()

    def get_checkpoint_size(self, checkpoint_path: Path) -> int:
        """
        Get checkpoint file size.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            File size in bytes
        """
        if checkpoint_path.exists():
            return checkpoint_path.stat().st_size
        return 0

    def compute_checksum(self, checkpoint_path: Path) -> str:
        """
        Compute checkpoint file checksum.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            SHA256 checksum
        """
        sha256_hash = hashlib.sha256()
        
        with open(checkpoint_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()

    def get_storage_usage(self, job_id: Optional[str] = None) -> Dict[str, float]:
        """
        Get storage usage statistics.
        
        Args:
            job_id: Optional job ID to filter
            
        Returns:
            Storage statistics in GB
        """
        if job_id:
            job_dir = self.base_dir / job_id
            if not job_dir.exists():
                return {"total_gb": 0.0, "checkpoint_count": 0}

            total_size = sum(f.stat().st_size for f in job_dir.glob("*.pt"))
            checkpoint_count = len(list(job_dir.glob("*.pt")))

        else:
            total_size = sum(
                f.stat().st_size
                for f in self.base_dir.rglob("*.pt")
            )
            checkpoint_count = len(list(self.base_dir.rglob("*.pt")))

        return {
            "total_gb": total_size / (1024 ** 3),
            "checkpoint_count": checkpoint_count,
        }

    def check_storage_quota(
        self, required_size_bytes: int, max_size_gb: Optional[float]
    ) -> bool:
        """
        Check if there's enough storage quota.
        
        Args:
            required_size_bytes: Required size in bytes
            max_size_gb: Maximum allowed size in GB
            
        Returns:
            True if quota available
            
        Raises:
            StorageQuotaExceededError: If quota exceeded
        """
        if max_size_gb is None:
            return True

        usage = self.get_storage_usage()
        current_gb = usage["total_gb"]
        required_gb = required_size_bytes / (1024 ** 3)

        if current_gb + required_gb > max_size_gb:
            raise StorageQuotaExceededError(
                f"Storage quota exceeded: {current_gb + required_gb:.2f} GB "
                f"(limit: {max_size_gb} GB)"
            )

        return True

    def cleanup_old_checkpoints(
        self, job_id: str, keep_n: int
    ) -> List[Path]:
        """
        Cleanup old checkpoints, keeping only N most recent.
        
        Args:
            job_id: Job identifier
            keep_n: Number of checkpoints to keep
            
        Returns:
            List of deleted checkpoint paths
        """
        job_dir = self.base_dir / job_id
        if not job_dir.exists():
            return []

        # Get all checkpoints sorted by modification time
        checkpoints = sorted(
            job_dir.glob("*.pt"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        # Delete old checkpoints
        deleted = []
        for checkpoint_path in checkpoints[keep_n:]:
            if self.delete_checkpoint(checkpoint_path):
                deleted.append(checkpoint_path)

        self.logger.info(f"Cleaned up {len(deleted)} old checkpoints for job {job_id}")

        return deleted


# Global instance
checkpoint_storage = CheckpointStorage()
