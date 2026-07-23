"""Checkpoint schemas and models."""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class CheckpointType(str, Enum):
    """Checkpoint types."""

    MANUAL = "manual"
    AUTOMATIC = "automatic"
    EPOCH = "epoch"
    STEP = "step"
    BEST = "best"
    LAST = "last"
    EMERGENCY = "emergency"


class CheckpointStatus(str, Enum):
    """Checkpoint status."""

    CREATING = "creating"
    COMPLETED = "completed"
    FAILED = "failed"
    VALIDATING = "validating"
    VALIDATED = "validated"
    CORRUPTED = "corrupted"
    DELETED = "deleted"


class RecoveryStrategy(str, Enum):
    """Recovery strategies."""

    AUTOMATIC = "automatic"
    MANUAL = "manual"
    LATEST = "latest"
    BEST = "best"
    SPECIFIC = "specific"


# Request Schemas


class CheckpointConfig(BaseModel):
    """Checkpoint configuration."""

    save_dir: str = Field(..., description="Checkpoint save directory")
    checkpoint_type: CheckpointType = Field(
        default=CheckpointType.AUTOMATIC, description="Checkpoint type"
    )
    save_interval: Optional[int] = Field(
        default=None, ge=1, description="Save interval (steps)"
    )
    save_epochs: Optional[int] = Field(
        default=None, ge=1, description="Save every N epochs"
    )
    keep_last_n: int = Field(
        default=3, ge=1, description="Keep last N checkpoints"
    )
    keep_best_n: int = Field(
        default=2, ge=0, description="Keep best N checkpoints"
    )
    max_storage_gb: Optional[float] = Field(
        default=None, ge=0, description="Maximum storage in GB"
    )
    auto_resume: bool = Field(
        default=True, description="Automatically resume from latest checkpoint"
    )
    validate_on_save: bool = Field(
        default=True, description="Validate checkpoint after save"
    )


class CreateCheckpointRequest(BaseModel):
    """Create checkpoint request."""

    job_id: str = Field(..., description="Training job ID")
    checkpoint_type: CheckpointType = Field(
        default=CheckpointType.MANUAL, description="Checkpoint type"
    )
    tags: Optional[List[str]] = Field(
        default=None, description="Optional tags"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional metadata"
    )


class RestoreCheckpointRequest(BaseModel):
    """Restore checkpoint request."""

    checkpoint_id: Optional[str] = Field(
        default=None, description="Specific checkpoint ID"
    )
    job_id: Optional[str] = Field(
        default=None, description="Job ID for latest checkpoint"
    )
    recovery_strategy: RecoveryStrategy = Field(
        default=RecoveryStrategy.LATEST, description="Recovery strategy"
    )


class DeleteCheckpointRequest(BaseModel):
    """Delete checkpoint request."""

    checkpoint_id: str = Field(..., description="Checkpoint ID to delete")


class CleanupCheckpointsRequest(BaseModel):
    """Cleanup checkpoints request."""

    job_id: Optional[str] = Field(
        default=None, description="Job ID to cleanup (all if None)"
    )
    older_than_days: Optional[int] = Field(
        default=None, ge=1, description="Delete checkpoints older than N days"
    )
    keep_best: bool = Field(
        default=True, description="Keep best checkpoints"
    )


# Response Schemas


class CheckpointMetadata(BaseModel):
    """Checkpoint metadata."""

    checkpoint_id: str
    job_id: str
    checkpoint_type: CheckpointType
    status: CheckpointStatus
    epoch: Optional[int]
    global_step: int
    training_loss: Optional[float] = None
    eval_loss: Optional[float] = None
    learning_rate: float
    file_path: str
    file_size_mb: float
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    validated_at: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    model_name: Optional[str] = None
    adapter_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CheckpointContents(BaseModel):
    """Contents of a checkpoint."""

    has_model_weights: bool = False
    has_optimizer_state: bool = False
    has_scheduler_state: bool = False
    has_adapter_state: bool = False
    has_trainer_state: bool = False
    has_rng_state: bool = False
    has_metadata: bool = False
    components: List[str] = Field(default_factory=list)


class CheckpointInfo(BaseModel):
    """Checkpoint information."""

    metadata: CheckpointMetadata
    contents: CheckpointContents
    is_valid: bool
    validation_errors: List[str] = Field(default_factory=list)


class CheckpointResponse(BaseModel):
    """Checkpoint operation response."""

    success: bool
    message: str
    checkpoint_id: Optional[str] = None
    metadata: Optional[CheckpointMetadata] = None


class RestoreResponse(BaseModel):
    """Restore operation response."""

    success: bool
    message: str
    checkpoint_id: Optional[str] = None
    restored_epoch: Optional[int] = None
    restored_step: int = 0
    metadata: Optional[CheckpointMetadata] = None


class CheckpointListResponse(BaseModel):
    """List checkpoints response."""

    checkpoints: List[CheckpointMetadata]
    total: int
    latest_checkpoint: Optional[CheckpointMetadata] = None
    best_checkpoint: Optional[CheckpointMetadata] = None


class CheckpointHealthResponse(BaseModel):
    """Checkpoint health response."""

    status: str
    healthy: bool
    total_checkpoints: int
    active_jobs: int
    storage_used_gb: float
    storage_limit_gb: Optional[float]
    oldest_checkpoint: Optional[str] = None
    newest_checkpoint: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# Internal Models


class CheckpointState(BaseModel):
    """Internal checkpoint state."""

    checkpoint_id: str
    job_id: str
    checkpoint_type: CheckpointType
    status: CheckpointStatus
    epoch: Optional[int]
    global_step: int
    file_path: str
    file_size_bytes: int
    hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetentionPolicy(BaseModel):
    """Retention policy configuration."""

    keep_last_n: int = 3
    keep_best_n: int = 2
    max_storage_gb: Optional[float] = None
    max_age_days: Optional[int] = None
    keep_epoch_checkpoints: bool = True
    keep_manual_checkpoints: bool = True


class RecoveryInfo(BaseModel):
    """Recovery information."""

    checkpoint_id: str
    job_id: str
    recovery_strategy: RecoveryStrategy
    restored_from: str
    restored_epoch: Optional[int]
    restored_step: int
    recovery_time_seconds: float
    recovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
