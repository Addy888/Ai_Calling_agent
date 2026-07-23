"""Dataset metadata generator."""

from datetime import datetime

from app.dataset.models import Dataset, DatasetMetadata, Language
from app.logger import training_logger


class MetadataGenerator:
    """Generate comprehensive dataset metadata."""

    def __init__(self):
        """Initialize metadata generator."""
        training_logger.info("Metadata generator initialized")

    async def generate(self, dataset: Dataset) -> Dataset:
        """Generate metadata for dataset."""
        training_logger.info(f"Generating metadata for: {dataset.dataset_id}")

        metadata = dataset.metadata

        # Calculate statistics
        metadata.total_conversations = len(dataset.conversations)
        metadata.total_qa_pairs = len(dataset.qa_pairs)
        metadata.total_records = (
            len(dataset.conversations) +
            len(dataset.qa_pairs) +
            len(dataset.records)
        )

        # Calculate message statistics
        total_messages = 0
        total_characters = 0
        total_words = 0
        language_counts = {}

        for conv in dataset.conversations:
            total_messages += len(conv.messages)

            for msg in conv.messages:
                total_characters += len(msg.text)
                total_words += len(msg.text.split())

                # Count languages
                if msg.language:
                    lang = msg.language.value
                    language_counts[lang] = language_counts.get(lang, 0) + 1

        metadata.total_messages = total_messages

        # Calculate averages
        if metadata.total_conversations > 0:
            metadata.avg_conversation_length = (
                total_messages / metadata.total_conversations
            )

        if total_messages > 0:
            metadata.avg_message_length = total_characters / total_messages

        metadata.total_characters = total_characters
        metadata.total_words = total_words

        # Language distribution
        if language_counts:
            metadata.languages = [
                Language(lang) for lang in language_counts.keys()
            ]
            metadata.language_distribution = language_counts

        # Set processed timestamp
        metadata.processed_at = datetime.utcnow()

        dataset.add_processing_step("Generated metadata")

        training_logger.info(
            f"Metadata generated: {dataset.dataset_id}",
            total_records=metadata.total_records,
            total_messages=metadata.total_messages,
            total_words=metadata.total_words,
        )

        return dataset

    def get_metadata_summary(self, metadata: DatasetMetadata) -> dict:
        """Get metadata summary."""
        return {
            "dataset_id": metadata.dataset_id,
            "name": metadata.name,
            "dataset_type": metadata.dataset_type.value,
            "format": metadata.format.value,
            "statistics": {
                "total_records": metadata.total_records,
                "total_conversations": metadata.total_conversations,
                "total_messages": metadata.total_messages,
                "total_qa_pairs": metadata.total_qa_pairs,
                "total_characters": metadata.total_characters,
                "total_words": metadata.total_words,
                "avg_conversation_length": metadata.avg_conversation_length,
                "avg_message_length": metadata.avg_message_length,
            },
            "quality": {
                "duplicate_count": metadata.duplicate_count,
                "empty_count": metadata.empty_count,
                "invalid_count": metadata.invalid_count,
            },
            "languages": [lang.value for lang in metadata.languages],
            "language_distribution": metadata.language_distribution,
            "file_info": {
                "file_name": metadata.file_name,
                "file_size": metadata.file_size,
                "file_hash": metadata.file_hash,
            },
            "timestamps": {
                "created_at": metadata.created_at.isoformat() if metadata.created_at else None,
                "processed_at": metadata.processed_at.isoformat() if metadata.processed_at else None,
            },
        }
