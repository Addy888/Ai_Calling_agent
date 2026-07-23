"""Dataset validator module."""

from typing import Dict, List, Optional

from app.dataset.exceptions import DatasetValidationException
from app.dataset.models import (
    Conversation,
    Dataset,
    QuestionAnswer,
    ValidationResult,
)
from app.logger import training_logger


class DatasetValidator:
    """Validate dataset quality and structure."""

    def __init__(self):
        """Initialize dataset validator."""
        training_logger.info("Dataset validator initialized")

    async def validate(self, dataset: Dataset) -> ValidationResult:
        """Validate complete dataset."""
        training_logger.info(f"Validating dataset: {dataset.dataset_id}")

        errors = []
        warnings = []
        statistics = {}

        # Validate basic structure
        if not dataset.metadata:
            errors.append("Missing dataset metadata")

        # Validate data presence
        total_data = (
            len(dataset.conversations) +
            len(dataset.qa_pairs) +
            len(dataset.records)
        )

        if total_data == 0:
            errors.append("Dataset is empty - no data found")
        else:
            statistics["total_items"] = total_data

        # Validate conversations
        if dataset.conversations:
            conv_errors, conv_warnings, conv_stats = await self._validate_conversations(
                dataset.conversations
            )
            errors.extend(conv_errors)
            warnings.extend(conv_warnings)
            statistics["conversations"] = conv_stats

        # Validate QA pairs
        if dataset.qa_pairs:
            qa_errors, qa_warnings, qa_stats = await self._validate_qa_pairs(
                dataset.qa_pairs
            )
            errors.extend(qa_errors)
            warnings.extend(qa_warnings)
            statistics["qa_pairs"] = qa_stats

        # Check for duplicates
        duplicate_stats = await self._check_duplicates(dataset)
        if duplicate_stats["duplicate_count"] > 0:
            warnings.append(
                f"Found {duplicate_stats['duplicate_count']} duplicate records"
            )
        statistics["duplicates"] = duplicate_stats

        is_valid = len(errors) == 0

        result = ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            statistics=statistics,
        )

        training_logger.info(
            f"Dataset validation complete: valid={is_valid}, errors={len(errors)}, warnings={len(warnings)}",
            dataset_id=dataset.dataset_id,
            is_valid=is_valid,
        )

        return result

    async def _validate_conversations(
        self, conversations: List[Conversation]
    ) -> tuple[List[str], List[str], Dict]:
        """Validate conversations."""
        errors = []
        warnings = []
        statistics = {
            "total": len(conversations),
            "empty": 0,
            "single_message": 0,
            "no_speaker": 0,
            "empty_messages": 0,
        }

        for idx, conv in enumerate(conversations):
            # Check if conversation has messages
            if not conv.messages:
                errors.append(f"Conversation {idx} has no messages")
                statistics["empty"] += 1
                continue

            # Warn if only one message
            if len(conv.messages) == 1:
                warnings.append(f"Conversation {idx} has only one message")
                statistics["single_message"] += 1

            # Validate messages
            for msg_idx, msg in enumerate(conv.messages):
                if not msg.text or not msg.text.strip():
                    errors.append(
                        f"Conversation {idx}, message {msg_idx} has empty text"
                    )
                    statistics["empty_messages"] += 1

                if not msg.speaker:
                    warnings.append(
                        f"Conversation {idx}, message {msg_idx} has no speaker"
                    )
                    statistics["no_speaker"] += 1

        return errors, warnings, statistics

    async def _validate_qa_pairs(
        self, qa_pairs: List[QuestionAnswer]
    ) -> tuple[List[str], List[str], Dict]:
        """Validate QA pairs."""
        errors = []
        warnings = []
        statistics = {
            "total": len(qa_pairs),
            "empty_questions": 0,
            "empty_answers": 0,
            "short_questions": 0,
            "short_answers": 0,
        }

        for idx, qa in enumerate(qa_pairs):
            # Check question
            if not qa.question or not qa.question.strip():
                errors.append(f"QA pair {idx} has empty question")
                statistics["empty_questions"] += 1
            elif len(qa.question) < 5:
                warnings.append(f"QA pair {idx} has very short question")
                statistics["short_questions"] += 1

            # Check answer
            if not qa.answer or not qa.answer.strip():
                errors.append(f"QA pair {idx} has empty answer")
                statistics["empty_answers"] += 1
            elif len(qa.answer) < 5:
                warnings.append(f"QA pair {idx} has very short answer")
                statistics["short_answers"] += 1

        return errors, warnings, statistics

    async def _check_duplicates(self, dataset: Dataset) -> Dict:
        """Check for duplicate records."""
        statistics = {
            "duplicate_count": 0,
            "duplicate_conversations": 0,
            "duplicate_qa": 0,
        }

        # Check duplicate conversations
        if dataset.conversations:
            seen = set()
            for conv in dataset.conversations:
                # Create hash from conversation text
                conv_text = "".join(msg.text for msg in conv.messages)
                if conv_text in seen:
                    statistics["duplicate_conversations"] += 1
                else:
                    seen.add(conv_text)

        # Check duplicate QA pairs
        if dataset.qa_pairs:
            seen = set()
            for qa in dataset.qa_pairs:
                qa_text = qa.question + qa.answer
                if qa_text in seen:
                    statistics["duplicate_qa"] += 1
                else:
                    seen.add(qa_text)

        statistics["duplicate_count"] = (
            statistics["duplicate_conversations"] + statistics["duplicate_qa"]
        )

        return statistics

    async def validate_file_structure(
        self, records: List[Dict], required_fields: Optional[List[str]] = None
    ) -> ValidationResult:
        """Validate file structure."""
        errors = []
        warnings = []

        if not records:
            errors.append("No records found")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)

        if required_fields:
            # Check if all records have required fields
            for idx, record in enumerate(records):
                missing = [field for field in required_fields if field not in record]
                if missing:
                    errors.append(
                        f"Record {idx} missing required fields: {', '.join(missing)}"
                    )

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            statistics={"total_records": len(records)},
        )
