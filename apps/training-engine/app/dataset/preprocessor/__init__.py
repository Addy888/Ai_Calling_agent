"""Dataset preprocessor module."""

import re
from typing import Optional

from app.dataset.models import (
    Conversation,
    Dataset,
    Language,
    PreprocessingConfig,
    QuestionAnswer,
)
from app.logger import training_logger


class DatasetPreprocessor:
    """Preprocess dataset for training."""

    def __init__(self, config: Optional[PreprocessingConfig] = None):
        """Initialize dataset preprocessor."""
        self.config = config or PreprocessingConfig()
        training_logger.info("Dataset preprocessor initialized")

    async def preprocess(self, dataset: Dataset) -> Dataset:
        """Preprocess entire dataset."""
        training_logger.info(f"Preprocessing dataset: {dataset.dataset_id}")

        # Preprocess conversations
        for conv in dataset.conversations:
            for msg in conv.messages:
                msg.text = await self._preprocess_text(msg.text)

        # Preprocess QA pairs
        for qa in dataset.qa_pairs:
            qa.question = await self._preprocess_text(qa.question)
            qa.answer = await self._preprocess_text(qa.answer)

        dataset.add_processing_step("Preprocessed text")

        training_logger.info(f"Dataset preprocessed: {dataset.dataset_id}")

        return dataset

    async def _preprocess_text(self, text: str) -> str:
        """Preprocess individual text."""
        # Remove HTML if configured
        if self.config.remove_html:
            text = self._remove_html(text)

        # Normalize unicode if configured
        if self.config.normalize_unicode:
            text = self._normalize_unicode(text)

        # Normalize whitespace if configured
        if self.config.normalize_whitespace:
            text = self._normalize_whitespace(text)

        # Lowercase if configured
        if self.config.lowercase:
            text = text.lower()

        # Remove special characters if configured
        if self.config.remove_special_chars:
            text = self._remove_special_chars(text)

        return text.strip()

    def _remove_html(self, text: str) -> str:
        """Remove HTML tags."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove HTML entities
        text = re.sub(r'&[a-z]+;', ' ', text)

        return text

    def _normalize_unicode(self, text: str) -> str:
        """Normalize unicode."""
        import unicodedata
        return unicodedata.normalize('NFC', text)

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace."""
        # Replace multiple spaces with single space
        text = re.sub(r' +', ' ', text)

        # Replace tabs with spaces
        text = text.replace('\t', ' ')

        # Normalize newlines
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n +', '\n', text)

        return text.strip()

    def _remove_special_chars(self, text: str) -> str:
        """Remove special characters."""
        # Keep only alphanumeric, spaces, and basic punctuation
        text = re.sub(r'[^\w\s.,!?;:\'-]', ' ', text)
        return text

    async def filter_by_language(
        self, dataset: Dataset, languages: list[Language]
    ) -> Dataset:
        """Filter dataset by language."""
        if not languages:
            return dataset

        # Filter conversations
        dataset.conversations = [
            conv for conv in dataset.conversations
            if conv.language in languages or conv.language is None
        ]

        dataset.add_processing_step(f"Filtered by languages: {[l.value for l in languages]}")

        return dataset

    async def filter_short_messages(
        self, dataset: Dataset, min_length: int = 1
    ) -> Dataset:
        """Filter out short messages."""
        for conv in dataset.conversations:
            conv.messages = [
                msg for msg in conv.messages
                if len(msg.text) >= min_length
            ]

        # Remove conversations with no messages
        dataset.conversations = [
            conv for conv in dataset.conversations
            if conv.messages
        ]

        dataset.add_processing_step(f"Filtered messages shorter than {min_length} chars")

        return dataset

    async def detect_languages(self, dataset: Dataset) -> Dataset:
        """Detect languages in dataset (placeholder)."""
        # Future: Implement language detection
        # For now, mark as unknown
        for conv in dataset.conversations:
            if not conv.language:
                conv.language = Language.UNKNOWN

        dataset.add_processing_step("Language detection (placeholder)")

        return dataset
