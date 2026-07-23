"""Dataset storage module."""

import json
from pathlib import Path
from typing import Optional

import aiofiles

from app.config import settings
from app.dataset.models import Dataset
from app.logger import training_logger


class DatasetStorage:
    """Store and retrieve datasets from file system."""

    def __init__(self, storage_dir: Optional[str] = None):
        """Initialize dataset storage."""
        self.storage_dir = Path(storage_dir or settings.TRAINING_DATA_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        training_logger.info(f"Dataset storage initialized: {self.storage_dir}")

    async def save(self, dataset: Dataset) -> Path:
        """Save dataset to storage."""
        file_path = self.storage_dir / f"{dataset.dataset_id}.json"

        training_logger.info(f"Saving dataset: {dataset.dataset_id}")

        try:
            async with aiofiles.open(file_path, mode="w", encoding="utf-8") as f:
                await f.write(dataset.model_dump_json(indent=2))

            training_logger.info(
                f"Dataset saved: {dataset.dataset_id}",
                path=str(file_path),
            )

            return file_path

        except Exception as e:
            training_logger.error(f"Failed to save dataset: {str(e)}")
            raise

    async def load(self, dataset_id: str) -> Optional[Dataset]:
        """Load dataset from storage."""
        file_path = self.storage_dir / f"{dataset_id}.json"

        if not file_path.exists():
            training_logger.warning(f"Dataset file not found: {dataset_id}")
            return None

        training_logger.info(f"Loading dataset: {dataset_id}")

        try:
            async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
                content = await f.read()
                data = json.loads(content)
                dataset = Dataset(**data)

            training_logger.info(f"Dataset loaded: {dataset_id}")
            return dataset

        except Exception as e:
            training_logger.error(f"Failed to load dataset: {str(e)}")
            raise

    async def delete(self, dataset_id: str) -> bool:
        """Delete dataset from storage."""
        file_path = self.storage_dir / f"{dataset_id}.json"

        if not file_path.exists():
            return False

        try:
            file_path.unlink()
            training_logger.info(f"Dataset deleted: {dataset_id}")
            return True

        except Exception as e:
            training_logger.error(f"Failed to delete dataset: {str(e)}")
            raise

    async def exists(self, dataset_id: str) -> bool:
        """Check if dataset exists in storage."""
        file_path = self.storage_dir / f"{dataset_id}.json"
        return file_path.exists()

    async def list_datasets(self) -> list[str]:
        """List all dataset IDs in storage."""
        dataset_files = self.storage_dir.glob("*.json")
        return [f.stem for f in dataset_files]

    async def save_split(
        self, dataset_id: str, split_name: str, data: list
    ) -> Path:
        """Save a dataset split."""
        split_dir = self.storage_dir / dataset_id
        split_dir.mkdir(parents=True, exist_ok=True)

        file_path = split_dir / f"{split_name}.json"

        training_logger.info(f"Saving split: {dataset_id}/{split_name}")

        try:
            async with aiofiles.open(file_path, mode="w", encoding="utf-8") as f:
                await f.write(json.dumps(data, indent=2, ensure_ascii=False))

            training_logger.info(f"Split saved: {dataset_id}/{split_name}")
            return file_path

        except Exception as e:
            training_logger.error(f"Failed to save split: {str(e)}")
            raise


# Global storage instance
dataset_storage = DatasetStorage()
