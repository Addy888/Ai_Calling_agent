"""Tests for optimizer factory."""

import pytest

from app.optimizer.factory import OptimizerFactory
from app.optimizer.schemas import OptimizerType


class TestOptimizerFactory:
    """Test optimizer factory."""

    @pytest.fixture
    def factory(self):
        """Create factory instance."""
        return OptimizerFactory()

    def test_create_adamw(self, factory, simple_model):
        """Test creating AdamW optimizer."""
        result = factory.create_adamw(
            model=simple_model,
            model_id="test_model",
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        assert "optimizer_id" in result
        assert "optimizer" in result
        assert "optimizer_metadata" in result
        assert result["optimizer_metadata"].optimizer_type == OptimizerType.ADAMW

    def test_create_adamw_with_scheduler(self, factory, simple_model):
        """Test creating AdamW with scheduler."""
        result = factory.create_adamw(
            model=simple_model,
            model_id="test_model",
            learning_rate=5e-5,
            weight_decay=0.01,
            with_scheduler=True,
            num_training_steps=1000,
        )

        assert "optimizer_id" in result
        assert "optimizer" in result
        assert "scheduler_id" in result
        assert "scheduler" in result

    def test_create_sgd(self, factory, simple_model):
        """Test creating SGD optimizer."""
        result = factory.create_sgd(
            model=simple_model,
            model_id="test_model",
            learning_rate=0.01,
            weight_decay=0.01,
        )

        assert "optimizer_id" in result
        assert "optimizer" in result
        assert result["optimizer_metadata"].optimizer_type == OptimizerType.SGD

    def test_create_adafactor(self, factory, simple_model):
        """Test creating Adafactor optimizer."""
        result = factory.create_adafactor(
            model=simple_model,
            model_id="test_model",
            learning_rate=1e-3,
            weight_decay=0.01,
        )

        assert "optimizer_id" in result
        assert "optimizer" in result
        assert result["optimizer_metadata"].optimizer_type == OptimizerType.ADAFACTOR

    def test_create_with_cosine_schedule(self, factory, simple_model):
        """Test creating optimizer with cosine schedule."""
        result = factory.create_with_cosine_schedule(
            model=simple_model,
            model_id="test_model",
            learning_rate=5e-5,
            num_training_steps=1000,
            warmup_ratio=0.1,
        )

        assert "optimizer_id" in result
        assert "scheduler_id" in result
        assert "optimizer" in result
        assert "scheduler" in result

    def test_create_preset_default(self, factory, simple_model):
        """Test creating with default preset."""
        result = factory.create_preset(
            model=simple_model,
            model_id="test_model",
            preset="default",
        )

        assert "optimizer_id" in result
        assert "optimizer" in result

    def test_create_preset_aggressive(self, factory, simple_model):
        """Test creating with aggressive preset."""
        result = factory.create_preset(
            model=simple_model,
            model_id="test_model",
            preset="aggressive",
        )

        assert "optimizer_id" in result
        # Aggressive preset should have higher learning rate
        assert result["optimizer_metadata"].learning_rate == 1e-4

    def test_create_preset_conservative(self, factory, simple_model):
        """Test creating with conservative preset."""
        result = factory.create_preset(
            model=simple_model,
            model_id="test_model",
            preset="conservative",
        )

        assert "optimizer_id" in result
        # Conservative preset should have lower learning rate
        assert result["optimizer_metadata"].learning_rate == 1e-5

    def test_create_preset_with_scheduler(self, factory, simple_model):
        """Test creating preset with scheduler."""
        result = factory.create_preset(
            model=simple_model,
            model_id="test_model",
            preset="default",
            num_training_steps=1000,
        )

        assert "optimizer_id" in result
        assert "scheduler_id" in result

    def test_create_preset_invalid_raises_exception(self, factory, simple_model):
        """Test that invalid preset raises exception."""
        from app.optimizer.exceptions import OptimizerException

        with pytest.raises(OptimizerException):
            factory.create_preset(
                model=simple_model,
                model_id="test_model",
                preset="invalid_preset",
            )
