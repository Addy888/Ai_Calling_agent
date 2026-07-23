"""Checkpoint exceptions."""


class CheckpointException(Exception):
    """Base checkpoint exception."""

    pass


class CheckpointValidationException(CheckpointException):
    """Checkpoint validation failed."""

    pass


class ResumeException(CheckpointException):
    """Resume operation failed."""

    pass


class RecoveryException(CheckpointException):
    """Recovery operation failed."""

    pass


class SnapshotException(CheckpointException):
    """Snapshot operation failed."""

    pass


class StorageException(CheckpointException):
    """Storage operation failed."""

    pass


class CheckpointNotFoundError(CheckpointException):
    """Checkpoint not found."""

    pass


class CheckpointCorruptedError(CheckpointValidationException):
    """Checkpoint file is corrupted."""

    pass


class IncompatibleCheckpointError(CheckpointValidationException):
    """Checkpoint is incompatible with current configuration."""

    pass


class StorageQuotaExceededError(StorageException):
    """Storage quota exceeded."""

    pass


class CheckpointSaveError(CheckpointException):
    """Failed to save checkpoint."""

    pass


class CheckpointRestoreError(ResumeException):
    """Failed to restore checkpoint."""

    pass
