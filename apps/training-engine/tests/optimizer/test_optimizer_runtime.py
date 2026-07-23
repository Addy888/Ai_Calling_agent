"""Tests for optimizer runtime."""

import pytest

from app.optimizer.runtime import OptimizerRuntime
from app.optimizer.manager import OptimizerManager
from app.optimizer.exceptions import OptimizerException


class TestOptimizerRuntime:
    """Test optimizer runtime."""

    @pytest.fixture
    def runtime(self):
        """Create runtime instance."""
        return OptimizerRuntime()

    @pytest.fixture
    def optimizer_id(self, simple_model, optimizer_config):
        """Create optimizer and return ID."""
        manager = OptimizerManager()
        optimizer_id, _, _ = manager.create_optimizer(
            model=simple_model,
            config=optimizer_config,
            model_id="test_model",
        )
        return optimizer_id

    def test_get_current_lr(self, runtime, optimizer_id, optimizer_config):
        """Test getting current learning rate."""
        lr = runtime.get_current_lr(optimizer_id)

        assert lr == optimizer_config.learning_rate

    def test_update_lr(self, runtime, optimizer_id):
        """Test updating learning rate."""
        new_lr = 1e-4

        runtime.update_lr(optimizer_id, new_lr)

        current_lr = runtime.get_current_lr(optimizer_id)
        assert current_lr == new_lr

    def test_get_state(self, runtime, optimizer_id):
        """Test getting optimizer state."""
        state = runtime.get_state(optimizer_id)

        assert state is not None
        assert "optimizer_id" in state
        assert "optimizer_type" in state
        assert "current_lr" in state
        assert "parameter_groups" in state

    def test_set_runtime_state(self, runtime, optimizer_id):
        """Test setting runtime state."""
        runtime.set_runtime_state(optimizer_id, "test_key", "test_value")

        value = runtime.get_runtime_state(optimizer_id, "test_key")
        assert value == "test_value"

    def test_get_runtime_state(self, runtime, optimizer_id):
        """Test getting runtime state."""
        runtime.set_runtime_state(optimizer_id, "step", 100)

        state = runtime.get_runtime_state(optimizer_id)
        assert state is not None
        assert "step" in state
        assert state["step"] == 100

    def test_clear_runtime_state(self, runtime, optimizer_id):
        """Test clearing runtime state."""
        runtime.set_runtime_state(optimizer_id, "test_key", "test_value")

        runtime.clear_runtime_state(optimizer_id)

        state = runtime.get_runtime_state(optimizer_id)
        assert state == {}

    def test_get_stats(self, runtime, optimizer_id):
        """Test getting runtime statistics."""
        stats = runtime.get_stats()

        assert stats is not None
        assert "total_optimizers" in stats
        assert "active_schedulers" in stats
        assert stats["total_optimizers"] >= 1

    def test_step_optimizer(self, runtime, optimizer_id):
        """Test stepping optimizer."""
        runtime.step_optimizer(optimizer_id)

        # Check that step counter was incremented
        step = runtime.get_runtime_state(optimizer_id, "global_step")
        assert step == 1

        # Step again
        runtime.step_optimizer(optimizer_id)
        step = runtime.get_runtime_state(optimizer_id, "global_step")
        assert step == 2

    def test_zero_grad(self, runtime, optimizer_id):
        """Test zeroing gradients."""
        # Should not raise exception
        runtime.zero_grad(optimizer_id)

    def test_invalid_optimizer_raises_exception(self, runtime):
        """Test that invalid optimizer ID raises exception."""
        with pytest.raises(OptimizerException):
            runtime.get_current_lr("invalid_id")
