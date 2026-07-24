"""Distributed training exceptions."""


class DistributedTrainingException(Exception):
    """Base exception for distributed training operations."""
    pass


class AccelerateException(DistributedTrainingException):
    """Exception for Accelerate-related errors."""
    pass


class DDPException(DistributedTrainingException):
    """Exception for DDP-related errors."""
    pass


class FSDPException(DistributedTrainingException):
    """Exception for FSDP-related errors."""
    pass


class DeepSpeedException(DistributedTrainingException):
    """Exception for DeepSpeed-related errors."""
    pass


class ProcessGroupException(DistributedTrainingException):
    """Exception for process group operations."""
    pass


class WorkerException(DistributedTrainingException):
    """Exception for worker-related errors."""
    pass


class SynchronizationException(DistributedTrainingException):
    """Exception for synchronization errors."""
    pass


class DeviceException(DistributedTrainingException):
    """Exception for device-related errors."""
    pass


class DistributedInitializationError(DistributedTrainingException):
    """Raised when distributed initialization fails."""
    pass


class WorkerFailureError(WorkerException):
    """Raised when a worker fails."""
    pass


class CommunicationError(DistributedTrainingException):
    """Raised when distributed communication fails."""
    pass


class TimeoutError(DistributedTrainingException):
    """Raised when distributed operation times out."""
    pass
