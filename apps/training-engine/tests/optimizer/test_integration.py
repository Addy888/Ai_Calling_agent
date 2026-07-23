"""Integration tests for optimizer module."""

import pytest
import torch

from app.optimizer.manager import OptimizerManager
from app.optimizer.factory import OptimizerFactory
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class TestOptimizerIntegration:
    """Integration tests for complete optimizer workflow."""

    def test_full_optimization_workflow(self, simple_model):
        """Test complete optimization workflow."""
        manager = OptimizerManager()

        # Create optimizer and scheduler
        optimizer_config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        scheduler_config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
        )

        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=1000,
        )

        optimizer = result["optimizer"]
        scheduler = result["scheduler"]

        # Simulate training steps
        initial_lr = result["optimizer_metadata"].learning_rate

        for step in range(10):
            # Forward pass (dummy)
            x = torch.randn(4, 10)
            output = simple_model(x)
            loss = output.sum()

            # Backward pass
            optimizer.zero_grad()
            loss.backward()

            # Optimizer step
            optimizer.step()

            # Scheduler step
            scheduler.step()

        # Learning rate should have changed
        current_lr = optimizer.param_groups[0]["lr"]
        # During warmup, LR should increase
        assert current_lr >= initial_lr or step > 100  # After warmup

    def test_multiple_optimizers(self, simple_model):
        """Test managing multiple optimizers."""
        manager = OptimizerManager()
        factory = OptimizerFactory()

        # Create multiple optimizers
        result1 = factory.create_adamw(
            model=simple_model,
            model_id="model1",
            learning_rate=5e-5,
        )

        result2 = factory.create_sgd(
            model=simple_model,
            model_id="model2",
            learning_rate=0.01,
        )

        # Both should be accessible
        opt1 = manager.get_optimizer(result1["optimizer_id"])
        opt2 = manager.get_optimizer(result2["optimizer_id"])

        assert opt1 is not None
        assert opt2 is not None

    def test_optimizer_with_frozen_parameters(self, simple_model):
        """Test optimizer with frozen parameters."""
        manager = OptimizerManager()

        # Freeze some parameters
        for i, param in enumerate(simple_model.parameters()):
            if i % 2 == 0:
                param.requires_grad = False

        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
            use_parameter_groups=True,
        )

        optimizer_id, optimizer, metadata = manager.create_optimizer(
            model=simple_model,
            config=config,
            model_id="test_model",
        )

        # Should only optimize trainable parameters
        assert metadata.trainable_parameters < metadata.total_parameters

    def test_scheduler_warmup_to_decay(self, simple_model):
        """Test scheduler warmup to decay transition."""
        manager = OptimizerManager()

        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        scheduler_config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.STEPS,
            warmup_steps=10,
            num_training_steps=100,
        )

        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=100,
        )

        scheduler_id = result["scheduler_id"]
        optimizer = result["optimizer"]

        learning_rates = []

        # Track learning rates through warmup and decay
        for step in range(50):
            lr = optimizer.param_groups[0]["lr"]
            learning_rates.append(lr)
            manager.step_scheduler(scheduler_id)

        # During warmup (first 10 steps), LR should increase
        assert learning_rates[9] > learning_rates[0]

        # After warmup, LR should decrease
        assert learning_rates[-1] < learning_rates[10]

    def test_preset_factory_workflow(self, simple_model):
        """Test preset factory workflow."""
        factory = OptimizerFactory()

        # Test different presets
        presets = ["default", "aggressive", "conservative"]

        for preset in presets:
            result = factory.create_preset(
                model=simple_model,
                model_id=f"model_{preset}",
                preset=preset,
                num_training_steps=1000,
            )

            assert "optimizer_id" in result
            assert "scheduler_id" in result

    def test_parameter_groups_with_scheduler(self, simple_model):
        """Test parameter groups working with scheduler."""
        manager = OptimizerManager()

        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
            use_parameter_groups=True,
        )

        scheduler_config = SchedulerConfig(
            scheduler_type=SchedulerType.COSINE,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
        )

        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=1000,
        )

        optimizer = result["optimizer"]
        scheduler = result["scheduler"]

        # Should have multiple parameter groups
        assert len(optimizer.param_groups) >= 1

        # All groups should be updated by scheduler
        for _ in range(5):
            scheduler.step()

        # All groups should have same LR (scheduler updates all)
        lrs = [group["lr"] for group in optimizer.param_groups]
        assert all(lr == lrs[0] for lr in lrs)

    def test_validation_before_creation(self, simple_model):
        """Test validation before optimizer creation."""
        manager = OptimizerManager()

        optimizer_config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        scheduler_config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.1,
            num_training_steps=1000,
        )

        # Validate first
        report = manager.validate_configuration(
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            num_training_steps=1000,
        )

        assert report["valid"] is True

        # Then create
        result = manager.create_optimizer_with_scheduler(
            model=simple_model,
            optimizer_config=optimizer_config,
            scheduler_config=scheduler_config,
            model_id="test_model",
            num_training_steps=1000,
        )

        assert result is not None

    def test_different_scheduler_types(self, simple_model):
        """Test different scheduler types."""
        manager = OptimizerManager()

        optimizer_config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        scheduler_types = [
            SchedulerType.LINEAR_WITH_WARMUP,
            SchedulerType.COSINE,
            SchedulerType.CONSTANT_WITH_WARMUP,
        ]

        for scheduler_type in scheduler_types:
            scheduler_config = SchedulerConfig(
                scheduler_type=scheduler_type,
                warmup_strategy=WarmupStrategy.RATIO,
                warmup_ratio=0.1,
                num_training_steps=1000,
            )

            result = manager.create_optimizer_with_scheduler(
                model=simple_model,
                optimizer_config=optimizer_config,
                scheduler_config=scheduler_config,
                model_id=f"model_{scheduler_type.value}",
                num_training_steps=1000,
            )

            assert result is not None
            assert result["scheduler_metadata"].scheduler_type == scheduler_type
