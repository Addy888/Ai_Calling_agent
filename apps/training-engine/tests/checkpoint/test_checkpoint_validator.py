"""Tests for checkpoint validator."""

import pytest
import torch
from pathlib import Path

from app.checkpoint.checkpoint_validator import CheckpointValidator
from app.checkpoint.checkpoint_storage import CheckpointStorage


class TestCheckpointValidator:
    """Test checkpoint validation."""

    @pytest.fixture
    def validator(self):
        """Create validator instance."""
        return CheckpointValidator()

    @pytest.fixture
    def storage(self, temp_checkpoint_dir):
        """Create storage instance."""
        return CheckpointStorage(base_dir=str(temp_checkpoint_dir))

    def test_validate_existing_checkpoint(self, validator, storage, trainer_state):
        """Test validation of existing checkpoint."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_001",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Validate
        is_valid, errors = validator.validate_checkpoint(checkpoint_path)
        
        assert is_valid
        assert len(errors) == 0

    def test_validate_nonexistent_checkpoint(self, validator, temp_checkpoint_dir):
        """Test validation of nonexistent checkpoint."""
        nonexistent_path = temp_checkpoint_dir / "nonexistent.pt"
        
        is_valid, errors = validator.validate_checkpoint(nonexistent_path)
        
        assert not is_valid
        assert len(errors) > 0
        assert any("does not exist" in error.lower() for error in errors)

    def test_validate_empty_file(self, validator, temp_checkpoint_dir):
        """Test validation of empty checkpoint file."""
        # Create empty file
        empty_path = temp_checkpoint_dir / "empty.pt"
        empty_path.touch()
        
        is_valid, errors = validator.validate_checkpoint(empty_path)
        
        assert not is_valid
        assert len(errors) > 0

    def test_validate_corrupted_file(self, validator, temp_checkpoint_dir):
        """Test validation of corrupted checkpoint file."""
        # Create corrupted file
        corrupted_path = temp_checkpoint_dir / "corrupted.pt"
        with open(corrupted_path, "wb") as f:
            f.write(b"corrupted data that is not a valid torch checkpoint")
        
        is_valid, errors = validator.validate_checkpoint(corrupted_path)
        
        assert not is_valid
        assert len(errors) > 0

    def test_validate_checkpoint_structure(self, validator, storage, temp_checkpoint_dir):
        """Test validation of checkpoint structure."""
        # Save checkpoint with proper structure
        checkpoint_data = {
            "checkpoint_metadata": {
                "checkpoint_id": "test_001",
                "job_id": "job_123",
            },
            "model_state_dict": {"layer1.weight": torch.randn(10, 10)},
            "optimizer_state_dict": {"state": {}},
        }
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_002",
            state_dict=checkpoint_data,
            job_id="job_123",
        )
        
        is_valid, errors = validator.validate_checkpoint(checkpoint_path)
        
        assert is_valid
        assert len(errors) == 0

    def test_verify_hash(self, validator, storage, trainer_state):
        """Test hash verification."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_003",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Compute hash
        expected_hash = storage.compute_checksum(checkpoint_path)
        
        # Verify hash
        is_valid = validator.verify_hash(checkpoint_path, expected_hash)
        
        assert is_valid

    def test_verify_hash_mismatch(self, validator, storage, trainer_state):
        """Test hash verification with mismatch."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_004",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Use wrong hash
        wrong_hash = "0" * 64
        
        # Verify hash
        is_valid = validator.verify_hash(checkpoint_path, wrong_hash)
        
        assert not is_valid

    def test_quick_validate(self, validator, storage, trainer_state):
        """Test quick validation."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_005",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Quick validate (only file existence and size)
        is_valid, errors = validator.quick_validate(checkpoint_path)
        
        assert is_valid
        assert len(errors) == 0

    def test_quick_validate_nonexistent(self, validator, temp_checkpoint_dir):
        """Test quick validation of nonexistent file."""
        nonexistent_path = temp_checkpoint_dir / "nonexistent.pt"
        
        is_valid, errors = validator.quick_validate(nonexistent_path)
        
        assert not is_valid
        assert len(errors) > 0

    def test_validate_checkpoint_contents(self, validator, storage):
        """Test validation of checkpoint contents."""
        # Save checkpoint with specific contents
        checkpoint_data = {
            "checkpoint_metadata": {"checkpoint_id": "test_001"},
            "model_state_dict": {"layer1.weight": torch.randn(10, 10)},
            "optimizer_state_dict": {"state": {}},
            "scheduler_state_dict": {"last_epoch": 0},
            "rng_state": {"python": (3, tuple(), None)},
        }
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_006",
            state_dict=checkpoint_data,
            job_id="job_123",
        )
        
        # Validate
        is_valid, errors = validator.validate_checkpoint(checkpoint_path)
        
        assert is_valid

    def test_validate_minimal_checkpoint(self, validator, storage):
        """Test validation of checkpoint with minimal required fields."""
        # Save minimal checkpoint
        checkpoint_data = {
            "checkpoint_metadata": {
                "checkpoint_id": "test_001",
                "job_id": "job_123",
            },
        }
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_007",
            state_dict=checkpoint_data,
            job_id="job_123",
        )
        
        # Validate
        is_valid, errors = validator.validate_checkpoint(checkpoint_path)
        
        # Should be valid even with minimal fields
        assert is_valid

    def test_get_checkpoint_info(self, validator, storage, trainer_state):
        """Test getting checkpoint information."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_008",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Get info
        info = validator.get_checkpoint_info(checkpoint_path)
        
        assert info is not None
        assert "size_bytes" in info
        assert "exists" in info
        assert info["exists"] is True

    def test_get_checkpoint_info_nonexistent(self, validator, temp_checkpoint_dir):
        """Test getting info for nonexistent checkpoint."""
        nonexistent_path = temp_checkpoint_dir / "nonexistent.pt"
        
        info = validator.get_checkpoint_info(nonexistent_path)
        
        assert info is not None
        assert info["exists"] is False
        assert info["size_bytes"] == 0

    def test_validate_multiple_checkpoints(self, validator, storage, trainer_state):
        """Test validation of multiple checkpoints."""
        checkpoint_paths = []
        
        # Save multiple checkpoints
        for i in range(3):
            checkpoint_path = storage.save_checkpoint(
                checkpoint_id=f"test_checkpoint_{i:03d}",
                state_dict=trainer_state,
                job_id="job_123",
            )
            checkpoint_paths.append(checkpoint_path)
        
        # Validate all
        for checkpoint_path in checkpoint_paths:
            is_valid, errors = validator.validate_checkpoint(checkpoint_path)
            assert is_valid
            assert len(errors) == 0

    def test_validation_with_large_state_dict(self, validator, storage):
        """Test validation with large state dict."""
        # Create large state dict
        large_state = {
            "checkpoint_metadata": {"checkpoint_id": "test_001"},
            "model_state_dict": {
                f"layer{i}.weight": torch.randn(100, 100)
                for i in range(10)
            },
        }
        
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_large",
            state_dict=large_state,
            job_id="job_123",
        )
        
        # Validate
        is_valid, errors = validator.validate_checkpoint(checkpoint_path)
        
        assert is_valid
        assert len(errors) == 0

    def test_validate_after_modification(self, validator, storage, trainer_state):
        """Test validation detects file modification."""
        # Save checkpoint
        checkpoint_path = storage.save_checkpoint(
            checkpoint_id="test_checkpoint_009",
            state_dict=trainer_state,
            job_id="job_123",
        )
        
        # Compute original hash
        original_hash = storage.compute_checksum(checkpoint_path)
        
        # Modify file
        with open(checkpoint_path, "ab") as f:
            f.write(b"modified")
        
        # Verify hash fails
        is_valid = validator.verify_hash(checkpoint_path, original_hash)
        assert not is_valid
