"""Trainer interfaces and protocols."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Protocol

from app.training_executor.models import TrainingContext, TrainingJob


class ITrainer(Protocol):
    """Interface for trainer implementations."""

    async def initialize(self, context: TrainingContext) -> Dict[str, Any]:
        """Initialize trainer with context."""
        ...

    async def execute(self, context: TrainingContext) -> Dict[str, Any]:
        """Execute training."""
        ...

    async def shutdown(self) -> bool:
        """Shutdown trainer gracefully."""
        ...

    def get_status(self) -> Dict[str, Any]:
        """Get trainer status."""
        ...


class ITrainerBuilder(Protocol):
    """Interface for trainer builders."""

    def build(self, context: TrainingContext) -> "ITrainer":
        """Build trainer instance."""
        ...

    def validate(self, context: TrainingContext) -> bool:
        """Validate context for trainer building."""
        ...


class TrainerComponent(ABC):
    """Base class for trainer components."""

    @abstractmethod
    async def initialize(self, context: TrainingContext) -> None:
        """Initialize component."""
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup component resources."""
        pass

    @abstractmethod
    def validate(self, context: TrainingContext) -> bool:
        """Validate component configuration."""
        pass
