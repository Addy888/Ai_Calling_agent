"""Logging API for structured log access."""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.middleware.auth import verify_token
from app.metrics.structured_logger import structured_logger
from app.metrics.schemas import LogEntry, LogLevel


router = APIRouter(prefix="/logs", tags=["logs"])


# Response models

class LogsResponse(BaseModel):
    """Logs response."""
    
    job_id: str
    total_logs: int
    logs: List[LogEntry]


class LogStatsResponse(BaseModel):
    """Log statistics response."""
    
    total_jobs: int
    total_logs: int
    log_files: int
    log_level: str
    console_output: bool
    file_output: bool


# Endpoints

@router.get("", response_model=LogsResponse)
async def get_logs(
    job_id: str = Query(..., description="Job ID"),
    level: Optional[str] = Query(None, description="Filter by log level"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=10000, description="Max logs to return"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get logs for a job.
    
    Returns structured logs with optional filtering.
    """
    try:
        # Parse log level if provided
        log_level = None
        if level:
            try:
                log_level = LogLevel(level.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid log level: {level}"
                )
        
        # Get logs
        logs = structured_logger.get_logs(
            job_id=job_id,
            level=log_level,
            category=category,
            limit=limit,
            start_time=start_time,
            end_time=end_time,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/errors", response_model=LogsResponse)
async def get_error_logs(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get error logs for a job.
    
    Returns only ERROR and CRITICAL level logs.
    """
    try:
        logs = structured_logger.get_error_logs(
            job_id=job_id,
            limit=limit,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runtime", response_model=LogsResponse)
async def get_runtime_logs(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get runtime logs for a job.
    
    Returns only runtime category logs.
    """
    try:
        logs = structured_logger.get_runtime_logs(
            job_id=job_id,
            limit=limit,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training")
async def get_training_logs(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get training logs for a job.
    
    Returns only training category logs.
    """
    try:
        logs = structured_logger.get_logs(
            job_id=job_id,
            category="training",
            limit=limit,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/checkpoint")
async def get_checkpoint_logs(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get checkpoint logs for a job.
    
    Returns only checkpoint category logs.
    """
    try:
        logs = structured_logger.get_logs(
            job_id=job_id,
            category="checkpoint",
            limit=limit,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance")
async def get_performance_logs(
    job_id: str = Query(..., description="Job ID"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get performance logs for a job.
    
    Returns only performance category logs.
    """
    try:
        logs = structured_logger.get_logs(
            job_id=job_id,
            category="performance",
            limit=limit,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=LogStatsResponse)
async def get_log_stats(
    _token: dict = Depends(verify_token),
) -> LogStatsResponse:
    """
    Get logging system statistics.
    
    Returns overall logging system stats.
    """
    try:
        stats = structured_logger.get_stats()
        
        return LogStatsResponse(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{job_id}")
async def clear_logs(
    job_id: str,
    _token: dict = Depends(verify_token),
) -> dict:
    """
    Clear logs for a job.
    
    Removes all in-memory logs for the specified job.
    """
    try:
        structured_logger.clear_logs(job_id)
        
        return {
            "status": "cleared",
            "job_id": job_id,
            "message": f"Logs cleared for job: {job_id}",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_logs(
    job_id: str = Query(..., description="Job ID"),
    minutes: int = Query(10, ge=1, le=1440, description="Minutes back"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Get recent logs from the last N minutes.
    
    Convenience endpoint for recent log viewing.
    """
    try:
        from datetime import timedelta
        
        end_time = datetime.now()
        start_time = end_time - timedelta(minutes=minutes)
        
        logs = structured_logger.get_logs(
            job_id=job_id,
            start_time=start_time,
            end_time=end_time,
        )
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(logs),
            logs=logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_logs(
    job_id: str = Query(..., description="Job ID"),
    query: str = Query(..., description="Search query"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    _token: dict = Depends(verify_token),
) -> LogsResponse:
    """
    Search logs by message content.
    
    Returns logs where message contains the search query.
    """
    try:
        logs = structured_logger.get_logs(
            job_id=job_id,
            limit=limit,
        )
        
        # Filter by search query
        query_lower = query.lower()
        filtered_logs = [
            log for log in logs
            if query_lower in log.message.lower()
        ]
        
        return LogsResponse(
            job_id=job_id,
            total_logs=len(filtered_logs),
            logs=filtered_logs,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

