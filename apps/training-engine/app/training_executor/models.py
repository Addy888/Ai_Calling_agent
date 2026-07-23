"""Training executor data models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class TrainingStatus(str, Enum):
    """Training status."""

    PENDING = "pending"
    INITIALIZING = "initializing"
    PREPARING = "preparing"
    TRAINING = "training"
    PAUSED = "paused"
    RESUMING = "resuming"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"
    CHECKPOINTING = "checkpointing"


class TrainingType(str, Enum):
    """Training type."""

    FULL_FINE_TUNE = "full_fine_tune"
    LORA = "lora"
    QLORA = "qlora"
    PEFT = "peft"
    INSTRUCTION_TUNING = "instruction_tuning"
    CONVERSATION_TUNING = "conversation_tuning"
    DOMAIN_ADAPTATION = "domain_adaptation"


class OptimizerType(str, Enum):
    """Optimizer type."""

    ADAMW = "adamw"
    ADAM = "adam"
    SGD = "sgd"
    ADAFACTOR = "adafactor"
    RMSPROP = "rmsprop"


class SchedulerType(str, Enum):
    """Learning rate scheduler type."""

    LINEAR = "linear"
    COSINE = "cosine"
    COSINE_WITH_RESTARTS = "cosine_with_restarts"
    POLYNOMIAL = "polynomial"
    CONSTANT = "constant"
    CONSTANT_WITH_WARMUP = "constant_with_warmup"


class PrecisionType(str, Enum):
    """Training precision type."""

    FP32 = "fp32"
    FP16 = "fp16"
    BF16 = "bf16"
    INT8 = "int8"


class LoRAConfig(BaseModel):
    """LoRA configuration."""

    r: int = Field(default=8, description="LoRA rank")
    lora_alpha: int = Field(default=16, description="LoRA alpha")
    lora_dropout: float = Field(default=0.05, description="LoRA dropout")
    target_modules: Optional[List[str]] = Field(
        default=None, description="Target modules for LoRA"
    )
    bias: str = Field(default="none", description="Bias type")
    task_type: str = Field(default="CAUSAL_LM", description="Task type")
    fan_in_fan_out: bool = Field(default=False, description="Fan in fan out")
    inference_mode: bool = Field(default=False, description="Inference mode")


class TrainingConfig(BaseModel):
    """Training configuration."""

    # Basic settings
    training_type: TrainingType = TrainingType.LORA
    num_train_epochs: int = Field(default=3, ge=1, le=100)
    per_device_train_batch_size: int = Field(default=4, ge=1, le=128)
    per_device_eval_batch_size: int = Field(default=4, ge=1, le=128)
    gradient_accumulation_steps: int = Field(default=4, ge=1, le=128)
    
    # Learning rate
    learning_rate: float = Field(default=2e-4, ge=1e-6, le=1e-2)
    weight_decay: float = Field(default=0.01, ge=0.0, le=1.0)
    warmup_ratio: float = Field(default=0.03, ge=0.0, le=1.0)
    warmup_steps: int = Field(default=0, ge=0)
    
    # Optimizer and scheduler
    optimizer_type: OptimizerType = OptimizerType.ADAMW
    scheduler_type: SchedulerType = SchedulerType.LINEAR
    adam_beta1: float = Field(default=0.9, ge=0.0, le=1.0)
    adam_beta2: float = Field(default=0.999, ge=0.0, le=1.0)
    adam_epsilon: float = Field(default=1e-8, ge=1e-10, le=1e-6)
    
    # Precision
    precision: PrecisionType = PrecisionType.FP16
    fp16: bool = Field(default=True)
    bf16: bool = Field(default=False)
    
    # Gradient management
    max_grad_norm: float = Field(default=1.0, ge=0.0, le=10.0)
    gradient_checkpointing: bool = Field(default=True)
    
    # Sequence length
    max_seq_length: int = Field(default=512, ge=128, le=8192)
    
    # Logging and evaluation
    logging_steps: int = Field(default=10, ge=1)
    eval_steps: int = Field(default=100, ge=1)
    save_steps: int = Field(default=100, ge=1)
    save_total_limit: int = Field(default=3, ge=1, le=10)
    
    # Evaluation
    evaluation_strategy: str = Field(default="steps")
    save_strategy: str = Field(default="steps")
    load_best_model_at_end: bool = Field(default=True)
    metric_for_best_model: str = Field(default="loss")
    
    # System
    seed: int = Field(default=42, ge=0)
    dataloader_num_workers: int = Field(default=4, ge=0, le=16)
    dataloader_pin_memory: bool = Field(default=True)
    
    # Device
    device: str = Field(default="cuda" if torch_cuda_available() else "cpu")
    use_cpu: bool = Field(default=False)
    
    # LoRA config (if applicable)
    lora_config: Optional[LoRAConfig] = None
    
    # Additional settings
    report_to: List[str] = Field(default_factory=lambda: ["none"])
    push_to_hub: bool = Field(default=False)
    resume_from_checkpoint: Optional[str] = None
    
    # Custom options
    custom_config: Dict[str, Any] = Field(default_factory=dict)


def torch_cuda_available() -> bool:
    """Check if CUDA is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except:
        return False


