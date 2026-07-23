"""Optimizer REST API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.logger import training_logger
from app.middleware import verify_token
from app.model.loader import model_loader
from app.optimizer.exceptions import (
    ConfigurationException,
    OptimizerException,
    OptimizerNotFoundError,
    SchedulerException,
)
from app.optimizer.factory import OptimizerFactory, optimizer_factory
from app.optimizer.manager import OptimizerManager, optimizer_manager
from app.optimizer.registry import OptimizerRegistry, optimizer_registry
from app.optimizer.runtime import OptimizerRuntime, optimizer_runtime
from app.optimizer.scheduler.manager import SchedulerManager, scheduler_manager
from app.optimizer.schemas import (
    CreateOptimizerRequest,
    CreateSchedulerRequest,
    OptimizerHealthResponse,
    OptimizerMetadata,
    OptimizerResponse,
    OptimizerStatusResponse,
    OptimizerType,
    ResetSchedulerRequest,
    SchedulerResponse,
    SchedulerStatusResponse,
    SchedulerType,
    ValidateOptimizerRequest,
    ValidationResult,
)
from app.optimizer.validator import OptimizerValidator, optimizer_validator

router = APIRouter(prefix="/optimizer")


@router.post(
    "/create",
    response_model=OptimizerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Optimizer",
)
async def create_optimizer(
    request: CreateOptimizerRequest,
    token: str = Depends(verify_token),
) -> OptimizerResponse:
    """Create optimizer and optional scheduler."""
    training_logger.info(
        f"Creating optimizer for model {request.model_id}"
    )

    try:
        # Load model
        model = model_loader.load_model(request.model_id)

        # Create optimizer with optional scheduler
        if request.scheduler_config:
            if request.scheduler_config.num_training_steps is None:
                raise ConfigurationException(
                    "num_training_steps required for scheduler"
                )

            result = optimizer_manager.create_optimizer_with_scheduler(
                model=model,
                optimizer_config=request.optimizer_config,
                scheduler_config=request.scheduler_config,
                model_id=request.model_id,
                num_training_steps=request.scheduler_config.num_training_steps,
            )

            return OptimizerResponse(
                success=True,
                message="Optimizer and scheduler created successfully",
                optimizer_id=result["optimizer_id"],
                metadata=result["optimizer_metadata"],
            )
        else:
            optimizer_id, optimizer, metadata = optimizer_manager.create_optimizer(
                model=model,
                config=request.optimizer_config,
                model_id=request.model_id,
            )

            return OptimizerResponse(
                success=True,
                message="Optimizer created successfully",
                optimizer_id=optimizer_id,
                metadata=metadata,
            )

    except ConfigurationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except OptimizerException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/validate",
    response_model=ValidationResult,
    summary="Validate Configuration",
)
async def validate_configuration(
    request: ValidateOptimizerRequest,
    token: str = Depends(verify_token),
) -> ValidationResult:
    """Validate optimizer and scheduler configuration."""
    try:
        report = optimizer_manager.validate_configuration(
            optimizer_config=request.optimizer_config,
            scheduler_config=request.scheduler_config,
            num_training_steps=request.num_training_steps,
        )

        return ValidationResult(**report)

    except Exception as e:
        training_logger.error(f"Validation failed: {str(e)}")
        return ValidationResult(
            valid=False,
            optimizer_valid=False,
            scheduler_valid=False,
            issues=[str(e)],
        )


@router.post(
    "/scheduler/create",
    response_model=SchedulerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Scheduler",
)
async def create_scheduler(
    request: CreateSchedulerRequest,
    token: str = Depends(verify_token),
) -> SchedulerResponse:
    """Create scheduler for existing optimizer."""
    try:
        if request.scheduler_config.num_training_steps is None:
            raise ConfigurationException("num_training_steps required")

        scheduler_id, scheduler, metadata = optimizer_manager.create_scheduler(
            optimizer_id=request.optimizer_id,
            config=request.scheduler_config,
            num_training_steps=request.scheduler_config.num_training_steps,
        )

        return SchedulerResponse(
            success=True,
            message="Scheduler created successfully",
            scheduler_id=scheduler_id,
            metadata=metadata,
        )

    except OptimizerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except (ConfigurationException, SchedulerException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/scheduler/reset",
    response_model=SchedulerResponse,
    summary="Reset Scheduler",
)
async def reset_scheduler(
    request: ResetSchedulerRequest,
    token: str = Depends(verify_token),
) -> SchedulerResponse:
    """Reset scheduler to initial state."""
    try:
        scheduler_manager.reset_scheduler(request.scheduler_id)

        return SchedulerResponse(
            success=True,
            message="Scheduler reset successfully",
            scheduler_id=request.scheduler_id,
        )

    except SchedulerException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/status/{optimizer_id}",
    response_model=OptimizerStatusResponse,
    summary="Get Optimizer Status",
)
async def get_optimizer_status(
    optimizer_id: str,
    token: str = Depends(verify_token),
) -> OptimizerStatusResponse:
    """Get optimizer status."""
    try:
        metadata = optimizer_registry.get_metadata(optimizer_id)
        current_lr = optimizer_runtime.get_current_lr(optimizer_id)
        state = optimizer_runtime.get_state(optimizer_id)

        return OptimizerStatusResponse(
            optimizer_id=optimizer_id,
            optimizer_type=metadata.optimizer_type,
            current_lr=current_lr,
            global_step=state.get("runtime_state", {}).get("global_step", 0),
            parameter_groups=metadata.parameter_groups,
        )

    except OptimizerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/scheduler/status/{scheduler_id}",
    response_model=SchedulerStatusResponse,
    summary="Get Scheduler Status",
)
async def get_scheduler_status(
    scheduler_id: str,
    token: str = Depends(verify_token),
) -> SchedulerStatusResponse:
    """Get scheduler status."""
    try:
        metadata = scheduler_manager.get_metadata(scheduler_id)
        current_lr = scheduler_manager.get_current_lr(scheduler_id)
        warmup_progress = scheduler_manager.get_warmup_progress(scheduler_id)
        warmup_completed = scheduler_manager.is_warmup_completed(scheduler_id)

        return SchedulerStatusResponse(
            scheduler_id=scheduler_id,
            scheduler_type=metadata["config"]["scheduler_type"],
            current_step=metadata["current_step"],
            total_steps=metadata["total_steps"],
            current_lr=current_lr,
            warmup_completed=warmup_completed,
            warmup_progress=warmup_progress,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/metadata/{optimizer_id}",
    response_model=OptimizerMetadata,
    summary="Get Optimizer Metadata",
)
async def get_optimizer_metadata(
    optimizer_id: str,
    token: str = Depends(verify_token),
) -> OptimizerMetadata:
    """Get optimizer metadata."""
    try:
        return optimizer_registry.get_metadata(optimizer_id)

    except OptimizerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/health",
    response_model=OptimizerHealthResponse,
    summary="Optimizer Health Check",
)
async def optimizer_health() -> OptimizerHealthResponse:
    """Check optimizer service health."""
    try:
        stats = optimizer_runtime.get_stats()

        return OptimizerHealthResponse(
            status="healthy",
            healthy=True,
            active_optimizers=stats["total_optimizers"],
            active_schedulers=stats["active_schedulers"],
            supported_optimizers=[t.value for t in OptimizerType],
            supported_schedulers=[t.value for t in SchedulerType],
        )

    except Exception as e:
        training_logger.error(f"Health check failed: {str(e)}")
        return OptimizerHealthResponse(
            status="unhealthy",
            healthy=False,
            active_optimizers=0,
            active_schedulers=0,
            supported_optimizers=[],
            supported_schedulers=[],
        )
