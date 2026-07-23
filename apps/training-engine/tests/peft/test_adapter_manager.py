"""Tests for Adapter Manager."""

import pytest

from app.peft.adapter.manager import AdapterManager
from app.peft.adapter.registry import AdapterRegistry
from app.peft.exceptions import AdapterException, AdapterNotFoundError
from app.peft.schemas import AdapterMetadata, AdapterType


@pytest.fixture
def adapter_registry():
    """Create fresh adapter registry."""
    registry = AdapterRegistry()
    registry.clear()
    return registry


@pytest.fixture
def adapter_manager(adapter_registry):
    """Create adapter manager with fresh registry."""
    return AdapterManager(registry=adapter_registry)


@pytest.fixture
def sample_metadata():
    """Create sample adapter metadata."""
    return AdapterMetadata(
        adapter_id="test-adapter-001",
        adapter_name="test-adapter",
        adapter_type=AdapterType.LORA,
        base_model="test-model",
        rank=8,
        alpha=16,
        dropout=0.1,
        target_modules=["q_proj", "v_proj"],
        trainable_params=1000,
        frozen_params=9000,
        trainable_percent=10.0,
        task_type="CAUSAL_LM",
    )


class TestAdapterManager:
    """Test Adapter Manager functionality."""

    def test_initialization(self, adapter_manager):
        """Test adapter manager initialization."""
        assert adapter_manager is not None
        assert adapter_manager.registry is not None

    def test_register_adapter(self, adapter_manager, sample_metadata):
        """Test registering an adapter."""
        adapter_manager.register_adapter(sample_metadata, model_id="test-model")

        # Verify registration
        retrieved = adapter_manager.get_adapter(sample_metadata.adapter_id)
        assert retrieved.adapter_id == sample_metadata.adapter_id
        assert retrieved.adapter_name == sample_metadata.adapter_name

    def test_unregister_adapter(self, adapter_manager, sample_metadata):
        """Test unregistering an adapter."""
        # Register first
        adapter_manager.register_adapter(sample_metadata)

        # Unregister
        adapter_manager.unregister_adapter(sample_metadata.adapter_id)

        # Verify removal
        with pytest.raises(AdapterNotFoundError):
            adapter_manager.get_adapter(sample_metadata.adapter_id)

    def test_get_adapter_by_name(self, adapter_manager, sample_metadata):
        """Test getting adapter by name."""
        adapter_manager.register_adapter(sample_metadata)

        retrieved = adapter_manager.get_adapter_by_name(sample_metadata.adapter_name)
        assert retrieved is not None
        assert retrieved.adapter_name == sample_metadata.adapter_name

    def test_list_adapters(self, adapter_manager, sample_metadata):
        """Test listing adapters."""
        adapter_manager.register_adapter(sample_metadata)

        adapters = adapter_manager.list_adapters()
        assert len(adapters) > 0
        assert any(a.adapter_id == sample_metadata.adapter_id for a in adapters)

    def test_list_adapters_by_model(self, adapter_manager, sample_metadata):
        """Test listing adapters by model."""
        adapter_manager.register_adapter(sample_metadata, model_id="test-model")

        adapters = adapter_manager.list_adapters(model_id="test-model")
        assert len(adapters) > 0

    def test_set_active_adapter(self, adapter_manager, sample_metadata):
        """Test setting active adapter."""
        adapter_manager.register_adapter(sample_metadata)

        adapter_manager.set_active_adapter("test-model", sample_metadata.adapter_id)

        active_id = adapter_manager.get_active_adapter("test-model")
        assert active_id == sample_metadata.adapter_id

    def test_clear_active_adapter(self, adapter_manager, sample_metadata):
        """Test clearing active adapter."""
        adapter_manager.register_adapter(sample_metadata)
        adapter_manager.set_active_adapter("test-model", sample_metadata.adapter_id)

        adapter_manager.clear_active_adapter("test-model")

        active_id = adapter_manager.get_active_adapter("test-model")
        assert active_id is None

    def test_is_adapter_active(self, adapter_manager, sample_metadata):
        """Test checking if adapter is active."""
        adapter_manager.register_adapter(sample_metadata)

        # Not active initially
        assert not adapter_manager.is_adapter_active(sample_metadata.adapter_id)

        # Set as active
        adapter_manager.set_active_adapter("test-model", sample_metadata.adapter_id)

        # Now active
        assert adapter_manager.is_adapter_active(sample_metadata.adapter_id)

    def test_get_models_using_adapter(self, adapter_manager, sample_metadata):
        """Test getting models using adapter."""
        adapter_manager.register_adapter(sample_metadata)
        adapter_manager.set_active_adapter("test-model-1", sample_metadata.adapter_id)
        adapter_manager.set_active_adapter("test-model-2", sample_metadata.adapter_id)

        models = adapter_manager.get_models_using_adapter(sample_metadata.adapter_id)
        assert len(models) == 2
        assert "test-model-1" in models
        assert "test-model-2" in models

    def test_get_stats(self, adapter_manager, sample_metadata):
        """Test getting adapter manager stats."""
        adapter_manager.register_adapter(sample_metadata, model_id="test-model")

        stats = adapter_manager.get_stats()
        assert isinstance(stats, dict)
        assert "total_adapters" in stats
        assert stats["total_adapters"] > 0


class TestAdapterManagerEdgeCases:
    """Test Adapter Manager edge cases."""

    def test_get_nonexistent_adapter(self, adapter_manager):
        """Test getting adapter that doesn't exist."""
        with pytest.raises(AdapterNotFoundError):
            adapter_manager.get_adapter("nonexistent-id")

    def test_unregister_nonexistent_adapter(self, adapter_manager):
        """Test unregistering adapter that doesn't exist."""
        with pytest.raises(AdapterNotFoundError):
            adapter_manager.unregister_adapter("nonexistent-id")

    def test_set_active_nonexistent_adapter(self, adapter_manager):
        """Test setting active adapter that doesn't exist."""
        with pytest.raises(AdapterNotFoundError):
            adapter_manager.set_active_adapter("test-model", "nonexistent-id")

    def test_multiple_adapters_same_model(self, adapter_manager):
        """Test multiple adapters for same model."""
        metadata1 = AdapterMetadata(
            adapter_id="adapter-1",
            adapter_name="adapter-1",
            adapter_type=AdapterType.LORA,
            base_model="test-model",
            rank=8,
            alpha=16,
            dropout=0.1,
            target_modules=["q_proj"],
            trainable_params=1000,
            frozen_params=9000,
            trainable_percent=10.0,
            task_type="CAUSAL_LM",
        )

        metadata2 = AdapterMetadata(
            adapter_id="adapter-2",
            adapter_name="adapter-2",
            adapter_type=AdapterType.LORA,
            base_model="test-model",
            rank=16,
            alpha=32,
            dropout=0.1,
            target_modules=["v_proj"],
            trainable_params=2000,
            frozen_params=8000,
            trainable_percent=20.0,
            task_type="CAUSAL_LM",
        )

        adapter_manager.register_adapter(metadata1, model_id="test-model")
        adapter_manager.register_adapter(metadata2, model_id="test-model")

        adapters = adapter_manager.list_adapters(model_id="test-model")
        assert len(adapters) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
