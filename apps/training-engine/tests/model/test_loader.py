"""Tests for model loader."""

import pytest
from pathlib import Path

from app.model.loader import ModelLoader
from app.model.models import ModelConfig, ModelArchitecture, ModelType, ModelLoadRequest
from app.model.exceptions import ModelLoadException, InvalidModelPathException


@pytest.fixture
def loader():
    """Create model loader."""
    return ModelLoader()


@pytest.fixture
def sample_config():
    """Create sample model config."""
    return ModelConfig(
        model_name="test_model",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
        model_path="./test_models/llama",
        parameter_count=7000000000,
        context_length=4096,
        vocabulary_size=32000,
    )


@pytest.mark.asyncio
async def test_loader_initialization(loader):
    """Test loader initialization."""
    assert loader is not None
    assert loader._loaded_models == {}


@pytest.mark.asyncio
async def test_load_model_invalid_path(loader, sample_config):
    """Test loading model with invalid path."""
    sample_config.model_path = "/invalid/path"
    
    with pytest.raises(InvalidModelPathException):
        await loader.load_model("test_id", sample_config)


@pytest.mark.asyncio
async def test_is_loaded(loader):
    """Test checking if model is loaded."""
    assert not loader.is_loaded("test_id")


@pytest.mark.asyncio
async def test_get_loaded_models(loader):
    """Test getting loaded models list."""
    models = loader.get_loaded_models()
    assert isinstance(models, list)
    assert len(models) == 0


@pytest.mark.asyncio
async def test_get_load_statistics(loader):
    """Test getting load statistics."""
    stats = loader.get_load_statistics()
    assert "total_loaded" in stats
    assert "loaded_models" in stats
    assert stats["total_loaded"] == 0
