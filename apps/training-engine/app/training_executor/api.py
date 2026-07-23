"""Training executor REST API."""

from fastapi import APIRouter, HTTPException, status
from typing import Optional

from app.logger import api_logger
from app.training_executor.exceptions import (
    TrainingException,
    TrainingJobNotFoundException,
)
from app.training_executor.executor import training_executor
from app.training_executor.factory import TrainingConfigFactory
from app.training_executor.health import health_checker
from app.training_executor.models import TrainingConfig, TrainingStatus, TrainingType, LoRAConfig
from app.training_executor.runtime_manager import runtime_manager
from app.training_executor.schemas import (
    ApiResponse,
    CreateTrainingJobRequest,
    ExecutorStatsResponse,
    TrainingHealthResponse,
    TrainingJobDetailResponse,
    TrainingJobListResponse,
    TrainingJobResponse,
    TrainingRuntimeResponse,
)

router = APIRouter()


@router.post("/training/jobs", response_model=TrainingJobResponse)
async def create_training_job(request: CreateTrainingJobRequest):
    """Create a new training job."""
    try:
        api_logger.info(f"Creating training job for model: {request.model_id}")

        # Create training configuration
        if request.training_type == TrainingType.LORA:
            config = TrainingConfigFactory.create_lora_config(
                num_epochs=request.num_train_epochs,
                learning_rate=request.learning_rate,
                batch_size=request.per_device_train_batch_size,
                lora_r=request.lora_r or 8,
                lora_alpha=request.lora_alpha or 16,
                lora_dropout=request.lora_dropout or 0.05,
                gradient_accumulation_steps=request.gradient_accumulation_steps,
                optimizer_type=request.optimizer_type,
                scheduler_type=request.scheduler_type,
                weight_decay=request.weight_decay,
                warmup_ratio=request.warmup_ratio,
                fp16=request.fp16,
                max_seq_length=request.max_seq_length,
                gradient_checkpointing=request.gradient_checkpointing,
                max_grad_norm=request.max_grad_norm,
                logging_steps=request.logging_steps,
                eval_steps=request.eval_steps,
                save_steps=request.save_steps,
            )
        else:
            config = TrainingConfigFactory.create_full_finetune_config(
                num_epochs=request.num_train_epochs,
                learning_rate=request.learning_rate,
                batch_size=request.per_device_train_batch_size,
                gradient_accumulation_steps=request.gradient_accumulation_steps,
                optimizer_type=request.optimizer_type,
                scheduler_type=request.scheduler_type,
                weight_decay=request.weight_decay,
                warmup_ratio=request.warmup_ratio,
                fp16=request.fp16,
                max_seq_length=request.max_seq_length,
                gradient_checkpointing=request.gradient_checkpointing,
                max_grad_norm=request.max_grad_norm,
                logging_steps=request.logging_steps,
                eval_steps=request.eval_steps,
                save_steps=request.save_steps,
            )

        # Submit job
        job = await training_executor.submit_job(
            model_id=request.model_id,
            dataset_id=request.dataset_id,
            config=config,
            tokenizer_id=request.tokenizer_id,
            company_id=request.company_id,
            user_id=request.user_id,
            project_id=request.project_id,
            tags=request.tags,
        )

        return TrainingJobResponse(
            job_id=job.job_id,
            model_id=job.model_id,
            dataset_id=job.dataset_id,
            tokenizer_id=job.tokenizer_id,
            status=job.status.value,
            training_type=job.config.training_type.value,
            created_at=job.created_at,
            company_id=job.company_id,
            user_id=job.user_id,
        )

    except Exception as e:
        api_logger.error(f"Failed to create training job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/training/start", response_model=ApiResponse)
async def start_training(job_id: str):
    """Start training for a job."""
    try:
        api_logger.info(f"Starting training for job: {job_id}")

        job = await training_executor.start_training(job_id)

        return ApiResponse(
            success=True,
            message="Training started successfully",
            data={
                "job_id": job.job_id,
                "status": job.status.value,
            },
        )

    except TrainingJobNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to start training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/training/pause", response_model=ApiResponse)
async def pause_training(job_id: str):
    """Pause training."""
    try:
        api_logger.info(f"Pausing training: {job_id}")

        job = await training_executor.pause_training(job_id)

        return ApiResponse(
            success=True,
            message="Training pause requested (limited support)",
            data={"job_id": job.job_id, "status": job.status.value},
        )

    except TrainingJobNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to pause training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/training/resume", response_model=ApiResponse)
async def resume_training(job_id: str):
    """Resume paused training."""
    try:
        api_logger.info(f"Resuming training: {job_id}")

        job = await training_executor.resume_training(job_id)

        return ApiResponse(
            success=True,
            message="Training resumed",
            data={"job_id": job.job_id, "status": job.status.value},
        )

    except TrainingJobNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to resume training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/training/cancel", response_model=ApiResponse)
