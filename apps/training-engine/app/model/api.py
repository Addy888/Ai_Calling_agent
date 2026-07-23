"""Model API routes."""

from fastapi import APIRouter, HTTPException, status
from typing import Optional

from app.logger import api_logger
from app.model.exceptions import (
    ModelException,
    ModelNotFoundException,
)
from app.model.health import model_health_checker
from app.model.manager import model_manager
from app.model.metadata import metadata_service
from app.model.models import ModelArchitecture, ModelStatus
from app.model.pipeline import model_pipeline
from app.model.schemas import (
    ApiResponse,
    CompatibilityResponse,
    LoadModelRequest,
    ModelDetailResponse,
    ModelHealthResponse,
    ModelListResponse,
    ModelMetadataResponse,
    ModelResponse,
    ModelStatsResponse,
    ModelStatusResponse,
    PrepareTrainingRequest,
    RegisterModelRequest,
    SystemHealthResponse,
    TrainingReadinessResponse,
    UpdateModelRequest,
    ValidationResponse,
)

router = APIRouter()


@router.post("/model/register", response_model=ApiResponse)
async def register_model(request: RegisterModelRequest):
    """Register a new model."""
    try:
        api_logger.info(f"Registering model: {request.model_name}")

        # Register through pipeline
        registry_entry = await model_pipeline.register_and_prepare(
            model_path=request.model_path,
            model_name=request.model_name,
            architecture=request.architecture,
            model_type=request.model_type,
            version=request.version,
            validate=request.validate,
            load=request.load,
            description=request.description,
            author=request.author,
            organization=request.organization,
            license=request.license,
            supported_languages=request.supported_languages,
            source=request.source,
            source_url=request.source_url,
            tags=request.tags,
            extra_metadata=request.extra_metadata,
        )

        return ApiResponse(
            success=True,
            message="Model registered successfully",
            data={
                "model_id": registry_entry.model_id,
                "name": registry_entry.name,
                "status": registry_entry.status.value,
            },
        )

    except Exception as e:
        api_logger.error(f"Failed to register model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/load", response_model=ApiResponse)
