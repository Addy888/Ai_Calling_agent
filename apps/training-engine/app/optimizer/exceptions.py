"""Optimizer and Scheduler exceptions."""


class OptimizerException(Exception):
    """Base optimizer exception."""

    pass


class SchedulerException(Exception):
    """Base scheduler exception."""

    pass


class LearningRateException(OptimizerException):
    """Learning rate configuration exception."""

    pass


class WarmupException(SchedulerException):
    """Warmup configuration exception."""

    pass


class ConfigurationException(OptimizerException):
    """Configuration exception."""

    pass


class ValidationException(OptimizerException):
    """Validation exception."""

    pass


class ParameterGroupException(OptimizerException):
    """Parameter group exception."""

    pass


class OptimizerNotFoundError(OptimizerException):
    """Optimizer not found."""

    pass


class SchedulerNotFoundError(SchedulerException):
    """Scheduler not found."""

    pass


class InvalidLearningRateError(LearningRateException):
    """Invalid learning rate."""

    pass


class InvalidWarmupConfigError(WarmupException):
    """Invalid warmup configuration."""

    pass


class IncompatibleSchedulerError(SchedulerException):
    """Scheduler incompatible with optimizer."""

    pass
