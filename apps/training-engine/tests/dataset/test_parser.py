"""Tests for Dataset Parser."""

import json
import pytest
from app.dataset.parser import DatasetParser
from app.dataset.models import DatasetFormat, DatasetType


@pytest.fixture
def parser():
    """Create parser fixture."""
    return DatasetParser()


@pytest.mark.asyncio
async def test_parse_json(parser):
    """Test parsing JSON."""
    data = [
        {
            "id": "conv1",
            "messages": [
                {"speaker": "agent", "text": "Hello"},
                {"speaker": "customer", "text": "Hi"},
            ]
        }
    ]

    content = json.dumps(data)
    records = await parser.parse(content, DatasetFormat.JSON, DatasetType.CONVERSATION)

    assert len(records) == 1
    assert records[0]["id"] == "conv1"


@pytest.mark.asyncio
async def test_parse_jsonl(parser):
    """Test parsing JSONL."""
    lines = [
        '{"id": "conv1", "text": "Hello"}',
        '{"id": "conv2", "text": "Hi"}',
    ]

    content = "\n".join(lines)
    records = await parser.parse(content, DatasetFormat.JSONL, DatasetType.CONVERSATION)

    assert len(records) == 2
    assert records[0]["id"] == "conv1"
    assert records[1]["id"] == "conv2"


@pytest.mark.asyncio
async def test_parse_conversation(parser):
    """Test parsing conversation record."""
    record = {
        "id": "conv1",
        "messages": [
            {"speaker": "agent", "text": "Hello"},
            {"speaker": "customer", "text": "Hi there"},
        ],
        "intent": "greeting",
    }

    conversation = await parser.parse_conversation(record)

    assert conversation.conversation_id == "conv1"
    assert len(conversation.messages) == 2
    assert conversation.messages[0].speaker == "agent"
    assert conversation.messages[0].text == "Hello"
    assert conversation.intent == "greeting"


@pytest.mark.asyncio
async def test_parse_qa(parser):
    """Test parsing QA record."""
    record = {
        "id": "qa1",
        "question": "What is your name?",
        "answer": "I am an AI assistant",
    }

    qa = await parser.parse_qa(record)

    assert qa.qa_id == "qa1"
    assert qa.question == "What is your name?"
    assert qa.answer == "I am an AI assistant"


@pytest.mark.asyncio
async def test_parse_csv(parser):
    """Test parsing CSV."""
    content = "id,question,answer\nqa1,Hello?,Hi!"

    records = await parser.parse(content, DatasetFormat.CSV, DatasetType.QA)

    assert len(records) == 1
    assert records[0]["id"] == "qa1"
    assert records[0]["question"] == "Hello?"
