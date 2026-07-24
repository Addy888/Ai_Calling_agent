"""Integration tests for checkpoint system."""

import pytest
import torch

from app.checkpoint.checkpoint_manager import CheckpointManager
from app.checkpoint.resume_manager import ResumeManager
from app.checkpoint.recovery_manager import RecoveryManager
from app.checkpoint.cleanup_manager import CleanupManager
from app.checkpoint.checkpoint_storage import CheckpointStorage
from app.checkpoint.checkpoint_registry import CheckpointRegistry
from app.checkpoint.checkpoint_validator import CheckpointValidator
from app.checkpoint.factory import CheckpointFactory
from app.checkpoint.schemas import CheckpointType, RecoveryStrategy, RetentionPolicy


class TestCheckpointIntegration:
    """Integration tests for complete checkpoint workflow."""

    @pytest.fixture
    def factory(self, temp_checkpoint_dir):
        """Create checkpoint factory."""
        return CheckpointFactory(
            base_dir=str(temp_checkpoint_dir),
            registry_path=temp_checkpoint_dir / "registry.json",
        )

    def test_complete_checkpoint_workflow(self, factory, trainer_state):
        """Test complete checkpoint creation and resume workflow."""
        # Create checkpoint
        checkpoint_id, metadata = factory.create_checkpoint(
            job_id="job_123",
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            global_step=1000,
        )
        
        assert checkpoint_id is not None
        
        # Resume from checkpoint
        success, state, resume_metadata = factory.resume(
            job_id="job_123",
            strategy=RecoveryStrategy.LATEST,
        )
        
        assert success
        assert state is not None
        assert resume_metadata.checkpoint_id == checkpoint_id

    def test_training_loop_simulation(self, factory, trainer_state):
        """Test simulated training loop with periodic checkpoints."""
        job_id = "training_job_001"
        
        # Simulate training with checkpoints every 100 steps
        for step in range(0, 500, 100):
            checkpoint_id, metadata = factory.create_checkpoint(
                job_id=job_id,
                trainer_state={
                    **trainer_state,
                    "global_step": step,
                },
                checkpoint_type=CheckpointType.AUTOMATIC,
                global_step=step,
            )
            
            assert checkpoint_id is not None
        
        # Verify all checkpoints exist
        checkpoints = factory.list_checkpoints(job_id)
        assert len(checkpoints) == 5
        
        # Get latest
        latest = factory.get_latest_checkpoint(job_id)
        assert latest is not None
        assert latest.global_step == 400

    def test_crash_recovery_simulation(self, factory, trainer_state):
        """Test crash and recovery simulation."""
        job_id = "crash_test_job"
        
        # Create checkpoints simulating training
        for i in range(3):
            factory.create_checkpoint(
                job_id=job_id,
                trainer_state=trainer_state,
                global_step=i * 1000,
            )
        
        # Simulate crash and recovery
        recovery = RecoveryManager(
            checkpoint_manager=factory.checkpoint_manager,
            resume_manager=factory.resume_manager,
        )
        
        success, state, metadata = recovery.attempt_recovery(
            job_id=job_id,
            auto_strategy=RecoveryStrategy.LATEST,
        )
        
        assert success
        assert state is not None
        assert metadata.global_step == 2000  # Latest checkpoint

    def test_checkpoint_rotation_workflow(self, factory, trainer_state):
        """Test checkpoint rotation with retention policy."""
        job_id = "rotation_job"
        
        # Create many checkpoints
        for i in range(10):
            factory.create_checkpoint(
                job_id=job_id,
                trainer_state=trainer_state,
                global_step=i * 100,
            )
        
        # Apply retention policy
        cleanup = CleanupManager(checkpoint_manager=factory.checkpoint_manager)
        policy = RetentionPolicy(keep_last_n=3, keep_best_n=0)
        
        deleted_count = cleanup.apply_retention_policy(
            job_id=job_id,
            policy=policy,
        )
        
        assert deleted_count == 7
        
        # Verify only 3 remain
        remaining = factory.list_checkpoints(job_id)
        assert len(remaining) == 3

    def test_best_model_tracking(self, factory, trainer_state):
        """Test tracking and resuming from best model."""
        job_id = "best_model_job"
        
        # Create checkpoints with varying performance
        losses = [0.8, 0.5, 0.6, 0.9, 0.4, 0.7]
        
        for i, loss in enumerate(losses):
            factory.create_checkpoint(
                job_id=job_id,
                trainer_state=trainer_state,
                checkpoint_type=CheckpointType.AUTOMATIC,
                global_step=i * 100,
                eval_loss=loss,
            )
        
        # Get best checkpoint
        best = factory.get_best_checkpoint(job_id)
        assert best is not None
        assert best.metadata.get("eval_loss") == 0.4
        
        # Resume from best
        success, state, metadata = factory.resume(
            job_id=job_id,
            strategy=RecoveryStrategy.BEST,
        )
        
        assert success
        assert metadata.eval_loss == 0.4

    def test_multi_job_isolation(self, factory, trainer_state):
        """Test that multiple jobs are properly isolated."""
        jobs = ["job_001", "job_002", "job_003"]
        
        # Create checkpoints for each job
        for job_id in jobs:
            for i in range(3):
                factory.create_checkpoint(
                    job_id=job_id,
                    trainer_state=trainer_state,
                    global_step=i * 100,
                )
        
        # Verify each job has exactly 3 checkpoints
        for job_id in jobs:
            checkpoints = factory.list_checkpoints(job_id)
            assert len(checkpoints) == 3
        
        # Delete checkpoints for one job
        job1_checkpoints = factory.list_checkpoints("job_001")
        for cp in job1_checkpoints:
            factory.delete_checkpoint(cp.checkpoint_id)
        
        # Verify other jobs unaffected
        assert len(factory.list_checkpoints("job_002")) == 3
        assert len(factory.list_checkpoints("job_003")) == 3
        assert len(factory.list_checkpoints("job_001")) == 0

    def test_checkpoint_validation_in_workflow(self, factory, trainer_state):
        """Test that validation is integrated into workflow."""
        # Create checkpoint
        checkpoint_id, metadata = factory.create_checkpoint(
            job_id="validation_job",
            trainer_state=trainer_state,
            global_step=1000,
        )
        
        # Checkpoint should be validated
        checkpoint = factory.checkpoint_manager.get_checkpoint(checkpoint_id)
        assert checkpoint.status.value in ["completed", "validated"]
        assert checkpoint.hash is not None

    def test_state_consistency_across_save_load(self, factory):
        """Test that state is consistent across save and load."""
        # Create specific state
        original_state = {
            "model_state_dict": {
                "layer1.weight": torch.randn(10, 10),
                "layer2.bias": torch.randn(10),
            },
            "optimizer_state_dict": {
                "state": {"param1": "value1"},
                "param_groups": [{"lr": 5e-5}],
            },
            "scheduler_state_dict": {"last_epoch": 10},
            "epoch": 5,
            "global_step": 5000,
            "training_loss": 0.35,
            "learning_rate": 3e-5,
        }
        
        # Save
        checkpoint_id, _ = factory.create_checkpoint(
            job_id="consistency_job",
            trainer_state=original_state,
            global_step=5000,
        )
        
        # Load
        success, loaded_state, _ = factory.resume_from_specific(checkpoint_id)
        
        assert success
        
        # Verify key fields
        assert loaded_state["epoch"] == 5
        assert loaded_state["global_step"] == 5000
        assert loaded_state["training_loss"] == 0.35
        assert "optimizer_state_dict" in loaded_state
        assert "scheduler_state_dict" in loaded_state

    def test_epoch_based_checkpointing(self, factory, trainer_state):
        """Test epoch-based checkpoint workflow."""
        job_id = "epoch_job"
        
        # Create epoch checkpoints
        for epoch in range(1, 6):
            factory.create_checkpoint(
                job_id=job_id,
                trainer_state=trainer_state,
                checkpoint_type=CheckpointType.EPOCH,
                epoch=epoch,
                global_step=epoch * 1000,
            )
        
        # Verify epoch checkpoints
        checkpoints = factory.list_checkpoints(job_id)
        epoch_checkpoints = [
            cp for cp in checkpoints
            if cp.checkpoint_type == CheckpointType.EPOCH
        ]
        
        assert len(epoch_checkpoints) == 5

    def test_emergency_checkpoint_workflow(self, factory, trainer_state):
        """Test emergency checkpoint creation and recovery."""
        job_id = "emergency_job"
        
        # Create normal checkpoints
        factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.AUTOMATIC,
            global_step=1000,
        )
        
        # Create emergency checkpoint (simulating crash scenario)
        emergency_id, emergency_metadata = factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EMERGENCY,
            global_step=1500,
        )
        
        assert emergency_metadata.checkpoint_type == CheckpointType.EMERGENCY
        
        # Should be able to resume from emergency checkpoint
        success, state, metadata = factory.resume_from_specific(emergency_id)
        assert success

    def test_selective_cleanup_preserves_important_checkpoints(self, factory, trainer_state):
        """Test that cleanup preserves important checkpoint types."""
        job_id = "selective_cleanup_job"
        
        # Create mix of checkpoint types
        factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.AUTOMATIC,
            global_step=100,
        )
        
        manual_id, _ = factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.MANUAL,
            global_step=200,
        )
        
        factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.AUTOMATIC,
            global_step=300,
        )
        
        epoch_id, _ = factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            checkpoint_type=CheckpointType.EPOCH,
            epoch=1,
            global_step=400,
        )
        
        # Cleanup with preservation
        cleanup = CleanupManager(checkpoint_manager=factory.checkpoint_manager)
        policy = RetentionPolicy(
            keep_last_n=1,
            keep_best_n=0,
            keep_manual_checkpoints=True,
            keep_epoch_checkpoints=True,
        )
        
        cleanup.apply_retention_policy(job_id=job_id, policy=policy)
        
        # Manual and epoch should be preserved
        remaining = factory.list_checkpoints(job_id)
        remaining_ids = [cp.checkpoint_id for cp in remaining]
        
        assert manual_id in remaining_ids
        assert epoch_id in remaining_ids

    def test_concurrent_checkpoint_operations(self, factory, trainer_state):
        """Test multiple checkpoint operations in sequence."""
        job_id = "concurrent_job"
        
        # Create
        cp1_id, _ = factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            global_step=100,
        )
        
        # Resume
        success, _, _ = factory.resume_from_specific(cp1_id)
        assert success
        
        # Create another
        cp2_id, _ = factory.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer_state,
            global_step=200,
        )
        
        # List
        checkpoints = factory.list_checkpoints(job_id)
        assert len(checkpoints) == 2
        
        # Delete one
        factory.delete_checkpoint(cp1_id)
        
        # Verify
        checkpoints = factory.list_checkpoints(job_id)
        assert len(checkpoints) == 1
        assert checkpoints[0].checkpoint_id == cp2_id

    def test_large_state_handling(self, factory):
        """Test handling of large state dictionaries."""
        # Create large state
        large_state = {
            "model_state_dict": {
                f"layer{i}.weight": torch.randn(100, 100)
                for i in range(20)
            },
            "optimizer_state_dict": {"state": {}},
            "global_step": 1000,
        }
        
        # Save
        checkpoint_id, metadata = factory.create_checkpoint(
            job_id="large_state_job",
            trainer_state=large_state,
            global_step=1000,
        )
        
        assert metadata.file_size_mb > 0
        
        # Load
        success, loaded_state, _ = factory.resume_from_specific(checkpoint_id)
        
        assert success
        assert len(loaded_state["model_state_dict"]) == 20

    def test_checkpoint_metadata_persistence(self, factory, trainer_state):
        """Test that metadata persists across operations."""
        custom_metadata = {
            "experiment_name": "test_exp",
            "hyperparams": {"lr": 5e-5, "batch_size": 32},
            "notes": "Important checkpoint",
        }
        
        # Create with metadata
        checkpoint_id, _ = factory.create_checkpoint(
            job_id="metadata_job",
            trainer_state=trainer_state,
            global_step=1000,
            tags=["important", "milestone"],
            metadata=custom_metadata,
        )
        
        # Retrieve and verify
        checkpoint = factory.checkpoint_manager.get_checkpoint(checkpoint_id)
        
        assert "hyperparams" in checkpoint.metadata
        assert checkpoint.metadata["experiment_name"] == "test_exp"
        
        # Resume and verify metadata is accessible
        success, state, resume_metadata = factory.resume_from_specific(checkpoint_id)
        
        assert success
        assert "experiment_name" in resume_metadata.metadata
