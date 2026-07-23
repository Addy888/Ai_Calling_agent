"""Tests for compatibility engine."""

import pytest

from app.model.compatibility import CompatibilityEngine
from app.model.models import ModelArchitecture, ModelConfig, ModelType, CompatibilityStatus


@pytest.fixture
def compatibility_engine():
    """Create compatibility engine."""
    return CompatibilityEngine()


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
async def test_compatibility_engine_initialization(compatibility_engine):
    """Test compatibility engine initialization."""
    assert compatibility_engine is not None


@pytest.mark.asyncio
async def test_check_tokenizer_compatibility(compatibility_engine, sample_config):
    """Test checking tokenizer compatibility."""
    result = await compatibility_engine.check_tokenizer_compatibility(
        "model_id",
        sample_config,
        {"tokenizer_id": "llama_tokenizer"},
    )
    
    assert result.component == "tokenizer"
    assert result.model_id == "model_id"
    assert result.status in [CompatibilityStatus.COMPATIBLE, CompatibilityStatus.UNKNOWN]


@pytest.mark.asyncio
async def test_check_dataset_compatibility(compatibility_engine, sample_config):
    """Test checking dataset compatibility."""
    result = await compatibility_engine.check_dataset_compatibility(
        "model_id",
        sample_config,
        {"dataset_id": "test_dataset"},
    )
    
    assert result.component == "dataset"
    assert result.model_id == "model_id"


@pytest.mark.asyncio
async def test_check_training_engine_compatibility(compatibility_engine, sample_config):
    """Test checking training engine compatibility."""
    result = await compatibility_engine.check_training_engine_compatibility(
        "model_id",
        sample_config,
        {},
    )
    
    assert result.component == "training_engine"
    assert result.compatible is True


@pytest.mark.asyncio
async def test_check_gpu_compatibility(compatibility_engine, sample_config):
    """Test checking GPU compatibility."""
    result = await compatibility_engine.check_gpu_compatibility(
        "model_id",
        sample_config,
        {},
    )
    
    assert result.component == "gpu"
    assert result.model_id == "model_id"


@pytest.mark.asyncio
async def test_check_all_compatibility(compatibility_engine, sample_config):
    """Test checking all compatibility."""
    results = await compatibility_engine.check_all_compatibility(
        "model_id",
        sample_config,
        {},
    )
    
    assert len(results) >= 4  # tokenizer, dataset, training_engine, gpu
    assert all(hasattr(r, "compatible") for r in results)
