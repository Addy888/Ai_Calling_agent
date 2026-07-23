"""Test fixtures for optimizer tests."""

import pytest
import torch
import torch.nn as nn

from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class SimpleModel(nn.Module):
    """Simple model for testing."""

    def __init__(self):
        super().__init__()
        self.linear1 = nn.Linear(10, 20)
        self.linear2 = nn.Linear(20, 10)
        self.layer_norm = nn.LayerNorm(10)

    def forward(self, x):
        x = self.linear1(x)
        x = torch.relu(x)
        x = self.linear2(x)
        x = self.layer_norm(x)
        return x


@pytest.fixture
def simple_model():
    """Create a simple model for testing."""
    return SimpleModel()


@pytest.fixture
def optimizer_config():
    """Create default optimizer configuration."""
    return OptimizerConfig(
        optimizer_type=OptimizerType.ADAMW,
        learning_rate=5e-5,
        weight_decay=0.01,
    )


@pytest.fixture
def scheduler_config():
    """Create default scheduler configuration."""
    return SchedulerConfig(
        scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
        warmup_strategy=WarmupStrategy.RATIO,
        warmup_ratio=0.1,
        num_training_steps=1000,
    )


@pytest.fixture
def adamw_config():
    """Create AdamW optimizer configuration."""
    return OptimizerConfig(
        optimizer_type=OptimizerType.ADAMW,
        learning_rate=5e-5,
        weight_decay=0.01,
        adam_beta1=0.9,
        adam_beta2=0.999,
        adam_epsilon=1e-8,
    )


@pytest.fixture
def sgd_config():
    """Create SGD optimizer configuration."""
    return OptimizerConfig(
        optimizer_type=OptimizerType.SGD,
        learning_rate=0.01,
        weight_decay=0.01,
    )


@pytest.fixture
def cosine_scheduler_config():
    """Create cosine scheduler configuration."""
    return SchedulerConfig(
        scheduler_type=SchedulerType.COSINE,
        warmup_strategy=WarmupStrategy.RATIO,
        warmup_ratio=0.1,
        num_training_steps=1000,
    )
