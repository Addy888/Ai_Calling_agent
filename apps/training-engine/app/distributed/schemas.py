"""Distributed training schemas and data models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DistributedStrategy(str, Enum):
    """Distributed training strategies."""
    
    NONE = "none"  # Single device
    DDP = "ddp"  # DistributedDataParallel
    FSDP = "fsdp"  # FullyShardedDataParallel
    DEEPSPEED = "deepspeed"  # DeepSpeed
    ACCELERATE = "accelerate"  # Hugging Face Accelerate (auto-select)


class DeviceType(str, Enum):
    """Device types."""
    
    CPU = "cpu"
    CUDA = "cuda"
    MPS = "mps"  # Apple Silicon


class MixedPrecision(str, Enum):
    """Mixed precision training modes."""
    
    NO = "no"
    FP16 = "fp16"
    BF16 = "bf16"


class DistributedBackend(str, Enum):
    """Distributed communication backends."""
    
    NCCL = "nccl"  # NVIDIA GPUs
    GLOO = "gloo"  # CPU and GPU
    MPI = "mpi"  # MPI-based


class WorkerStatus(str, Enum):
    """Worker status."""
    
    INITIALIZING = "initializing"
    READY = "ready"
    TRAINING = "training"
    FAILED = "failed"
    STOPPED = "stopped"


# Configuration Models


class DistributedConfig(BaseModel):
    """Distributed training configuration."""
    
    # Strategy
    strategy: DistributedStrategy = DistributedStrategy.ACCELERATE
    backend: Optional[DistributedBackend] = None  # Auto-select if None
    
    # Hardware
    num_processes: Optional[int] = None  # Auto-detect if None
    num_machines: int = 1
    machine_rank: int = 0
    main_process_ip: Optional[str] = None
    main_process_port: int = 29500
    
    # Mixed Precision
    mixed_precision: MixedPrecision = MixedPrecision.NO
    
    # Optimization
    gradient_accumulation_steps: int = 1
    gradient_clipping: Optional[float] = None
    
    # DeepSpeed specific
    deepspeed_config_file: Optional[str] = None
    deepspeed_config: Optional[Dict[str, Any]] = None
    
    # FSDP specific
    fsdp_sharding_strategy: str = "full_shard"  # full_shard, shard_grad_op, no_shard
    fsdp_offload: bool = False
    fsdp_auto_wrap: bool = True
    
    # Advanced
    find_unused_parameters: bool = False
    broadcast_buffers: bool = True
    bucket_cap_mb: int = 25
    
    # Timeouts
    init_timeout_seconds: int = 1800  # 30 minutes
    barrier_timeout_seconds: int = 300  # 5 minutes


class AccelerateConfig(BaseModel):
    """Accelerate-specific configuration."""
    
    compute_environment: str = "LOCAL_MACHINE"
    distributed_type: str = "MULTI_GPU"
    mixed_precision: str = "no"
    use_cpu: bool = False
    num_processes: Optional[int] = None
    machine_rank: int = 0
    num_machines: int = 1
    main_process_ip: Optional[str] = None
    main_process_port: int = 29500
    deepspeed_config: Optional[Dict[str, Any]] = None
    fsdp_config: Optional[Dict[str, Any]] = None


class DeepSpeedConfig(BaseModel):
    """DeepSpeed configuration."""
    
    train_batch_size: int = 32
    train_micro_batch_size_per_gpu: int = 8
    gradient_accumulation_steps: int = 4
    gradient_clipping: float = 1.0
    
    # ZeRO optimization
    zero_optimization: Dict[str, Any] = Field(
        default_factory=lambda: {
            "stage": 2,
            "offload_optimizer": {
                "device": "cpu",
                "pin_memory": True
            },
            "allgather_partitions": True,
            "allgather_bucket_size": 2e8,
            "overlap_comm": True,
            "reduce_scatter": True,
            "reduce_bucket_size": 2e8,
            "contiguous_gradients": True
        }
    )
    
    # FP16/BF16
    fp16: Optional[Dict[str, Any]] = None
    bf16: Optional[Dict[str, Any]] = None
    
    # Optimizer
    optimizer: Optional[Dict[str, Any]] = None
    scheduler: Optional[Dict[str, Any]] = None
    
    # Advanced
    steps_per_print: int = 100
    wall_clock_breakdown: bool = False


# Runtime Models


class DeviceInfo(BaseModel):
    """Device information."""
    
    device_type: DeviceType
    device_id: int = 0
    device_name: str
    total_memory_gb: Optional[float] = None
    available_memory_gb: Optional[float] = None
    compute_capability: Optional[str] = None
    supports_bf16: bool = False
    supports_fp16: bool = False


class ProcessGroupInfo(BaseModel):
    """Process group information."""
    
    world_size: int
    rank: int
    local_rank: int
    local_world_size: int
    is_main_process: bool
    backend: str
    master_addr: str
    master_port: int
    group_name: Optional[str] = None


class WorkerInfo(BaseModel):
    """Worker/process information."""
    
    rank: int
    local_rank: int
    world_size: int
    status: WorkerStatus
    device: DeviceInfo
    pid: Optional[int] = None
    hostname: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None


class DistributedStatus(BaseModel):
    """Distributed training status."""
    
    is_distributed: bool
    strategy: DistributedStrategy
    num_processes: int
    num_machines: int
    current_machine_rank: int
    
    # Process info
    world_size: int
    rank: int
    local_rank: int
    is_main_process: bool
    
    # Hardware
    devices: List[DeviceInfo]
    backend: str
    
    # Health
    all_workers_ready: bool
    failed_workers: List[int] = Field(default_factory=list)
    
    # Metrics
    communication_overhead_ms: Optional[float] = None
    synchronization_time_ms: Optional[float] = None
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DistributedMetrics(BaseModel):
    """Distributed training metrics."""
    
    job_id: str
    global_step: int
    
    # Per-worker metrics
    rank: int
    local_rank: int
    
    # Training metrics
    loss: Optional[float] = None
    learning_rate: float
    
    # Distributed metrics
    gradient_sync_time_ms: float
    communication_time_ms: float
    all_reduce_time_ms: Optional[float] = None
    
    # Device metrics
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_total_mb: Optional[float] = None
    gpu_utilization_percent: Optional[float] = None
    
    # Throughput
    samples_per_second: float
    tokens_per_second: Optional[float] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# API Request/Response Models


class StartDistributedTrainingRequest(BaseModel):
    """Request to start distributed training."""
    
    job_id: str
    config: DistributedConfig
    model_cfg: Dict[str, Any]  # Renamed from model_config to avoid Pydantic conflict
    training_cfg: Dict[str, Any]  # Renamed from training_config to avoid Pydantic conflict


class StopDistributedTrainingRequest(BaseModel):
    """Request to stop distributed training."""
    
    job_id: str
    graceful: bool = True


class DistributedHealthResponse(BaseModel):
    """Distributed training health response."""
    
    is_healthy: bool
    status: DistributedStatus
    workers: List[WorkerInfo]
    issues: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class WorkerRegistration(BaseModel):
    """Worker registration data."""
    
    rank: int
    local_rank: int
    hostname: str
    pid: int
    device_info: DeviceInfo


class SynchronizationRequest(BaseModel):
    """Synchronization request."""
    
    job_id: str
    barrier_name: str
    timeout_seconds: int = 300


class BroadcastRequest(BaseModel):
    """Broadcast request."""
    
    job_id: str
    data: Any
    src_rank: int = 0


class AllReduceRequest(BaseModel):
    """All-reduce request."""
    
    job_id: str
    tensor_name: str
    operation: str = "sum"  # sum, mean, min, max
