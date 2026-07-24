"""Tests for cleanup manager."""

import pytest
from datetime import datetime, timedelta

from app.checkpoint.cleanup_manager import CleanupManager
from app.checkpoint.checkpoint_manager import CheckpointManager
from app.checkpoint.checkpoint_storage import CheckpointStorage
from app.checkpoint.checkpoint_registry import CheckpointRegistry
from app.checkpoint.checkpoint_validator import CheckpointValidator
from app.checkpoint.schemas import CheckpointType, RetentionPolicy


class TestCleanupManager:
    """Test cleanup manager operations."""

    @pytest.fixture
    def checkpoint_manager(self, temp_checkpoint_dir):
        """Create checkpoint manager."""
        storage = CheckpointStorage(base_dir=str(temp_checkpoint_dir))
        registry = CheckpointRegistry(
            registry_path=temp_checkpoint_dir / "test_registry.json"
        )
        validator = CheckpointValidator()
        
        return CheckpointManager(
            storage=storage,
            registry=registry,
            validator=validator,
        )

    @pytest.fixture
    def cleanup_manager(self, checkpoint_manager):
        """Create cleanup manager."""
        return CleanupManager(
            checkpoint_manager=checkpoint_manager,
        )

    def test_cleanup_old_checkpoints(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test cleanup of old checkpoints."""
        # Create 5 checkpoints
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Keep only 2
        deleted_count = cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=2,
        )
        
        assert deleted_count == 3
        
        # Verify only 2 remain
        remaining = checkpoint_manager.list_checkpoints("job_123")
        assert len(remaining) == 2

    def test_cleanup_keeps_most_recent(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test that cleanup keeps most recent checkpoints."""
        # Create checkpoints
        steps = [100, 300, 200, 500, 400]
        for step in steps:
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=step,
            )
        
        # Keep only 2
        cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=2,
        )
        
        # Verify most recent are kept
        remaining = checkpoint_manager.list_checkpoints("job_123")
        remaining_steps = [cp.global_step for cp in remaining]
        
        assert 500 in remaining_steps
        assert 400 in remaining_steps

    def test_cleanup_by_age(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test cleanup by age."""
        # Create checkpoints
        for i in range(3):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Manually set old timestamp on one checkpoint
        checkpoints = checkpoint_manager.list_checkpoints("job_123")
        if checkpoints:
            old_checkpoint = checkpoints[-1]
            old_checkpoint.created_at = datetime.utcnow() - timedelta(days=10)
            checkpoint_manager.registry._save_registry()
        
        # Cleanup checkpoints older than 5 days
        deleted_count = cleanup_manager.cleanup_by_age(
            job_id="job_123",
            max_age_days=5,
        )
        
        # At least the old one should be deleted
        assert deleted_count >= 1

    def test_apply_retention_policy_last_n(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test applying retention policy with keep_last_n."""
        # Create checkpoints
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Apply policy
        policy = RetentionPolicy(keep_last_n=3, keep_best_n=0)
        deleted_count = cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        assert deleted_count == 2
        
        # Verify only 3 remain
        remaining = checkpoint_manager.list_checkpoints("job_123")
        assert len(remaining) == 3

    def test_apply_retention_policy_best_n(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test applying retention policy with keep_best_n."""
        # Create checkpoints with eval losses
        losses = [0.8, 0.5, 0.6, 0.9, 0.4]
        for i, loss in enumerate(losses):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
                eval_loss=loss,
            )
        
        # Apply policy: keep best 2
        policy = RetentionPolicy(keep_last_n=0, keep_best_n=2)
        deleted_count = cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        assert deleted_count == 3
        
        # Verify best 2 remain (0.4 and 0.5)
        remaining = checkpoint_manager.list_checkpoints("job_123")
        remaining_losses = [
            cp.metadata.get("eval_loss") for cp in remaining
            if cp.metadata.get("eval_loss") is not None
        ]
        assert 0.4 in remaining_losses
        assert 0.5 in remaining_losses

    def test_apply_retention_policy_combined(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test applying retention policy with both last_n and best_n."""
        # Create checkpoints
        for i in range(6):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
                eval_loss=0.5 - (i * 0.05),  # Decreasing loss
            )
        
        # Apply policy: keep last 2 and best 2
        policy = RetentionPolicy(keep_last_n=2, keep_best_n=2)
        cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        # Should keep at least 2 (union of last and best)
        remaining = checkpoint_manager.list_checkpoints("job_123")
        assert len(remaining) >= 2

    def test_apply_retention_policy_preserve_manual(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test that retention policy preserves manual checkpoints."""
        # Create automatic checkpoints
        for i in range(3):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                checkpoint_type=CheckpointType.AUTOMATIC,
                global_step=i * 100,
            )
        
        # Create manual checkpoint
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            global_step=150,
        )
        
        # Apply policy: keep last 1, preserve manual
        policy = RetentionPolicy(
            keep_last_n=1,
            keep_best_n=0,
            keep_manual_checkpoints=True,
        )
        cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        # Manual checkpoint should still exist
        remaining = checkpoint_manager.list_checkpoints("job_123")
        manual_checkpoints = [
            cp for cp in remaining
            if cp.checkpoint_type == CheckpointType.MANUAL
        ]
        assert len(manual_checkpoints) == 1

    def test_apply_retention_policy_preserve_epoch(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test that retention policy preserves epoch checkpoints."""
        # Create automatic checkpoints
        for i in range(3):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                checkpoint_type=CheckpointType.AUTOMATIC,
                global_step=i * 100,
            )
        
        # Create epoch checkpoint
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EPOCH,
            global_step=150,
            epoch=1,
        )
        
        # Apply policy: keep last 1, preserve epoch
        policy = RetentionPolicy(
            keep_last_n=1,
            keep_best_n=0,
            keep_epoch_checkpoints=True,
        )
        cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        # Epoch checkpoint should still exist
        remaining = checkpoint_manager.list_checkpoints("job_123")
        epoch_checkpoints = [
            cp for cp in remaining
            if cp.checkpoint_type == CheckpointType.EPOCH
        ]
        assert len(epoch_checkpoints) == 1

    def test_cleanup_no_checkpoints(self, cleanup_manager):
        """Test cleanup when no checkpoints exist."""
        deleted_count = cleanup_manager.cleanup_old_checkpoints(
            job_id="job_empty",
            keep_last_n=3,
        )
        
        assert deleted_count == 0

    def test_cleanup_keep_all(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test cleanup when keep_n >= checkpoint count."""
        # Create 3 checkpoints
        for i in range(3):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Keep 5 (more than available)
        deleted_count = cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=5,
        )
        
        assert deleted_count == 0
        
        # All should remain
        remaining = checkpoint_manager.list_checkpoints("job_123")
        assert len(remaining) == 3

    def test_cleanup_multiple_jobs(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test cleanup doesn't affect other jobs."""
        # Create checkpoints for two jobs
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        for i in range(3):
            checkpoint_manager.create_checkpoint(
                job_id="job_456",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Cleanup only job_123
        cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=2,
        )
        
        # Job_123 should have 2
        job1_remaining = checkpoint_manager.list_checkpoints("job_123")
        assert len(job1_remaining) == 2
        
        # Job_456 should still have 3
        job2_remaining = checkpoint_manager.list_checkpoints("job_456")
        assert len(job2_remaining) == 3

    def test_get_cleanup_candidates(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test getting cleanup candidates."""
        # Create checkpoints
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Get candidates for deletion (keep 2)
        policy = RetentionPolicy(keep_last_n=2, keep_best_n=0)
        candidates = cleanup_manager.get_cleanup_candidates(
            job_id="job_123",
            policy=policy,
        )
        
        assert len(candidates) == 3

    def test_cleanup_by_storage_limit(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test cleanup based on storage limit."""
        # Create checkpoints
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Apply policy with storage limit
        policy = RetentionPolicy(
            keep_last_n=10,  # Would keep all
            keep_best_n=0,
            max_storage_gb=0.001,  # Very small limit (1 MB)
        )
        
        # Should delete some to meet storage limit
        deleted_count = cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        # At least some should be deleted
        assert deleted_count > 0

    def test_cleanup_preserves_best_when_requested(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test that cleanup preserves best checkpoint when requested."""
        # Create checkpoints with losses
        losses = [0.9, 0.3, 0.8, 0.7, 0.6]  # 0.3 is best
        for i, loss in enumerate(losses):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
                eval_loss=loss,
            )
        
        # Cleanup keeping only 1, but preserve best
        policy = RetentionPolicy(
            keep_last_n=1,
            keep_best_n=1,
        )
        cleanup_manager.apply_retention_policy(
            job_id="job_123",
            policy=policy,
        )
        
        # Best checkpoint (loss=0.3) should remain
        remaining = checkpoint_manager.list_checkpoints("job_123")
        best_in_remaining = any(
            cp.metadata.get("eval_loss") == 0.3
            for cp in remaining
        )
        assert best_in_remaining

    def test_cleanup_idempotent(self, cleanup_manager, checkpoint_manager, trainer_state):
        """Test that cleanup is idempotent."""
        # Create checkpoints
        for i in range(5):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Cleanup twice
        deleted1 = cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=3,
        )
        
        deleted2 = cleanup_manager.cleanup_old_checkpoints(
            job_id="job_123",
            keep_last_n=3,
        )
        
        assert deleted1 == 2
        assert deleted2 == 0  # Nothing to delete second time
