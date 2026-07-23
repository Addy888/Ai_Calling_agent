"""Optimizer and Scheduler interfaces."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Protocol

import torch.nn as nn
from torch.optim import Optimizer
from torch.optim.lr_scheduler import LRScheduler


class IOptimizerBuilder(Protocol):
    """Interface for optimizer builders."""

    def build_optimizer(
        self, model: nn.Module, config: Dict[str, Any]
    ) -> Optimizer:
        """Build optimizer."""
        ...

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate optimizer configuration."""
        ...


class ISchedulerBuilder(Protocol):
    """Interface for scheduler builders."""

    def build_scheduler(
        self, optimizer: Optimizer, config: Dict[str, Any]
    ) -> LRScheduler:
        """Build scheduler."""
        ...

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate scheduler configuration."""
        ...


class IParameterGroupBuilder(Protocol):
    """Interface for parameter group builders."""

    def build_parameter_groups(
        self, model: nn.Module, config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Build parameter groups."""
        ...

    def get_trainable_parameters(self, model: nn.Module) -> List[nn.Parameter]:
        """Get trainable parameters."""
        ...


class OptimizerComponent(ABC):
    """Base class for optimizer components."""

    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize component."""
        pass

    @abstractmethod
    def validate(self) -> bool:
        """Validate component."""
        pass

    @abstractmethod
    def get_state(self) -> Dict[str, Any]:
        """Get component state."""
        pass

    @abstractmethod
    def cleanup(self) -> None:
        """Cleanup component resources."""
        pass


class IOptimizerRuntime(Protocol):
    """Interface for optimizer runtime."""

    def get_current_lr(self, optimizer_id: str) -> float:
        """Get current learning rate."""
        ...

    def update_lr(self, optimizer_id: str, lr: float) -> None:
        """Update learning rate."""
        ...

    def step_scheduler(self, scheduler_id: str) -> None:
        """Step scheduler."""
        ...

    def get_state(self, optimizer_id: str) -> Dict[str, Any]:
        """Get optimizer state."""
        ...
