"""Trainer-specific exceptions."""


class TrainerException(Exception):
    """Base trainer exception."""

    pass


class TrainerInitializationException(TrainerException):
    """Trainer initialization failed."""

    pass


class TrainingArgumentsException(TrainerException):
    """Training arguments creation failed."""

    pass


class TrainerRuntimeException(TrainerException):
    """Trainer runtime error."""

    pass


class TrainerValidationException(TrainerException):
    """Trainer validation failed."""

    pass


class TrainerBuildException(TrainerException):
    """Trainer build failed."""

    pass


class DataCollatorException(TrainerException):
    """Data collator creation failed."""

    pass
