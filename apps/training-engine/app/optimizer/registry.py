"""Optimizer registry."""

from typing import Any, Dict, List, Optional

from torch.optim import Optimizer

from app.logger import training_logger
from app.optimizer.exceptions import OptimizerNotFoundError
from app.optimizer.schemas import OptimizerMetadata


class OptimizerRegistry:
    """
    Registry for tracking optimizers and their metadata.
    """

    def __init__(self):
        """Initialize optimizer registry."""
        self.logger = training_logger
        self._optimizers: Dict[str, Optimizer] = {}
        self._metadata: Dict[str, OptimizerMetadata] = {}
        self._scheduler_mappings: Dict[str, str] = {}  # scheduler_id -> optimizer_id

    def register(
        self,
        optimizer_id: str,
        optimizer: Optimizer,
        metadata: OptimizerMetadata,
    ) -> None:
        """
        Register optimizer.
        
        Args:
            optimizer_id: Optimizer ID
            optimizer: Optimizer instance
            metadata: Optimizer metadata
        """
        self._optimizers[optimizer_id] = optimizer
        self._metadata[optimizer_id] = metadata

        self.logger.info(f"Optimizer registered: {optimizer_id}")

    def unregister(self, optimizer_id: str) -> None:
        """
        Unregister optimizer.
        
        Args:
            optimizer_id: Optimizer ID
        """
        if optimizer_id in self._optimizers:
            del self._optimizers[optimizer_id]
        if optimizer_id in self._metadata:
            del self._metadata[optimizer_id]

        # Remove scheduler mappings
        self._scheduler_mappings = {
            k: v for k, v in self._scheduler_mappings.items() if v != optimizer_id
        }

        self.logger.info(f"Optimizer unregistered: {optimizer_id}")

    def get_optimizer(self, optimizer_id: str) -> Optimizer:
        """
        Get optimizer by ID.
        
        Args:
            optimizer_id: Optimizer ID
            
        Returns:
            Optimizer instance
        """
        if optimizer_id not in self._optimizers:
            raise OptimizerNotFoundError(f"Optimizer not found: {optimizer_id}")

        return self._optimizers[optimizer_id]

    def get_metadata(self, optimizer_id: str) -> OptimizerMetadata:
        """
        Get optimizer metadata.
        
        Args:
            optimizer_id: Optimizer ID
            
        Returns:
            Optimizer metadata
        """
        if optimizer_id not in self._metadata:
            raise OptimizerNotFoundError(f"Optimizer not found: {optimizer_id}")

        return self._metadata[optimizer_id]

    def exists(self, optimizer_id: str) -> bool:
        """
        Check if optimizer exists.
        
        Args:
            optimizer_id: Optimizer ID
            
        Returns:
            True if exists
        """
        return optimizer_id in self._optimizers

    def list_all(self) -> List[str]:
        """
        List all optimizer IDs.
        
        Returns:
            List of optimizer IDs
        """
        return list(self._optimizers.keys())

    def map_scheduler(self, scheduler_id: str, optimizer_id: str) -> None:
        """
        Map scheduler to optimizer.
        
        Args:
            scheduler_id: Scheduler ID
            optimizer_id: Optimizer ID
        """
        self._scheduler_mappings[scheduler_id] = optimizer_id

    def get_optimizer_for_scheduler(self, scheduler_id: str) -> Optional[str]:
        """
        Get optimizer ID for scheduler.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            Optimizer ID or None
        """
        return self._scheduler_mappings.get(scheduler_id)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get registry statistics.
        
        Returns:
            Statistics dictionary
        """
        return {
            "total_optimizers": len(self._optimizers),
            "optimizer_ids": list(self._optimizers.keys()),
            "scheduler_mappings": len(self._scheduler_mappings),
        }


# Global instance
optimizer_registry = OptimizerRegistry()
