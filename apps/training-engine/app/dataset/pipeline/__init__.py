"""Dataset processing pipeline."""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from app.dataset.cache import dataset_cache
from app.dataset.cleaner import DatasetCleaner
from app.dataset.exceptions import DatasetProcessingException
from app.dataset.formatter import DatasetFormatter
from app.dataset.loader import DatasetLoader
from app.dataset.metadata import MetadataGenerator
from app.dataset.models import (
    Dataset,
    DatasetStatus,
    DatasetType,
    PreprocessingConfig,
    SplitConfig,
    ValidationResult,
)
from app.dataset.parser import DatasetParser
from app.dataset.preprocessor import DatasetPreprocessor
from app.dataset.splitter import DatasetSplitter
from app.dataset.storage import dataset_storage
from app.dataset.validator import DatasetValidator
from app.logger import training_logger


class DatasetPipeline:
    """Complete dataset processing pipeline."""

    def __init__(self):
        """Initialize dataset pipeline."""
        self.loader = DatasetLoader()
        self.parser = DatasetParser()
        self.validator = DatasetValidator()
        self.cleaner = DatasetCleaner()
        self.formatter = DatasetFormatter()
        self.metadata_generator = MetadataGenerator()

        training_logger.info("Dataset pipeline initialized")

    async def process_file(
        self,
        file_path: Union[str, Path],
        dataset_name: Optional[str] = None,
        dataset_type: Optional[DatasetType] = None,
        preprocessing_config: Optional[PreprocessingConfig] = None,
        split_config: Optional[SplitConfig] = None,
        save_to_storage: bool = True,
    ) -> Dataset:
        """Process dataset from file through complete pipeline."""
        training_logger.info(f"Starting pipeline for file: {file_path}")

        try:
            # 1. Load
            dataset = await self.load(file_path, dataset_name, dataset_type)

            # 2. Process
            dataset = await self.process(
                dataset,
                preprocessing_config=preprocessing_config,
                split_config=split_config,
            )

            # 3. Save if requested
            if save_to_storage:
                await dataset_storage.save(dataset)
                await dataset_cache.set(dataset)

            training_logger.info(f"Pipeline complete: {dataset.dataset_id}")

            return dataset

        except Exception as e:
            training_logger.error(f"Pipeline failed: {str(e)}")
            raise DatasetProcessingException(str(e))

    async def load(
        self,
        file_path: Union[str, Path],
        dataset_name: Optional[str] = None,
        dataset_type: Optional[DatasetType] = None,
    ) -> Dataset:
        """Load dataset from file."""
        training_logger.info("Pipeline Step 1: Loading")

        # Load file
        dataset = await self.loader.load_from_file(
            file_path,
            dataset_name,
            dataset_type,
        )

        # Read file content
        async with open(file_path, "rb") as f:
            content = await f.read()

        # Parse content
        raw_records = await self.parser.parse(
            content,
            dataset.metadata.format,
            dataset.metadata.dataset_type,
        )

        # Store raw records temporarily
        dataset.metadata.total_records = len(raw_records)

        # Format to unified structure
        dataset = await self.formatter.format(dataset, raw_records)

        dataset.status = DatasetStatus.LOADING
        return dataset

    async def validate(self, dataset: Dataset) -> ValidationResult:
        """Validate dataset."""
        training_logger.info("Pipeline Step 2: Validating")

        dataset.status = DatasetStatus.VALIDATING
        result = await self.validator.validate(dataset)

        # Store validation results
        for error in result.errors:
            dataset.add_error(error)

        for warning in result.warnings:
            dataset.add_warning(warning)

        return result

    async def clean(self, dataset: Dataset) -> Dataset:
        """Clean dataset."""
        training_logger.info("Pipeline Step 3: Cleaning")

        dataset.status = DatasetStatus.CLEANING
        dataset = await self.cleaner.clean(dataset)
        dataset = await self.cleaner.remove_empty_records(dataset)

        return dataset

    async def preprocess(
        self,
        dataset: Dataset,
        config: Optional[PreprocessingConfig] = None,
    ) -> Dataset:
        """Preprocess dataset."""
        training_logger.info("Pipeline Step 4: Preprocessing")

        dataset.status = DatasetStatus.PREPROCESSING

        preprocessor = DatasetPreprocessor(config or PreprocessingConfig())
        dataset = await preprocessor.preprocess(dataset)

        return dataset

    async def split(
        self,
        dataset: Dataset,
        config: Optional[SplitConfig] = None,
    ) -> Dataset:
        """Split dataset."""
        training_logger.info("Pipeline Step 5: Splitting")

        dataset.status = DatasetStatus.SPLITTING

        splitter = DatasetSplitter(config or SplitConfig())
        dataset = await splitter.split(dataset)

        return dataset

    async def generate_metadata(self, dataset: Dataset) -> Dataset:
        """Generate metadata."""
        training_logger.info("Pipeline Step 6: Generating Metadata")

        dataset = await self.metadata_generator.generate(dataset)

        return dataset

    async def process(
        self,
        dataset: Dataset,
        preprocessing_config: Optional[PreprocessingConfig] = None,
        split_config: Optional[SplitConfig] = None,
    ) -> Dataset:
        """Process dataset through all steps."""
        training_logger.info(f"Processing dataset: {dataset.dataset_id}")

        try:
            # Validate
            validation_result = await self.validate(dataset)
            if not validation_result.is_valid:
                raise DatasetProcessingException(
                    f"Dataset validation failed: {', '.join(validation_result.errors)}"
                )

            # Clean
            dataset = await self.clean(dataset)

            # Preprocess
            dataset = await self.preprocess(dataset, preprocessing_config)

            # Split
            if split_config or (dataset.conversations or dataset.qa_pairs):
                dataset = await self.split(dataset, split_config)

            # Generate metadata
            dataset = await self.generate_metadata(dataset)

            # Mark as ready
            dataset.status = DatasetStatus.READY

            training_logger.info(f"Dataset processing complete: {dataset.dataset_id}")

            return dataset

        except Exception as e:
            dataset.status = DatasetStatus.FAILED
            dataset.add_error(str(e))
            training_logger.error(f"Dataset processing failed: {str(e)}")
            raise

    async def get_dataset(self, dataset_id: str) -> Optional[Dataset]:
        """Get dataset by ID (from cache or storage)."""
        # Check cache first
        dataset = await dataset_cache.get(dataset_id)
        if dataset:
            return dataset

        # Load from storage
        dataset = await dataset_storage.load(dataset_id)
        if dataset:
            # Cache it
            await dataset_cache.set(dataset)

        return dataset

    async def delete_dataset(self, dataset_id: str) -> bool:
        """Delete dataset."""
        # Delete from cache
        await dataset_cache.delete(dataset_id)

        # Delete from storage
        return await dataset_storage.delete(dataset_id)

    def get_pipeline_summary(self, dataset: Dataset) -> Dict[str, Any]:
        """Get pipeline processing summary."""
        return {
            "dataset_id": dataset.dataset_id,
            "status": dataset.status.value,
            "processing_steps": dataset.processing_steps,
            "errors": dataset.errors,
            "warnings": dataset.warnings,
            "metadata": self.metadata_generator.get_metadata_summary(dataset.metadata),
        }


# Global pipeline instance
dataset_pipeline = DatasetPipeline()
