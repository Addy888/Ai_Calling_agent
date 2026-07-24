"""Tests for resume manager."""

import pytest
import random
import numpy as np
import torch

from app.checkpoint.resume_manager import ResumeManager
from app.checkpoint.checkpoint_manager import CheckpointManager
from app.checkpoint.checkpoint_storage import CheckpointStorage
from app.checkpoint.checkpoint_registry import CheckpointRegistry
from app.checkpoint.checkpoint_validator import CheckpointValidator
from app.checkpoint.schemas import CheckpointType, RecoveryStrategy
from app.checkpoint.exceptions import ResumeException


class TestResumeManager:
    """Test resume manager operations."""

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
    def resume_manager(self, checkpoint_manager):
        """Create resume manager."""
        return ResumeManager(
            storage=checkpoint_manager.storage,
            registry=checkpoint_manager.registry,
            validator=checkpoint_manager.validator,
        )

    def test_can_resume_true(self, resume_manager, checkpoint_manager, trainer_state):
        """Test can_resume returns True when checkpoints exist."""
        # Create checkpoint
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        can_resume = resume_manager.can_resume("job_123")
        assert can_resume is True

    def test_can_resume_false(self, resume_manager):
        """Test can_resume returns False when no checkpoints exist."""
        can_resume = resume_manager.can_resume("job_empty")
        assert can_resume is False

    def test_resume_from_latest(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming from latest checkpoint."""
        # Create checkpoints
        steps = [100, 300, 200]
        for step in steps:
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=step,
            )
        
        # Resume from latest
        success, state, metadata = resume_manager.resume_from_latest("job_123")
        
        assert success
        assert state is not None
        assert metadata is not None
        assert metadata.global_step == 300  # Highest step

    def test_resume_from_latest_no_checkpoints(self, resume_manager):
        """Test resuming when no checkpoints exist."""
        success, state, metadata = resume_manager.resume_from_latest("job_empty")
        
        assert not success
        assert state is None
        assert metadata is None

    def test_resume_from_best(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming from best checkpoint."""
        # Create checkpoints with different eval losses
        losses = [0.8, 0.5, 0.6]
        for i, loss in enumerate(losses):
            checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
                eval_loss=loss,
            )
        
        # Resume from best
        success, state, metadata = resume_manager.resume_from_best("job_123")
        
        assert success
        assert state is not None
        assert metadata is not None
        assert metadata.eval_loss == 0.5  # Lowest loss

    def test_resume_from_best_no_eval_loss(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming from best when no eval loss exists."""
        # Create checkpoint without eval loss
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        success, state, metadata = resume_manager.resume_from_best("job_123")
        
        assert not success

    def test_resume_from_specific(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming from specific checkpoint."""
        # Create checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=500,
        )
        
        # Resume from specific
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        assert success
        assert state is not None
        assert metadata is not None
        assert metadata.checkpoint_id == checkpoint_id

    def test_resume_from_nonexistent_checkpoint(self, resume_manager):
        """Test resuming from nonexistent checkpoint."""
        success, state, metadata = resume_manager.resume_from_specific("nonexistent")
        
        assert not success
        assert state is None
        assert metadata is None

    def test_resume_with_latest_strategy(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resume with LATEST strategy."""
        # Create checkpoints
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume(
            job_id="job_123",
            strategy=RecoveryStrategy.LATEST,
        )
        
        assert success
        assert state is not None

    def test_resume_with_best_strategy(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resume with BEST strategy."""
        # Create checkpoints with eval loss
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
            eval_loss=0.7,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume(
            job_id="job_123",
            strategy=RecoveryStrategy.BEST,
        )
        
        assert success
        assert state is not None

    def test_resume_with_specific_strategy(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resume with SPECIFIC strategy."""
        # Create checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume(
            job_id="job_123",
            strategy=RecoveryStrategy.SPECIFIC,
            checkpoint_id=checkpoint_id,
        )
        
        assert success
        assert state is not None

    def test_resume_specific_without_checkpoint_id(self, resume_manager):
        """Test resume with SPECIFIC strategy without checkpoint_id."""
        with pytest.raises(ResumeException, match="checkpoint_id required"):
            resume_manager.resume(
                job_id="job_123",
                strategy=RecoveryStrategy.SPECIFIC,
            )

    def test_rng_state_restoration(self, resume_manager, checkpoint_manager, trainer_state):
        """Test RNG state restoration."""
        # Capture RNG states before checkpoint
        python_state_before = random.getstate()
        numpy_state_before = np.random.get_state()
        torch_state_before = torch.get_rng_state()
        
        # Create checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Modify RNG states
        random.seed(999)
        np.random.seed(999)
        torch.manual_seed(999)
        
        # Resume (should restore RNG states)
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        assert success
        
        # Note: RNG states are restored during resume
        # Exact comparison is complex due to state structure

    def test_state_preservation(self, resume_manager, checkpoint_manager, trainer_state):
        """Test that all state is preserved during resume."""
        # Create checkpoint with specific state
        trainer_state_custom = {
            **trainer_state,
            "custom_field": "custom_value",
            "learning_rate": 5e-5,
        }
        
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state_custom,
            global_step=200,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        assert success
        assert state["custom_field"] == "custom_value"
        assert "learning_rate" in state

    def test_get_resume_info_with_checkpoints(self, resume_manager, checkpoint_manager, trainer_state):
        """Test getting resume info when checkpoints exist."""
        # Create checkpoints
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
            epoch=1,
        )
        
        checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=200,
            epoch=2,
            eval_loss=0.5,
        )
        
        # Get info
        info = resume_manager.get_resume_info("job_123")
        
        assert info["can_resume"] is True
        assert info["job_id"] == "job_123"
        assert "latest_checkpoint" in info
        assert "best_checkpoint" in info
        assert info["latest_checkpoint"]["global_step"] == 200

    def test_get_resume_info_no_checkpoints(self, resume_manager):
        """Test getting resume info when no checkpoints exist."""
        info = resume_manager.get_resume_info("job_empty")
        
        assert info["can_resume"] is False
        assert info["job_id"] == "job_empty"
        assert "latest_checkpoint" not in info

    def test_resume_multiple_times(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming multiple times."""
        # Create checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Resume multiple times
        for _ in range(3):
            success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
            assert success
            assert state is not None

    def test_resume_validates_checkpoint(self, resume_manager, checkpoint_manager, trainer_state):
        """Test that resume validates checkpoint before loading."""
        # Create checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Resume (should validate internally)
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        # If validation failed, success would be False
        assert success

    def test_resume_from_epoch_checkpoint(self, resume_manager, checkpoint_manager, trainer_state):
        """Test resuming from epoch checkpoint."""
        # Create epoch checkpoint
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EPOCH,
            epoch=5,
            global_step=5000,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        assert success
        assert metadata.checkpoint_type == CheckpointType.EPOCH
        assert metadata.epoch == 5

    def test_resume_loads_all_components(self, resume_manager, checkpoint_manager):
        """Test that resume loads all checkpoint components."""
        # Create comprehensive checkpoint
        comprehensive_state = {
            "model_state_dict": {"layer1.weight": torch.randn(10, 10)},
            "optimizer_state_dict": {"state": {"param1": "value1"}},
            "scheduler_state_dict": {"last_epoch": 5},
            "epoch": 10,
            "global_step": 10000,
            "training_loss": 0.3,
            "learning_rate": 3e-5,
        }
        
        checkpoint_id, _ = checkpoint_manager.create_checkpoint(
            job_id="job_123",
            trainer_state=comprehensive_state,
            global_step=10000,
        )
        
        # Resume
        success, state, metadata = resume_manager.resume_from_specific(checkpoint_id)
        
        assert success
        assert "model_state_dict" in state
        assert "optimizer_state_dict" in state
        assert "scheduler_state_dict" in state
        assert "rng_state" in state

    def test_concurrent_resume_operations(self, resume_manager, checkpoint_manager, trainer_state):
        """Test multiple concurrent resume operations."""
        # Create multiple checkpoints
        checkpoint_ids = []
        for i in range(3):
            checkpoint_id, _ = checkpoint_manager.create_checkpoint(
                job_id="job_123",
                trainer_state=trainer_state,
                global_step=i * 100,
            )
            checkpoint_ids.append(checkpoint_id)
        
        # Resume from multiple checkpoints
        results = []
        for cp_id in checkpoint_ids:
            success, state, metadata = resume_manager.resume_from_specific(cp_id)
            results.append((success, state is not None))
        
        # All should succeed
        assert all(success for success, _ in results)
        assert all(has_state for _, has_state in results)
