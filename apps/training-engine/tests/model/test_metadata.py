"""Tests for metadata service."""

import pytest

from app.model.metadata import MetadataService
from app.model.models import ModelArchitecture, ModelType


@pytest.fixture
def metadata_service():
    """Create metadata service."""
    return MetadataService()


@pytest.mark.asyncio
async def test_metadata_service_initialization(metadata_service):
    """Test metadata service initialization."""
    assert metadata_service is not None


@pytest.mark.asyncio
async def test_get_metadata_summary(metadata_service):
    """Test getting metadata summary."""
    from app.model.models import ModelMetadata
    
    metadata = ModelMetadata(
        name="test_model",
        version="1.0.0",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
        parameter_count=7000000000,
        context_length=4096,
        vocabulary_size=32000,
    )
    
    summary = metadata_service.get_metadata_summary(metadata)
    
    assert "model_id" in summary
    assert "name" in summary
    assert "architecture" in summary
    assert summary["name"] == "test_model"


@pytest.mark.asyncio
async def test_validate_metadata(metadata_service):
    """Test validating metadata."""
    from app.model.models import ModelMetadata
    
    metadata = ModelMetadata(
        name="test_model",
        version="1.0.0",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
    )
    
    result = await metadata_service.validate_metadata(metadata)
    
    assert "is_valid" in result
    assert "errors" in result
    assert "warnings" in result
