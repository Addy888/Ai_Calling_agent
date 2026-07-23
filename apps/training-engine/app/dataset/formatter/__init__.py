"""Dataset formatter module - Converts all datasets to unified format."""

from typing import Any, Dict, List

from app.dataset.models import (
    Conversation,
    Dataset,
    DatasetRecord,
    DatasetType,
    Message,
    QuestionAnswer,
)
from app.logger import training_logger


class DatasetFormatter:
    """Format datasets into unified conversation format."""

    def __init__(self):
        """Initialize dataset formatter."""
        training_logger.info("Dataset formatter initialized")

    async def format(
        self, dataset: Dataset, raw_records: List[Dict[str, Any]]
    ) -> Dataset:
        """Format dataset to unified format."""
        training_logger.info(
            f"Formatting dataset: {dataset.dataset_id}, type={dataset.metadata.dataset_type.value}"
        )

        dataset_type = dataset.metadata.dataset_type

        if dataset_type == DatasetType.CONVERSATION:
            dataset.conversations = await self._format_conversations(raw_records)

        elif dataset_type == DatasetType.QA:
            dataset.qa_pairs = await self._format_qa_pairs(raw_records)

        elif dataset_type == DatasetType.WHISPER_TRANSCRIPT:
            dataset.conversations = await self._format_whisper_transcripts(raw_records)

        elif dataset_type == DatasetType.CALL_RECORDING:
            dataset.conversations = await self._format_call_recordings(raw_records)

        elif dataset_type == DatasetType.TRANSCRIPT:
            dataset.conversations = await self._format_transcripts(raw_records)

        elif dataset_type == DatasetType.FAQ:
            dataset.qa_pairs = await self._format_faq(raw_records)

        elif dataset_type == DatasetType.PROMPT:
            dataset.conversations = await self._format_prompts(raw_records)

        elif dataset_type == DatasetType.KNOWLEDGE:
            dataset.records = await self._format_knowledge(raw_records)

        else:
            # Generic format
            dataset.records = await self._format_generic(raw_records)

        dataset.add_processing_step("Formatted to unified structure")

        training_logger.info(
            f"Dataset formatted: {dataset.dataset_id}",
            conversations=len(dataset.conversations),
            qa_pairs=len(dataset.qa_pairs),
            records=len(dataset.records),
        )

        return dataset

    async def _format_conversations(
        self, records: List[Dict[str, Any]]
    ) -> List[Conversation]:
        """Format conversation records."""
        conversations = []

        for record in records:
            messages = []

            # Handle different message formats
            if "messages" in record:
                for msg in record["messages"]:
                    messages.append(Message(
                        speaker=msg.get("speaker", msg.get("role", "unknown")),
                        text=msg.get("text", msg.get("content", "")),
                        timestamp=msg.get("timestamp"),
                        metadata=msg.get("metadata", {}),
                    ))

            elif "turns" in record or "dialog" in record:
                turns = record.get("turns", record.get("dialog", []))
                for turn in turns:
                    messages.append(Message(
                        speaker=turn.get("speaker", "unknown"),
                        text=turn.get("text", ""),
                        timestamp=turn.get("timestamp"),
                    ))

            else:
                # Fallback: treat as single message
                messages.append(Message(
                    speaker="unknown",
                    text=record.get("text", str(record)),
                ))

            if messages:
                conversations.append(Conversation(
                    conversation_id=record.get("id", record.get("conversation_id")),
                    messages=messages,
                    intent=record.get("intent"),
                    sentiment=record.get("sentiment"),
                    metadata=record.get("metadata", {}),
                ))

        return conversations

    async def _format_qa_pairs(
        self, records: List[Dict[str, Any]]
    ) -> List[QuestionAnswer]:
        """Format QA pair records."""
        qa_pairs = []

        for record in records:
            question = record.get("question", record.get("q", ""))
            answer = record.get("answer", record.get("a", ""))

            if question and answer:
                qa_pairs.append(QuestionAnswer(
                    qa_id=record.get("id", record.get("qa_id")),
                    question=question,
                    answer=answer,
                    context=record.get("context"),
                    metadata=record.get("metadata", {}),
                ))

        return qa_pairs

    async def _format_whisper_transcripts(
        self, records: List[Dict[str, Any]]
    ) -> List[Conversation]:
        """Format Whisper transcript records."""
        conversations = []

        for record in records:
            messages = []

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
                messages.append(Message(
                    speaker="speaker",
                    text=record.get("text", ""),
                ))

            if messages:
                conversations.append(Conversation(
                    conversation_id=record.get("id"),
                    messages=messages,
                    metadata=record.get("metadata", {}),
                ))

        return conversations

    async def _format_call_recordings(
        self, records: List[Dict[str, Any]]
    ) -> List[Conversation]:
        """Format call recording records."""
        conversations = []

        for record in records:
            messages = []

            if "transcript" in record:
                for turn in record["transcript"]:
                    messages.append(Message(
                        speaker=turn.get("speaker", turn.get("role", "unknown")),
                        text=turn.get("text", turn.get("content", "")),
                        timestamp=turn.get("timestamp", turn.get("time")),
                        metadata=turn.get("metadata", {}),
                    ))

            if messages:
                conversations.append(Conversation(
                    conversation_id=record.get("call_id", record.get("id")),
                    messages=messages,
                    intent=record.get("intent", record.get("purpose")),
                    duration=record.get("duration"),
                    metadata=record.get("metadata", {}),
                ))

        return conversations

    async def _format_transcripts(
        self, records: List[Dict[str, Any]]
    ) -> List[Conversation]:
        """Format generic transcript records."""
        conversations = []

        for record in records:
            # Simple transcript - entire text as one message
            text = record.get("text", record.get("transcript", ""))

            if text:
                conversations.append(Conversation(
                    conversation_id=record.get("id"),
                    messages=[Message(speaker="speaker", text=text)],
                    metadata=record.get("metadata", {}),
                ))

        return conversations

    async def _format_faq(
        self, records: List[Dict[str, Any]]
    ) -> List[QuestionAnswer]:
        """Format FAQ records."""
        return await self._format_qa_pairs(records)

    async def _format_prompts(
        self, records: List[Dict[str, Any]]
    ) -> List[Conversation]:
        """Format prompt records as conversations."""
        conversations = []

        for record in records:
            messages = []

            # Prompt-response format
            prompt = record.get("prompt", record.get("input", ""))
            response = record.get("response", record.get("output", ""))

            if prompt:
                messages.append(Message(speaker="user", text=prompt))

            if response:
                messages.append(Message(speaker="assistant", text=response))

            if messages:
                conversations.append(Conversation(
                    conversation_id=record.get("id"),
                    messages=messages,
                    metadata=record.get("metadata", {}),
                ))

        return conversations

    async def _format_knowledge(
        self, records: List[Dict[str, Any]]
    ) -> List[DatasetRecord]:
        """Format knowledge records."""
        formatted = []

        for record in records:
            formatted.append(DatasetRecord(
                record_id=record.get("id"),
                data=record,
                metadata=record.get("metadata", {}),
            ))

        return formatted

    async def _format_generic(
        self, records: List[Dict[str, Any]]
    ) -> List[DatasetRecord]:
        """Format generic records."""
        formatted = []

        for record in records:
            formatted.append(DatasetRecord(
                record_id=record.get("id"),
                data=record,
                metadata=record.get("metadata", {}),
            ))

        return formatted

    async def convert_to_training_format(
        self, dataset: Dataset
    ) -> List[Dict[str, Any]]:
        """Convert dataset to training format (Future: for model training)."""
        training_data = []

        # Convert conversations
        for conv in dataset.conversations:
            training_data.append({
                "conversation_id": conv.conversation_id,
                "messages": [
                    {
                        "speaker": msg.speaker,
                        "text": msg.text,
                        "timestamp": msg.timestamp,
                    }
                    for msg in conv.messages
                ],
                "metadata": conv.metadata,
            })

        # Convert QA pairs
        for qa in dataset.qa_pairs:
            training_data.append({
                "qa_id": qa.qa_id,
                "question": qa.question,
                "answer": qa.answer,
                "context": qa.context,
                "metadata": qa.metadata,
            })

        return training_data
