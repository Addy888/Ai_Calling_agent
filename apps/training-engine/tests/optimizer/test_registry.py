"""Tests for optimizer registry."""

import pytest

from app.optimizer.registry import OptimizerRegistry
from app.optimizer.manager import OptimizerManager
from app.optimizer.exceptions import OptimizerNotFoundError


class TestOptimizerRegistry:
    """Test optimizer registry."""

    @pytest.fixture
    def registry(self):
        """Create registry instance."""
        return OptimizerRegistry()

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

    def test_register_optimizer(self, registry, simple_model, optimizer_config):
        """Test registering optimizer."""
        from app.optimizer.builder import OptimizerBuilder
        from app.optimizer.schemas import OptimizerMetadata, ParameterGroupInfo

        builder = OptimizerBuilder()
        optimizer = builder.build_optimizer(simple_model, optimizer_config)

        metadata = OptimizerMetadata(
            optimizer_id="test_id",
            optimizer_type=optimizer_config.optimizer_type,
            learning_rate=optimizer_config.learning_rate,
            weight_decay=optimizer_config.weight_decay,
            max_grad_norm=optimizer_config.max_grad_norm,
            parameter_groups=[],
            total_parameters=100,
            trainable_parameters=100,
        )

        registry.register("test_id", optimizer, metadata)

        assert registry.exists("test_id")

    def test_unregister_optimizer(self, registry, optimizer_id):
        """Test unregistering optimizer."""
        registry.unregister(optimizer_id)

        assert not registry.exists(optimizer_id)

    def test_get_optimizer(self, registry, optimizer_id):
        """Test getting optimizer."""
        optimizer = registry.get_optimizer(optimizer_id)

        assert optimizer is not None

    def test_get_optimizer_not_found(self, registry):
        """Test getting non-existent optimizer."""
        with pytest.raises(OptimizerNotFoundError):
            registry.get_optimizer("invalid_id")

    def test_get_metadata(self, registry, optimizer_id):
        """Test getting optimizer metadata."""
        metadata = registry.get_metadata(optimizer_id)

        assert metadata is not None
        assert metadata.optimizer_id == optimizer_id

    def test_get_metadata_not_found(self, registry):
        """Test getting metadata for non-existent optimizer."""
        with pytest.raises(OptimizerNotFoundError):
            registry.get_metadata("invalid_id")

    def test_exists(self, registry, optimizer_id):
        """Test checking optimizer existence."""
        assert registry.exists(optimizer_id)
        assert not registry.exists("invalid_id")

    def test_list_all(self, registry, optimizer_id):
        """Test listing all optimizers."""
        optimizer_ids = registry.list_all()

        assert isinstance(optimizer_ids, list)
        assert optimizer_id in optimizer_ids

    def test_map_scheduler(self, registry, optimizer_id):
        """Test mapping scheduler to optimizer."""
        scheduler_id = "scheduler_123"

        registry.map_scheduler(scheduler_id, optimizer_id)

        mapped_optimizer_id = registry.get_optimizer_for_scheduler(scheduler_id)
        assert mapped_optimizer_id == optimizer_id

    def test_get_optimizer_for_scheduler(self, registry):
        """Test getting optimizer for scheduler."""
        result = registry.get_optimizer_for_scheduler("invalid_scheduler")

        assert result is None

    def test_get_stats(self, registry, optimizer_id):
        """Test getting registry statistics."""
        stats = registry.get_stats()

        assert "total_optimizers" in stats
        assert "optimizer_ids" in stats
        assert "scheduler_mappings" in stats
        assert stats["total_optimizers"] >= 1
