"""Dataset parser module."""

import csv
import json
from io import StringIO
from typing import Any, Dict, List, Union

from app.dataset.exceptions import DatasetParserException
from app.dataset.models import (
    Conversation,
    DatasetFormat,
    DatasetType,
    Language,
    Message,
    QuestionAnswer,
)
from app.logger import training_logger


class DatasetParser:
    """Parse various dataset formats."""

    def __init__(self):
        """Initialize dataset parser."""
        training_logger.info("Dataset parser initialized")

    async def parse(
        self,
        content: Union[str, bytes],
        file_format: DatasetFormat,
        dataset_type: DatasetType,
    ) -> List[Dict[str, Any]]:
        """Parse dataset content."""
        training_logger.info(f"Parsing dataset: format={file_format.value}, type={dataset_type.value}")

        # Convert bytes to string if needed
        if isinstance(content, bytes):
            content = content.decode("utf-8")

        # Parse based on format
        if file_format == DatasetFormat.JSON:
            return await self._parse_json(content)
        elif file_format == DatasetFormat.JSONL:
            return await self._parse_jsonl(content)
        elif file_format == DatasetFormat.CSV:
            return await self._parse_csv(content)
        elif file_format == DatasetFormat.TXT:
            return await self._parse_txt(content)
        elif file_format == DatasetFormat.MARKDOWN:
            return await self._parse_markdown(content)
        else:
            raise DatasetParserException(f"Unsupported format: {file_format.value}")

    async def _parse_json(self, content: str) -> List[Dict[str, Any]]:
        """Parse JSON content."""
        try:
            data = json.loads(content)

            # Handle single object vs array
            if isinstance(data, dict):
                # Check if it's a wrapper with data key
                if "data" in data and isinstance(data["data"], list):
                    return data["data"]
                elif "conversations" in data and isinstance(data["conversations"], list):
                    return data["conversations"]
                elif "records" in data and isinstance(data["records"], list):
                    return data["records"]
                else:
                    return [data]
            elif isinstance(data, list):
                return data
            else:
                raise DatasetParserException("Invalid JSON structure")

        except json.JSONDecodeError as e:
            raise DatasetParserException(f"Invalid JSON: {str(e)}")

    async def _parse_jsonl(self, content: str) -> List[Dict[str, Any]]:
        """Parse JSONL (JSON Lines) content."""
        records = []
        lines = content.strip().split("\n")

        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
                records.append(record)
            except json.JSONDecodeError as e:
                raise DatasetParserException(
                    f"Invalid JSON at line {line_num}: {str(e)}"
                )

        return records

    async def _parse_csv(self, content: str) -> List[Dict[str, Any]]:
        """Parse CSV content."""
        try:
            reader = csv.DictReader(StringIO(content))
            records = list(reader)
            return records
        except Exception as e:
            raise DatasetParserException(f"Failed to parse CSV: {str(e)}")

    async def _parse_txt(self, content: str) -> List[Dict[str, Any]]:
        """Parse plain text content."""
        # Split by double newlines to separate conversations/entries
        entries = content.strip().split("\n\n")

        records = []
        for idx, entry in enumerate(entries):
            if entry.strip():
                records.append({
                    "id": f"entry_{idx}",
                    "text": entry.strip(),
                })

        return records

    async def _parse_markdown(self, content: str) -> List[Dict[str, Any]]:
        """Parse Markdown content."""
        # Simple markdown parsing - split by headers
        sections = []
        current_section = {"text": ""}

        for line in content.split("\n"):
            if line.startswith("#"):
                if current_section["text"]:
                    sections.append(current_section)
                current_section = {
                    "header": line.strip("# ").strip(),
                    "text": "",
                }
            else:
                current_section["text"] += line + "\n"

        if current_section["text"]:
            sections.append(current_section)

        return sections

    async def parse_conversation(self, record: Dict[str, Any]) -> Conversation:
        """Parse a conversation record."""
        messages = []

        # Try different conversation formats
        if "messages" in record:
            # Standard format
            for msg in record["messages"]:
                messages.append(Message(
                    speaker=msg.get("speaker", msg.get("role", "unknown")),
                    text=msg.get("text", msg.get("content", "")),
                    timestamp=msg.get("timestamp"),
                    language=self._detect_language(msg.get("language")),
                    metadata=msg.get("metadata", {}),
                ))

        elif "turns" in record:
            # Dialog turns format
            for turn in record["turns"]:
                messages.append(Message(
                    speaker=turn.get("speaker", "unknown"),
                    text=turn.get("text", ""),
                    timestamp=turn.get("timestamp"),
                ))

        elif "dialog" in record:
            # Dialog format
            for item in record["dialog"]:
                messages.append(Message(
                    speaker=item.get("speaker", "unknown"),
                    text=item.get("text", ""),
                ))

        else:
            # Fallback: treat entire record as single message
            messages.append(Message(
                speaker="unknown",
                text=record.get("text", str(record)),
            ))

        return Conversation(
            conversation_id=record.get("id", record.get("conversation_id")),
            messages=messages,
            intent=record.get("intent"),
            sentiment=record.get("sentiment"),
            language=self._detect_language(record.get("language")),
            metadata=record.get("metadata", {}),
        )

    async def parse_qa(self, record: Dict[str, Any]) -> QuestionAnswer:
        """Parse a QA record."""
        return QuestionAnswer(
            qa_id=record.get("id", record.get("qa_id")),
            question=record.get("question", record.get("q", "")),
            answer=record.get("answer", record.get("a", "")),
            context=record.get("context"),
            metadata=record.get("metadata", {}),
        )

    async def parse_whisper_transcript(self, record: Dict[str, Any]) -> Conversation:
        """Parse Whisper transcript format."""
        messages = []

        # Whisper format has segments
        if "segments" in record:
            for segment in record["segments"]:
                messages.append(Message(
                    speaker="speaker",
                    text=segment.get("text", ""),
                    timestamp=str(segment.get("start", "")),
                    metadata={
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "confidence": segment.get("confidence"),
                    },
                ))
        else:
            # Single transcript
            messages.append(Message(
                speaker="speaker",
                text=record.get("text", ""),
            ))

        return Conversation(
            conversation_id=record.get("id"),
            messages=messages,
            language=self._detect_language(record.get("language")),
            metadata=record.get("metadata", {}),
        )

    async def parse_call_transcript(self, record: Dict[str, Any]) -> Conversation:
        """Parse call transcript format."""
        messages = []

        # Call transcript with agent/customer turns
        if "transcript" in record:
            for turn in record["transcript"]:
                messages.append(Message(
                    speaker=turn.get("speaker", turn.get("role", "unknown")),
                    text=turn.get("text", turn.get("content", "")),
                    timestamp=turn.get("timestamp", turn.get("time")),
                    metadata=turn.get("metadata", {}),
                ))

        return Conversation(
            conversation_id=record.get("call_id", record.get("id")),
            messages=messages,
            intent=record.get("intent", record.get("purpose")),
            duration=record.get("duration"),
            metadata=record.get("metadata", {}),
        )

    def _detect_language(self, lang_code: Optional[str]) -> Optional[Language]:
        """Detect language from code."""
        if not lang_code:
            return None

        lang_map = {
            "en": Language.ENGLISH,
            "english": Language.ENGLISH,
            "hi": Language.HINDI,
            "hindi": Language.HINDI,
            "mr": Language.MARATHI,
            "marathi": Language.MARATHI,
        }

        return lang_map.get(lang_code.lower(), Language.UNKNOWN)
