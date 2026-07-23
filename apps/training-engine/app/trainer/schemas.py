"""Trainer API Schemas."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# Request Schemas

class CreateTrainerRequest(BaseModel):
    """Request to create trainer."""

    job_id: str = Field(..., description="Training job ID")
    trainer_type: Optional[str] = Field(
        default="hf_trainer",
        description="Trainer type (default: hf_trainer)"
    )


class InitializeTrainerRequest(BaseModel):
    """Request to initialize trainer."""

    job_id: str = Field(..., description="Training job ID")


class StartTrainingRequest(BaseModel):
    """Request to start training."""

    job_id: str = Field(..., description="Training job ID")


# Response Schemas

class TrainerResponse(BaseModel):
    """Trainer response."""

    job_id: str
    trainer_type: str
    status: str
    message: Optional[str] = None


class TrainerStatusResponse(BaseModel):
    """Trainer status response."""

    job_id: str
    state: str
    trainer_initialized: bool
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    error: Optional[str] = None


class TrainerRuntimeResponse(BaseModel):
    """Trainer runtime response."""

    job_id: str
    state: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    trainer_status: Optional[Dict[str, Any]] = None


class TrainerHealthResponse(BaseModel):
    """Trainer health response."""

    status: str
    active_trainers: int
    total_trainers: int
    healthy: bool
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class TrainingResultResponse(BaseModel):
    """Training result response."""

    job_id: str
    status: str
    duration_seconds: Optional[float] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    model_path: Optional[str] = None
    message: Optional[str] = None


class ApiResponse(BaseModel):
    """Generic API response."""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
