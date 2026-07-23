"""Adapter runtime management."""

from typing import Any, Dict, List, Optional

import torch.nn as nn

from app.logger import training_logger
from app.peft.adapter.manager import AdapterManager, adapter_manager
from app.peft.exceptions import AdapterException, AdapterNotFoundError


class AdapterRuntime:
    """
    Adapter runtime manager.
    
    Manages adapter lifecycle, state, and operations during runtime.
    Provides query and inspection capabilities for active adapters.
    """

    def __init__(self, manager: Optional[AdapterManager] = None):
        """
        Initialize adapter runtime.
        
        Args:
            manager: Optional AdapterManager instance
        """
        self.logger = training_logger
        self.manager = manager or adapter_manager
        self._runtime_state: Dict[str, Dict[str, Any]] = {}

    def get_metadata(self, adapter_id: str) -> Dict[str, Any]:
        """
        Get adapter metadata.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            Adapter metadata dictionary
        """
        try:
            metadata = self.manager.get_adapter(adapter_id)
            return metadata.model_dump()

        except AdapterNotFoundError:
            raise

        except Exception as e:
            self.logger.error(f"Failed to get adapter metadata: {str(e)}")
            raise AdapterException(
                f"Failed to get adapter metadata: {str(e)}"
            )

    def list_adapters(
        self,
        model_id: Optional[str] = None,
        adapter_type: Optional[str] = None,
        active_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        List adapters with optional filters.
        
        Args:
            model_id: Optional model ID filter
            adapter_type: Optional adapter type filter
            active_only: Only return active adapters
            
        Returns:
            List of adapter metadata dictionaries
        """
        try:
            adapters = self.manager.list_adapters(
                model_id=model_id,
                adapter_type=adapter_type,
            )

            # Filter active only
            if active_only:
                active_ids = set()
                for adapter_metadata in adapters:
                    if self.manager.is_adapter_active(adapter_metadata.adapter_id):
                        active_ids.add(adapter_metadata.adapter_id)

                adapters = [
                    a for a in adapters if a.adapter_id in active_ids
                ]

            return [a.model_dump() for a in adapters]

        except Exception as e:
            self.logger.error(f"Failed to list adapters: {str(e)}")
            raise AdapterException(f"Failed to list adapters: {str(e)}")

    def is_adapter_active(self, adapter_id: str) -> bool:
        """
        Check if adapter is active.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            True if active
        """
        try:
            return self.manager.is_adapter_active(adapter_id)

        except Exception as e:
            self.logger.error(
                f"Failed to check adapter active status: {str(e)}"
            )
            return False

    def get_active_model_adapters(self) -> Dict[str, str]:
        """
        Get active adapters for all models.
        
        Returns:
            Dictionary mapping model_id to adapter_id
        """
        stats = self.manager.get_stats()
        return {
            model_id: self.manager.get_active_adapter(model_id)
            for model_id in stats.get("active_models", [])
        }

    def get_adapter_models(self, adapter_id: str) -> List[str]:
        """
        Get models using a specific adapter.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            List of model IDs
        """
        try:
            return self.manager.get_models_using_adapter(adapter_id)

        except Exception as e:
            self.logger.error(f"Failed to get adapter models: {str(e)}")
            raise AdapterException(
                f"Failed to get adapter models: {str(e)}"
            )

    def set_runtime_state(
        self, adapter_id: str, key: str, value: Any
    ) -> None:
        """
        Set runtime state for an adapter.
        
        Args:
            adapter_id: Adapter ID
            key: State key
            value: State value
        """
        if adapter_id not in self._runtime_state:
            self._runtime_state[adapter_id] = {}

        self._runtime_state[adapter_id][key] = value

        self.logger.debug(
            f"Runtime state set for adapter {adapter_id}: {key}={value}"
        )

    def get_runtime_state(
        self, adapter_id: str, key: str = None
    ) -> Any:
        """
        Get runtime state for an adapter.
        
        Args:
            adapter_id: Adapter ID
            key: Optional specific state key
            
        Returns:
            State value or entire state dict
        """
        if adapter_id not in self._runtime_state:
            return None if key else {}

        if key:
            return self._runtime_state[adapter_id].get(key)

        return self._runtime_state[adapter_id]

    def clear_runtime_state(self, adapter_id: str) -> None:
        """
        Clear runtime state for an adapter.
        
        Args:
            adapter_id: Adapter ID
        """
        if adapter_id in self._runtime_state:
            del self._runtime_state[adapter_id]

        self.logger.debug(f"Runtime state cleared for adapter {adapter_id}")

    def get_runtime_stats(self) -> Dict[str, Any]:
        """
        Get runtime statistics.
        
        Returns:
            Statistics dictionary
        """
        manager_stats = self.manager.get_stats()

        stats = {
            **manager_stats,
            "runtime_state_tracked": len(self._runtime_state),
            "active_adapter_count": manager_stats.get("active_adapters", 0),
        }

        return stats

    def validate_adapter_for_model(
        self, adapter_id: str, model: nn.Module
    ) -> Dict[str, Any]:
        """
        Validate adapter compatibility with model.
        
        Args:
            adapter_id: Adapter ID
            model: PyTorch model
            
        Returns:
            Validation result dictionary
        """
        result = {
            "adapter_id": adapter_id,
            "compatible": False,
            "issues": [],
            "warnings": [],
        }

        try:
            # Verify adapter exists
            metadata = self.manager.get_adapter(adapter_id)
            result["adapter_name"] = metadata.adapter_name
            result["adapter_type"] = metadata.adapter_type.value

            # Validate compatibility
            is_compatible = self.manager.validate_adapter_compatibility(
                adapter_id, model
            )

            result["compatible"] = is_compatible

            if is_compatible:
                result["message"] = "Adapter is compatible with model"
            else:
                result["issues"].append("Adapter not compatible with model")

        except AdapterNotFoundError as e:
            result["issues"].append(f"Adapter not found: {str(e)}")

        except Exception as e:
            result["issues"].append(f"Validation error: {str(e)}")

        return result

    def get_adapter_summary(self, adapter_id: str) -> Dict[str, Any]:
        """
        Get comprehensive adapter summary.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            Adapter summary dictionary
        """
        try:
            metadata = self.get_metadata(adapter_id)
            is_active = self.is_adapter_active(adapter_id)
            models = self.get_adapter_models(adapter_id)
            runtime_state = self.get_runtime_state(adapter_id)

            summary = {
                **metadata,
                "is_active": is_active,
                "active_on_models": models,
                "runtime_state": runtime_state or {},
            }

            return summary

        except Exception as e:
            self.logger.error(f"Failed to get adapter summary: {str(e)}")
            raise AdapterException(
                f"Failed to get adapter summary: {str(e)}"
            )


# Global instance
adapter_runtime = AdapterRuntime()
