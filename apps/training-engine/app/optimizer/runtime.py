"""Optimizer runtime management."""

from typing import Any, Dict, Optional

from torch.optim import Optimizer

from app.logger import training_logger
from app.optimizer.exceptions import OptimizerException, OptimizerNotFoundError
from app.optimizer.registry import OptimizerRegistry, optimizer_registry
from app.optimizer.scheduler.manager import SchedulerManager, scheduler_manager


class OptimizerRuntime:
    """
    Manages optimizer runtime state and operations.
    """

    def __init__(
        self,
        registry: Optional[OptimizerRegistry] = None,
        scheduler_manager: Optional[SchedulerManager] = None,
    ):
        """
        Initialize optimizer runtime.
        
        Args:
            registry: Optional OptimizerRegistry instance
            scheduler_manager: Optional SchedulerManager instance
        """
        self.logger = training_logger
        self.registry = registry or optimizer_registry
        self.scheduler_manager = scheduler_manager or scheduler_manager
        self._runtime_state: Dict[str, Dict[str, Any]] = {}

    def get_current_lr(self, optimizer_id: str) -> float:
        """
        Get current learning rate.
        
        Args:
            optimizer_id: Optimizer ID
            
        Returns:
            Current learning rate
        """
        try:
            optimizer = self.registry.get_optimizer(optimizer_id)
            lrs = [group["lr"] for group in optimizer.param_groups]
            return lrs[0] if lrs else 0.0

        except Exception as e:
            self.logger.error(f"Failed to get current LR: {str(e)}")
            raise OptimizerException(f"Failed to get current LR: {str(e)}")

    def update_lr(self, optimizer_id: str, lr: float) -> None:
        """
        Update learning rate.
        
        Args:
            optimizer_id: Optimizer ID
            lr: New learning rate
        """
        try:
            optimizer = self.registry.get_optimizer(optimizer_id)

            for group in optimizer.param_groups:
                group["lr"] = lr

            self.logger.info(f"Learning rate updated to {lr} for {optimizer_id}")

        except Exception as e:
            self.logger.error(f"Failed to update LR: {str(e)}")
            raise OptimizerException(f"Failed to update LR: {str(e)}")

    def get_state(self, optimizer_id: str) -> Dict[str, Any]:
        """
        Get optimizer state.
        
        Args:
            optimizer_id: Optimizer ID
            
        Returns:
            State dictionary
        """
        try:
            optimizer = self.registry.get_optimizer(optimizer_id)
            metadata = self.registry.get_metadata(optimizer_id)

            state = {
                "optimizer_id": optimizer_id,
                "optimizer_type": metadata.optimizer_type.value,
                "current_lr": self.get_current_lr(optimizer_id),
                "parameter_groups": len(optimizer.param_groups),
                "state_size": len(optimizer.state),
            }

            # Add runtime state if exists
            if optimizer_id in self._runtime_state:
                state["runtime_state"] = self._runtime_state[optimizer_id]

            return state

        except Exception as e:
            self.logger.error(f"Failed to get optimizer state: {str(e)}")
            raise OptimizerException(f"Failed to get state: {str(e)}")

    def set_runtime_state(
        self, optimizer_id: str, key: str, value: Any
    ) -> None:
        """
        Set runtime state value.
        
        Args:
            optimizer_id: Optimizer ID
            key: State key
            value: State value
        """
        if optimizer_id not in self._runtime_state:
            self._runtime_state[optimizer_id] = {}

        self._runtime_state[optimizer_id][key] = value

    def get_runtime_state(
        self, optimizer_id: str, key: Optional[str] = None
    ) -> Any:
        """
        Get runtime state.
        
        Args:
            optimizer_id: Optimizer ID
            key: Optional specific key
            
        Returns:
            Runtime state value or dictionary
        """
        if optimizer_id not in self._runtime_state:
            return None if key else {}

        if key:
            return self._runtime_state[optimizer_id].get(key)

        return self._runtime_state[optimizer_id]

    def clear_runtime_state(self, optimizer_id: str) -> None:
        """
        Clear runtime state.
        
        Args:
            optimizer_id: Optimizer ID
        """
        if optimizer_id in self._runtime_state:
            del self._runtime_state[optimizer_id]

    def get_stats(self) -> Dict[str, Any]:
        """
        Get runtime statistics.
        
        Returns:
            Statistics dictionary
        """
        registry_stats = self.registry.get_stats()

        stats = {
            **registry_stats,
            "runtime_state_tracked": len(self._runtime_state),
            "active_schedulers": len(self.scheduler_manager.list_schedulers()),
        }

        return stats

    def step_optimizer(self, optimizer_id: str) -> None:
        """
        Step optimizer.
        
        Args:
            optimizer_id: Optimizer ID
        """
        try:
            optimizer = self.registry.get_optimizer(optimizer_id)
            optimizer.step()

            # Increment step counter
            current_step = self.get_runtime_state(optimizer_id, "global_step") or 0
            self.set_runtime_state(optimizer_id, "global_step", current_step + 1)

        except Exception as e:
            self.logger.error(f"Failed to step optimizer: {str(e)}")
            raise OptimizerException(f"Failed to step optimizer: {str(e)}")

    def zero_grad(self, optimizer_id: str) -> None:
        """
        Zero optimizer gradients.
        
        Args:
            optimizer_id: Optimizer ID
        """
        try:
            optimizer = self.registry.get_optimizer(optimizer_id)
            optimizer.zero_grad()

        except Exception as e:
            self.logger.error(f"Failed to zero gradients: {str(e)}")
            raise OptimizerException(f"Failed to zero gradients: {str(e)}")


# Global instance
optimizer_runtime = OptimizerRuntime()
