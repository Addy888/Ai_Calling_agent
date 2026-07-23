"""Tests for scheduler manager."""

import pytest
from torch.optim import AdamW

from app.optimizer.scheduler.manager import SchedulerManager
from app.optimizer.exceptions import SchedulerNotFoundError
from app.optimizer.schemas import SchedulerConfig, SchedulerType, WarmupStrategy


class TestSchedulerManager:
    """Test scheduler manager."""

    @pytest.fixture
    def manager(self):
        """Create manager instance."""
        return SchedulerManager()

    @pytest.fixture
    def optimizer(self, simple_model):
        """Create optimizer for testing."""
        return AdamW(simple_model.parameters(), lr=5e-5)

    def test_create_scheduler(self, manager, optimizer, scheduler_config):
        """Test creating scheduler."""
        scheduler_id, metadata = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        assert scheduler_id is not None
        assert metadata is not None
        assert metadata.scheduler_type == SchedulerType.LINEAR_WITH_WARMUP

    def test_get_scheduler(self, manager, optimizer, scheduler_config):
        """Test getting scheduler."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        scheduler = manager.get_scheduler(scheduler_id)

        assert scheduler is not None

    def test_get_scheduler_not_found(self, manager):
        """Test getting non-existent scheduler."""
        with pytest.raises(SchedulerNotFoundError):
            manager.get_scheduler("invalid_id")

    def test_step_scheduler(self, manager, optimizer, scheduler_config):
        """Test stepping scheduler."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        lr = manager.step_scheduler(scheduler_id)

        assert lr is not None
        assert isinstance(lr, float)

    def test_get_current_lr(self, manager, optimizer, scheduler_config):
        """Test getting current learning rate."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        lr = manager.get_current_lr(scheduler_id)

        assert lr is not None
        assert isinstance(lr, float)

    def test_get_metadata(self, manager, optimizer, scheduler_config):
        """Test getting scheduler metadata."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        metadata = manager.get_metadata(scheduler_id)

        assert metadata is not None
        assert "config" in metadata
        assert "optimizer_id" in metadata
        assert metadata["optimizer_id"] == "test_optimizer"

    def test_reset_scheduler(self, manager, optimizer, scheduler_config):
        """Test resetting scheduler."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        # Step a few times
        manager.step_scheduler(scheduler_id)
        manager.step_scheduler(scheduler_id)

        # Reset
        manager.reset_scheduler(scheduler_id)

        # Check step counter was reset
        metadata = manager.get_metadata(scheduler_id)
        assert metadata["current_step"] == 0

    def test_remove_scheduler(self, manager, optimizer, scheduler_config):
        """Test removing scheduler."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        manager.remove_scheduler(scheduler_id)

        with pytest.raises(SchedulerNotFoundError):
            manager.get_scheduler(scheduler_id)

    def test_list_schedulers(self, manager, optimizer, scheduler_config):
        """Test listing schedulers."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        scheduler_ids = manager.list_schedulers()

        assert isinstance(scheduler_ids, list)
        assert scheduler_id in scheduler_ids

    def test_get_warmup_progress(self, manager, optimizer, scheduler_config):
        """Test getting warmup progress."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        progress = manager.get_warmup_progress(scheduler_id)

        assert progress >= 0.0
        assert progress <= 1.0

    def test_is_warmup_completed(self, manager, optimizer, scheduler_config):
        """Test checking if warmup is completed."""
        scheduler_id, _ = manager.create_scheduler(
            optimizer=optimizer,
            config=scheduler_config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        # Initially not completed
        assert not manager.is_warmup_completed(scheduler_id)

        # Step through warmup (10% of 1000 = 100 steps)
        for _ in range(101):
            manager.step_scheduler(scheduler_id)

        # Now should be completed
        assert manager.is_warmup_completed(scheduler_id)

    def test_warmup_steps_calculation(self, manager, optimizer):
        """Test warmup steps calculation."""
        config = SchedulerConfig(
            scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=0.2,
            num_training_steps=1000,
        )

        scheduler_id, metadata = manager.create_scheduler(
            optimizer=optimizer,
            config=config,
            optimizer_id="test_optimizer",
            num_training_steps=1000,
        )

        assert metadata.warmup_steps == 200  # 20% of 1000
