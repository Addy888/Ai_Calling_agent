"""Dataset-specific exceptions."""

from typing import Any, Optional

from app.exceptions import TrainingEngineException


class DatasetException(TrainingEngineException):
    """Base exception for dataset operations."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, code="DATASET_ERROR", details=details)


class DatasetValidationException(DatasetException):
    """Exception for dataset validation errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_VALIDATION_ERROR"


class DatasetFormatException(DatasetException):
    """Exception for dataset format errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_FORMAT_ERROR"


class DatasetParserException(DatasetException):
    """Exception for dataset parsing errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_PARSER_ERROR"


class DatasetCleanerException(DatasetException):
    """Exception for dataset cleaning errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_CLEANER_ERROR"


class DatasetProcessingException(DatasetException):
    """Exception for dataset processing errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_PROCESSING_ERROR"


class DatasetNotFoundException(DatasetException):
    """Exception when dataset is not found."""

    def __init__(self, dataset_id: str):
        super().__init__(
            f"Dataset not found: {dataset_id}",
            details={"dataset_id": dataset_id},
        )
        self.code = "DATASET_NOT_FOUND"


class DatasetLoadException(DatasetException):
    """Exception for dataset loading errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "DATASET_LOAD_ERROR"


class UnsupportedFormatException(DatasetException):
    """Exception for unsupported format."""

    def __init__(self, format_name: str):
        super().__init__(
            f"Unsupported format: {format_name}",
            details={"format": format_name},
        )
        self.code = "UNSUPPORTED_FORMAT"
