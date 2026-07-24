"""Metrics REST API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.logger import training_logger
from app.middleware import verify_token
from app.metrics.metrics_manager import metrics_manager
from app.metrics.schemas import (
    MetricsResponse,
    LiveMetricsResponse,
    MetricsRequest,
)
from app.metrics.exceptions import MetricsException

router = APIRouter(prefix="/metrics")


@router.get(
    "/live",
    response_model=LiveMetricsResponse,
    summary="Get Live Metrics",
)
async def get_live_metrics(
    job_id: str = Query(..., description="Job ID"),
    token: str = Depends(verify_token),
) -> LiveMetricsResponse:
    """Get current live metrics for a training job."""
    try:
        live_data = metrics_manager.get_live_metrics(job_id)
        
        return LiveMetricsResponse(
            job_id=live_data["job_id"],
            training_loss=live_data.get("training_loss"),
            validation_loss=live_data.get("validation_loss"),
            learning_rate=live_data.get("learning_rate", 0.0),
            global_step=live_data.get("global_step", 0),
            epoch=live_data.get("epoch"),
            gpu_usage_percent=live_data.get("gpu_usage_percent"),
            gpu_memory_percent=None,  # Calculate if needed
            tokens_per_second=None,
            eta_seconds=None,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/history",
    summary="Get Metrics History",
)
async def get_metrics_history(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000),
    token: str = Depends(verify_token),
):
    """Get historical metrics for a training job."""
    try:
        training_metrics = metrics_manager.storage.get_training_metrics(
            job_id, limit=limit
        )
        
        return {
            "job_id": job_id,
            "count": len(training_metrics),
            "metrics": [m.model_dump() for m in training_metrics],
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/system",
    summary="Get System Metrics",
)
async def get_system_metrics(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000),
    token: str = Depends(verify_token),
):
    """Get system resource metrics."""
    try:
        system_metrics = metrics_manager.storage.get_system_metrics(
            job_id, limit=limit
        )
        
        return {
            "job_id": job_id,
            "count": len(system_metrics),
            "metrics": [m.model_dump() for m in system_metrics],
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/model",
    summary="Get Model Metrics",
)
async def get_model_metrics(
    job_id: str = Query(..., description="Job ID"),
    token: str = Depends(verify_token),
):
    """Get model architecture metrics."""
    try:
        model_metrics = metrics_manager.storage.get_model_metrics(job_id)
        
        return {
            "job_id": job_id,
            "count": len(model_metrics),
            "metrics": [m.model_dump() for m in model_metrics],
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/aggregated",
    summary="Get Aggregated Metrics",
)
async def get_aggregated_metrics(
    job_id: str = Query(..., description="Job ID"),
    token: str = Depends(verify_token),
):
    """Get aggregated metrics with statistics."""
    try:
        aggregated = metrics_manager.get_aggregated_metrics(job_id)
        
        return {
            "job_id": job_id,
            "aggregated": {
                name: agg.model_dump() for name, agg in aggregated.items()
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/stats",
    summary="Get Metrics Stats",
)
async def get_metrics_stats(
    token: str = Depends(verify_token),
):
    """Get metrics system statistics."""
    try:
        stats = metrics_manager.get_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/export",
    summary="Export Metrics",
)
async def export_metrics(
    job_id: str = Query(..., description="Job ID"),
    format: str = Query("json", regex="^(json|csv)$"),
    token: str = Depends(verify_token),
):
    """Export metrics to file."""
    try:
        import tempfile
        from pathlib import Path
        
        # Create temp file
        suffix = f".{format}"
        with tempfile.NamedTemporaryFile(
            mode='w', suffix=suffix, delete=False
        ) as f:
            output_path = f.name
        
        metrics_manager.export_metrics(job_id, output_path, format)
        
        return {
            "success": True,
            "message": f"Metrics exported to {output_path}",
            "file_path": output_path,
            "format": format,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
