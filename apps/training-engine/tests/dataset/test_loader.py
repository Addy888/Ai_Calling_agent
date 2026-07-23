"""Tests for Dataset Loader."""

import pytest
from app.dataset.loader import DatasetLoader
from app.dataset.models import DatasetFormat, DatasetType


@pytest.fixture
def loader():
    """Create loader fixture."""
    return DatasetLoader()


@pytest.mark.asyncio
async def test_load_from_text(loader):
    """Test loading dataset from text."""
    content = '{"conversations": [{"messages": [{"speaker": "agent", "text": "Hello"}]}]}'

    dataset = await loader.load_from_text(
        content=content,
        dataset_name="test_dataset",
        dataset_type=DatasetType.CONVERSATION,
        file_format=DatasetFormat.JSON,
    )

    assert dataset.dataset_id is not None
    assert dataset.metadata.name == "test_dataset"
    assert dataset.metadata.dataset_type == DatasetType.CONVERSATION
    assert dataset.metadata.format == DatasetFormat.JSON


@pytest.mark.asyncio
async def test_load_from_dict(loader):
    """Test loading dataset from dictionary."""
    data = {
        "conversations": [
            {
                "messages": [
                    {"speaker": "agent", "text": "Hello"},
                    {"speaker": "customer", "text": "Hi"},
                ]
            }
        ]
    }

    dataset = await loader.load_from_dict(
        data=data,
        dataset_name="test_dataset",
        dataset_type=DatasetType.CONVERSATION,
    )

    assert dataset.dataset_id is not None
    assert dataset.metadata.name == "test_dataset"


@pytest.mark.asyncio
async def test_dataset_summary(loader):
    """Test getting dataset summary."""
    content = '{"data": []}'

    dataset = await loader.load_from_text(
        content=content,
        dataset_name="test_dataset",
        dataset_type=DatasetType.CONVERSATION,
        file_format=DatasetFormat.JSON,
    )

    summary = loader.get_dataset_summary(dataset)

    assert "dataset_id" in summary
    assert "name" in summary
    assert "type" in summary
    assert "format" in summary