class TrainingMetrics(BaseModel):
    """Training metrics."""

    epoch: float = 0.0
    global_step: int = 0
    train_loss: Optional[float] = None
    eval_loss: Optional[float] = None
    learning_rate: Optional[float] = None
    train_runtime: Optional[float] = None
    train_samples_per_second: Optional[float] = None
    train_steps_per_second: Optional[float] = None
    
    # GPU metrics (if available)
    gpu_utilization: Optional[float] = None
    gpu_memory_allocated: Optional[float] = None
    gpu_memory_reserved: Optional[float] = None
    
    # System metrics
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    
    # Progress
    progress_percentage: float = 0.0
    eta_seconds: Optional[float] = None
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TrainingCheckpoint(BaseModel):
    """Training checkpoint information."""

    checkpoint_id: str = Field(default_factory=lambda: str(uuid4()))
    training_job_id: str
    
    checkpoint_path: str
    checkpoint_number: int
    
    epoch: float
    global_step: int
    
    loss: Optional[float] = None
    eval_loss: Optional[float] = None
    
    is_best: bool = False
    
    size_mb: Optional[float] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrainingJob(BaseModel):
    """Training job."""

    job_id: str = Field(default_factory=lambda: str(uuid4()))
    
    # Models and data
    model_id: str
    dataset_id: str
    tokenizer_id: Optional[str] = None
    
    # Configuration
    config: TrainingConfig
    
    # Status
    status: TrainingStatus = TrainingStatus.PENDING
    
    # Metrics
    current_metrics: Optional[TrainingMetrics] = None
    
    # Checkpoints
    checkpoints: List[TrainingCheckpoint] = Field(default_factory=list)
    best_checkpoint: Optional[str] = None
    
    # Paths
    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None
    
    # Errors
    error_message: Optional[str] = None
    error_traceback: Optional[str] = None
    
    # Progress
    total_steps: Optional[int] = None
    completed_steps: int = 0
    
    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Company context
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    
    # Additional metadata
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrainingEvent(BaseModel):
    """Training event."""

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    job_id: str
    
    event_type: str  # started, epoch_started, step, checkpoint, completed, failed
    
    message: str
    data: Dict[str, Any] = Field(default_factory=dict)
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TrainingRuntimeInfo(BaseModel):
    """Training runtime information."""

    job_id: str
    status: TrainingStatus
    
    # Process info
    process_id: Optional[int] = None
    worker_id: Optional[str] = None
    
    # Device info
    device: str
    num_gpus: int = 0
    gpu_names: List[str] = Field(default_factory=list)
    
    # Memory info
    total_memory_gb: Optional[float] = None
    available_memory_gb: Optional[float] = None
    
    # Model info
    model_parameters: Optional[int] = None
    trainable_parameters: Optional[int] = None
    
    # Training info
    total_train_batch_size: Optional[int] = None
    total_steps: Optional[int] = None
    
    started_at: Optional[datetime] = None
    last_update: datetime = Field(default_factory=datetime.utcnow)


class TrainingContext(BaseModel):
    """Training execution context."""
    
    job_id: str
    job: "TrainingJob"
    
    # Metadata references (not actual loaded objects)
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict)
    tokenizer_metadata: Dict[str, Any] = Field(default_factory=dict)
    model_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Runtime info
    runtime_info: Dict[str, Any] = Field(default_factory=dict)
    device: str = "cpu"
    
    # Directories
    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None
    temp_dir: Optional[str] = None
    
    # State
    is_prepared: bool = False
    is_validated: bool = False
    
    # Additional context
    metadata: Dict[str, Any] = Field(default_factory=dict)
