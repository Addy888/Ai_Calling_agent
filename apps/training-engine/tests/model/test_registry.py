"""Tests for model registry."""

import pytest

from app.model.models import (
    ModelArchitecture,
    ModelConfig,
    ModelMetadata,
    ModelRegistry,
    ModelStatus,
    ModelType,
)
from app.model.registry import ModelRegistryManager
from app.model.exceptions import ModelNotFoundException


@pytest.fixture
def registry():
    """Create model registry."""
    return ModelRegistryManager()


@pytest.fixture
def sample_registry_entry():
    """Create sample registry entry."""
    config = ModelConfig(
        model_name="test_model",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
        model_path="./test_models/llama",
    )
    
    metadata = ModelMetadata(
        name="test_model",
        version="1.0.0",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
    )
    
    return ModelRegistry(
        model_id="test_id",
        name="test_model",
        version="1.0.0",
        architecture=ModelArchitecture.LLAMA,
        status=ModelStatus.REGISTERED,
        config=config,
        metadata=metadata,
    )


@pytest.mark.asyncio
async def test_registry_initialization(registry):
    """Test registry initialization."""
    assert registry is not None
    assert registry._registry == {}


@pytest.mark.asyncio
async def test_register_model(registry, sample_registry_entry):
    """Test registering a model."""
    entry = await registry.register_model(sample_registry_entry)
    
    assert entry.model_id == "test_id"
    assert entry.status == ModelStatus.REGISTERED


@pytest.mark.asyncio
async def test_get_model(registry, sample_registry_entry):
    """Test getting a model."""
    await registry.register_model(sample_registry_entry)
    
    entry = await registry.get_model("test_id")
    assert entry.model_id == "test_id"


@pytest.mark.asyncio
async def test_get_model_not_found(registry):
    """Test getting non-existent model."""
    with pytest.raises(ModelNotFoundException):
        await registry.get_model("non_existent")


@pytest.mark.asyncio
async def test_update_model_status(registry, sample_registry_entry):
    """Test updating model status."""
    await registry.register_model(sample_registry_entry)
    
    await registry.update_model_status("test_id", ModelStatus.LOADED)
    entry = await registry.get_model("test_id")
    
    assert entry.status == ModelStatus.LOADED


@pytest.mark.asyncio
async def test_activate_model(registry, sample_registry_entry):
    """Test activating a model."""
    await registry.register_model(sample_registry_entry)
    
    entry = await registry.activate_model("test_id")
    assert entry.is_active is True


@pytest.mark.asyncio
async def test_deactivate_model(registry, sample_registry_entry):
    """Test deactivating a model."""
    await registry.register_model(sample_registry_entry)
    await registry.activate_model("test_id")
    
    entry = await registry.deactivate_model("test_id")
    assert entry.is_active is False


@pytest.mark.asyncio
async def test_list_models(registry, sample_registry_entry):
    """Test listing models."""
    await registry.register_model(sample_registry_entry)
    
    models = await registry.list_models()
    assert len(models) == 1


@pytest.mark.asyncio
async def test_delete_model(registry, sample_registry_entry):
    """Test deleting a model."""
    await registry.register_model(sample_registry_entry)
    
    success = await registry.delete_model("test_id")
    assert success is True
    
    with pytest.raises(ModelNotFoundException):
        await registry.get_model("test_id")


@pytest.mark.asyncio
async def test_get_registry_stats(registry):
    """Test getting registry stats."""
    stats = registry.get_registry_stats()
    
    assert "total_models" in stats
    assert "active_models" in stats
