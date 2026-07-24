"""Tests for checkpoint registry."""

import pytest
from datetime import datetime, timedelta

from app.checkpoint.checkpoint_registry import CheckpointRegistry
from app.checkpoint.schemas import CheckpointState, CheckpointStatus, CheckpointType


class TestCheckpointRegistry:
    """Test checkpoint registry operations."""

    @pytest.fixture
    def registry(self, temp_checkpoint_dir):
        """Create registry instance."""
        registry_path = temp_checkpoint_dir / "test_registry.json"
        return CheckpointRegistry(registry_path=registry_path)

    @pytest.fixture
    def sample_checkpoint_state(self, temp_checkpoint_dir):
        """Create sample checkpoint state."""
        return CheckpointState(
            checkpoint_id="checkpoint_001",
            job_id="job_123",
            checkpoint_type=CheckpointType.AUTOMATIC,
            status=CheckpointStatus.COMPLETED,
            epoch=1,
            global_step=100,
            file_path=str(temp_checkpoint_dir / "checkpoint_001.pt"),
            file_size_bytes=1024 * 1024,  # 1 MB
            hash="abc123",
            metadata={"eval_loss": 0.5},
        )

    def test_register_checkpoint(self, registry, sample_checkpoint_state):
        """Test checkpoint registration."""
        registry.register(sample_checkpoint_state)
        
        assert registry.exists(sample_checkpoint_state.checkpoint_id)
        
        retrieved = registry.get(sample_checkpoint_state.checkpoint_id)
        assert retrieved is not None
        assert retrieved.checkpoint_id == sample_checkpoint_state.checkpoint_id

    def test_unregister_checkpoint(self, registry, sample_checkpoint_state):
        """Test checkpoint unregistration."""
        registry.register(sample_checkpoint_state)
        assert registry.exists(sample_checkpoint_state.checkpoint_id)
        
        registry.unregister(sample_checkpoint_state.checkpoint_id)
        assert not registry.exists(sample_checkpoint_state.checkpoint_id)

    def test_get_nonexistent_checkpoint(self, registry):
        """Test getting nonexistent checkpoint."""
        result = registry.get("nonexistent")
        assert result is None

    def test_list_by_job(self, registry, temp_checkpoint_dir):
        """Test listing checkpoints by job."""
        # Create checkpoints for two jobs
        for i in range(3):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_job1_{i}",
                job_id="job_123",
                checkpoint_type=CheckpointType.AUTOMATIC,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        for i in range(2):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_job2_{i}",
                job_id="job_456",
                checkpoint_type=CheckpointType.AUTOMATIC,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        job1_checkpoints = registry.list_by_job("job_123")
        job2_checkpoints = registry.list_by_job("job_456")
        
        assert len(job1_checkpoints) == 3
        assert len(job2_checkpoints) == 2
        
        # Verify sorting (descending by global_step)
        assert job1_checkpoints[0].global_step > job1_checkpoints[1].global_step

    def test_get_latest(self, registry, temp_checkpoint_dir):
        """Test getting latest checkpoint."""
        # Create checkpoints with different steps
        steps = [100, 200, 150]
        for i, step in enumerate(steps):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_{i}",
                job_id="job_123",
                checkpoint_type=CheckpointType.AUTOMATIC,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=step,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        latest = registry.get_latest("job_123")
        
        assert latest is not None
        assert latest.global_step == 200  # Highest step

    def test_get_latest_no_completed(self, registry, temp_checkpoint_dir):
        """Test getting latest with no completed checkpoints."""
        # Create failed checkpoint
        state = CheckpointState(
            checkpoint_id="checkpoint_failed",
            job_id="job_123",
            checkpoint_type=CheckpointType.AUTOMATIC,
            status=CheckpointStatus.FAILED,
            epoch=1,
            global_step=100,
            file_path=str(temp_checkpoint_dir / "checkpoint.pt"),
            file_size_bytes=1024 * 1024,
        )
        registry.register(state)
        
        latest = registry.get_latest("job_123")
        assert latest is None

    def test_get_best(self, registry, temp_checkpoint_dir):
        """Test getting best checkpoint by eval loss."""
        losses = [0.8, 0.5, 0.6]
        for i, loss in enumerate(losses):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_{i}",
                job_id="job_123",
                checkpoint_type=CheckpointType.AUTOMATIC,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
                metadata={"eval_loss": loss},
            )
            registry.register(state)
        
        best = registry.get_best("job_123")
        
        assert best is not None
        assert best.metadata["eval_loss"] == 0.5  # Lowest loss

    def test_get_best_no_eval_loss(self, registry, temp_checkpoint_dir):
        """Test getting best with no eval loss."""
        state = CheckpointState(
            checkpoint_id="checkpoint_001",
            job_id="job_123",
            checkpoint_type=CheckpointType.AUTOMATIC,
            status=CheckpointStatus.COMPLETED,
            epoch=1,
            global_step=100,
            file_path=str(temp_checkpoint_dir / "checkpoint.pt"),
            file_size_bytes=1024 * 1024,
            metadata={},  # No eval_loss
        )
        registry.register(state)
        
        best = registry.get_best("job_123")
        assert best is None

    def test_get_by_type(self, registry, temp_checkpoint_dir):
        """Test getting checkpoints by type."""
        types = [
            CheckpointType.AUTOMATIC,
            CheckpointType.MANUAL,
            CheckpointType.AUTOMATIC,
            CheckpointType.EPOCH,
        ]
        
        for i, cp_type in enumerate(types):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_{i}",
                job_id="job_123",
                checkpoint_type=cp_type,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        automatic_cps = registry.get_by_type("job_123", CheckpointType.AUTOMATIC)
        manual_cps = registry.get_by_type("job_123", CheckpointType.MANUAL)
        epoch_cps = registry.get_by_type("job_123", CheckpointType.EPOCH)
        
        assert len(automatic_cps) == 2
        assert len(manual_cps) == 1
        assert len(epoch_cps) == 1

    def test_get_by_epoch(self, registry, temp_checkpoint_dir):
        """Test getting checkpoint by epoch."""
        for i in range(3):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_{i}",
                job_id="job_123",
                checkpoint_type=CheckpointType.EPOCH,
                status=CheckpointStatus.COMPLETED,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        checkpoint = registry.get_by_epoch("job_123", epoch=1)
        
        assert checkpoint is not None
        assert checkpoint.epoch == 1

    def test_get_by_epoch_not_found(self, registry):
        """Test getting checkpoint by epoch when not found."""
        checkpoint = registry.get_by_epoch("job_123", epoch=99)
        assert checkpoint is None

    def test_update_status(self, registry, sample_checkpoint_state):
        """Test updating checkpoint status."""
        registry.register(sample_checkpoint_state)
        
        registry.update_status(
            sample_checkpoint_state.checkpoint_id,
            CheckpointStatus.VALIDATED,
        )
        
        updated = registry.get(sample_checkpoint_state.checkpoint_id)
        assert updated.status == CheckpointStatus.VALIDATED

    def test_update_metadata(self, registry, sample_checkpoint_state):
        """Test updating checkpoint metadata."""
        registry.register(sample_checkpoint_state)
        
        new_metadata = {"new_key": "new_value"}
        registry.update_metadata(
            sample_checkpoint_state.checkpoint_id,
            new_metadata,
        )
        
        updated = registry.get(sample_checkpoint_state.checkpoint_id)
        assert "new_key" in updated.metadata
        assert updated.metadata["new_key"] == "new_value"
        # Original metadata should still be there
        assert "eval_loss" in updated.metadata

    def test_get_stats(self, registry, temp_checkpoint_dir):
        """Test getting registry statistics."""
        # Create checkpoints with different statuses
        statuses = [
            CheckpointStatus.COMPLETED,
            CheckpointStatus.COMPLETED,
            CheckpointStatus.FAILED,
        ]
        
        for i, status in enumerate(statuses):
            state = CheckpointState(
                checkpoint_id=f"checkpoint_{i}",
                job_id="job_123",
                checkpoint_type=CheckpointType.AUTOMATIC,
                status=status,
                epoch=i,
                global_step=i * 100,
                file_path=str(temp_checkpoint_dir / f"checkpoint_{i}.pt"),
                file_size_bytes=1024 * 1024,
            )
            registry.register(state)
        
        stats = registry.get_stats(job_id="job_123")
        
        assert stats["total_checkpoints"] == 3
        assert stats["completed"] == 2
        assert stats["failed"] == 1
        assert stats["total_size_gb"] > 0
        assert stats["job_id"] == "job_123"
        assert "latest_step" in stats

    def test_get_stats_all_jobs(self, registry, temp_checkpoint_dir):
        """Test getting statistics for all jobs."""
        # Create checkpoints for multiple jobs
        for job_id in ["job_123", "job_456"]:
            for i in range(2):
                state = CheckpointState(
                    checkpoint_id=f"{job_id}_checkpoint_{i}",
                    job_id=job_id,
                    checkpoint_type=CheckpointType.AUTOMATIC,
                    status=CheckpointStatus.COMPLETED,
                    epoch=i,
                    global_step=i * 100,
                    file_path=str(temp_checkpoint_dir / f"{job_id}_{i}.pt"),
                    file_size_bytes=1024 * 1024,
                )
                registry.register(state)
        
        stats = registry.get_stats()
        
        assert stats["total_checkpoints"] == 4
        assert "job_id" not in stats

    def test_registry_persistence(self, temp_checkpoint_dir, sample_checkpoint_state):
        """Test registry persistence across instances."""
        registry_path = temp_checkpoint_dir / "test_registry.json"
        
        # Create registry and register checkpoint
        registry1 = CheckpointRegistry(registry_path=registry_path)
        registry1.register(sample_checkpoint_state)
        
        # Create new registry instance (should load from file)
        registry2 = CheckpointRegistry(registry_path=registry_path)
        
        # Verify checkpoint exists
        assert registry2.exists(sample_checkpoint_state.checkpoint_id)
        retrieved = registry2.get(sample_checkpoint_state.checkpoint_id)
        assert retrieved.checkpoint_id == sample_checkpoint_state.checkpoint_id

    def test_empty_job(self, registry):
        """Test operations on empty job."""
        checkpoints = registry.list_by_job("nonexistent_job")
        assert len(checkpoints) == 0
        
        latest = registry.get_latest("nonexistent_job")
        assert latest is None
        
        best = registry.get_best("nonexistent_job")
        assert best is None
