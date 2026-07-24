"""Dashboard API for real-time training visualization data."""

from typing import Dict, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.middleware.auth import verify_token
from app.metrics.metrics_storage import metrics_storage
from app.metrics.alert_engine import alert_engine
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    Alert,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Response models

class LiveDashboardData(BaseModel):
    """Live dashboard data."""
    
    job_id: str
    current_loss: Optional[float]
    current_lr: float
    current_step: int
    current_epoch: Optional[int]
    gpu_usage_percent: Optional[float]
    gpu_memory_used_gb: Optional[float]
    cpu_usage_percent: float
    ram_usage_gb: float
    samples_per_second: float
    eta_seconds: Optional[float]
    last_update: datetime


class TrainingTimelinePoint(BaseModel):
    """Training timeline data point."""
    
    timestamp: datetime
    global_step: int
    training_loss: Optional[float]
    validation_loss: Optional[float]
    learning_rate: float


class CheckpointTimelinePoint(BaseModel):
    """Checkpoint timeline data point."""
    
    timestamp: datetime
    global_step: int
    checkpoint_id: str
    size_mb: float


class TrainingHistoryResponse(BaseModel):
    """Training history response."""
    
    job_id: str
    start_time: datetime
    end_time: Optional[datetime]
    total_steps: int
    total_epochs: Optional[int]
    best_training_loss: Optional[float]
    best_validation_loss: Optional[float]
    average_samples_per_second: float
    total_training_time_seconds: float
    checkpoints_created: int


# Endpoints

