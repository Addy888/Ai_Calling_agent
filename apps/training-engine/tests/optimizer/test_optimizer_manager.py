"""Tests for optimizer manager."""

import pytest

from app.optimizer.manager import OptimizerManager
from app.optimizer.exceptions import OptimizerException
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class TestOptimizerManager:
    """Test optimizer manager."""

    def test_create_optimizer(self, simple_model, optimizer_config):
        """Test creating optimizer."""
        manager = OptimizerManager()

        optimizer_id, optimizer, metadata = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )

        assert optimizer_id is not None
        assert optimizer is not None
        assert metadata is not None
        assert metadata.optimizer_type == OptimizerType.ADAMW
        assert metadata.learning_rate == optimizer_config.learning_rate

    def test_create_scheduler(self, simple_model, optimizer_config, scheduler_config):
        """Test creating scheduler."""
        manager = OptimizerManager()

        # First create optimizer
        optimizer_id, _, _ = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )

        # Then create scheduler
        scheduler_id, scheduler, metadata = manager.create_scheduler(
            optimizer_id=optimizer_id,
            config=scheduler_config,
            num_training_steps=1000,
        )

        assert scheduler_id is not None
        assert scheduler is not None
        assert metadata is not None
        assert metadata.scheduler_type == SchedulerType.LINEAR_WITH_WARMUP

    def test_create_optimizer_with_scheduler(
        self, simple_model, optimizer_config, scheduler_config
    ):
        """Test creating optimizer and scheduler together."""
        manager = OptimizerManager()

        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=1000,
        )

        assert "optimizer_id" in result
        assert "optimizer" in result
        assert "optimizer_metadata" in result
        assert "scheduler_id" in result
        assert "scheduler" in result
        assert "scheduler_metadata" in result

    def test_get_optimizer(self, simple_model, optimizer_config):
        """Test getting optimizer by ID."""
        manager = OptimizerManager()

        optimizer_id, _, _ = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )

        optimizer = manager.get_optimizer(optimizer_id)

        assert optimizer is not None

    def test_get_optimizer_metadata(self, simple_model, optimizer_config):
        """Test getting optimizer metadata."""
        manager = OptimizerManager()

        optimizer_id, _, metadata = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )

        retrieved_metadata = manager.get_optimizer_metadata(optimizer_id)

        assert retrieved_metadata.optimizer_id == metadata.optimizer_id
        assert retrieved_metadata.optimizer_type == metadata.optimizer_type

    def test_get_current_lr(self, simple_model, optimizer_config):
        """Test getting current learning rate."""
        manager = OptimizerManager()

        optimizer_id, _, _ = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )

        lr = manager.get_current_lr(optimizer_id)

        assert lr == optimizer_config.learning_rate

    def test_step_scheduler(self, simple_model, optimizer_config, scheduler_config):
        """Test stepping scheduler."""
        manager = OptimizerManager()

        # Create optimizer and scheduler
        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=1000,
        )

        scheduler_id = result["scheduler_id"]

        # Step scheduler
        lr = manager.step_scheduler(scheduler_id)

        assert lr is not None
        assert isinstance(lr, float)

    def test_validate_configuration(self, optimizer_config):
        """Test validating configuration."""
        manager = OptimizerManager()

        report = manager.validate_configuration(
            optimizer_config=optimizer_config,
            scheduler_config=None,
        )

        assert report["valid"] is True
        assert report["optimizer_valid"] is True

    def test_validate_combined_configuration(
        self, optimizer_config, scheduler_config
    ):
        """Test validating combined configuration."""
        manager = OptimizerManager()

        report = manager.validate_configuration(
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            num_training_steps=1000,
        )

        assert report["valid"] is True
        assert report["optimizer_valid"] is True
        assert report["scheduler_valid"] is True

    def test_create_optimizer_with_invalid_config(self, simple_model):
        """Test creating optimizer with invalid config."""
        manager = OptimizerManager()

        invalid_config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=-0.01,  # Invalid
            weight_decay=0.01,
        )

        with pytest.raises(OptimizerException):
            manager.create_optimizer(
                model=simple_model,
                config=invalid_config,
                model_id="test_model",
            )
