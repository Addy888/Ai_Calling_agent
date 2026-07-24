"""
Enterprise Metrics, Logging & Monitoring Engine.

A production-ready comprehensive observability system for AI training workloads.

Core Components:
- MetricsManager: Central orchestrator for metric collection and management
- MetricsCollector: Collect training, system, model, and performance metrics
- MetricsStorage: In-memory and disk-based metric storage
- MetricsAggregator: Statistical aggregations and windowing
- AlertEngine: Anomaly detection and alert generation
- TrainingMonitor: Continuous health monitoring
- StructuredLogger: JSON-based structured logging
- TensorBoardWriter: TensorBoard integration

Quick Start:
    >>> from app.metrics import metrics_manager
    >>> 
    >>> # Start tracking
    >>> metrics_manager.start_job("my_job")
    >>> 
    >>> # Record metrics
    >>> metrics_manager.record_training_metrics(
    ...     job_id="my_job",
    ...     global_step=100,
    ...     training_loss=0.45,
    ...     learning_rate=1e-4,
    ... )
    >>> 
    >>> # Get live metrics
    >>> live = metrics_manager.get_live_metrics("my_job")

See COMPREHENSIVE_README.md for complete documentation.
"""

from app.metrics.metrics_manager import MetricsManager, metrics_manager
from app.metrics.metrics_collector import MetricsCollector, metrics_collector
from app.metrics.metrics_aggregator import MetricsAggregator, metrics_aggregator
from app.metrics.metrics_storage import MetricsStorage, metrics_storage
from app.metrics.tensorboard_writer import TensorBoardWriter, tensorboard_writer
from app.metrics.alert_engine import AlertEngine, alert_engine
from app.metrics.training_monitor import TrainingMonitor, training_monitor
from app.metrics.structured_logger import StructuredLogger, structured_logger

# Factory for easy setup
from app.metrics.factory import (
    MetricsFactory,
    MetricsConfig,
    create_default_metrics_stack,
    create_dev_metrics_stack,
    create_prod_metrics_stack,
    create_test_metrics_stack,
)

# Schemas
from app.metrics.schemas import (
    # Metric schemas
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
    MetricSnapshot,
    # Logging schemas
    LogEntry,
    LogLevel,
    # Alert schemas
    Alert,
    AlertType,
    AlertSeverity,
    # Aggregation schemas
    AggregatedMetrics,
    AggregationConfig,
    # Monitor schemas
    MonitorStatus,
    HealthStatus,
)

# Exceptions
from app.metrics.exceptions import (
    MetricsException,
    LoggerException,
    MonitorException,
    TelemetryException,
    AggregationException,
    AlertException,
)

__all__ = [
    # Core components
    "MetricsManager",
    "metrics_manager",
    "MetricsCollector",
    "metrics_collector",
    "MetricsAggregator",
    "metrics_aggregator",
    "MetricsStorage",
    "metrics_storage",
    "TensorBoardWriter",
    "tensorboard_writer",
    "AlertEngine",
    "alert_engine",
    "TrainingMonitor",
    "training_monitor",
    "StructuredLogger",
    "structured_logger",
    # Factory
    "MetricsFactory",
    "MetricsConfig",
    "create_default_metrics_stack",
    "create_dev_metrics_stack",
    "create_prod_metrics_stack",
    "create_test_metrics_stack",
    # Schemas
    "TrainingMetrics",
    "SystemMetrics",
    "ModelMetrics",
    "PerformanceMetrics",
    "MetricSnapshot",
    "LogEntry",
    "LogLevel",
    "Alert",
    "AlertType",
    "AlertSeverity",
    "AggregatedMetrics",
    "AggregationConfig",
    "MonitorStatus",
    "HealthStatus",
    # Exceptions
    "MetricsException",
    "LoggerException",
    "MonitorException",
    "TelemetryException",
    "AggregationException",
    "AlertException",
]

__version__ = "1.0.0"
__phase__ = "4.4.4.5.6"
