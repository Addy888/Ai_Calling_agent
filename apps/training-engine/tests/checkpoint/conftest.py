"""Test fixtures for checkpoint tests."""

import pytest
import tempfile
from pathlib import Path

from app.checkpoint.schemas import CheckpointConfig, CheckpointType, RetentionPolicy


@pytest.fixture
def temp_checkpoint_dir():
    """Create temporary checkpoint directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def checkpoint_config(temp_checkpoint_dir):
    """Create checkpoint configuration."""
    return CheckpointConfig(
        save_dir=str(temp_checkpoint_dir),
        checkpoint_type=CheckpointType.AUTOMATIC,
        save_interval=100,
        keep_last_n=3,
        keep_best_n=2,
        validate_on_save=True,
    )


@pytest.fixture
def retention_policy():
    """Create retention policy."""
    return RetentionPolicy(
        keep_last_n=3,
        keep_best_n=2,
        keep_manual_checkpoints=True,
        keep_epoch_checkpoints=True,
    )


@pytest.fixture
def trainer_state():
    """Create sample trainer state."""
    return {
        "model_state_dict": {"layer1.weight": [1, 2, 3]},
        "optimizer_state_dict": {"state": {}},
        "scheduler_state_dict": {"last_epoch": 0},
        "epoch": 1,
        "global_step": 100,
        "training_loss": 0.5,
        "learning_rate": 5e-5,
    }
