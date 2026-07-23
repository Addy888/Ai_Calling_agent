"""Training executor exceptions."""

from typing import Any, Optional

from app.exceptions import TrainingEngineException


class TrainingException(TrainingEngineException):
    """Base exception for training operations."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, code="TRAINING_ERROR", details=details)


class CheckpointException(TrainingException):
    """Exception for checkpoint operations."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "CHECKPOINT_ERROR"


class RuntimeException(TrainingException):
    """Exception for runtime errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "RUNTIME_ERROR"


class OptimizerException(TrainingException):
    """Exception for optimizer errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "OPTIMIZER_ERROR"


class SchedulerException(TrainingException):
    """Exception for scheduler errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "SCHEDULER_ERROR"


class ModelPreparationException(TrainingException):
    """Exception for model preparation errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "MODEL_PREPARATION_ERROR"


class DatasetPreparationException(TrainingException):
    """Exception for dataset preparation errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_PREPARATION_ERROR"


class TrainingJobNotFoundException(TrainingException):
    """Exception when training job is not found."""

    def __init__(self, job_id: str):
        super().__init__(
            f"Training job not found: {job_id}",
            details={"job_id": job_id},
        )
        self.code = "TRAINING_JOB_NOT_FOUND"


class TrainingAlreadyRunningException(TrainingException):
    """Exception when training is already running."""

    def __init__(self, job_id: str):
        super().__init__(
            f"Training already running: {job_id}",
            details={"job_id": job_id},
        )
        self.code = "TRAINING_ALREADY_RUNNING"


class InvalidTrainingConfigException(TrainingException):
    """Exception for invalid training configuration."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "INVALID_TRAINING_CONFIG"
