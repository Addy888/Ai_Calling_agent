"""Tests for Dataset Cleaner."""

import pytest
from app.dataset.cleaner import DatasetCleaner
from app.dataset.models import (
    Conversation,
    Dataset,
    DatasetMetadata,
    DatasetType,
    DatasetFormat,
    Message,
)


@pytest.fixture
def cleaner():
    """Create cleaner fixture."""
    return DatasetCleaner()


@pytest.fixture
def sample_dataset():
    """Create sample dataset with issues."""
    metadata = DatasetMetadata(
        name="test_dataset",
        dataset_type=DatasetType.CONVERSATION,
        format=DatasetFormat.JSON,
    )

    conversations = [
        Conversation(
            conversation_id="conv1",
            messages=[
                Message(speaker="agent", text="Hello"),
                Message(speaker="customer", text="Hi"),
            ],
        ),
        # Duplicate conversation
        Conversation(
            conversation_id="conv1_dup",
            messages=[
                Message(speaker="agent", text="Hello"),
                Message(speaker="customer", text="Hi"),
            ],
        ),
        # Empty conversation
        Conversation(
            conversation_id="conv2",
            messages=[
                Message(speaker="agent", text=""),
            ],
        ),
    ]

    return Dataset(
        metadata=metadata,
        conversations=conversations,
    )


@pytest.mark.asyncio
async def test_clean_dataset(cleaner, sample_dataset):
    """Test cleaning dataset."""
    original_count = len(sample_dataset.conversations)

    dataset = await cleaner.clean(sample_dataset)

    # Should have removed duplicates and empty conversations
    assert len(dataset.conversations) < original_count
    assert dataset.metadata.duplicate_count > 0


@pytest.mark.asyncio
async def test_remove_duplicates(cleaner, sample_dataset):
    """Test removing duplicates."""
    original_count = len(sample_dataset.conversations)

    dataset = await cleaner.remove_duplicates(sample_dataset)

    # Should have removed one duplicate
    assert len(dataset.conversations) < original_count


@pytest.mark.asyncio
async def test_remove_empty_records(cleaner, sample_dataset):
    """Test removing empty records."""
    dataset = await cleaner.remove_empty_records(sample_dataset)

    # All conversations should have non-empty messages
    for conv in dataset.conversations:
        assert len(conv.messages) > 0
        for msg in conv.messages:
            assert msg.text.strip() != ""


@pytest.mark.asyncio
async def test_clean_text(cleaner):
    """Test cleaning individual text."""
    text = "Hello    world  \n\n  with   extra spaces"

    cleaned = await cleaner._clean_text(text)

    assert "  " not in cleaned
    assert cleaned == cleaned.strip()
