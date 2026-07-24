"""REST API for distributed training management."""

from typing import List

from fastapi import APIRouter, HTTPException, Depends, status

from app.middleware import verify_token
from app.logger import training_logger
from app.distributed.distributed_manager import distributed_manager
from app.distributed.device_manager import device_manager
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStatus,
    DistributedHealthResponse,
    WorkerInfo,
    DeviceInfo,
    StartDistributedTrainingRequest,
    StopDistributedTrainingRequest,
)
from app.distributed.exceptions import DistributedTrainingException

router = APIRouter(prefix="/distributed", tags=["distributed"])


@router.post(
    "/start",
    summary="Start Distributed Training",
    status_code=status.HTTP_200_OK,
)
async def start_distributed_training(
    request: StartDistributedTrainingRequest,
    token: str = Depends(verify_token),
) -> dict:
    """
    Initialize and start distributed training.
    
    This endpoint initializes the distributed environment
    and prepares for distributed training.
    """
    try:
        training_logger.info(f"Starting distributed training for job: {request.job_id}")
        
        # Initialize distributed environment
        status = distributed_manager.initialize(request.config)
        
        return {
            "status": "started",
            "job_id": request.job_id,
            "distributed_status": status.model_dump(),
            "message": f"Distributed training initialized: {request.config.strategy.value}",
        }
        
    except DistributedTrainingException as e:
        training_logger.error(f"Failed to start distributed training: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        training_logger.error(f"Unexpected error starting distributed training: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start distributed training: {str(e)}",
        )


@router.post(
    "/stop",
    summary="Stop Distributed Training",
    status_code=status.HTTP_200_OK,
)
async def stop_distributed_training(
    request: StopDistributedTrainingRequest,
    token: str = Depends(verify_token),
) -> dict:
    """
    Stop distributed training and cleanup resources.
    """
    try:
        training_logger.info(f"Stopping distributed training for job: {request.job_id}")
        
        # Shutdown distributed environment
        distributed_manager.shutdown()
        
        return {
            "status": "stopped",
            "job_id": request.job_id,
            "message": "Distributed training stopped successfully",
        }
        
    except Exception as e:
        training_logger.error(f"Failed to stop distributed training: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/restart",
    summary="Restart Distributed Training",
    status_code=status.HTTP_200_OK,
)
async def restart_distributed_training(
    config: DistributedConfig,
    token: str = Depends(verify_token),
) -> dict:
    """
    Restart distributed training with new configuration.
    """
    try:
        training_logger.info("Restarting distributed training")
        
        # Shutdown existing
        distributed_manager.shutdown()
        
        # Reinitialize
        status = distributed_manager.initialize(config)
        
        return {
            "status": "restarted",
            "distributed_status": status.model_dump(),
            "message": "Distributed training restarted successfully",
        }
        
    except Exception as e:
        training_logger.error(f"Failed to restart distributed training: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/status",
    response_model=DistributedStatus,
    summary="Get Distributed Training Status",
)
async def get_distributed_status(
    token: str = Depends(verify_token),
) -> DistributedStatus:
    """
    Get current distributed training status.
    
    Returns information about the distributed environment,
    including number of processes, devices, and health status.
    """
    try:
        status = distributed_manager.get_status()
        return status
        
    except Exception as e:
        training_logger.error(f"Failed to get distributed status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/workers",
    response_model=List[WorkerInfo],
    summary="Get Worker Information",
)
async def get_workers(
    token: str = Depends(verify_token),
) -> List[WorkerInfo]:
    """
    Get information about all distributed workers.
    
    Returns status and details for each worker process.
    """
    try:
        workers = distributed_manager._workers
        return list(workers.values())
        
    except Exception as e:
        training_logger.error(f"Failed to get worker information: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/devices",
    response_model=List[DeviceInfo],
    summary="Get Device Information",
)
async def get_devices(
    token: str = Depends(verify_token),
) -> List[DeviceInfo]:
    """
    Get information about available devices.
    
    Returns details about CPUs, GPUs, and other training devices.
    """
    try:
        devices = device_manager.detect_devices()
        return devices
        
    except Exception as e:
        training_logger.error(f"Failed to get device information: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/health",
    response_model=DistributedHealthResponse,
    summary="Get Distributed Training Health",
)
async def get_distributed_health(
    token: str = Depends(verify_token),
) -> DistributedHealthResponse:
    """
    Get health status of distributed training.
    
    Returns comprehensive health check including worker status,
    device health, and any detected issues.
    """
    try:
        status = distributed_manager.get_status()
        workers = list(distributed_manager._workers.values())
        
        # Check for issues
        issues = []
        warnings = []
        
        if not distributed_manager.is_initialized():
            warnings.append("Distributed training not initialized")
        
        if not status.all_workers_ready:
            issues.append("Not all workers are ready")
        
        if status.failed_workers:
            issues.append(f"{len(status.failed_workers)} workers failed")
        
        is_healthy = len(issues) == 0
        
        return DistributedHealthResponse(
            is_healthy=is_healthy,
            status=status,
            workers=workers,
            issues=issues,
            warnings=warnings,
        )
        
    except Exception as e:
        training_logger.error(f"Failed to get health status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/config",
    summary="Get Current Configuration",
)
async def get_current_config(
    token: str = Depends(verify_token),
) -> dict:
    """
    Get current distributed training configuration.
    """
    try:
        if not distributed_manager._config:
            return {"message": "No configuration available"}
        
        return {
            "config": distributed_manager._config.model_dump(),
        }
        
    except Exception as e:
        training_logger.error(f"Failed to get configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/capabilities",
    summary="Get System Capabilities",
)
async def get_system_capabilities(
    token: str = Depends(verify_token),
) -> dict:
    """
    Get system distributed training capabilities.
    
    Returns information about available backends, device count,
    and supported features.
    """
    try:
        device_count = device_manager.get_device_count()
        recommended_backend = device_manager.get_recommended_backend()
        recommended_precision = device_manager.get_recommended_precision()
        devices = device_manager.detect_devices()
        
        # Check availability of different strategies
        from app.distributed.accelerate_integration import ACCELERATE_AVAILABLE
        from app.distributed.deepspeed_integration import DEEPSPEED_AVAILABLE
        from app.distributed.fsdp_integration import FSDP_AVAILABLE
        
        return {
            "device_count": device_count,
            "devices": [d.model_dump() for d in devices],
            "recommended_backend": recommended_backend.value,
            "recommended_precision": recommended_precision.value,
            "distributed_available": device_manager.is_distributed_available(),
            "strategies_available": {
                "accelerate": ACCELERATE_AVAILABLE,
                "ddp": TORCH_AVAILABLE,
                "fsdp": FSDP_AVAILABLE,
                "deepspeed": DEEPSPEED_AVAILABLE,
            },
        }
        
    except Exception as e:
        training_logger.error(f"Failed to get capabilities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
