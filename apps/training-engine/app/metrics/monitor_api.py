"""Monitor API for training health monitoring."""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel

from app.middleware.auth import verify_token
from app.metrics.training_monitor import training_monitor
from app.metrics.alert_engine import alert_engine
from app.metrics.schemas import MonitorStatus, Alert, HealthStatus


router = APIRouter(prefix="/monitor", tags=["monitor"])


# Request/Response models

class StartMonitoringRequest(BaseModel):
    """Start monitoring request."""
    
    job_id: str
    check_interval_seconds: Optional[int] = 30


class MonitoringStatusResponse(BaseModel):
    """Monitoring status response."""
    
    is_monitoring: bool
    job_id: Optional[str]
    active_jobs: List[str]
    last_check_time: Optional[datetime]
    total_checks_performed: int
    alerts_generated: int


class HealthCheckResponse(BaseModel):
    """Health check response."""
    
    status: str
    job_id: str
    is_healthy: bool
    issues: List[str]
    warnings: List[str]
    last_check: datetime


# Endpoints

@router.get("/status", response_model=MonitoringStatusResponse)
async def get_monitor_status(
    job_id: Optional[str] = Query(None, description="Job ID (optional)"),
    _token: dict = Depends(verify_token),
) -> MonitoringStatusResponse:
    """
    Get monitoring status.
    
    Returns current monitoring state for a specific job or all jobs.
    """
    try:
        status = training_monitor.get_status(job_id)
        
        return MonitoringStatusResponse(
            is_monitoring=status.is_monitoring,
            job_id=job_id,
            active_jobs=status.active_jobs,
            last_check_time=status.last_check_time,
            total_checks_performed=status.total_checks_performed,
            alerts_generated=status.alerts_generated,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_monitoring(
    request: StartMonitoringRequest = Body(...),
    _token: dict = Depends(verify_token),
) -> dict:
    """
    Start monitoring a job.
    
    Begins continuous health monitoring for the specified job.
    """
    try:
        # Update check interval if provided
        if request.check_interval_seconds:
            training_monitor.check_interval = request.check_interval_seconds
        
        # Start monitoring (async)
        import asyncio
        asyncio.create_task(training_monitor.start_monitoring(request.job_id))
        
        return {
            "status": "started",
            "job_id": request.job_id,
            "message": f"Monitoring started for job: {request.job_id}",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_monitoring(
    job_id: str = Body(..., embed=True),
    _token: dict = Depends(verify_token),
) -> dict:
    """
    Stop monitoring a job.
    
    Stops continuous health monitoring for the specified job.
    """
    try:
        # Stop monitoring (async)
        import asyncio
        asyncio.create_task(training_monitor.stop_monitoring(job_id))
        
        return {
            "status": "stopped",
            "job_id": job_id,
            "message": f"Monitoring stopped for job: {job_id}",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    job_id: str = Query(..., description="Job ID"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(100, ge=1, le=1000, description="Max alerts to return"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged"),
    _token: dict = Depends(verify_token),
) -> List[Alert]:
    """
    Get alerts for a job.
    
    Returns generated alerts with optional filtering.
    """
    try:
        alerts = alert_engine.get_alerts(
            job_id=job_id,
            limit=limit,
        )
        
        # Apply severity filter
        if severity:
            alerts = [a for a in alerts if a.severity.value == severity.lower()]
        
        # Apply acknowledged filter
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]
        
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    _token: dict = Depends(verify_token),
) -> dict:
    """
    Acknowledge an alert.
    
    Marks an alert as acknowledged.
    """
    try:
        alert_engine.acknowledge_alert(alert_id)
        
        return {
            "status": "acknowledged",
            "alert_id": alert_id,
            "message": "Alert acknowledged",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthCheckResponse)
async def get_health_status(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> HealthCheckResponse:
    """
    Get health status for a job.
    
    Performs comprehensive health check and returns status.
    """
    try:
        from app.metrics.metrics_storage import metrics_storage
        
        issues = []
        warnings = []
        
        # Check for recent metrics
        training_metrics = metrics_storage.get_latest_training_metrics(job_id)
        system_metrics = metrics_storage.get_latest_system_metrics(job_id)
        
        if not training_metrics:
            issues.append("No training metrics available")
        elif training_metrics.training_loss is None:
            warnings.append("Training loss not recorded")
        elif training_metrics.training_loss > 10.0:
            warnings.append(f"High training loss: {training_metrics.training_loss:.2f}")
        
        # Check system metrics
        if system_metrics:
            if system_metrics.gpu_usage_percent and system_metrics.gpu_usage_percent < 10:
                warnings.append(f"Low GPU utilization: {system_metrics.gpu_usage_percent:.1f}%")
            
            if system_metrics.ram_usage_percent > 95:
                warnings.append(f"High RAM usage: {system_metrics.ram_usage_percent:.1f}%")
            
            if system_metrics.gpu_temperature_celsius and system_metrics.gpu_temperature_celsius > 85:
                warnings.append(f"High GPU temperature: {system_metrics.gpu_temperature_celsius}°C")
        
        # Check for recent alerts
        recent_alerts = alert_engine.get_alerts(job_id, limit=10)
        critical_alerts = [a for a in recent_alerts if a.severity.value == "critical"]
        
        if critical_alerts:
            issues.append(f"{len(critical_alerts)} critical alerts")
        
        # Determine health status
        is_healthy = len(issues) == 0
        status = "healthy" if is_healthy else "unhealthy"
        
        return HealthCheckResponse(
            status=status,
            job_id=job_id,
            is_healthy=is_healthy,
            issues=issues,
            warnings=warnings,
            last_check=datetime.now(),
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/summary")
async def get_alerts_summary(
    job_id: str = Query(..., description="Job ID"),
    _token: dict = Depends(verify_token),
) -> dict:
    """
    Get alerts summary for a job.
    
    Returns count of alerts by severity.
    """
    try:
        alerts = alert_engine.get_alerts(job_id)
        
        summary = {
            "job_id": job_id,
            "total_alerts": len(alerts),
            "by_severity": {
                "critical": len([a for a in alerts if a.severity.value == "critical"]),
                "error": len([a for a in alerts if a.severity.value == "error"]),
                "warning": len([a for a in alerts if a.severity.value == "warning"]),
                "info": len([a for a in alerts if a.severity.value == "info"]),
            },
            "unacknowledged": len([a for a in alerts if not a.acknowledged]),
        }
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

