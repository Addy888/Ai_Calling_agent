"""Checkpoint REST API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.logger import training_logger
from app.middleware import verify_token
from app.checkpoint.checkpoint_manager import checkpoint_manager
from app.checkpoint.resume_manager import resume_manager
from app.checkpoint.recovery_manager import recovery_manager
from app.checkpoint.cleanup_manager import cleanup_manager
from app.checkpoint.exceptions import (
    CheckpointException,
    CheckpointNotFoundError,
    ResumeException,
    RecoveryException,
)
from app.checkpoint.schemas import (
    CheckpointResponse,
    CheckpointListResponse,
    CheckpointHealthResponse,
    CheckpointMetadata,
    CreateCheckpointRequest,
    RestoreCheckpointRequest,
    DeleteCheckpointRequest,
    CleanupCheckpointsRequest,
    RestoreResponse,
)

router = APIRouter(prefix="/checkpoint")


@router.post(
    "/create",
    response_model=CheckpointResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Checkpoint",
)
async def create_checkpoint(
    request: CreateCheckpointRequest,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Create a checkpoint for a training job."""
    training_logger.info(f"Creating checkpoint for job: {request.job_id}")

    try:
        # Note: In real implementation, this would get trainer state from job
        # For now, we'll create a minimal checkpoint
        trainer_state = {
            "model_state_dict": {},  # Would be populated from actual trainer
            "optimizer_state_dict": {},
            "scheduler_state_dict": {},
            "epoch": 0,
            "global_step": 0,
            "training_loss": 0.0,
            "learning_rate": 5e-5,
        }

        checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
            job_id=request.job_id,
            trainer_state=trainer_state,
            checkpoint_type=request.checkpoint_type,
            tags=request.tags,
            metadata=request.metadata,
        )

        return CheckpointResponse(
            success=True,
            message="Checkpoint created successfully",
            checkpoint_id=checkpoint_id,
            metadata=metadata,
        )

    except CheckpointException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/restore",
    response_model=RestoreResponse,
    summary="Restore Checkpoint",
)
async def restore_checkpoint(
    request: RestoreCheckpointRequest,
    token: str = Depends(verify_token),
) -> RestoreResponse:
    """Restore training from a checkpoint."""
    training_logger.info(
        f"Restoring checkpoint: job={request.job_id}, "
        f"strategy={request.recovery_strategy.value}"
    )

    try:
        success, state, metadata = resume_manager.resume(
            job_id=request.job_id or "",
            strategy=request.recovery_strategy,
            checkpoint_id=request.checkpoint_id,
        )

        if not success:
            return RestoreResponse(
                success=False,
                message="Failed to restore checkpoint",
            )

        return RestoreResponse(
            success=True,
            message="Checkpoint restored successfully",
            checkpoint_id=metadata.checkpoint_id if metadata else None,
            restored_epoch=metadata.epoch if metadata else None,
            restored_step=metadata.global_step if metadata else 0,
            metadata=metadata,
        )

    except (ResumeException, RecoveryException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/delete",
    response_model=CheckpointResponse,
    summary="Delete Checkpoint",
)
async def delete_checkpoint(
    request: DeleteCheckpointRequest,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Delete a checkpoint."""
    training_logger.info(f"Deleting checkpoint: {request.checkpoint_id}")

    try:
        success = checkpoint_manager.delete_checkpoint(request.checkpoint_id)

        if not success:
            raise CheckpointNotFoundError(
                f"Checkpoint not found: {request.checkpoint_id}"
            )

        return CheckpointResponse(
            success=True,
            message="Checkpoint deleted successfully",
            checkpoint_id=request.checkpoint_id,
        )

    except CheckpointNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except CheckpointException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/cleanup",
    response_model=CheckpointResponse,
    summary="Cleanup Checkpoints",
)
async def cleanup_checkpoints(
    request: CleanupCheckpointsRequest,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Cleanup old checkpoints based on retention policy."""
    training_logger.info(f"Cleaning up checkpoints for job: {request.job_id}")

    try:
        if request.older_than_days:
            deleted_count = cleanup_manager.cleanup_by_age(
                job_id=request.job_id or "",
                max_age_days=request.older_than_days,
            )
        else:
            deleted_count = cleanup_manager.cleanup_old_checkpoints(
                job_id=request.job_id or "",
                keep_last_n=3,
            )

        return CheckpointResponse(
            success=True,
            message=f"Cleaned up {deleted_count} checkpoints",
        )

    except CheckpointException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/list",
    response_model=CheckpointListResponse,
    summary="List Checkpoints",
)
async def list_checkpoints(
    job_id: str,
    token: str = Depends(verify_token),
) -> CheckpointListResponse:
    """List all checkpoints for a job."""
    try:
        checkpoints = checkpoint_manager.list_checkpoints(job_id)

        # Convert to metadata
        checkpoint_metadata_list = []
        for cp in checkpoints:
            metadata = CheckpointMetadata(
                checkpoint_id=cp.checkpoint_id,
                job_id=cp.job_id,
                checkpoint_type=cp.checkpoint_type,
                status=cp.status,
                epoch=cp.epoch,
                global_step=cp.global_step,
                eval_loss=cp.metadata.get("eval_loss"),
                learning_rate=0.0,  # Would come from checkpoint data
                file_path=cp.file_path,
                file_size_mb=cp.file_size_bytes / (1024 * 1024),
                created_at=cp.created_at.isoformat(),
                metadata=cp.metadata,
            )
            checkpoint_metadata_list.append(metadata)

        # Get latest and best
        latest = checkpoint_manager.get_latest_checkpoint(job_id)
        best = checkpoint_manager.get_best_checkpoint(job_id)

        latest_metadata = None
        if latest:
            latest_metadata = CheckpointMetadata(
                checkpoint_id=latest.checkpoint_id,
                job_id=latest.job_id,
                checkpoint_type=latest.checkpoint_type,
                status=latest.status,
                epoch=latest.epoch,
                global_step=latest.global_step,
                eval_loss=latest.metadata.get("eval_loss"),
                learning_rate=0.0,
                file_path=latest.file_path,
                file_size_mb=latest.file_size_bytes / (1024 * 1024),
                created_at=latest.created_at.isoformat(),
                metadata=latest.metadata,
            )

        best_metadata = None
        if best:
            best_metadata = CheckpointMetadata(
                checkpoint_id=best.checkpoint_id,
                job_id=best.job_id,
                checkpoint_type=best.checkpoint_type,
                status=best.status,
                epoch=best.epoch,
                global_step=best.global_step,
                eval_loss=best.metadata.get("eval_loss"),
                learning_rate=0.0,
                file_path=best.file_path,
                file_size_mb=best.file_size_bytes / (1024 * 1024),
                created_at=best.created_at.isoformat(),
                metadata=best.metadata,
            )

        return CheckpointListResponse(
            checkpoints=checkpoint_metadata_list,
            total=len(checkpoint_metadata_list),
            latest_checkpoint=latest_metadata,
            best_checkpoint=best_metadata,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/latest",
    response_model=CheckpointResponse,
    summary="Get Latest Checkpoint",
)
async def get_latest_checkpoint(
    job_id: str,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Get the latest checkpoint for a job."""
    try:
        checkpoint = checkpoint_manager.get_latest_checkpoint(job_id)

        if not checkpoint:
            raise CheckpointNotFoundError(
                f"No checkpoint found for job: {job_id}"
            )

        metadata = CheckpointMetadata(
            checkpoint_id=checkpoint.checkpoint_id,
            job_id=checkpoint.job_id,
            checkpoint_type=checkpoint.checkpoint_type,
            status=checkpoint.status,
            epoch=checkpoint.epoch,
            global_step=checkpoint.global_step,
            eval_loss=checkpoint.metadata.get("eval_loss"),
            learning_rate=0.0,
            file_path=checkpoint.file_path,
            file_size_mb=checkpoint.file_size_bytes / (1024 * 1024),
            created_at=checkpoint.created_at.isoformat(),
            metadata=checkpoint.metadata,
        )

        return CheckpointResponse(
            success=True,
            message="Latest checkpoint retrieved",
            checkpoint_id=checkpoint.checkpoint_id,
            metadata=metadata,
        )

    except CheckpointNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/best",
    response_model=CheckpointResponse,
    summary="Get Best Checkpoint",
)
async def get_best_checkpoint(
    job_id: str,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Get the best checkpoint for a job."""
    try:
        checkpoint = checkpoint_manager.get_best_checkpoint(job_id)

        if not checkpoint:
            raise CheckpointNotFoundError(
                f"No best checkpoint found for job: {job_id}"
            )

        metadata = CheckpointMetadata(
            checkpoint_id=checkpoint.checkpoint_id,
            job_id=checkpoint.job_id,
            checkpoint_type=checkpoint.checkpoint_type,
            status=checkpoint.status,
            epoch=checkpoint.epoch,
            global_step=checkpoint.global_step,
            eval_loss=checkpoint.metadata.get("eval_loss"),
            learning_rate=0.0,
            file_path=checkpoint.file_path,
            file_size_mb=checkpoint.file_size_bytes / (1024 * 1024),
            created_at=checkpoint.created_at.isoformat(),
            metadata=checkpoint.metadata,
        )

        return CheckpointResponse(
            success=True,
            message="Best checkpoint retrieved",
            checkpoint_id=checkpoint.checkpoint_id,
            metadata=metadata,
        )

    except CheckpointNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/{checkpoint_id}",
    response_model=CheckpointResponse,
    summary="Get Checkpoint",
)
async def get_checkpoint(
    checkpoint_id: str,
    token: str = Depends(verify_token),
) -> CheckpointResponse:
    """Get checkpoint by ID."""
    try:
        checkpoint = checkpoint_manager.get_checkpoint(checkpoint_id)

        if not checkpoint:
            raise CheckpointNotFoundError(
                f"Checkpoint not found: {checkpoint_id}"
            )

        metadata = CheckpointMetadata(
            checkpoint_id=checkpoint.checkpoint_id,
            job_id=checkpoint.job_id,
            checkpoint_type=checkpoint.checkpoint_type,
            status=checkpoint.status,
            epoch=checkpoint.epoch,
            global_step=checkpoint.global_step,
            eval_loss=checkpoint.metadata.get("eval_loss"),
            learning_rate=0.0,
            file_path=checkpoint.file_path,
            file_size_mb=checkpoint.file_size_bytes / (1024 * 1024),
            created_at=checkpoint.created_at.isoformat(),
            metadata=checkpoint.metadata,
        )

        return CheckpointResponse(
            success=True,
            message="Checkpoint retrieved",
            checkpoint_id=checkpoint_id,
            metadata=metadata,
        )

    except CheckpointNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/metadata/{checkpoint_id}",
    response_model=CheckpointMetadata,
    summary="Get Checkpoint Metadata",
)
async def get_checkpoint_metadata(
    checkpoint_id: str,
    token: str = Depends(verify_token),
) -> CheckpointMetadata:
    """Get checkpoint metadata."""
    try:
        checkpoint = checkpoint_manager.get_checkpoint(checkpoint_id)

        if not checkpoint:
            raise CheckpointNotFoundError(
                f"Checkpoint not found: {checkpoint_id}"
            )

        return CheckpointMetadata(
            checkpoint_id=checkpoint.checkpoint_id,
            job_id=checkpoint.job_id,
            checkpoint_type=checkpoint.checkpoint_type,
            status=checkpoint.status,
            epoch=checkpoint.epoch,
            global_step=checkpoint.global_step,
            eval_loss=checkpoint.metadata.get("eval_loss"),
            learning_rate=0.0,
            file_path=checkpoint.file_path,
            file_size_mb=checkpoint.file_size_bytes / (1024 * 1024),
            created_at=checkpoint.created_at.isoformat(),
            metadata=checkpoint.metadata,
        )

    except CheckpointNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/health",
    response_model=CheckpointHealthResponse,
    summary="Checkpoint Health Check",
)
async def checkpoint_health() -> CheckpointHealthResponse:
    """Check checkpoint service health."""
    try:
        from app.checkpoint.checkpoint_registry import checkpoint_registry
        from app.checkpoint.checkpoint_storage import checkpoint_storage

        stats = checkpoint_registry.get_stats()
        storage_stats = checkpoint_storage.get_storage_usage()

        return CheckpointHealthResponse(
            status="healthy",
            healthy=True,
            total_checkpoints=stats["total_checkpoints"],
            active_jobs=len(set(
                cp.job_id for cp in checkpoint_registry._checkpoints.values()
            )),
            storage_used_gb=storage_stats["total_gb"],
            storage_limit_gb=None,
        )

    except Exception as e:
        training_logger.error(f"Health check failed: {str(e)}")
        return CheckpointHealthResponse(
            status="unhealthy",
            healthy=False,
            total_checkpoints=0,
            active_jobs=0,
            storage_used_gb=0.0,
            storage_limit_gb=None,
        )
