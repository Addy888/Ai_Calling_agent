"""Metrics and monitoring schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class MetricType(str, Enum):
    """Metric types."""
    
    TRAINING = "training"
    VALIDATION = "validation"
    SYSTEM = "system"
    MODEL = "model"
    PERFORMANCE = "performance"
    CUSTOM = "custom"


class LogLevel(str, Enum):
    """Log levels."""
    
    TRACE = "trace"
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Alert types."""
    
    LOSS_EXPLOSION = "loss_explosion"
    NAN_LOSS = "nan_loss"
    OOM_ERROR = "oom_error"
    GPU_FAILURE = "gpu_failure"
    CHECKPOINT_FAILURE = "checkpoint_failure"
    TRAINING_TIMEOUT = "training_timeout"
    RUNTIME_CRASH = "runtime_crash"
    LOW_DISK_SPACE = "low_disk_space"
    HIGH_MEMORY_USAGE = "high_memory_usage"
    TRAINING_STALLED = "training_stalled"


# Metrics Schemas


class TrainingMetrics(BaseModel):
    """Training metrics."""
    
    job_id: str
    epoch: Optional[int] = None
    global_step: int
    training_loss: Optional[float] = None
    validation_loss: Optional[float] = None
    learning_rate: float
    gradient_norm: Optional[float] = None
    gradient_clipping: Optional[float] = None
    tokens_processed: Optional[int] = None
    samples_processed: int = 0
    batch_time: Optional[float] = None
    step_time: Optional[float] = None
    epoch_time: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SystemMetrics(BaseModel):
    """System resource metrics."""
    
    job_id: str
    cpu_usage_percent: float
    ram_usage_gb: float
    ram_total_gb: float
    gpu_usage_percent: Optional[float] = None
    gpu_memory_used_gb: Optional[float] = None
    gpu_memory_total_gb: Optional[float] = None
    gpu_temperature: Optional[float] = None
    disk_usage_gb: float
    disk_total_gb: float
    network_rx_mb: Optional[float] = None
    network_tx_mb: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ModelMetrics(BaseModel):
    """Model architecture metrics."""
    
    job_id: str
    total_parameters: int
    trainable_parameters: int
    frozen_parameters: int
    lora_parameters: Optional[int] = None
    model_size_mb: float
    checkpoint_size_mb: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PerformanceMetrics(BaseModel):
    """Training performance metrics."""
    
    job_id: str
    global_step: int
    tokens_per_second: Optional[float] = None
    samples_per_second: float
    steps_per_second: float
    eta_seconds: Optional[int] = None
    elapsed_seconds: int
    throughput_mb_per_second: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MetricSnapshot(BaseModel):
    """Complete metric snapshot at a point in time."""
    
    job_id: str
    global_step: int
    training: Optional[TrainingMetrics] = None
    system: Optional[SystemMetrics] = None
    model: Optional[ModelMetrics] = None
    performance: Optional[PerformanceMetrics] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Logging Schemas


class LogEntry(BaseModel):
    """Structured log entry."""
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: LogLevel
    message: str
    job_id: Optional[str] = None
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    exception: Optional[str] = None
    stack_trace: Optional[str] = None


# Alert Schemas


class Alert(BaseModel):
    """Alert definition."""
    
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    job_id: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    acknowledged: bool = False


# Aggregation Schemas


class AggregationConfig(BaseModel):
    """Configuration for metric aggregation."""
    
    window_size: int = 100  # Number of data points
    compute_moving_average: bool = True
    compute_min_max: bool = True
    compute_percentiles: bool = False
    percentiles: List[int] = Field(default_factory=lambda: [25, 50, 75, 95])


class AggregatedMetrics(BaseModel):
    """Aggregated metrics."""
    
    metric_name: str
    count: int
    mean: float
    min: float
    max: float
    std: Optional[float] = None
    median: Optional[float] = None
    percentiles: Dict[int, float] = Field(default_factory=dict)
    moving_average: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Monitor Schemas


class MonitorStatus(BaseModel):
    """Monitor status."""
    
    is_running: bool
    job_id: Optional[str] = None
    last_update: datetime = Field(default_factory=datetime.utcnow)
    metrics_collected: int = 0
    alerts_generated: int = 0
    uptime_seconds: float = 0.0


class HealthStatus(BaseModel):
    """Health check status."""
    
    status: str  # healthy, degraded, unhealthy
    job_id: Optional[str] = None
    training_active: bool = False
    gpu_available: bool = False
    disk_space_ok: bool = True
    memory_ok: bool = True
    last_metric_time: Optional[datetime] = None
    issues: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# API Request/Response Schemas


class MetricsRequest(BaseModel):
    """Request for metrics."""
    
    job_id: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    metric_types: Optional[List[MetricType]] = None


class MetricsResponse(BaseModel):
    """Response with metrics."""
    
    job_id: str
    metrics: List[MetricSnapshot]
    total_count: int
    aggregated: Optional[Dict[str, AggregatedMetrics]] = None


class LiveMetricsResponse(BaseModel):
    """Live metrics response."""
    
    job_id: str
    training_loss: Optional[float] = None
    validation_loss: Optional[float] = None
    learning_rate: float
    global_step: int
    epoch: Optional[int] = None
    gpu_usage_percent: Optional[float] = None
    gpu_memory_percent: Optional[float] = None
    tokens_per_second: Optional[float] = None
    eta_seconds: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LogsRequest(BaseModel):
    """Request for logs."""
    
    job_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    level: Optional[LogLevel] = None
    limit: int = 100


class LogsResponse(BaseModel):
    """Response with logs."""
    
    logs: List[LogEntry]
    total_count: int


class AlertsResponse(BaseModel):
    """Response with alerts."""
    
    alerts: List[Alert]
    total_count: int
    critical_count: int = 0
    error_count: int = 0
    warning_count: int = 0


# TensorBoard Config


class TensorBoardConfig(BaseModel):
    """TensorBoard configuration."""
    
    log_dir: str = "./tensorboard_logs"
    enabled: bool = True
    flush_seconds: int = 30
    write_to_disk: bool = True


# Dashboard Data


class TrainingTimeline(BaseModel):
    """Training timeline data point."""
    
    timestamp: datetime
    global_step: int
    epoch: Optional[int]
    training_loss: Optional[float]
    validation_loss: Optional[float]
    learning_rate: float


class CheckpointTimeline(BaseModel):
    """Checkpoint timeline data point."""
    
    timestamp: datetime
    checkpoint_id: str
    global_step: int
    epoch: Optional[int]
    checkpoint_type: str
    file_size_mb: float


class TrainingHistory(BaseModel):
    """Complete training history."""
    
    job_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_steps: int
    total_epochs: Optional[int] = None
    best_loss: Optional[float] = None
    final_loss: Optional[float] = None
    total_training_time_seconds: float
    timeline: List[TrainingTimeline] = Field(default_factory=list)
    checkpoints: List[CheckpointTimeline] = Field(default_factory=list)