async def cancel_training(job_id: str):
    """Cancel training."""
    try:
        api_logger.info(f"Cancelling training: {job_id}")

        job = await training_executor.cancel_training(job_id)

        return ApiResponse(
            success=True,
            message="Training cancelled",
            data={"job_id": job.job_id, "status": job.status.value},
        )

    except TrainingJobNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to cancel training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/training/jobs", response_model=TrainingJobListResponse)
async def list_training_jobs(
    status: Optional[str] = None,
    company_id: Optional[str] = None,
    limit: int = 100,
):
    """List training jobs."""
    try:
        # Parse status if provided
        job_status = None
        if status:
            try:
                job_status = TrainingStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}",
                )

        jobs = await training_executor.list_jobs(
            status=job_status, company_id=company_id, limit=limit
        )

        job_responses = [
            TrainingJobResponse(
                job_id=job.job_id,
                model_id=job.model_id,
                dataset_id=job.dataset_id,
                tokenizer_id=job.tokenizer_id,
                status=job.status.value,
                training_type=job.config.training_type.value,
                progress_percentage=(
                    job.current_metrics.progress_percentage
                    if job.current_metrics
                    else 0.0
                ),
                current_epoch=(
                    job.current_metrics.epoch if job.current_metrics else None
                ),
                current_step=(
                    job.current_metrics.global_step if job.current_metrics else None
                ),
                total_steps=job.total_steps,
                output_dir=job.output_dir,
                checkpoint_dir=job.checkpoint_dir,
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error_message=job.error_message,
                company_id=job.company_id,
                user_id=job.user_id,
            )
            for job in jobs
        ]

        return TrainingJobListResponse(
            total=len(job_responses),
            jobs=job_responses,
        )

    except Exception as e:
        api_logger.error(f"Failed to list jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/training/jobs/{job_id}", response_model=TrainingJobDetailResponse)
async def get_training_job(job_id: str):
    """Get training job details."""
    try:
        job = await training_executor.get_job(job_id)

        return TrainingJobDetailResponse(
            job_id=job.job_id,
            model_id=job.model_id,
            dataset_id=job.dataset_id,
            tokenizer_id=job.tokenizer_id,
            status=job.status.value,
            training_type=job.config.training_type.value,
            config=job.config.model_dump(),
            progress_percentage=(
                job.current_metrics.progress_percentage if job.current_metrics else 0.0
            ),
            current_metrics=(
                job.current_metrics.model_dump() if job.current_metrics else None
            ),
            current_epoch=job.current_metrics.epoch if job.current_metrics else None,
            current_step=(
                job.current_metrics.global_step if job.current_metrics else None
            ),
            total_steps=job.total_steps,
            checkpoints=[c.model_dump() for c in job.checkpoints],
            best_checkpoint=job.best_checkpoint,
            output_dir=job.output_dir,
            checkpoint_dir=job.checkpoint_dir,
            created_at=job.created_at,
            updated_at=job.updated_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            paused_at=job.paused_at,
            error_message=job.error_message,
            error_traceback=job.error_traceback,
            company_id=job.company_id,
            user_id=job.user_id,
            project_id=job.project_id,
            tags=job.tags,
            metadata=job.metadata,
        )

    except TrainingJobNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        api_logger.error(f"Failed to get job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/training/runtime/{job_id}", response_model=TrainingRuntimeResponse)
async def get_training_runtime(job_id: str):
    """Get training runtime information."""
    try:
        runtime = await runtime_manager.get_runtime(job_id)

        if not runtime:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Runtime not found for job: {job_id}",
            )

        return TrainingRuntimeResponse(
            job_id=job_id,
            status=runtime.get("status", "unknown"),
            runtime_info=runtime,
            device=runtime.get("device", "unknown"),
            output_dir=runtime.get("output_dir"),
            checkpoint_dir=runtime.get("checkpoint_dir"),
        )

    except Exception as e:
        api_logger.error(f"Failed to get runtime: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/training/health", response_model=TrainingHealthResponse)
async def get_training_health():
    """Get training executor health."""
    try:
        health = await health_checker.check_health()

        return TrainingHealthResponse(
            healthy=health["healthy"],
            status=health["status"],
            timestamp=health["timestamp"],
            components=health.get("components", {}),
            issues=health.get("issues", []),
        )

    except Exception as e:
        api_logger.error(f"Failed to check health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/training/stats", response_model=ExecutorStatsResponse)
async def get_executor_stats():
    """Get executor statistics."""
    try:
        stats = training_executor.get_executor_stats()

        return ExecutorStatsResponse(
            jobs=stats["jobs"],
            active_runtimes=stats["active_runtimes"],
            executing_tasks=stats["executing_tasks"],
        )

    except Exception as e:
        api_logger.error(f"Failed to get stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/training/jobs/{job_id}", response_model=ApiResponse)
async def delete_training_job(job_id: str):
    """Delete training job."""
    try:
        success = await training_executor.delete_job(job_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found or cannot be deleted: {job_id}",
            )

        return ApiResponse(
            success=True,
            message="Training job deleted",
            data={"job_id": job_id},
        )

    except Exception as e:
        api_logger.error(f"Failed to delete job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
