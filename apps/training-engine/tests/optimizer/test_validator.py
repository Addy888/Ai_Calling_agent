"""Tests for optimizer validator."""

import pytest

from app.optimizer.validator import OptimizerValidator
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class TestOptimizerValidator:
    """Test optimizer validator."""

    @pytest.fixture
    def validator(self):
        """Create validator instance."""
        return OptimizerValidator()

    def test_validate_valid_optimizer_config(self, validator, optimizer_config):
        """Test validating valid optimizer configuration."""
        report = validator.validate_optimizer_config(optimizer_config)

        assert report["valid"] is True
        assert len(report["issues"]) == 0

    def test_validate_invalid_learning_rate(self, validator):
        """Test validating invalid learning rate."""
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=-0.01,
            weight_decay=0.01,
        )

        report = validator.validate_optimizer_config(config)

        assert report["valid"] is False
        assert len(report["issues"]) > 0

    def test_validate_high_learning_rate_warning(self, validator):
        """Test warning for high learning rate."""
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=0.5,  # High but valid
            weight_decay=0.01,
        )

        report = validator.validate_optimizer_config(config)

        assert report["valid"] is True
        assert len(report["warnings"]) > 0

    def test_validate_invalid_weight_decay(self, validator):
        """Test validating invalid weight decay."""
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=-0.1,  # Invalid
        )

        report = validator.validate_optimizer_config(config)

        assert report["valid"] is False

    def test_validate_invalid_adam_beta(self, validator):
        """Test validating invalid Adam beta."""
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
            adam_beta1=1.5,  # Invalid
        )

        report = validator.validate_optimizer_config(config)

        assert report["valid"] is False

    def test_validate_valid_scheduler_config(self, validator, scheduler_config):
        """Test validating valid scheduler configuration."""
        report = validator.validate_scheduler_config(scheduler_config, num_training_steps=1000)

        assert report["valid"] is True
        assert len(report["issues"]) == 0

    def test_validate_invalid_warmup_steps(self, validator):
        """Test validating invalid warmup steps."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=1500,  # Greater than total steps
            num_training_steps=1000,
        )

        report = validator.validate_scheduler_config(config, num_training_steps=1000)

        assert report["valid"] is False

    def test_validate_missing_warmup_steps(self, validator):
        """Test validating missing warmup steps."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=None,  # Missing
            num_training_steps=1000,
        )

        report = validator.validate_scheduler_config(config, num_training_steps=1000)

        assert report["valid"] is False

    def test_validate_invalid_warmup_ratio(self, validator):
        """Test validating invalid warmup ratio."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=1.5,  # Invalid
            num_training_steps=1000,
        )

        report = validator.validate_scheduler_config(config, num_training_steps=1000)

        assert report["valid"] is False

    def test_validate_high_warmup_ratio_warning(self, validator):
        """Test warning for high warmup ratio."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.7,  # High but valid
            num_training_steps=1000,
        )

        report = validator.validate_scheduler_config(config, num_training_steps=1000)

        assert report["valid"] is True
        assert len(report["warnings"]) > 0

    def test_validate_combined_config(self, validator, optimizer_config, scheduler_config):
        """Test validating combined configuration."""
        report = validator.validate_combined_config(
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            num_training_steps=1000,
        )

        assert report["valid"] is True
        assert report["optimizer_valid"] is True
        assert report["scheduler_valid"] is True

    def test_validate_combined_with_invalid_optimizer(self, validator, scheduler_config):
        """Test validating combined config with invalid optimizer."""
        invalid_optimizer = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=-0.01,  # Invalid
            weight_decay=0.01,
        )

        report = validator.validate_combined_config(
            optimizer_config=invalid_optimizer,
            scheduler_config=scheduler_config,
            num_training_steps=1000,
        )

        assert report["valid"] is False
        assert report["optimizer_valid"] is False
        assert report["scheduler_valid"] is True

    def test_validate_combined_with_invalid_scheduler(self, validator, optimizer_config):
        """Test validating combined config with invalid scheduler."""
        invalid_scheduler = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=2.0,  # Invalid
            num_training_steps=1000,
        )

        report = validator.validate_combined_config(
            optimizer_config=optimizer_config,
            scheduler_config=invalid_scheduler,
            num_training_steps=1000,
        )

        assert report["valid"] is False
        assert report["optimizer_valid"] is True
        assert report["scheduler_valid"] is False

    def test_validate_polynomial_scheduler(self, validator):
        """Test validating polynomial scheduler config."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.POLYNOMIAL,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
            power=-1.0,  # Invalid
        )

        report = validator.validate_scheduler_config(config, num_training_steps=1000)

        assert report["valid"] is False
