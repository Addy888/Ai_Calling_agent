"""Training executor interfaces and protocols."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Protocol

from app.training_executor.models import TrainingJob, TrainingContext, TrainingStatus


class ITrainingRuntime(Protocol):
    """Interface for training runtime."""

    async def initialize(self, job_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize runtime environment."""
        ...

    async def cleanup(self, job_id: str) -> bool:
        """Cleanup runtime resources."""
        ...

    async def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get runtime status."""
        ...


class ITrainingTrainer(Protocol):
    """Interface for training trainer (to be implemented in future phase)."""

    async def execute(self, context: "TrainingContext") -> Dict[str, Any]:
        """Execute training with given context."""
        ...

    async def pause(self, job_id: str) -> bool:
        """Pause training."""
        ...

    async def resume(self, job_id: str) -> bool:
        """Resume training."""
        ...

    async def stop(self, job_id: str) -> bool:
        """Stop training."""
        ...


class IEventEmitter(Protocol):
    """Interface for event emission."""

    def emit(self, event_type: str, data: Dict[str, Any]) -> None:
        """Emit training event."""
        ...


class IJobStore(Protocol):
    """Interface for job storage."""

    async def save(self, job: TrainingJob) -> TrainingJob:
        """Save training job."""
        ...

    async def get(self, job_id: str) -> Optional[TrainingJob]:
        """Get training job."""
        ...

    async def update_status(
        self, job_id: str, status: TrainingStatus
    ) -> Optional[TrainingJob]:
        """Update job status."""
        ...

    async def delete(self, job_id: str) -> bool:
        """Delete training job."""
        ...


class TrainingComponent(ABC):
    """Base class for training components."""

    @abstractmethod
    async def initialize(self, context: "TrainingContext") -> None:
        """Initialize component."""
        pass

    @abstractmethod
    async def cleanup(self, context: "TrainingContext") -> None:
        """Cleanup component resources."""
        pass

    @abstractmethod
    async def validate(self, context: "TrainingContext") -> bool:
        """Validate component configuration."""
        pass


class TrainingContextModel(BaseModel):
    """Training context data model."""
    
    job_id: str
    job: TrainingJob
    
    # Metadata references (not actual loaded objects)
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict)
    tokenizer_metadata: Dict[str, Any] = Field(default_factory=dict)
    model_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Runtime info
    runtime_info: Dict[str, Any] = Field(default_factory=dict)
    device: str = "cpu"
    
    # Directories
    output_dir: Optional[str] = None
    checkpoint_dir: Optional[str] = None
    temp_dir: Optional[str] = None
    
    # State
    is_prepared: bool = False
    is_validated: bool = False
    
    # Additional context
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Add to models.py
from pydantic import BaseModel, Field

class TrainingContext(TrainingContextModel):
    """Training execution context."""
    pass
