"""Dataset splitter module."""

import random
from typing import Any, List

from app.dataset.models import (
    Dataset,
    DatasetSplit,
    SplitConfig,
    SplitType,
)
from app.logger import training_logger


class DatasetSplitter:
    """Split dataset into train/validation/test sets."""

    def __init__(self, config: SplitConfig):
        """Initialize dataset splitter."""
        self.config = config

        if not self.config.validate_ratios():
            raise ValueError("Split ratios must sum to 1.0")

        training_logger.info("Dataset splitter initialized")

    async def split(self, dataset: Dataset) -> Dataset:
        """Split dataset into train/validation/test."""
        training_logger.info(
            f"Splitting dataset: {dataset.dataset_id}",
            train_ratio=self.config.train_ratio,
            val_ratio=self.config.validation_ratio,
            test_ratio=self.config.test_ratio,
        )

        # Split conversations if present
        if dataset.conversations:
            train, val, test = await self._split_list(dataset.conversations)

            dataset.train_split = DatasetSplit(
                split_type=SplitType.TRAIN,
                size=len(train),
                percentage=self.config.train_ratio * 100,
                records=train,
            )

            dataset.validation_split = DatasetSplit(
                split_type=SplitType.VALIDATION,
                size=len(val),
                percentage=self.config.validation_ratio * 100,
                records=val,
            )

            dataset.test_split = DatasetSplit(
                split_type=SplitType.TEST,
                size=len(test),
                percentage=self.config.test_ratio * 100,
                records=test,
            )

        # Split QA pairs if present
        elif dataset.qa_pairs:
            train, val, test = await self._split_list(dataset.qa_pairs)

            dataset.train_split = DatasetSplit(
                split_type=SplitType.TRAIN,
                size=len(train),
                percentage=self.config.train_ratio * 100,
                records=train,
            )

            dataset.validation_split = DatasetSplit(
                split_type=SplitType.VALIDATION,
                size=len(val),
                percentage=self.config.validation_ratio * 100,
                records=val,
            )

            dataset.test_split = DatasetSplit(
                split_type=SplitType.TEST,
                size=len(test),
                percentage=self.config.test_ratio * 100,
                records=test,
            )

        dataset.add_processing_step(
            f"Split into train/val/test: {self.config.train_ratio}/{self.config.validation_ratio}/{self.config.test_ratio}"
        )

        training_logger.info(
            f"Dataset split complete: {dataset.dataset_id}",
            train_size=dataset.train_split.size if dataset.train_split else 0,
            val_size=dataset.validation_split.size if dataset.validation_split else 0,
            test_size=dataset.test_split.size if dataset.test_split else 0,
        )

        return dataset

    async def _split_list(
        self, items: List[Any]
    ) -> tuple[List[Any], List[Any], List[Any]]:
        """Split a list into train/validation/test sets."""
        # Shuffle if configured
        if self.config.shuffle:
            items = items.copy()
            random.seed(self.config.random_seed)
            random.shuffle(items)

        total = len(items)

        # Calculate split points
        train_size = int(total * self.config.train_ratio)
        val_size = int(total * self.config.validation_ratio)

        # Split
        train = items[:train_size]
        val = items[train_size:train_size + val_size]
        test = items[train_size + val_size:]

        return train, val, test

    def get_split_summary(self, dataset: Dataset) -> dict:
        """Get summary of dataset splits."""
        summary = {}

        if dataset.train_split:
            summary["train"] = {
                "size": dataset.train_split.size,
                "percentage": dataset.train_split.percentage,
            }

        if dataset.validation_split:
            summary["validation"] = {
                "size": dataset.validation_split.size,
                "percentage": dataset.validation_split.percentage,
            }

        if dataset.test_split:
            summary["test"] = {
                "size": dataset.test_split.size,
                "percentage": dataset.test_split.percentage,
            }

        return summary
