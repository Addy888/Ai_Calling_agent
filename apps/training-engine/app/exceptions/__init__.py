"""Training engine exceptions."""


class TrainingEngineException(Exception):
    """Base exception for training engine."""
    pass


class ConfigurationError(TrainingEngineException):
    """Configuration error."""
    pass


class ResourceNotFoundError(TrainingEngineException):
    """Resource not found error."""
    pass


class ValidationError(TrainingEngineException):
    """Validation error."""
    pass


__all__ = [
    "TrainingEngineException",
    "ConfigurationError",
    "ResourceNotFoundError",
    "ValidationError",
]
