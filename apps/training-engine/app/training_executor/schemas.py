"""Training executor API schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.training_executor.models import (
    LoRAConfig,
    OptimizerType,
    SchedulerType,
    PrecisionType,
    TrainingStatus,
    TrainingType,
)


# Request Schemas


class CreateTrainingJobRequest(BaseModel):
    """Request to create training job."""

    model_id: str = Field(..., description="Model ID")
    dataset_id: str = Field(..., description="Dataset ID")
    tokenizer_id: Optional[str] = Field(default=None, description="Tokenizer ID")

    # Training configuration
    training_type: TrainingType = Field(
        default=TrainingType.LORA, description="Training type"
    )
    num_train_epochs: int = Field(default=3, ge=1, le=100, description="Number of epochs")
    learning_rate: float = Field(default=2e-4, ge=1e-6, le=1e-2)
    per_device_train_batch_size: int = Field(default=4, ge=1, le=128)
    gradient_accumulation_steps: int = Field(default=4, ge=1)

    # Optimizer and scheduler
    optimizer_type: OptimizerType = Field(default=OptimizerType.ADAMW)
    scheduler_type: SchedulerType = Field(default=SchedulerType.LINEAR)
    weight_decay: float = Field(default=0.01, ge=0.0, le=1.0)
    warmup_ratio: float = Field(default=0.03, ge=0.0, le=1.0)

    # Precision
    precision: PrecisionType = Field(default=PrecisionType.FP16)
    fp16: bool = Field(default=True)

    # LoRA config (if applicable)
    lora_r: Optional[int] = Field(default=8, ge=1, le=256)
    lora_alpha: Optional[int] = Field(default=16, ge=1, le=512)
    lora_dropout: Optional[float] = Field(default=0.05, ge=0.0, le=0.5)

    # Advanced
    max_seq_length: int = Field(default=512, ge=128, le=8192)
    gradient_checkpointing: bool = Field(default=True)
    max_grad_norm: float = Field(default=1.0)

    # Logging
    logging_steps: int = Field(default=10, ge=1)
    eval_steps: Optional[int] = Field(default=100, ge=1)
    save_steps: int = Field(default=100, ge=1)

    # Context
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class UpdateJobStatusRequest(BaseModel):
    """Request to update job status."""

    status: TrainingStatus


# Response Schemas


class ApiResponse(BaseModel):
    """Generic API response."""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class TrainingJobResponse(BaseModel):
    """Training job response."""

    job_id: str
    model_id: str
    dataset_id: str
    tokenizer_id: Optional[str] = None

    status: str
    training_type: str

    # Progress
    progress_percentage: float = 0.0
    current_epoch: Optional[float] = None
    current_step: Optional[int] = None
    total_steps: Optional[int] = None

    # Directories
    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None

    # Timing
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Error
    error_message: Optional[str] = None

    # Context
    company_id: Optional[str] = None
    user_id: Optional[str] = None


class TrainingJobDetailResponse(BaseModel):
    """Detailed training job response."""

    job_id: str
    model_id: str
    dataset_id: str
    tokenizer_id: Optional[str] = None

    status: str
    training_type: str

    # Configuration
    config: Dict[str, Any]

    # Progress
    progress_percentage: float = 0.0
    current_metrics: Optional[Dict[str, Any]] = None
    current_epoch: Optional[float] = None
    current_step: Optional[int] = None
    total_steps: Optional[int] = None

    # Checkpoints
    checkpoints: List[Dict[str, Any]] = Field(default_factory=list)
    best_checkpoint: Optional[str] = None

    # Directories
    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None

    # Timing
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None

    # Error
    error_message: Optional[str] = None
    error_traceback: Optional[str] = None

    # Context
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrainingJobListResponse(BaseModel):
    """List of training jobs response."""

    total: int
    jobs: List[TrainingJobResponse]


class TrainingRuntimeResponse(BaseModel):
    """Training runtime response."""

    job_id: str
    status: str

    runtime_info: Dict[str, Any]
    device: str

    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None


class TrainingHealthResponse(BaseModel):
    """Training health response."""

    healthy: bool
    status: str
    timestamp: str

    components: Dict[str, Any] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)


class ExecutorStatsResponse(BaseModel):
    """Executor statistics response."""

    jobs: Dict[str, int]
    active_runtimes: int
    executing_tasks: int
