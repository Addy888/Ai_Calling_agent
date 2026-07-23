"""Tests for Dataset Pipeline."""

import json
import pytest
from app.dataset.pipeline import DatasetPipeline
from app.dataset.models import DatasetType, DatasetFormat


@pytest.fixture
def pipeline():
    """Create pipeline fixture."""
    return DatasetPipeline()


@pytest.fixture
def sample_json_data():
    """Create sample JSON data."""
    return json.dumps({
        "conversations": [
            {
                "id": "conv1",
                "messages": [
                    {"speaker": "agent", "text": "Hello, how can I help you?"},
                    {"speaker": "customer", "text": "I need information about your products"},
                    {"speaker": "agent", "text": "Sure, I can help with that"},
                ],
            },
            {
                "id": "conv2",
                "messages": [
                    {"speaker": "agent", "text": "Welcome!"},
                    {"speaker": "customer", "text": "Thanks"},
                ],
            },
        ]
    })


@pytest.mark.asyncio
async def test_pipeline_load_and_format(pipeline, sample_json_data, tmp_path):
    """Test loading and formatting through pipeline."""
    # Create temp file
    test_file = tmp_path / "test.json"
    test_file.write_text(sample_json_data)

    # Load through pipeline
    dataset = await pipeline.load(
        test_file,
        dataset_name="test_dataset",
        dataset_type=DatasetType.CONVERSATION,
    )

    assert dataset.dataset_id is not None
    assert len(dataset.conversations) > 0


@pytest.mark.asyncio
async def test_pipeline_validate(pipeline, sample_json_data, tmp_path):
    """Test validation through pipeline."""
    test_file = tmp_path / "test.json"
    test_file.write_text(sample_json_data)

    dataset = await pipeline.load(
        test_file,
        dataset_type=DatasetType.CONVERSATION,
    )

    result = await pipeline.validate(dataset)

    assert result.is_valid is True


@pytest.mark.asyncio
async def test_pipeline_process(pipeline, sample_json_data, tmp_path):
    """Test complete processing pipeline."""
    test_file = tmp_path / "test.json"
    test_file.write_text(sample_json_data)

    dataset = await pipeline.load(
        test_file,
        dataset_type=DatasetType.CONVERSATION,
    )

    # Process
    dataset = await pipeline.process(dataset)

    assert dataset.status.value == "ready"
    assert dataset.metadata.total_conversations > 0
    assert dataset.metadata.total_messages > 0


@pytest.mark.asyncio
async def test_pipeline_split(pipeline, sample_json_data, tmp_path):
    """Test dataset splitting."""
    test_file = tmp_path / "test.json"
    test_file.write_text(sample_json_data)

    dataset = await pipeline.load(
        test_file,
        dataset_type=DatasetType.CONVERSATION,
    )

    # Split
    dataset = await pipeline.split(dataset)

    assert dataset.train_split is not None
    assert dataset.validation_split is not None
    assert dataset.test_split is not None
