"""Tests for checkpoint storage."""

import pytest
import torch
from pathlib import Path

from app.checkpoint.checkpoint_storage import CheckpointStorage
from app.checkpoint.exceptions import StorageException, StorageQuotaExceededError


class TestCheckpointStorage:
    """Test checkpoint storage operations."""

    def test_init(self, temp_checkpoint_dir):
        """Test storage initialization."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        assert storage.base_dir.exists()
        assert storage.base_dir == temp_checkpoint_dir

    def test_save_checkpoint(self, temp_checkpoint_dir, trainer_state):
        """Test checkpoint save operation."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_001",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        assert checkpoint_path.exists()
        assert checkpoint_path.suffix == ".pt"
        assert "job_123" in str(checkpoint_path)

    def test_load_checkpoint(self, temp_checkpoint_dir, trainer_state):
        """Test checkpoint load operation."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_002",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Load checkpoint
        loaded_state = storage.load_checkpoint(checkpoint_path)
        
        assert loaded_state is not None
        assert "model_state_dict" in loaded_state
        assert loaded_state["global_step"] == trainer_state["global_step"]

    def test_load_nonexistent_checkpoint(self, temp_checkpoint_dir):
        """Test loading nonexistent checkpoint."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        with pytest.raises(StorageException, match="Checkpoint not found"):
            storage.load_checkpoint(temp_checkpoint_dir / "nonexistent.pt")

    def test_delete_checkpoint(self, temp_checkpoint_dir, trainer_state):
        """Test checkpoint deletion."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_003",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        assert checkpoint_path.exists()
        
        # Delete checkpoint
        success = storage.delete_checkpoint(checkpoint_path)
        
        assert success
        assert not checkpoint_path.exists()

    def test_delete_nonexistent_checkpoint(self, temp_checkpoint_dir):
        """Test deleting nonexistent checkpoint."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Should return False but not raise
        success = storage.delete_checkpoint(temp_checkpoint_dir / "nonexistent.pt")
        assert not success

    def test_checkpoint_exists(self, temp_checkpoint_dir, trainer_state):
        """Test checkpoint existence check."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_004",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        assert storage.checkpoint_exists(checkpoint_path)
        assert not storage.checkpoint_exists(temp_checkpoint_dir / "nonexistent.pt")

    def test_get_checkpoint_size(self, temp_checkpoint_dir, trainer_state):
        """Test getting checkpoint size."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_005",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        size = storage.get_checkpoint_size(checkpoint_path)
        
        assert size > 0
        assert isinstance(size, int)

    def test_compute_checksum(self, temp_checkpoint_dir, trainer_state):
        """Test checksum computation."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_006",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        checksum = storage.compute_checksum(checkpoint_path)
        
        assert checksum is not None
        assert len(checksum) == 64  # SHA256 hex digest length

    def test_checksum_consistency(self, temp_checkpoint_dir, trainer_state):
        """Test checksum consistency for same content."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_007",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        checksum1 = storage.compute_checksum(checkpoint_path)
        checksum2 = storage.compute_checksum(checkpoint_path)
        
        assert checksum1 == checksum2

    def test_get_storage_usage(self, temp_checkpoint_dir, trainer_state):
        """Test storage usage calculation."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save multiple checkpoints
        for i in range(3):
            storage.save_checkpoint(
                checkpoint_id=f"test_checkpoint_{i:03d}",
                state_dict=trainer_state,
                job_id="job_123",
            )
        
        usage = storage.get_storage_usage()
        
        assert "total_gb" in usage
        assert "checkpoint_count" in usage
        assert usage["checkpoint_count"] == 3
        assert usage["total_gb"] > 0

    def test_get_storage_usage_by_job(self, temp_checkpoint_dir, trainer_state):
        """Test storage usage by job."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save checkpoints for two jobs
        storage.save_checkpoint(
            checkpoint_id="test_checkpoint_008",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        storage.save_checkpoint(
            checkpoint_id="test_checkpoint_009",
            state_dict=trainer_state,
            job_id="job_456",
        )
        
        usage_job1 = storage.get_storage_usage(job_id="job_123")
        usage_job2 = storage.get_storage_usage(job_id="job_456")
        
        assert usage_job1["checkpoint_count"] == 1
        assert usage_job2["checkpoint_count"] == 1

    def test_check_storage_quota_pass(self, temp_checkpoint_dir):
        """Test storage quota check passes."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Check with plenty of quota
        result = storage.check_storage_quota(
            required_size_bytes=1024 * 1024,  # 1 MB
            max_size_gb=100.0,  # 100 GB
        )
        
        assert result is True

    def test_check_storage_quota_fail(self, temp_checkpoint_dir):
        """Test storage quota check fails."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Check with insufficient quota
        with pytest.raises(StorageQuotaExceededError, match="Storage quota exceeded"):
            storage.check_storage_quota(
                required_size_bytes=10 * 1024 * 1024 * 1024,  # 10 GB
                max_size_gb=1.0,  # 1 GB limit
            )

    def test_check_storage_quota_no_limit(self, temp_checkpoint_dir):
        """Test storage quota check with no limit."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        result = storage.check_storage_quota(
            required_size_bytes=1000 * 1024 * 1024 * 1024,  # 1 TB
            max_size_gb=None,  # No limit
        )
        
        assert result is True

    def test_cleanup_old_checkpoints(self, temp_checkpoint_dir, trainer_state):
        """Test cleanup of old checkpoints."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save 5 checkpoints
        for i in range(5):
            storage.save_checkpoint(
                checkpoint_id=f"test_checkpoint_{i:03d}",
                state_dict=trainer_state,
                job_id="job_123",
            )
        
        # Keep only 2 most recent
        deleted = storage.cleanup_old_checkpoints(
            job_id="job_123",
            keep_n=2,
        )
        
        assert len(deleted) == 3
        
        # Verify only 2 remain
        job_dir = temp_checkpoint_dir / "job_123"
        remaining = list(job_dir.glob("*.pt"))
        assert len(remaining) == 2

    def test_save_creates_metadata(self, temp_checkpoint_dir, trainer_state):
        """Test that save creates metadata file."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_010",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        metadata_path = checkpoint_path.parent / f"{checkpoint_path.stem}_metadata.json"
        assert metadata_path.exists()

    def test_multiple_jobs_isolation(self, temp_checkpoint_dir, trainer_state):
        """Test that checkpoints for different jobs are isolated."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        
        # Save checkpoints for two jobs
        path1 = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_011",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        path2 = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_012",
            state_dict=trainer_state,
            job_id="job_456",
        )
        
        # Verify they're in different directories
        assert path1.parent.name == "job_123"
        assert path2.parent.name == "job_456"
        assert path1.parent != path2.parent
