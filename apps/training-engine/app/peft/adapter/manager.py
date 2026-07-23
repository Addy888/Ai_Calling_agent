"""Adapter management and lifecycle."""

from typing import Dict, List, Optional

import torch.nn as nn

from app.events import event_bus
from app.logger import training_logger
from app.peft.adapter.registry import AdapterRegistry, adapter_registry
from app.peft.exceptions import AdapterException, AdapterNotFoundError
from app.peft.schemas import AdapterMetadata


class AdapterManager:
    """
    Manages adapter lifecycle and operations.
    
    Responsibilities:
    - Track active adapters
    - Apply/remove adapters
    - Query adapter status
    - Manage adapter metadata
    """

    def __init__(self, registry: Optional[AdapterRegistry] = None):
        """
        Initialize adapter manager.
        
        Args:
            registry: Optional adapter registry
        """
        self.logger = training_logger
        self.registry = registry or adapter_registry
        self._active_adapters: Dict[str, str] = {}  # model_id -> adapter_id

    def register_adapter(
        self, metadata: AdapterMetadata, model_id: Optional[str] = None
    ) -> None:
        """
        Register an adapter.
        
        Args:
            metadata: Adapter metadata
            model_id: Optional model ID to associate with
        """
        self.logger.info(f"Registering adapter: {metadata.adapter_name}")

        try:
            # Register in registry
            self.registry.register(metadata)

            # Mark as active if model_id provided
            if model_id:
                self._active_adapters[model_id] = metadata.adapter_id

            # Emit event
            event_bus.emit(
                "adapter_registered",
                {
                    "adapter_id": metadata.adapter_id,
                    "adapter_name": metadata.adapter_name,
                    "adapter_type": metadata.adapter_type.value,
                    "model_id": model_id,
                },
            )

            self.logger.info(
                f"Adapter registered successfully: {metadata.adapter_id}"
            )

        except Exception as e:
            self.logger.error(f"Failed to register adapter: {str(e)}")
            raise AdapterException(f"Adapter registration failed: {str(e)}")

    def unregister_adapter(self, adapter_id: str) -> None:
        """
        Unregister an adapter.
        
        Args:
            adapter_id: Adapter ID
        """
        self.logger.info(f"Unregistering adapter: {adapter_id}")

        try:
            # Remove from active adapters
            for model_id, active_adapter_id in list(
                self._active_adapters.items()
            ):
                if active_adapter_id == adapter_id:
                    del self._active_adapters[model_id]

            # Unregister from registry
            self.registry.unregister(adapter_id)

            # Emit event
            event_bus.emit(
                "adapter_unregistered",
                {"adapter_id": adapter_id},
            )

            self.logger.info(f"Adapter unregistered: {adapter_id}")

        except Exception as e:
            self.logger.error(f"Failed to unregister adapter: {str(e)}")
            raise AdapterException(f"Adapter unregistration failed: {str(e)}")

    def get_adapter(self, adapter_id: str) -> AdapterMetadata:
        """
        Get adapter metadata.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            AdapterMetadata
        """
        return self.registry.get(adapter_id)

    def get_adapter_by_name(self, adapter_name: str) -> Optional[AdapterMetadata]:
        """
        Get adapter by name.
        
        Args:
            adapter_name: Adapter name
            
        Returns:
            AdapterMetadata or None
        """
        return self.registry.get_by_name(adapter_name)

    def list_adapters(
        self, model_id: Optional[str] = None, adapter_type: Optional[str] = None
    ) -> List[AdapterMetadata]:
        """
        List adapters with optional filters.
        
        Args:
            model_id: Optional model ID filter
            adapter_type: Optional adapter type filter
            
        Returns:
            List of adapter metadata
        """
        if model_id:
            adapters = self.registry.list_by_model(model_id)
        elif adapter_type:
            adapters = self.registry.list_by_type(adapter_type)
        else:
            adapters = self.registry.list_all()

        return adapters

    def get_active_adapter(self, model_id: str) -> Optional[str]:
        """
        Get active adapter ID for a model.
        
        Args:
            model_id: Model ID
            
        Returns:
            Adapter ID or None
        """
        return self._active_adapters.get(model_id)

    def set_active_adapter(self, model_id: str, adapter_id: str) -> None:
        """
        Set active adapter for a model.
        
        Args:
            model_id: Model ID
            adapter_id: Adapter ID
        """
        # Verify adapter exists
        if not self.registry.exists(adapter_id):
            raise AdapterNotFoundError(f"Adapter not found: {adapter_id}")

        self._active_adapters[model_id] = adapter_id

        self.logger.info(
            f"Active adapter set for model {model_id}: {adapter_id}"
        )

        # Emit event
        event_bus.emit(
            "adapter_activated",
            {
                "model_id": model_id,
                "adapter_id": adapter_id,
            },
        )

    def clear_active_adapter(self, model_id: str) -> None:
        """
        Clear active adapter for a model.
        
        Args:
            model_id: Model ID
        """
        if model_id in self._active_adapters:
            adapter_id = self._active_adapters[model_id]
            del self._active_adapters[model_id]

            self.logger.info(
                f"Active adapter cleared for model {model_id}: {adapter_id}"
            )

            # Emit event
            event_bus.emit(
                "adapter_deactivated",
                {
                    "model_id": model_id,
                    "adapter_id": adapter_id,
                },
            )

    def is_adapter_active(self, adapter_id: str) -> bool:
        """
        Check if adapter is active on any model.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            True if active
        """
        return adapter_id in self._active_adapters.values()

    def get_models_using_adapter(self, adapter_id: str) -> List[str]:
        """
        Get models using a specific adapter.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            List of model IDs
        """
        return [
            model_id
            for model_id, active_adapter_id in self._active_adapters.items()
            if active_adapter_id == adapter_id
        ]

    def get_stats(self) -> Dict[str, any]:
        """
        Get adapter manager statistics.
        
        Returns:
            Statistics dict
        """
        registry_stats = self.registry.get_stats()

        stats = {
            **registry_stats,
            "active_adapters": len(self._active_adapters),
            "active_models": list(self._active_adapters.keys()),
        }

        return stats

    def validate_adapter_compatibility(
        self, adapter_id: str, model: nn.Module
    ) -> bool:
        """
        Validate adapter compatibility with model.
        
        Args:
            adapter_id: Adapter ID
            model: PyTorch model
            
        Returns:
            True if compatible
        """
        # Get adapter metadata
        metadata = self.get_adapter(adapter_id)

        # Basic validation - check if model is a nn.Module
        if not isinstance(model, nn.Module):
            self.logger.error("Model is not a PyTorch nn.Module")
            return False

        # Additional validation could be added here
        # For now, we assume compatibility if adapter exists

        self.logger.info(
            f"Adapter {adapter_id} validated for compatibility"
        )

        return True


# Global instance
adapter_manager = AdapterManager()
