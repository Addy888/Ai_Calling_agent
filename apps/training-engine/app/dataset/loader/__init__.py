"""Dataset loader module."""

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import aiofiles

from app.dataset.exceptions import (
    DatasetFormatException,
    DatasetLoadException,
    UnsupportedFormatException,
)
from app.dataset.models import (
    Dataset,
    DatasetFormat,
    DatasetMetadata,
    DatasetStatus,
    DatasetType,
)
from app.logger import training_logger


class DatasetLoader:
    """Enterprise dataset loader."""

    SUPPORTED_FORMATS = {
        ".json": DatasetFormat.JSON,
        ".jsonl": DatasetFormat.JSONL,
        ".csv": DatasetFormat.CSV,
        ".txt": DatasetFormat.TXT,
        ".md": DatasetFormat.MARKDOWN,
        ".xlsx": DatasetFormat.EXCEL,
        ".xls": DatasetFormat.EXCEL,
        ".pdf": DatasetFormat.PDF,
    }

    def __init__(self):
        """Initialize dataset loader."""
        training_logger.info("Dataset loader initialized")

    async def load_from_file(
        self,
        file_path: Union[str, Path],
        dataset_name: Optional[str] = None,
        dataset_type: Optional[DatasetType] = None,
    ) -> Dataset:
        """Load dataset from file."""
        file_path = Path(file_path)

        if not file_path.exists():
            raise DatasetLoadException(f"File not found: {file_path}")

        training_logger.info(f"Loading dataset from: {file_path}")

        # Detect format
        file_format = self._detect_format(file_path)

        # Read file content
        content = await self._read_file(file_path)

        # Calculate file hash
        file_hash = self._calculate_hash(content)

        # Create metadata
        metadata = DatasetMetadata(
            name=dataset_name or file_path.stem,
            dataset_type=dataset_type or DatasetType.UNKNOWN,
            format=file_format,
            file_name=file_path.name,
            file_size=len(content),
            file_hash=file_hash,
        )

        # Create dataset
        dataset = Dataset(
            metadata=metadata,
            status=DatasetStatus.LOADING,
        )

        dataset.add_processing_step(f"Loaded from file: {file_path.name}")

        training_logger.info(
            f"Dataset loaded: {dataset.dataset_id}",
            dataset_id=dataset.dataset_id,
            format=file_format.value,
            size=len(content),
        )

        return dataset

    async def load_from_text(
        self,
        content: str,
        dataset_name: str,
        dataset_type: DatasetType,
        file_format: DatasetFormat,
    ) -> Dataset:
        """Load dataset from text content."""
        training_logger.info(f"Loading dataset from text: {dataset_name}")

        # Calculate content hash
        content_hash = self._calculate_hash(content.encode())

        # Create metadata
        metadata = DatasetMetadata(
            name=dataset_name,
            dataset_type=dataset_type,
            format=file_format,
            file_size=len(content),
            file_hash=content_hash,
        )

        # Create dataset
        dataset = Dataset(
            metadata=metadata,
            status=DatasetStatus.LOADING,
        )

        dataset.add_processing_step("Loaded from text content")

        training_logger.info(
            f"Dataset loaded from text: {dataset.dataset_id}",
            dataset_id=dataset.dataset_id,
        )

        return dataset

    async def load_from_dict(
        self,
        data: Union[Dict, List[Dict]],
        dataset_name: str,
        dataset_type: DatasetType,
    ) -> Dataset:
        """Load dataset from dictionary or list."""
        training_logger.info(f"Loading dataset from dict: {dataset_name}")

        # Convert to JSON for hashing
        content = json.dumps(data, sort_keys=True)
        content_hash = self._calculate_hash(content.encode())

        # Create metadata
        metadata = DatasetMetadata(
            name=dataset_name,
            dataset_type=dataset_type,
            format=DatasetFormat.JSON,
            file_size=len(content),
            file_hash=content_hash,
        )

        # Create dataset
        dataset = Dataset(
            metadata=metadata,
            status=DatasetStatus.LOADING,
        )

        dataset.add_processing_step("Loaded from dictionary")

        training_logger.info(
            f"Dataset loaded from dict: {dataset.dataset_id}",
            dataset_id=dataset.dataset_id,
        )

        return dataset

    def _detect_format(self, file_path: Path) -> DatasetFormat:
        """Detect file format from extension."""
        suffix = file_path.suffix.lower()

        if suffix not in self.SUPPORTED_FORMATS:
            raise UnsupportedFormatException(suffix)

        return self.SUPPORTED_FORMATS[suffix]

    async def _read_file(self, file_path: Path) -> bytes:
        """Read file content asynchronously."""
        try:
            async with aiofiles.open(file_path, mode="rb") as f:
                content = await f.read()
            return content
        except Exception as e:
            raise DatasetLoadException(f"Failed to read file: {str(e)}")

    def _calculate_hash(self, content: bytes) -> str:
        """Calculate SHA256 hash of content."""
        return hashlib.sha256(content).hexdigest()

    def get_dataset_summary(self, dataset: Dataset) -> Dict[str, Any]:
        """Get dataset summary."""
        return {
            "dataset_id": dataset.dataset_id,
            "name": dataset.metadata.name,
            "type": dataset.metadata.dataset_type.value,
            "format": dataset.metadata.format.value,
            "status": dataset.status.value,
            "total_records": dataset.metadata.total_records,
            "total_conversations": dataset.metadata.total_conversations,
            "total_messages": dataset.metadata.total_messages,
            "file_size": dataset.metadata.file_size,
            "created_at": dataset.metadata.created_at.isoformat(),
            "processing_steps": len(dataset.processing_steps),
            "errors": len(dataset.errors),
            "warnings": len(dataset.warnings),
        }
