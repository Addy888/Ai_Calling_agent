"""Tests for model cache."""

import pytest

from app.model.cache import ModelCache
from app.model.models import ModelInfo, ModelStatus, ModelMetadata, ModelArchitecture, ModelType


@pytest.fixture
def cache():
    """Create model cache."""
    return ModelCache(ttl_seconds=60)


@pytest.fixture
def sample_model_info():
    """Create sample model info."""
    return ModelInfo(
        model_id="test_id",
        status=ModelStatus.LOADED,
    )


@pytest.fixture
def sample_metadata():
    """Create sample metadata."""
    return ModelMetadata(
        name="test_model",
        version="1.0.0",
        architecture=ModelArchitecture.LLAMA,
        model_type=ModelType.BASE,
    )


@pytest.mark.asyncio
async def test_cache_initialization(cache):
    """Test cache initialization."""
    assert cache is not None
    assert cache.ttl_seconds == 60


@pytest.mark.asyncio
async def test_set_and_get(cache, sample_model_info):
    """Test setting and getting from cache."""
    await cache.set(sample_model_info)
    
    result = await cache.get("test_id")
    assert result is not None
    assert result.model_id == "test_id"


@pytest.mark.asyncio
async def test_get_miss(cache):
    """Test cache miss."""
    result = await cache.get("non_existent")
    assert result is None


@pytest.mark.asyncio
async def test_set_and_get_metadata(cache, sample_metadata):
    """Test setting and getting metadata."""
    await cache.set_metadata(sample_metadata)
    
    result = await cache.get_metadata(sample_metadata.model_id)
    assert result is not None
    assert result.model_id == sample_metadata.model_id


@pytest.mark.asyncio
async def test_delete(cache, sample_model_info):
    """Test deleting from cache."""
    await cache.set(sample_model_info)
    
    deleted = await cache.delete("test_id")
    assert deleted is True
    
    result = await cache.get("test_id")
    assert result is None


@pytest.mark.asyncio
async def test_clear(cache, sample_model_info):
    """Test clearing cache."""
    await cache.set(sample_model_info)
    await cache.clear()
    
    result = await cache.get("test_id")
    assert result is None


@pytest.mark.asyncio
async def test_get_cache_stats(cache):
    """Test getting cache stats."""
    stats = cache.get_cache_stats()
    
    assert "total_entries" in stats
    assert "metadata_entries" in stats
    assert "ttl_seconds" in stats