async def load_model(request: LoadModelRequest):
    """Load a model."""
    try:
        api_logger.info(f"Loading model: {request.model_id}")

        model_info = await model_manager.load_model(
            request.model_id,
            request,
        )

        return ApiResponse(
            success=True,
            message="Model loaded successfully",
            data={
                "model_id": model_info.model_id,
                "status": model_info.status.value,
                "load_time": model_info.load_time,
            },
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to load model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/unload", response_model=ApiResponse)
async def unload_model(model_id: str):
    """Unload a model."""
    try:
        api_logger.info(f"Unloading model: {model_id}")

        success = await model_manager.unload_model(model_id)

        return ApiResponse(
            success=success,
            message="Model unloaded successfully" if success else "Failed to unload model",
            data={"model_id": model_id},
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to unload model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/activate", response_model=ApiResponse)
async def activate_model(model_id: str):
    """Activate a model."""
    try:
        api_logger.info(f"Activating model: {model_id}")

        registry_entry = await model_manager.activate_model(model_id)

        return ApiResponse(
            success=True,
            message="Model activated successfully",
            data={
                "model_id": registry_entry.model_id,
                "is_active": registry_entry.is_active,
            },
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to activate model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/deactivate", response_model=ApiResponse)
async def deactivate_model(model_id: str):
    """Deactivate a model."""
    try:
        api_logger.info(f"Deactivating model: {model_id}")

        registry_entry = await model_manager.deactivate_model(model_id)

        return ApiResponse(
            success=True,
            message="Model deactivated successfully",
            data={
                "model_id": registry_entry.model_id,
                "is_active": registry_entry.is_active,
            },
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to deactivate model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/validate", response_model=ValidationResponse)
async def validate_model(model_id: str):
    """Validate a model."""
    try:
        api_logger.info(f"Validating model: {model_id}")

        validation_result = await model_manager.validate_model(model_id)
        validation = validation_result["validation"]

        return ValidationResponse(**validation)

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to validate model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/model/prepare-training", response_model=TrainingReadinessResponse)
async def prepare_training(request: PrepareTrainingRequest):
    """Prepare model for training."""
    try:
        api_logger.info(f"Preparing model for training: {request.model_id}")

        result = await model_pipeline.prepare_for_training(
            request.model_id,
            request.tokenizer_id,
            request.dataset_id,
        )

        # Convert to response format
        compatibility_responses = [
            CompatibilityResponse(**c) for c in result["compatibility"]
        ]

        errors = []
        warnings = []
        if not result["is_ready"]:
            errors = result["readiness"].get("errors", [])
            warnings = result["readiness"].get("warnings", [])

        return TrainingReadinessResponse(
            model_id=request.model_id,
            is_ready=result["is_ready"],
            readiness=result["readiness"],
            compatibility=compatibility_responses,
            errors=errors,
            warnings=warnings,
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to prepare training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/list", response_model=ModelListResponse)
async def list_models(
    architecture: Optional[str] = None,
    status: Optional[str] = None,
    active_only: bool = False,
):
    """List all models."""
    try:
        models = await model_manager.list_models(
            architecture=architecture,
            status=status,
            active_only=active_only,
        )

        model_responses = [
            ModelResponse(
                model_id=m.model_id,
                name=m.name,
                version=m.version,
                architecture=m.architecture.value,
                model_type=m.model_type.value,
                status=m.status.value,
                parameter_count=m.metadata.parameter_count,
                context_length=m.metadata.context_length,
                vocabulary_size=m.metadata.vocabulary_size,
                total_size_mb=m.metadata.total_size_mb,
                supported_languages=m.metadata.supported_languages,
                training_capabilities=[c.value for c in m.metadata.training_capabilities],
                is_active=m.is_active,
                is_default=m.is_default,
                is_loaded=model_manager.loader.is_loaded(m.model_id),
                source=m.metadata.source.value,
                created_at=m.registered_at,
                updated_at=m.updated_at,
            )
            for m in models
        ]

        return ModelListResponse(
            total=len(model_responses),
            models=model_responses,
        )

    except Exception as e:
        api_logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/{model_id}", response_model=ModelDetailResponse)
async def get_model(model_id: str):
    """Get model details."""
    try:
        registry_entry = await model_manager.get_model(model_id)

        return ModelDetailResponse(
            model_id=registry_entry.model_id,
            name=registry_entry.name,
            version=registry_entry.version,
            architecture=registry_entry.architecture.value,
            model_type=registry_entry.model_type.value,
            status=registry_entry.status.value,
            parameter_count=registry_entry.metadata.parameter_count,
            context_length=registry_entry.metadata.context_length,
            vocabulary_size=registry_entry.metadata.vocabulary_size,
            hidden_size=registry_entry.config.hidden_size,
            num_layers=registry_entry.config.num_layers,
            num_attention_heads=registry_entry.config.num_attention_heads,
            description=registry_entry.metadata.description,
            author=registry_entry.metadata.author,
            organization=registry_entry.metadata.organization,
            license=registry_entry.metadata.license,
            model_path=registry_entry.config.model_path,
            model_files=registry_entry.metadata.model_files,
            total_size_mb=registry_entry.metadata.total_size_mb,
            supported_languages=registry_entry.metadata.supported_languages,
            training_capabilities=[c.value for c in registry_entry.metadata.training_capabilities],
            compatible_tokenizers=registry_entry.metadata.compatible_tokenizers,
            is_active=registry_entry.is_active,
            is_default=registry_entry.is_default,
            is_loaded=model_manager.loader.is_loaded(model_id),
            source=registry_entry.metadata.source.value,
            source_url=registry_entry.metadata.source_url,
            training_count=registry_entry.metadata.training_count,
            inference_count=registry_entry.metadata.inference_count,
            created_at=registry_entry.registered_at,
            updated_at=registry_entry.updated_at,
            last_validated=registry_entry.metadata.last_validated,
            last_used=registry_entry.metadata.last_used,
            tags=registry_entry.metadata.tags,
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to get model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/status/{model_id}", response_model=ModelStatusResponse)
async def get_model_status(model_id: str):
    """Get model status."""
    try:
        registry_entry = await model_manager.get_model(model_id)
        is_loaded = model_manager.loader.is_loaded(model_id)

        return ModelStatusResponse(
            model_id=registry_entry.model_id,
            status=registry_entry.status.value,
            is_loaded=is_loaded,
            is_active=registry_entry.is_active,
            is_default=registry_entry.is_default,
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to get model status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/metadata/{model_id}", response_model=ModelMetadataResponse)
async def get_model_metadata(model_id: str):
    """Get model metadata."""
    try:
        registry_entry = await model_manager.get_model(model_id)
        summary = metadata_service.get_metadata_summary(registry_entry.metadata)

        return ModelMetadataResponse(**summary)

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to get model metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/health/{model_id}", response_model=ModelHealthResponse)
async def get_model_health(model_id: str):
    """Check model health."""
    try:
        health_status = await model_health_checker.check_model_health(model_id)

        return ModelHealthResponse(**health_status)

    except Exception as e:
        api_logger.error(f"Failed to check model health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/health", response_model=SystemHealthResponse)
async def get_system_health():
    """Check system health."""
    try:
        health_status = await model_health_checker.check_system_health()

        return SystemHealthResponse(**health_status)

    except Exception as e:
        api_logger.error(f"Failed to check system health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/model/stats", response_model=ModelStatsResponse)
async def get_model_stats():
    """Get model statistics."""
    try:
        pipeline_stats = await model_pipeline.get_pipeline_stats()
        models = await model_manager.list_models()

        # Count by architecture
        by_architecture = {}
        by_type = {}
        by_status = {}

        for model in models:
            arch = model.architecture.value
            by_architecture[arch] = by_architecture.get(arch, 0) + 1

            model_type = model.model_type.value
            by_type[model_type] = by_type.get(model_type, 0) + 1

            status_val = model.status.value
            by_status[status_val] = by_status.get(status_val, 0) + 1

        return ModelStatsResponse(
            total_models=len(models),
            active_models=sum(1 for m in models if m.is_active),
            loaded_models=by_status.get("loaded", 0),
            failed_models=by_status.get("failed", 0),
            archived_models=by_status.get("archived", 0),
            by_architecture=by_architecture,
            by_type=by_type,
            by_status=by_status,
            cache_stats=pipeline_stats["cache"],
            storage_stats=pipeline_stats["storage"],
        )

    except Exception as e:
        api_logger.error(f"Failed to get model stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/model/{model_id}", response_model=ApiResponse)
async def delete_model(model_id: str):
    """Delete a model."""
    try:
        api_logger.info(f"Deleting model: {model_id}")

        success = await model_pipeline.delete_model(model_id)

        if not success:
            raise ModelNotFoundException(model_id)

        return ApiResponse(
            success=True,
            message="Model deleted successfully",
            data={"model_id": model_id},
        )

    except ModelNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to delete model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
