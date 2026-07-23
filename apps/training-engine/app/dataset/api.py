"""Dataset API routes."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import Optional

from app.dataset.exceptions import (
    DatasetException,
    DatasetNotFoundException,
)
from app.dataset.models import (
    DatasetType,
    DatasetFormat,
    PreprocessingConfig,
    SplitConfig,
)
from app.dataset.pipeline import dataset_pipeline
from app.dataset.schemas import (
    ApiResponse,
    DatasetResponse,
    DatasetStatusResponse,
    DatasetSummaryResponse,
    PreprocessDatasetRequest,
    ProcessDatasetRequest,
    SplitDatasetRequest,
    SplitResponse,
    UploadDatasetRequest,
    ValidationResponse,
    ProcessingStatsResponse,
)
from app.dataset.storage import dataset_storage
from app.dataset.cache import dataset_cache
from app.logger import api_logger

router = APIRouter()


@router.post("/dataset/upload", response_model=ApiResponse)
async def upload_dataset(request: UploadDatasetRequest):
    """Upload and process dataset."""
    try:
        api_logger.info(f"Uploading dataset: {request.dataset_name}")

        # Load from content
        dataset = await dataset_pipeline.loader.load_from_text(
            content=request.content,
            dataset_name=request.dataset_name,
            dataset_type=request.dataset_type,
            file_format=request.file_format,
        )

        # Set additional metadata
        if request.company_name:
            dataset.metadata.company_name = request.company_name
        if request.project_id:
            dataset.metadata.project_id = request.project_id
        if request.user_id:
            dataset.metadata.user_id = request.user_id

        # Parse and format
        raw_records = await dataset_pipeline.parser.parse(
            request.content,
            request.file_format,
            request.dataset_type,
        )

        dataset = await dataset_pipeline.formatter.format(dataset, raw_records)

        # Save to storage
        await dataset_storage.save(dataset)
        await dataset_cache.set(dataset)

        return ApiResponse(
            success=True,
            message="Dataset uploaded successfully",
            data={"dataset_id": dataset.dataset_id},
        )

    except Exception as e:
        api_logger.error(f"Failed to upload dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/dataset/process", response_model=DatasetResponse)
async def process_dataset(request: ProcessDatasetRequest):
    """Process dataset through complete pipeline."""
    try:
        api_logger.info(f"Processing dataset: {request.dataset_name}")

        # Load from content
        dataset = await dataset_pipeline.loader.load_from_text(
            content=request.content,
            dataset_name=request.dataset_name,
            dataset_type=request.dataset_type,
            file_format=request.file_format,
        )

        # Set metadata
        if request.company_name:
            dataset.metadata.company_name = request.company_name
        if request.project_id:
            dataset.metadata.project_id = request.project_id
        if request.user_id:
            dataset.metadata.user_id = request.user_id

        # Parse
        raw_records = await dataset_pipeline.parser.parse(
            request.content,
            request.file_format,
            request.dataset_type,
        )

        # Format
        dataset = await dataset_pipeline.formatter.format(dataset, raw_records)

        # Create configs
        preprocessing_config = None
        if request.preprocessing:
            preprocessing_config = PreprocessingConfig(**request.preprocessing)

        split_config = None
        if request.split_config:
            split_config = SplitConfig(**request.split_config)

        # Process through pipeline
        dataset = await dataset_pipeline.process(
            dataset,
            preprocessing_config=preprocessing_config,
            split_config=split_config,
        )

        # Save
        await dataset_storage.save(dataset)
        await dataset_cache.set(dataset)

        return DatasetResponse(
            dataset_id=dataset.dataset_id,
            name=dataset.metadata.name,
            dataset_type=dataset.metadata.dataset_type,
            format=dataset.metadata.format,
            status=dataset.status,
            total_records=dataset.metadata.total_records,
            total_conversations=dataset.metadata.total_conversations,
            total_messages=dataset.metadata.total_messages,
            total_qa_pairs=dataset.metadata.total_qa_pairs,
            created_at=dataset.metadata.created_at,
            processed_at=dataset.metadata.processed_at,
            errors=dataset.errors,
            warnings=dataset.warnings,
        )

    except Exception as e:
        api_logger.error(f"Failed to process dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/dataset/validate", response_model=ValidationResponse)
async def validate_dataset(dataset_id: str):
    """Validate dataset."""
    try:
        api_logger.info(f"Validating dataset: {dataset_id}")

        dataset = await dataset_pipeline.get_dataset(dataset_id)
        if not dataset:
            raise DatasetNotFoundException(dataset_id)

        result = await dataset_pipeline.validate(dataset)

        return ValidationResponse(
            dataset_id=dataset_id,
            is_valid=result.is_valid,
            errors=result.errors,
            warnings=result.warnings,
            statistics=result.statistics,
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to validate dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/dataset/preprocess", response_model=ApiResponse)
async def preprocess_dataset(request: PreprocessDatasetRequest):
    """Preprocess dataset."""
    try:
        api_logger.info(f"Preprocessing dataset: {request.dataset_id}")

        dataset = await dataset_pipeline.get_dataset(request.dataset_id)
        if not dataset:
            raise DatasetNotFoundException(request.dataset_id)

        # Create config from request
        config = PreprocessingConfig(
            lowercase=request.lowercase,
            remove_html=request.remove_html,
            normalize_whitespace=request.normalize_whitespace,
            normalize_unicode=request.normalize_unicode,
            remove_special_chars=request.remove_special_chars,
            remove_duplicates=request.remove_duplicates,
            remove_empty=request.remove_empty,
            detect_language=request.detect_language,
        )

        # Preprocess
        dataset = await dataset_pipeline.preprocess(dataset, config)

        # Save
        await dataset_storage.save(dataset)
        await dataset_cache.set(dataset)

        return ApiResponse(
            success=True,
            message="Dataset preprocessed successfully",
            data={"dataset_id": dataset.dataset_id},
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to preprocess dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/dataset/split", response_model=SplitResponse)
async def split_dataset(request: SplitDatasetRequest):
    """Split dataset into train/val/test."""
    try:
        api_logger.info(f"Splitting dataset: {request.dataset_id}")

        dataset = await dataset_pipeline.get_dataset(request.dataset_id)
        if not dataset:
            raise DatasetNotFoundException(request.dataset_id)

        # Create split config
        config = SplitConfig(
            train_ratio=request.train_ratio,
            validation_ratio=request.validation_ratio,
            test_ratio=request.test_ratio,
            shuffle=request.shuffle,
            random_seed=request.random_seed,
        )

        # Split
        dataset = await dataset_pipeline.split(dataset, config)

        # Save
        await dataset_storage.save(dataset)
        await dataset_cache.set(dataset)

        return SplitResponse(
            dataset_id=dataset.dataset_id,
            train_size=dataset.train_split.size if dataset.train_split else 0,
            validation_size=dataset.validation_split.size if dataset.validation_split else 0,
            test_size=dataset.test_split.size if dataset.test_split else 0,
            train_percentage=dataset.train_split.percentage if dataset.train_split else 0,
            validation_percentage=dataset.validation_split.percentage if dataset.validation_split else 0,
            test_percentage=dataset.test_split.percentage if dataset.test_split else 0,
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to split dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/dataset/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: str):
    """Get dataset by ID."""
    try:
        dataset = await dataset_pipeline.get_dataset(dataset_id)
        if not dataset:
            raise DatasetNotFoundException(dataset_id)

        return DatasetResponse(
            dataset_id=dataset.dataset_id,
            name=dataset.metadata.name,
            dataset_type=dataset.metadata.dataset_type,
            format=dataset.metadata.format,
            status=dataset.status,
            total_records=dataset.metadata.total_records,
            total_conversations=dataset.metadata.total_conversations,
            total_messages=dataset.metadata.total_messages,
            total_qa_pairs=dataset.metadata.total_qa_pairs,
            created_at=dataset.metadata.created_at,
            processed_at=dataset.metadata.processed_at,
            errors=dataset.errors,
            warnings=dataset.warnings,
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/dataset/summary/{dataset_id}", response_model=DatasetSummaryResponse)
async def get_dataset_summary(dataset_id: str):
    """Get dataset summary."""
    try:
        dataset = await dataset_pipeline.get_dataset(dataset_id)
        if not dataset:
            raise DatasetNotFoundException(dataset_id)

        summary = dataset_pipeline.metadata_generator.get_metadata_summary(
            dataset.metadata
        )

        return DatasetSummaryResponse(
            dataset_id=dataset.dataset_id,
            name=dataset.metadata.name,
            dataset_type=dataset.metadata.dataset_type,
            format=dataset.metadata.format,
            status=dataset.status,
            statistics=summary["statistics"],
            quality=summary["quality"],
            languages=summary["languages"],
            language_distribution=summary["language_distribution"],
            file_info=summary["file_info"],
            timestamps=summary["timestamps"],
            processing_steps=len(dataset.processing_steps),
            errors=len(dataset.errors),
            warnings=len(dataset.warnings),
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/dataset/status/{dataset_id}", response_model=DatasetStatusResponse)
async def get_dataset_status(dataset_id: str):
    """Get dataset processing status."""
    try:
        dataset = await dataset_pipeline.get_dataset(dataset_id)
        if not dataset:
            raise DatasetNotFoundException(dataset_id)

        # Calculate progress based on status
        progress_map = {
            "pending": 0,
            "loading": 10,
            "validating": 30,
            "cleaning": 50,
            "preprocessing": 60,
            "formatting": 70,
            "splitting": 85,
            "ready": 100,
            "failed": 0,
        }

        progress = progress_map.get(dataset.status.value, 0)

        return DatasetStatusResponse(
            dataset_id=dataset.dataset_id,
            status=dataset.status,
            progress=progress,
            current_step=dataset.processing_steps[-1] if dataset.processing_steps else None,
            processing_steps=dataset.processing_steps,
            errors=dataset.errors,
            warnings=dataset.warnings,
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/dataset/{dataset_id}", response_model=ApiResponse)
async def delete_dataset(dataset_id: str):
    """Delete dataset."""
    try:
        success = await dataset_pipeline.delete_dataset(dataset_id)

        if not success:
            raise DatasetNotFoundException(dataset_id)

        return ApiResponse(
            success=True,
            message="Dataset deleted successfully",
            data={"dataset_id": dataset_id},
        )

    except DatasetNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/dataset/stats/processing", response_model=ProcessingStatsResponse)
async def get_processing_stats():
    """Get processing statistics."""
    try:
        # Get all dataset IDs
        dataset_ids = await dataset_storage.list_datasets()

        stats = {
            "total_datasets": len(dataset_ids),
            "processing": 0,
            "ready": 0,
            "failed": 0,
        }

        # Count by status
        for dataset_id in dataset_ids:
            dataset = await dataset_pipeline.get_dataset(dataset_id)
            if dataset:
                if dataset.status.value == "ready":
                    stats["ready"] += 1
                elif dataset.status.value == "failed":
                    stats["failed"] += 1
                else:
                    stats["processing"] += 1

        # Get cache stats
        cache_stats = dataset_cache.get_cache_stats()

        return ProcessingStatsResponse(
            total_datasets=stats["total_datasets"],
            processing=stats["processing"],
            ready=stats["ready"],
            failed=stats["failed"],
            cache_entries=cache_stats["total_entries"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
