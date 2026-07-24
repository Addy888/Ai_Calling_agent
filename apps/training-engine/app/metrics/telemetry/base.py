"""Base interface for telemetry integrations."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.metrics.schemas import TrainingMetrics, SystemMetrics, ModelMetrics


class BaseTelemetryInterface(ABC):
    """
    Base interface for telemetry integrations.
    
    All telemetry systems (MLflow, W&B, Prometheus, etc.) should implement this interface.
    """

    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize telemetry system.
        
        Args:
            config: Configuration dictionary
        """
        pass

    @abstractmethod
    def start_run(self, job_id: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Start a tracking run.
        
        Args:
            job_id: Job identifier
            metadata: Optional metadata about the run
        """
        pass

    @abstractmethod
    def end_run(self, job_id: str) -> None:
        """
        End a tracking run.
        
        Args:
            job_id: Job identifier
        """
        pass

    @abstractmethod
    def log_training_metrics(self, job_id: str, metrics: TrainingMetrics, step: int) -> None:
        """
        Log training metrics.
        
        Args:
            job_id: Job identifier
            metrics: TrainingMetrics object
            step: Current step
        """
        pass

    @abstractmethod
    def log_system_metrics(self, job_id: str, metrics: SystemMetrics, step: int) -> None:
        """
        Log system metrics.
        
        Args:
            job_id: Job identifier
            metrics: SystemMetrics object
            step: Current step
        """
        pass

    @abstractmethod
    def log_model_metrics(self, job_id: str, metrics: ModelMetrics) -> None:
        """
        Log model metrics.
        
        Args:
            job_id: Job identifier
            metrics: ModelMetrics object
        """
        pass

    @abstractmethod
    def log_custom_metric(self, job_id: str, key: str, value: float, step: Optional[int] = None) -> None:
        """
        Log custom metric.
        
        Args:
            job_id: Job identifier
            key: Metric name
            value: Metric value
            step: Optional step number
        """
        pass

    @abstractmethod
    def log_parameter(self, job_id: str, key: str, value: Any) -> None:
        """
        Log parameter/hyperparameter.
        
        Args:
            job_id: Job identifier
            key: Parameter name
            value: Parameter value
        """
        pass

    @abstractmethod
    def log_artifact(self, job_id: str, path: str, artifact_type: str = "file") -> None:
        """
        Log artifact (file, model, etc.).
        
        Args:
            job_id: Job identifier
            path: Path to artifact
            artifact_type: Type of artifact
        """
        pass

    @abstractmethod
    def is_enabled(self) -> bool:
        """
        Check if telemetry is enabled.
        
        Returns:
            True if enabled, False otherwise
        """
        pass

    @abstractmethod
    def flush(self, job_id: str) -> None:
        """
        Flush pending telemetry data.
        
        Args:
            job_id: Job identifier
        """
        pass
