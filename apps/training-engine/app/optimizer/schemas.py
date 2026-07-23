"""Optimizer and Scheduler schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class OptimizerType(str, Enum):
    """Supported optimizer types."""

    ADAMW = "adamw"
    SGD = "sgd"
    ADAFACTOR = "adafactor"
    ADAM = "adam"  # Extension interface
    RMSPROP = "rmsprop"  # Extension interface
    LION = "lion"  # Extension interface
    ADAMW_8BIT = "adamw_8bit"  # Future
    PAGED_ADAMW = "paged_adamw"  # Future


class SchedulerType(str, Enum):
    """Supported scheduler types."""

    LINEAR = "linear"
    COSINE = "cosine"
    COSINE_WITH_RESTARTS = "cosine_with_restarts"
    POLYNOMIAL = "polynomial"
    CONSTANT = "constant"
    CONSTANT_WITH_WARMUP = "constant_with_warmup"
    LINEAR_WITH_WARMUP = "linear_with_warmup"


class WarmupStrategy(str, Enum):
    """Warmup strategies."""

    STEPS = "steps"
    RATIO = "ratio"
    NONE = "none"


# Request Schemas


class OptimizerConfig(BaseModel):
    """Optimizer configuration."""

    optimizer_type: OptimizerType = Field(
        default=OptimizerType.ADAMW, description="Optimizer type"
    )
    learning_rate: float = Field(
        default=5e-5, ge=0.0, le=1.0, description="Learning rate"
    )
    weight_decay: float = Field(
        default=0.01, ge=0.0, le=1.0, description="Weight decay"
    )
    adam_beta1: float = Field(default=0.9, ge=0.0, le=1.0, description="Adam beta1")
    adam_beta2: float = Field(default=0.999, ge=0.0, le=1.0, description="Adam beta2")
    adam_epsilon: float = Field(default=1e-8, ge=0.0, description="Adam epsilon")
    max_grad_norm: Optional[float] = Field(
        default=1.0, ge=0.0, description="Max gradient norm for clipping"
    )
    use_parameter_groups: bool = Field(
        default=True, description="Use parameter groups"
    )

    @validator("learning_rate")
    def validate_learning_rate(cls, v):
        """Validate learning rate is positive."""
        if v <= 0:
            raise ValueError("Learning rate must be positive")
        return v


class SchedulerConfig(BaseModel):
    """Scheduler configuration."""

    scheduler_type: SchedulerType = Field(
        default=SchedulerType.LINEAR, description="Scheduler type"
    )
    warmup_strategy: WarmupStrategy = Field(
        default=WarmupStrategy.RATIO, description="Warmup strategy"
    )
    warmup_steps: Optional[int] = Field(
        default=None, ge=0, description="Number of warmup steps"
    )
    warmup_ratio: float = Field(
        default=0.1, ge=0.0, le=1.0, description="Warmup ratio of total steps"
    )
    num_training_steps: Optional[int] = Field(
        default=None, ge=1, description="Total training steps"
    )
    num_cycles: Optional[float] = Field(
        default=0.5, ge=0.0, description="Number of cycles for cosine schedulers"
    )
    lr_end: Optional[float] = Field(
        default=0.0, ge=0.0, description="End learning rate"
    )
    power: float = Field(default=1.0, ge=0.0, description="Power for polynomial decay")

    @validator("warmup_steps")
    def validate_warmup(cls, v, values):
        """Validate warmup configuration."""
        if v is not None and v < 0:
            raise ValueError("warmup_steps must be non-negative")
        return v


class CreateOptimizerRequest(BaseModel):
    """Create optimizer request."""

    model_id: str = Field(..., description="Model identifier")
    optimizer_config: OptimizerConfig = Field(
        default_factory=OptimizerConfig, description="Optimizer configuration"
    )
    scheduler_config: Optional[SchedulerConfig] = Field(
        default=None, description="Optional scheduler configuration"
    )


class ValidateOptimizerRequest(BaseModel):
    """Validate optimizer request."""

    optimizer_config: OptimizerConfig = Field(..., description="Optimizer configuration")
    scheduler_config: Optional[SchedulerConfig] = Field(
        default=None, description="Optional scheduler configuration"
    )
    num_training_steps: Optional[int] = Field(
        default=None, description="Total training steps for validation"
    )


class CreateSchedulerRequest(BaseModel):
    """Create scheduler request."""

    optimizer_id: str = Field(..., description="Optimizer ID")
    scheduler_config: SchedulerConfig = Field(..., description="Scheduler configuration")


class ResetSchedulerRequest(BaseModel):
    """Reset scheduler request."""

    scheduler_id: str = Field(..., description="Scheduler ID")


# Response Schemas


class ParameterGroupInfo(BaseModel):
    """Parameter group information."""

    name: str
    num_params: int
    has_weight_decay: bool
    learning_rate: float


class OptimizerMetadata(BaseModel):
    """Optimizer metadata."""

    optimizer_id: str
    optimizer_type: OptimizerType
    learning_rate: float
    weight_decay: float
    max_grad_norm: Optional[float]
    parameter_groups: List[ParameterGroupInfo]
    total_parameters: int
    trainable_parameters: int
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SchedulerMetadata(BaseModel):
    """Scheduler metadata."""

    scheduler_id: str
    scheduler_type: SchedulerType
    optimizer_id: str
    warmup_steps: int
    total_steps: int
    current_step: int
    current_lr: float
    warmup_completed: bool
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class OptimizerResponse(BaseModel):
    """Optimizer operation response."""

    success: bool
    message: str
    optimizer_id: Optional[str] = None
    metadata: Optional[OptimizerMetadata] = None


class SchedulerResponse(BaseModel):
    """Scheduler operation response."""

    success: bool
    message: str
    scheduler_id: Optional[str] = None
    metadata: Optional[SchedulerMetadata] = None


class OptimizerStatusResponse(BaseModel):
    """Optimizer status response."""

    optimizer_id: str
    optimizer_type: OptimizerType
    current_lr: float
    global_step: int
    parameter_groups: List[ParameterGroupInfo]


class SchedulerStatusResponse(BaseModel):
    """Scheduler status response."""

    scheduler_id: str
    scheduler_type: SchedulerType
    current_step: int
    total_steps: int
    current_lr: float
    warmup_completed: bool
    warmup_progress: float


class ValidationResult(BaseModel):
    """Validation result."""

    valid: bool
    optimizer_valid: bool
    scheduler_valid: bool
    issues: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class OptimizerHealthResponse(BaseModel):
    """Optimizer service health response."""

    status: str
    healthy: bool
    active_optimizers: int
    active_schedulers: int
    supported_optimizers: List[str]
    supported_schedulers: List[str]
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
