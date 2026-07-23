"""Dataset cleaner module."""

import re
from typing import List, Set

from app.dataset.models import (
    Conversation,
    Dataset,
    Message,
    QuestionAnswer,
)
from app.logger import training_logger


class DatasetCleaner:
    """Clean and normalize dataset."""

    def __init__(self):
        """Initialize dataset cleaner."""
        training_logger.info("Dataset cleaner initialized")

    async def clean(self, dataset: Dataset) -> Dataset:
        """Clean entire dataset."""
        training_logger.info(f"Cleaning dataset: {dataset.dataset_id}")

        original_counts = {
            "conversations": len(dataset.conversations),
            "qa_pairs": len(dataset.qa_pairs),
            "records": len(dataset.records),
        }

        # Remove duplicates
        dataset = await self.remove_duplicates(dataset)

        # Clean conversations
        dataset.conversations = await self._clean_conversations(dataset.conversations)

        # Clean QA pairs
        dataset.qa_pairs = await self._clean_qa_pairs(dataset.qa_pairs)

        # Update metadata
        removed_counts = {
            "conversations": original_counts["conversations"] - len(dataset.conversations),
            "qa_pairs": original_counts["qa_pairs"] - len(dataset.qa_pairs),
            "records": original_counts["records"] - len(dataset.records),
        }

        dataset.metadata.duplicate_count = sum(removed_counts.values())
        dataset.add_processing_step(
            f"Cleaned: removed {dataset.metadata.duplicate_count} items"
        )

        training_logger.info(
            f"Dataset cleaned: {dataset.dataset_id}",
            removed=removed_counts,
        )

        return dataset

    async def remove_duplicates(self, dataset: Dataset) -> Dataset:
        """Remove duplicate records."""
        # Remove duplicate conversations
        if dataset.conversations:
            seen: Set[str] = set()
            unique_conversations = []

            for conv in dataset.conversations:
                conv_text = "".join(msg.text for msg in conv.messages)
                if conv_text not in seen:
                    seen.add(conv_text)
                    unique_conversations.append(conv)

            removed = len(dataset.conversations) - len(unique_conversations)
            dataset.conversations = unique_conversations

            if removed > 0:
                dataset.add_warning(f"Removed {removed} duplicate conversations")

        # Remove duplicate QA pairs
        if dataset.qa_pairs:
            seen: Set[str] = set()
            unique_qa = []

            for qa in dataset.qa_pairs:
                qa_text = qa.question + qa.answer
                if qa_text not in seen:
                    seen.add(qa_text)
                    unique_qa.append(qa)

            removed = len(dataset.qa_pairs) - len(unique_qa)
            dataset.qa_pairs = unique_qa

            if removed > 0:
                dataset.add_warning(f"Removed {removed} duplicate QA pairs")

        return dataset

    async def _clean_conversations(
        self, conversations: List[Conversation]
    ) -> List[Conversation]:
        """Clean conversations."""
        cleaned = []

        for conv in conversations:
            # Remove empty messages
            conv.messages = [
                msg for msg in conv.messages
                if msg.text and msg.text.strip()
            ]

            # Skip conversations with no messages
            if not conv.messages:
                continue

            # Clean individual messages
            for msg in conv.messages:
                msg.text = await self._clean_text(msg.text)

            cleaned.append(conv)

        return cleaned

    async def _clean_qa_pairs(
        self, qa_pairs: List[QuestionAnswer]
    ) -> List[QuestionAnswer]:
        """Clean QA pairs."""
        cleaned = []

        for qa in qa_pairs:
            # Skip if empty
            if not qa.question or not qa.answer:
                continue

            if not qa.question.strip() or not qa.answer.strip():
                continue

            # Clean text
            qa.question = await self._clean_text(qa.question)
            qa.answer = await self._clean_text(qa.answer)

            cleaned.append(qa)

        return cleaned

    async def _clean_text(self, text: str) -> str:
        """Clean individual text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove leading/trailing whitespace
        text = text.strip()

        # Remove broken characters
        text = text.replace('\x00', '')
        text = text.replace('\ufffd', '')

        return text

    async def remove_empty_records(self, dataset: Dataset) -> Dataset:
        """Remove empty records."""
        # Remove empty conversations
        dataset.conversations = [
            conv for conv in dataset.conversations
            if conv.messages and any(msg.text.strip() for msg in conv.messages)
        ]

        # Remove empty QA pairs
        dataset.qa_pairs = [
            qa for qa in dataset.qa_pairs
            if qa.question.strip() and qa.answer.strip()
        ]

        dataset.add_processing_step("Removed empty records")

        return dataset

    async def normalize_unicode(self, dataset: Dataset) -> Dataset:
        """Normalize unicode characters."""
        for conv in dataset.conversations:
            for msg in conv.messages:
                msg.text = self._normalize_unicode_text(msg.text)

        for qa in dataset.qa_pairs:
            qa.question = self._normalize_unicode_text(qa.question)
            qa.answer = self._normalize_unicode_text(qa.answer)

        dataset.add_processing_step("Normalized unicode")

        return dataset

    def _normalize_unicode_text(self, text: str) -> str:
        """Normalize unicode in text."""
        # Normalize to NFC form
        import unicodedata
        return unicodedata.normalize('NFC', text)

    async def normalize_whitespace(self, dataset: Dataset) -> Dataset:
        """Normalize whitespace in dataset."""
        for conv in dataset.conversations:
            for msg in conv.messages:
                msg.text = self._normalize_whitespace_text(msg.text)

        for qa in dataset.qa_pairs:
            qa.question = self._normalize_whitespace_text(qa.question)
            qa.answer = self._normalize_whitespace_text(qa.answer)

        dataset.add_processing_step("Normalized whitespace")

        return dataset

    def _normalize_whitespace_text(self, text: str) -> str:
        """Normalize whitespace in text."""
        # Replace multiple spaces with single space
        text = re.sub(r' +', ' ', text)

        # Replace multiple newlines with double newline
        text = re.sub(r'\n\n+', '\n\n', text)

        # Remove trailing whitespace from lines
        text = '\n'.join(line.rstrip() for line in text.split('\n'))

        return text.strip()
