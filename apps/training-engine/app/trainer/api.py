"""Trainer REST API Endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.logger import training_logger
from app.trainer.health import trainer_health_checker
from app.trainer.schemas import (
    ApiResponse,
    CreateTrainerRequest,
    InitializeTrainerRequest,
    StartTrainingRequest,
    TrainerHealthResponse,
    TrainerResponse,
    TrainerRuntimeResponse,
    TrainerStatusResponse,
    TrainingResultResponse,
)
from app.trainer.trainer_factory import trainer_factory
from app.trainer.trainer_runtime import trainer_runtime_manager
from app.training_executor.executor import training_executor


router = APIRouter()


@router.post("/trainer/create", response_model=TrainerResponse)
async def create_trainer_endpoint(request: CreateTrainerRequest):
    """
    Create trainer instance.
    
    Args:
        request: Create trainer request
        
    Returns:
        Trainer response
    """
    try:
        training_logger.info(f"Creating trainer for job: {request.job_id}")

        # Get job context
        job = await training_executor.get_job(request.job_id)

        # Note: Trainer creation is deferred until initialization
        # This endpoint is mainly for validation

        # Validate training type compatibility
        from app.training_executor.runtime_manager import runtime_manager

        context = await runtime_manager.create_training_context(
            job=job,
            dataset_metadata={},  # Will be loaded during initialization
            tokenizer_metadata={},
            model_metadata={},
        )

        # Validate compatibility
        is_compatible = trainer_factory.validate_compatibility(context)

        if not is_compatible:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Training configuration not compatible",
            )

        return TrainerResponse(
            job_id=request.job_id,
            trainer_type=request.trainer_type or "hf_trainer",
            status="validated",
            message="Trainer configuration validated",
        )

    except HTTPException:
        raise
    except Exception as e:
        training_logger.error(f"Failed to create trainer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trainer creation failed: {str(e)}",
        )


@router.post("/trainer/initialize", response_model=TrainerResponse)
async def initialize_trainer_endpoint(request: InitializeTrainerRequest):
    """
    Initialize trainer with context.
    
    Args:
        request: Initialize trainer request
        
    Returns:
        Trainer response
    """
    try:
        training_logger.info(f"Initializing trainer for job: {request.job_id}")

        # Get job
        job = await training_executor.get_job(request.job_id)

        # Load context from pipeline
        from app.training_executor.pipeline import training_pipeline
        from app.training_executor.runtime_manager import runtime_manager

        # Load metadata
        dataset_metadata = await training_pipeline._load_dataset_metadata(job)
        model_metadata = await training_pipeline._load_model_metadata(job)
        tokenizer_metadata = await training_pipeline._load_tokenizer_metadata(job)

        # Initialize runtime
        runtime_info = await runtime_manager.initialize_runtime(job)

        # Create context
        context = await runtime_manager.create_training_context(
            job=job,
            dataset_metadata=dataset_metadata,
            tokenizer_metadata=tokenizer_metadata,
            model_metadata=model_metadata,
        )

        # Create trainer
        trainer = trainer_factory.create_trainer(context)

        # Create runtime
        runtime = trainer_runtime_manager.create_runtime(request.job_id)

        # Initialize runtime
        await runtime.initialize(trainer, context)

        return TrainerResponse(
            job_id=request.job_id,
            trainer_type="hf_trainer",
            status="initialized",
            message="Trainer initialized successfully",
        )

    except Exception as e:
        training_logger.error(f"Failed to initialize trainer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trainer initialization failed: {str(e)}",
        )


@router.post("/trainer/start", response_model=TrainingResultResponse)
async def start_training_endpoint(request: StartTrainingRequest):
    """
    Start training execution.
    
    Args:
        request: Start training request
        
    Returns:
        Training result response
    """
    try:
        training_logger.info(f"Starting training for job: {request.job_id}")

        # Get runtime
        runtime = trainer_runtime_manager.get_runtime(request.job_id)

        if runtime is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trainer runtime not found for job {request.job_id}",
            )

        # Start training
        result = await runtime.start_training()

        return TrainingResultResponse(
            job_id=request.job_id,
            status=result.get("status", "completed"),
            duration_seconds=result.get("duration_seconds"),
            metrics=result.get("metrics", {}),
            model_path=result.get("model_path"),
            message="Training completed successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        training_logger.error(f"Failed to start training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training execution failed: {str(e)}",
        )


@router.get("/trainer/status/{job_id}", response_model=TrainerStatusResponse)
async def get_trainer_status(job_id: str):
    """
    Get trainer status.
    
    Args:
        job_id: Training job ID
        
    Returns:
        Trainer status response
    """
    try:
        runtime = trainer_runtime_manager.get_runtime(job_id)

        if runtime is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trainer runtime not found for job {job_id}",
            )

        state = runtime.get_state()

        return TrainerStatusResponse(
            job_id=job_id,
            state=state["state"],
            trainer_initialized=True,
            started_at=state.get("started_at"),
            completed_at=state.get("completed_at"),
            elapsed_seconds=state.get("elapsed_seconds"),
            error=state.get("error"),
        )

    except HTTPException:
        raise
    except Exception as e:
        training_logger.error(f"Failed to get trainer status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trainer status: {str(e)}",
        )


@router.get("/trainer/runtime/{job_id}", response_model=TrainerRuntimeResponse)
async def get_trainer_runtime(job_id: str):
    """
    Get trainer runtime information.
    
    Args:
        job_id: Training job ID
        
    Returns:
        Trainer runtime response
    """
    try:
        runtime = trainer_runtime_manager.get_runtime(job_id)

        if runtime is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trainer runtime not found for job {job_id}",
            )

        state = runtime.get_state()

        return TrainerRuntimeResponse(
            job_id=job_id,
            state=state["state"],
            started_at=state.get("started_at"),
            completed_at=state.get("completed_at"),
            elapsed_seconds=state.get("elapsed_seconds"),
            trainer_status=state.get("trainer_status"),
        )

    except HTTPException:
        raise
    except Exception as e:
        training_logger.error(f"Failed to get trainer runtime: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trainer runtime: {str(e)}",
        )


@router.get("/trainer/health", response_model=TrainerHealthResponse)
async def get_trainer_health():
    """
    Get trainer service health.
    
    Returns:
        Trainer health response
    """
    try:
        health = await trainer_health_checker.check_health()

        return TrainerHealthResponse(
            status=health["status"],
            active_trainers=health.get("active_trainers", 0),
            total_trainers=health.get("total_trainers", 0),
            healthy=health["healthy"],
            timestamp=health["timestamp"],
        )

    except Exception as e:
        training_logger.error(f"Failed to get trainer health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trainer health: {str(e)}",
        )
