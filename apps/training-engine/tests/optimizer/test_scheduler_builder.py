"""Tests for scheduler builder."""

import pytest
import torch.nn as nn
from torch.optim import AdamW

from app.optimizer.scheduler.builder import SchedulerBuilder
from app.optimizer.exceptions import ConfigurationException, SchedulerException
from app.optimizer.schemas import (
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class TestSchedulerBuilder:
    """Test scheduler builder."""

    @pytest.fixture
    def optimizer(self, simple_model):
        """Create optimizer for testing."""
        return AdamW(simple_model.parameters(), lr=5e-5)

    def test_build_linear_scheduler(self, optimizer):
        """Test building linear scheduler."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR,
            num_training_steps=1000,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_build_cosine_scheduler(self, optimizer):
        """Test building cosine scheduler."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.COSINE,
            num_training_steps=1000,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_build_linear_with_warmup(self, optimizer, scheduler_config):
        """Test building linear scheduler with warmup."""
        builder = SchedulerBuilder()

        scheduler = builder.build_scheduler(optimizer, scheduler_config)

        assert scheduler is not None

    def test_build_constant_scheduler(self, optimizer):
        """Test building constant scheduler."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.CONSTANT,
            num_training_steps=1000,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_build_constant_with_warmup(self, optimizer):
        """Test building constant scheduler with warmup."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.CONSTANT_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_build_polynomial_scheduler(self, optimizer):
        """Test building polynomial scheduler."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.POLYNOMIAL,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
            power=2.0,
            lr_end=0.0,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_build_cosine_with_restarts(self, optimizer):
        """Test building cosine scheduler with restarts."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.COSINE_WITH_RESTARTS,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
            num_cycles=2,
        )

        scheduler = builder.build_scheduler(optimizer, config)

        assert scheduler is not None

    def test_calculate_warmup_steps_ratio(self, optimizer):
        """Test calculating warmup steps with ratio strategy."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.2,
            num_training_steps=1000,
        )

        warmup_steps = builder._calculate_warmup_steps(config, 1000)

        assert warmup_steps == 200  # 20% of 1000

    def test_calculate_warmup_steps_steps(self, optimizer):
        """Test calculating warmup steps with steps strategy."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=150,
            num_training_steps=1000,
        )

        warmup_steps = builder._calculate_warmup_steps(config, 1000)

        assert warmup_steps == 150

    def test_calculate_warmup_steps_none(self, optimizer):
        """Test calculating warmup steps with none strategy."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.CONSTANT,
            warmup_strategy=WarmupStrategy.NONE,
            num_training_steps=1000,
        )

        warmup_steps = builder._calculate_warmup_steps(config, 1000)

        assert warmup_steps == 0

    def test_validate_valid_config(self, scheduler_config):
        """Test validating valid scheduler configuration."""
        builder = SchedulerBuilder()

        result = builder.validate_config(scheduler_config, num_training_steps=1000)

        assert result is True

    def test_validate_invalid_warmup_steps(self, optimizer):
        """Test validating invalid warmup steps."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=1500,  # Greater than total steps
            num_training_steps=1000,
        )

        with pytest.raises(ConfigurationException):
            builder.validate_config(config, num_training_steps=1000)

    def test_validate_missing_warmup_steps(self, optimizer):
        """Test validating missing warmup steps for STEPS strategy."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=None,  # Missing required warmup_steps
            num_training_steps=1000,
        )

        with pytest.raises(ConfigurationException):
            builder.validate_config(config, num_training_steps=1000)

    def test_validate_invalid_warmup_ratio(self, optimizer):
        """Test validating invalid warmup ratio."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=1.5,  # Invalid ratio
            num_training_steps=1000,
        )

        with pytest.raises(ConfigurationException):
            builder.validate_config(config, num_training_steps=1000)

    def test_get_scheduler_info(self, optimizer, scheduler_config):
        """Test getting scheduler information."""
        builder = SchedulerBuilder()
        scheduler = builder.build_scheduler(optimizer, scheduler_config)

        info = builder.get_scheduler_info(scheduler)

        assert info is not None
        assert "type" in info
        assert "last_epoch" in info

    def test_build_without_training_steps_raises_exception(self, optimizer):
        """Test that building without training steps raises exception."""
        builder = SchedulerBuilder()
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=None,  # Missing
        )

        with pytest.raises(SchedulerException):
            builder.build_scheduler(optimizer, config, num_training_steps=None)
