"""Tests for Dataset Validator."""

import pytest
from app.dataset.validator import DatasetValidator
from app.dataset.models import (
    Conversation,
    Dataset,
    DatasetMetadata,
    DatasetType,
    DatasetFormat,
    Message,
    QuestionAnswer,
)


@pytest.fixture
def validator():
    """Create validator fixture."""
    return DatasetValidator()


@pytest.fixture
def sample_dataset():
    """Create sample dataset."""
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
        Conversation(
            conversation_id="conv2",
            messages=[
                Message(speaker="agent", text="How can I help?"),
            ],
        ),
    ]

    return Dataset(
        metadata=metadata,
        conversations=conversations,
    )


@pytest.mark.asyncio
async def test_validate_dataset(validator, sample_dataset):
    """Test validating dataset."""
    result = await validator.validate(sample_dataset)

    assert result.is_valid is True
    assert isinstance(result.statistics, dict)


@pytest.mark.asyncio
async def test_validate_empty_dataset(validator):
    """Test validating empty dataset."""
    metadata = DatasetMetadata(
        name="empty_dataset",
        dataset_type=DatasetType.CONVERSATION,
        format=DatasetFormat.JSON,
    )

    dataset = Dataset(metadata=metadata)

    result = await validator.validate(dataset)

    assert result.is_valid is False
    assert "empty" in " ".join(result.errors).lower()


@pytest.mark.asyncio
async def test_validate_conversations(validator):
    """Test validating conversations."""
    conversations = [
        Conversation(
            conversation_id="conv1",
            messages=[
                Message(speaker="agent", text="Hello"),
                Message(speaker="", text=""),  # Empty speaker and text
            ],
        ),
        Conversation(
            conversation_id="conv2",
            messages=[],  # No messages
        ),
    ]

    errors, warnings, stats = await validator._validate_conversations(conversations)

    assert len(errors) > 0
    assert stats["empty"] > 0


@pytest.mark.asyncio
async def test_validate_qa_pairs(validator):
    """Test validating QA pairs."""
    qa_pairs = [
        QuestionAnswer(
            qa_id="qa1",
            question="",  # Empty question
            answer="Answer",
        ),
        QuestionAnswer(
            qa_id="qa2",
            question="Question?",
            answer="",  # Empty answer
        ),
    ]

    errors, warnings, stats = await validator._validate_qa_pairs(qa_pairs)

    assert len(errors) > 0
    assert stats["empty_questions"] > 0
    assert stats["empty_answers"] > 0
