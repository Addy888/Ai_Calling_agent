"""Tests for model validator."""

import pytest

from app.model.models import ModelArchitecture, ModelConfig, ModelType
from app.model.validator import ModelValidator


@pytest.fixture
def validator():
    """Create model validator."""
    return ModelValidator()


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
async def test_validator_initialization(validator):
    """Test validator initialization."""
    assert validator is not None


@pytest.mark.asyncio
async def test_validate_model_config(validator, sample_config):
    """Test validating model configuration."""
    result = await validator.validate_model_config(sample_config)
    
    assert "is_valid" in result
    assert "errors" in result
    assert "warnings" in result


@pytest.mark.asyncio
async def test_validate_model_path(validator, sample_config):
    """Test validating model path."""
    result = await validator.validate_model_path(sample_config.model_path)
    
    assert "exists" in result
    assert "is_directory" in result


@pytest.mark.asyncio
async def test_validate_training_readiness(validator, sample_config):
    """Test validating training readiness."""
    result = await validator.validate_training_readiness("test_id", sample_config)
    
    assert "is_ready" in result
    assert "checks" in result
    assert "errors" in result
    assert "warnings" in result


@pytest.mark.asyncio
async def test_validate_tokenizer_compatibility(validator):
    """Test validating tokenizer compatibility."""
    result = await validator.validate_tokenizer_compatibility(
        "model_id",
        "tokenizer_id",
    )
    
    assert "compatible" in result
    assert "errors" in result
    assert "warnings" in result