@router.get("/live", response_model=LiveDashboardData)
async def get_live_dashboard_data(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> LiveDashboardData:
    """
    Get live dashboard data for a job.
    
    Real-time metrics for current training state.
    """
    try:
        # Get latest metrics
        training = metrics_storage.get_latest_training_metrics(job_id)
        system = metrics_storage.get_latest_system_metrics(job_id)
        performance = metrics_storage.get_latest_performance_metrics(job_id)
        
        if not training:
            raise HTTPException(
                status_code=404,
                detail=f"No training data found for job: {job_id}"
            )
        
        return LiveDashboardData(
            job_id=job_id,
            current_loss=training.training_loss,
            current_lr=training.learning_rate,
            current_step=training.global_step,
            current_epoch=training.epoch,
            gpu_usage_percent=system.gpu_usage_percent if system else None,
            gpu_memory_used_gb=system.gpu_memory_used_gb if system else None,
            cpu_usage_percent=system.cpu_usage_percent if system else 0.0,
            ram_usage_gb=system.ram_usage_gb if system else 0.0,
            samples_per_second=(
                performance.samples_per_second if performance else 0.0
            ),
            eta_seconds=performance.eta_seconds if performance else None,
            last_update=training.timestamp,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/training", response_model=List[TrainingTimelinePoint])
async def get_training_timeline(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(1000, ge=1, le=10000, description="Max data points"),
    start_time: Optional[datetime] = Query(None, description="Start time"),
    end_time: Optional[datetime] = Query(None, description="End time"),
    _token: dict = Depends(verify_token),
) -> List[TrainingTimelinePoint]:
    """
    Get training timeline for visualization.
    
    Returns time-series data for loss, learning rate, etc.
    """
    try:
        # Get training metrics
        training_metrics = metrics_storage.get_training_metrics(
            job_id=job_id,
            limit=limit,
            start_time=start_time,
            end_time=end_time,
        )
        
        if not training_metrics:
            return []
        
        # Convert to timeline points
        timeline = [
            TrainingTimelinePoint(
                timestamp=m.timestamp,
                global_step=m.global_step,
                training_loss=m.training_loss,
                validation_loss=m.validation_loss,
                learning_rate=m.learning_rate,
            )
            for m in training_metrics
        ]
        
        return timeline
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/checkpoints", response_model=List[CheckpointTimelinePoint])
async def get_checkpoint_timeline(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> List[CheckpointTimelinePoint]:
    """
    Get checkpoint timeline.
    
    Returns all checkpoints created during training.
    """
    try:
        # This would integrate with checkpoint manager
        # For now, return empty list (to be implemented with checkpoint integration)
        return []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=TrainingHistoryResponse)
async def get_training_history(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> TrainingHistoryResponse:
    """
    Get complete training history summary.
    
    Aggregated statistics and summary for entire training run.
    """
    try:
        # Get all training metrics
        all_training = metrics_storage.get_training_metrics(
            job_id=job_id,
            limit=None,
        )
        
        if not all_training:
            raise HTTPException(
                status_code=404,
                detail=f"No training history found for job: {job_id}"
            )
        
        # Calculate statistics
        start_time = all_training[0].timestamp
        end_time = all_training[-1].timestamp
        total_steps = all_training[-1].global_step
        
        # Find best losses
        losses = [m.training_loss for m in all_training if m.training_loss]
        val_losses = [m.validation_loss for m in all_training if m.validation_loss]
        
        best_training_loss = min(losses) if losses else None
        best_validation_loss = min(val_losses) if val_losses else None
        
        # Get epochs
        epochs = [m.epoch for m in all_training if m.epoch is not None]
        total_epochs = max(epochs) if epochs else None
        
        # Calculate average throughput
        all_performance = metrics_storage.get_performance_metrics(
            job_id=job_id,
            limit=None,
        )
        
        if all_performance:
            avg_samples_per_sec = sum(
                p.samples_per_second for p in all_performance
            ) / len(all_performance)
        else:
            avg_samples_per_sec = 0.0
        
        # Calculate training time
        training_time_seconds = (end_time - start_time).total_seconds()
        
        return TrainingHistoryResponse(
            job_id=job_id,
            start_time=start_time,
            end_time=end_time,
            total_steps=total_steps,
            total_epochs=total_epochs,
            best_training_loss=best_training_loss,
            best_validation_loss=best_validation_loss,
            average_samples_per_second=avg_samples_per_sec,
            total_training_time_seconds=training_time_seconds,
            checkpoints_created=0,  # To be integrated with checkpoint manager
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/loss")
async def get_live_loss(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> Dict:
    """Get live loss values."""
    try:
        training = metrics_storage.get_latest_training_metrics(job_id)
        
        if not training:
            raise HTTPException(
                status_code=404,
                detail=f"No training data found for job: {job_id}"
            )
        
        return {
            "job_id": job_id,
            "training_loss": training.training_loss,
            "validation_loss": training.validation_loss,
            "global_step": training.global_step,
            "timestamp": training.timestamp.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/lr")
async def get_live_learning_rate(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> Dict:
    """Get live learning rate."""
    try:
        training = metrics_storage.get_latest_training_metrics(job_id)
        
        if not training:
            raise HTTPException(
                status_code=404,
                detail=f"No training data found for job: {job_id}"
            )
        
        return {
            "job_id": job_id,
            "learning_rate": training.learning_rate,
            "global_step": training.global_step,
            "timestamp": training.timestamp.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/eta")
async def get_live_eta(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> Dict:
    """Get live ETA."""
    try:
        performance = metrics_storage.get_latest_performance_metrics(job_id)
        
        if not performance:
            raise HTTPException(
                status_code=404,
                detail=f"No performance data found for job: {job_id}"
            )
        
        return {
            "job_id": job_id,
            "eta_seconds": performance.eta_seconds,
            "eta_formatted": _format_eta(performance.eta_seconds),
            "samples_per_second": performance.samples_per_second,
            "timestamp": performance.timestamp.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/gpu")
async def get_live_gpu(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> Dict:
    """Get live GPU metrics."""
    try:
        system = metrics_storage.get_latest_system_metrics(job_id)
        
        if not system:
            raise HTTPException(
                status_code=404,
                detail=f"No system data found for job: {job_id}"
            )
        
        return {
            "job_id": job_id,
            "gpu_usage_percent": system.gpu_usage_percent,
            "gpu_memory_used_gb": system.gpu_memory_used_gb,
            "gpu_memory_total_gb": system.gpu_memory_total_gb,
            "gpu_memory_percent": (
                (system.gpu_memory_used_gb / system.gpu_memory_total_gb * 100)
                if system.gpu_memory_used_gb and system.gpu_memory_total_gb
                else None
            ),
            "gpu_temperature_celsius": system.gpu_temperature_celsius,
            "timestamp": system.timestamp.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/memory")
async def get_live_memory(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> Dict:
    """Get live memory metrics."""
    try:
        system = metrics_storage.get_latest_system_metrics(job_id)
        
        if not system:
            raise HTTPException(
                status_code=404,
                detail=f"No system data found for job: {job_id}"
            )
        
        return {
            "job_id": job_id,
            "ram_usage_gb": system.ram_usage_gb,
            "ram_total_gb": system.ram_total_gb,
            "ram_usage_percent": system.ram_usage_percent,
            "timestamp": system.timestamp.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _format_eta(seconds: Optional[float]) -> Optional[str]:
    """Format ETA seconds to human-readable string."""
    if seconds is None:
        return None
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"

