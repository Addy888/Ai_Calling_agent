"""Model-specific exceptions."""

from typing import Any, Optional

from app.exceptions import TrainingEngineException


class ModelException(TrainingEngineException):
    """Base exception for model operations."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, code="MODEL_ERROR", details=details)


class ModelLoadException(ModelException):
    """Exception for model loading errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "MODEL_LOAD_ERROR"


class ModelValidationException(ModelException):
    """Exception for model validation errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "MODEL_VALIDATION_ERROR"


class CompatibilityException(ModelException):
    """Exception for compatibility errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "COMPATIBILITY_ERROR"


class RegistryException(ModelException):
    """Exception for registry errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "REGISTRY_ERROR"


class CacheException(ModelException):
    """Exception for cache errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "CACHE_ERROR"


class ConfigurationException(ModelException):
    """Exception for configuration errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details)
        self.code = "CONFIGURATION_ERROR"


class ModelNotFoundException(ModelException):
    """Exception when model is not found."""

    def __init__(self, model_id: str):
        super().__init__(
            f"Model not found: {model_id}",
            details={"model_id": model_id},
        )
        self.code = "MODEL_NOT_FOUND"


class ModelAlreadyLoadedException(ModelException):
    """Exception when model is already loaded."""

    def __init__(self, model_id: str):
        super().__init__(
            f"Model already loaded: {model_id}",
            details={"model_id": model_id},
        )
        self.code = "MODEL_ALREADY_LOADED"


class ModelNotLoadedException(ModelException):
    """Exception when model is not loaded."""

    def __init__(self, model_id: str):
        super().__init__(
            f"Model not loaded: {model_id}",
            details={"model_id": model_id},
        )
        self.code = "MODEL_NOT_LOADED"


class InvalidModelPathException(ModelException):
    """Exception for invalid model path."""

    def __init__(self, path: str):
        super().__init__(
            f"Invalid model path: {path}",
            details={"path": path},
        )
        self.code = "INVALID_MODEL_PATH"


class ModelFileMissingException(ModelException):
    """Exception when required model file is missing."""

    def __init__(self, file_name: str):
        super().__init__(
            f"Required model file missing: {file_name}",
            details={"file_name": file_name},
        )
        self.code = "MODEL_FILE_MISSING"
