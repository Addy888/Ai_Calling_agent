"""Snapshot manager for immutable checkpoint snapshots."""

import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.logger import training_logger
from app.checkpoint.exceptions import SnapshotException


class SnapshotManager:
    """
    Creates immutable snapshots before critical operations.
    
    Provides rollback capability for checkpoint operations.
    """

    def __init__(self, snapshot_dir: Optional[Path] = None):
        """
        Initialize snapshot manager.
        
        Args:
            snapshot_dir: Directory for snapshots
        """
        self.logger = training_logger
        self.snapshot_dir = snapshot_dir or Path("./checkpoints/snapshots")
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)

    def create_snapshot(
        self,
        source_path: Path,
        snapshot_id: Optional[str] = None,
    ) -> Path:
        """
        Create immutable snapshot of checkpoint.
        
        Args:
            source_path: Source checkpoint path
            snapshot_id: Optional snapshot identifier
            
        Returns:
            Snapshot path
        """
        if not source_path.exists():
            raise SnapshotException(f"Source path does not exist: {source_path}")

        snapshot_id = snapshot_id or f"snapshot_{uuid.uuid4().hex[:8]}"
        snapshot_path = self.snapshot_dir / f"{snapshot_id}_{source_path.name}"

        self.logger.info(f"Creating snapshot: {snapshot_id}")

        try:
            # Copy file
            shutil.copy2(source_path, snapshot_path)

            # Make read-only
            snapshot_path.chmod(0o444)

            self.logger.info(f"Snapshot created: {snapshot_path}")

            return snapshot_path

        except Exception as e:
            self.logger.error(f"Failed to create snapshot: {str(e)}")
            raise SnapshotException(f"Snapshot creation failed: {str(e)}")

    def restore_snapshot(
        self,
        snapshot_path: Path,
        restore_path: Path,
    ) -> bool:
        """
        Restore from snapshot.
        
        Args:
            snapshot_path: Snapshot to restore
            restore_path: Destination path
            
        Returns:
            True if restored successfully
        """
        if not snapshot_path.exists():
            raise SnapshotException(f"Snapshot does not exist: {snapshot_path}")

        self.logger.info(f"Restoring snapshot: {snapshot_path}")

        try:
            shutil.copy2(snapshot_path, restore_path)

            self.logger.info(f"Snapshot restored to: {restore_path}")

            return True

        except Exception as e:
            self.logger.error(f"Failed to restore snapshot: {str(e)}")
            raise SnapshotException(f"Snapshot restore failed: {str(e)}")

    def delete_snapshot(self, snapshot_path: Path) -> bool:
        """
        Delete snapshot.
        
        Args:
            snapshot_path: Snapshot to delete
            
        Returns:
            True if deleted successfully
        """
        if not snapshot_path.exists():
            return False

        try:
            # Make writable first
            snapshot_path.chmod(0o644)
            snapshot_path.unlink()

            self.logger.info(f"Snapshot deleted: {snapshot_path}")

            return True

        except Exception as e:
            self.logger.error(f"Failed to delete snapshot: {str(e)}")
            return False


# Global instance
snapshot_manager = SnapshotManager()
