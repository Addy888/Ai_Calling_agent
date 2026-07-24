"""Tests for checkpoint manager."""

import pytest
import torch

from app.checkpoint.checkpoint_manager import CheckpointManager
from app.checkpoint.checkpoint_storage import CheckpointStorage
from app.checkpoint.checkpoint_registry import CheckpointRegistry
from app.checkpoint.checkpoint_validator import CheckpointValidator
from app.checkpoint.schemas import CheckpointType, CheckpointStatus
from app.checkpoint.exceptions import CheckpointException, CheckpointSaveError


class TestCheckpointManager:
    """Test checkpoint manager operations."""

    @pytest.fixture
    def manager(self, temp_checkpoint_dir):
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

    def test_create_checkpoint(self, manager, trainer_state):
        """Test checkpoint creation."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            epoch=1,
            global_step=100,
        )
        
        assert checkpoint_id is not None
        assert metadata is not None
        assert metadata.job_id == "job_123"
        assert metadata.global_step == 100
        assert metadata.epoch == 1

    def test_create_automatic_checkpoint(self, manager, trainer_state):
        """Test automatic checkpoint creation."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.AUTOMATIC,
            global_step=500,
        )
        
        assert metadata.checkpoint_type == CheckpointType.AUTOMATIC

    def test_create_epoch_checkpoint(self, manager, trainer_state):
        """Test epoch checkpoint creation."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EPOCH,
            epoch=5,
            global_step=1000,
        )
        
        assert metadata.checkpoint_type == CheckpointType.EPOCH
        assert metadata.epoch == 5

    def test_create_best_checkpoint(self, manager, trainer_state):
        """Test best checkpoint creation with eval loss."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.BEST,
            global_step=1500,
            eval_loss=0.25,
        )
        
        assert metadata.checkpoint_type == CheckpointType.BEST
        assert metadata.eval_loss == 0.25

    def test_create_checkpoint_with_tags(self, manager, trainer_state):
        """Test checkpoint creation with tags."""
        tags = ["milestone", "good-performance"]
        
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=200,
            tags=tags,
        )
        
        assert metadata.tags == tags

    def test_create_checkpoint_with_metadata(self, manager, trainer_state):
        """Test checkpoint creation with custom metadata."""
        custom_metadata = {
            "experiment_name": "test_experiment",
            "hyperparams": {"lr": 5e-5},
        }
        
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=300,
            metadata=custom_metadata,
        )
        
        assert "experiment_name" in metadata.metadata
        assert metadata.metadata["experiment_name"] == "test_experiment"

    def test_delete_checkpoint(self, manager, trainer_state):
        """Test checkpoint deletion."""
        # Create checkpoint
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=400,
        )
        
        # Verify exists
        checkpoint = manager.get_checkpoint(checkpoint_id)
        assert checkpoint is not None
        
        # Delete
        success = manager.delete_checkpoint(checkpoint_id)
        
        assert success
        
        # Verify deleted
        checkpoint = manager.get_checkpoint(checkpoint_id)
        assert checkpoint is None

    def test_delete_nonexistent_checkpoint(self, manager):
        """Test deleting nonexistent checkpoint."""
        success = manager.delete_checkpoint("nonexistent")
        assert not success

    def test_list_checkpoints(self, manager, trainer_state):
        """Test listing checkpoints."""
        # Create multiple checkpoints
        for i in range(3):
            manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        checkpoints = manager.list_checkpoints("job_123")
        
        assert len(checkpoints) == 3

    def test_list_checkpoints_empty(self, manager):
        """Test listing checkpoints for job with none."""
        checkpoints = manager.list_checkpoints("job_empty")
        assert len(checkpoints) == 0

    def test_get_checkpoint(self, manager, trainer_state):
        """Test getting checkpoint by ID."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=500,
        )
        
        checkpoint = manager.get_checkpoint(checkpoint_id)
        
        assert checkpoint is not None
        assert checkpoint.checkpoint_id == checkpoint_id

    def test_get_nonexistent_checkpoint(self, manager):
        """Test getting nonexistent checkpoint."""
        checkpoint = manager.get_checkpoint("nonexistent")
        assert checkpoint is None

    def test_get_latest_checkpoint(self, manager, trainer_state):
        """Test getting latest checkpoint."""
        # Create checkpoints with different steps
        steps = [100, 300, 200]
        for step in steps:
            manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=step,
            )
        
        latest = manager.get_latest_checkpoint("job_123")
        
        assert latest is not None
        assert latest.global_step == 300  # Highest step

    def test_get_best_checkpoint(self, manager, trainer_state):
        """Test getting best checkpoint by eval loss."""
        losses = [0.8, 0.5, 0.6]
        for i, loss in enumerate(losses):
            manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
                eval_loss=loss,
            )
        
        best = manager.get_best_checkpoint("job_123")
        
        assert best is not None
        assert best.metadata.get("eval_loss") == 0.5  # Lowest loss

    def test_rng_state_capture(self, manager, trainer_state):
        """Test RNG state capture."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=600,
        )
        
        # Load checkpoint and verify RNG state exists
        checkpoint = manager.storage.load_checkpoint(
            manager.registry.get(checkpoint_id).file_path
        )
        
        assert "rng_state" in checkpoint
        assert "python" in checkpoint["rng_state"]
        assert "numpy" in checkpoint["rng_state"]
        assert "torch" in checkpoint["rng_state"]

    def test_checkpoint_validation_on_create(self, manager, trainer_state):
        """Test that checkpoints are validated on creation."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=700,
        )
        
        # Check status is validated
        checkpoint = manager.get_checkpoint(checkpoint_id)
        assert checkpoint.status in [
            CheckpointStatus.COMPLETED,
            CheckpointStatus.VALIDATED,
        ]

    def test_checkpoint_metadata_preserved(self, manager, trainer_state):
        """Test that checkpoint metadata is preserved."""
        # Add custom data to trainer state
        trainer_state_with_meta = {
            **trainer_state,
            "custom_field": "custom_value",
            "training_loss": 0.42,
        }
        
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state_with_meta,
            global_step=800,
        )
        
        # Load and verify
        checkpoint_data = manager.storage.load_checkpoint(
            manager.registry.get(checkpoint_id).file_path
        )
        
        assert "checkpoint_metadata" in checkpoint_data
        assert checkpoint_data["custom_field"] == "custom_value"

    def test_multiple_jobs_isolation(self, manager, trainer_state):
        """Test that checkpoints for different jobs are isolated."""
        # Create checkpoints for different jobs
        _, meta1 = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        _, meta2 = manager.create_checkpoint(
            job_id="job_456",
            trainer_state=trainer_state,
            global_step=200,
        )
        
        # List checkpoints for each job
        job1_checkpoints = manager.list_checkpoints("job_123")
        job2_checkpoints = manager.list_checkpoints("job_456")
        
        assert len(job1_checkpoints) == 1
        assert len(job2_checkpoints) == 1
        assert job1_checkpoints[0].job_id == "job_123"
        assert job2_checkpoints[0].job_id == "job_456"

    def test_checkpoint_file_size_recorded(self, manager, trainer_state):
        """Test that checkpoint file size is recorded."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=900,
        )
        
        assert metadata.file_size_mb > 0

    def test_checkpoint_hash_recorded(self, manager, trainer_state):
        """Test that checkpoint hash is recorded."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=1000,
        )
        
        checkpoint = manager.get_checkpoint(checkpoint_id)
        assert checkpoint.hash is not None
        assert len(checkpoint.hash) == 64  # SHA256 hex length

    def test_create_checkpoint_with_all_options(self, manager, trainer_state):
        """Test checkpoint creation with all options."""
        checkpoint_id, metadata = manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            epoch=10,
            global_step=5000,
            eval_loss=0.15,
            tags=["final", "best-ever"],
            metadata={
                "notes": "Final checkpoint",
                "hyperparameters": {"lr": 1e-5},
            },
        )
        
        assert metadata.checkpoint_type == CheckpointType.MANUAL
        assert metadata.epoch == 10
        assert metadata.global_step == 5000
        assert metadata.eval_loss == 0.15
        assert len(metadata.tags) == 2
        assert "notes" in metadata.metadata

    def test_sequential_checkpoints(self, manager, trainer_state):
        """Test creating sequential checkpoints."""
        checkpoint_ids = []
        
        for i in range(5):
            checkpoint_id, _ = manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 1000,
                epoch=i,
            )
            checkpoint_ids.append(checkpoint_id)
        
        # Verify all exist
        for cp_id in checkpoint_ids:
            checkpoint = manager.get_checkpoint(cp_id)
            assert checkpoint is not None
        
        # Verify count
        all_checkpoints = manager.list_checkpoints("job_123")
        assert len(all_checkpoints) == 5
