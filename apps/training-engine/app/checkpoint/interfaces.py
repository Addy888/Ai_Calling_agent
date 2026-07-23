"""Checkpoint interfaces."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol

from app.checkpoint.schemas import (
    CheckpointConfig,
    CheckpointMetadata,
    CheckpointState,
    RecoveryStrategy,
)


class ICheckpointStorage(Protocol):
    """Interface for checkpoint storage."""

    def save(self, checkpoint_id: str, data: Dict[str, Any], path: Path) -> Path:
        """Save checkpoint data."""
        ...

    def load(self, path: Path) -> Dict[str, Any]:
        """Load checkpoint data."""
        ...

    def delete(self, path: Path) -> bool:
        """Delete checkpoint."""
        ...

    def exists(self, path: Path) -> bool:
        """Check if checkpoint exists."""
        ...

    def get_size(self, path: Path) -> int:
        """Get checkpoint size in bytes."""
        ...


class ICheckpointValidator(Protocol):
    """Interface for checkpoint validation."""

    def validate(self, checkpoint_path: Path) -> tuple[bool, List[str]]:
        """Validate checkpoint."""
        ...

    def compute_hash(self, checkpoint_path: Path) -> str:
        """Compute checkpoint hash."""
        ...


class ICheckpointRegistry(Protocol):
    """Interface for checkpoint registry."""

    def register(self, checkpoint: CheckpointState) -> None:
        """Register checkpoint."""
        ...

    def get(self, checkpoint_id: str) -> Optional[CheckpointState]:
        """Get checkpoint by ID."""
        ...

    def list_by_job(self, job_id: str) -> List[CheckpointState]:
        """List checkpoints for job."""
        ...

    def get_latest(self, job_id: str) -> Optional[CheckpointState]:
        """Get latest checkpoint for job."""
        ...

    def get_best(self, job_id: str) -> Optional[CheckpointState]:
        """Get best checkpoint for job."""
        ...


class CheckpointComponent(ABC):
    """Base class for checkpoint components."""

    @abstractmethod
    def initialize(self, config: CheckpointConfig) -> None:
        """Initialize component."""
        pass

    @abstractmethod
    def validate(self) -> bool:
        """Validate component."""
        pass

    @abstractmethod
    def cleanup(self) -> None:
        """Cleanup component resources."""
        pass


class IResumeManager(Protocol):
    """Interface for resume manager."""

    def can_resume(self, job_id: str) -> bool:
        """Check if job can be resumed."""
        ...

    def resume(
        self, job_id: str, strategy: RecoveryStrategy
    ) -> tuple[bool, Optional[CheckpointMetadata]]:
        """Resume training from checkpoint."""
        ...


class IRecoveryManager(Protocol):
    """Interface for recovery manager."""

    def recover(
        self, job_id: str, checkpoint_id: Optional[str] = None
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """Recover training state."""
        ...

    def get_recovery_options(self, job_id: str) -> List[CheckpointMetadata]:
        """Get available recovery options."""
        ...
