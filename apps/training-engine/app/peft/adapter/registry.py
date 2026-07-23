"""Adapter registry for tracking adapters."""

from typing import Dict, List, Optional

from app.logger import training_logger
from app.peft.exceptions import (
    AdapterAlreadyExistsError,
    AdapterNotFoundError,
)
from app.peft.schemas import AdapterMetadata


class AdapterRegistry:
    """
    Registry for tracking adapter metadata.
    
    Provides storage and retrieval of adapter information
    with various query capabilities.
    """

    def __init__(self):
        """Initialize adapter registry."""
        self.logger = training_logger
        self._adapters: Dict[str, AdapterMetadata] = {}
        self._name_index: Dict[str, str] = {}  # name -> adapter_id
        self._model_index: Dict[str, List[str]] = {}  # model_id -> [adapter_ids]
        self._type_index: Dict[str, List[str]] = {}  # type -> [adapter_ids]

    def register(self, metadata: AdapterMetadata) -> None:
        """
        Register an adapter.
        
        Args:
            metadata: Adapter metadata
            
        Raises:
            AdapterAlreadyExistsError: If adapter already exists
        """
        adapter_id = metadata.adapter_id
        adapter_name = metadata.adapter_name

        # Check for duplicate ID
        if adapter_id in self._adapters:
            raise AdapterAlreadyExistsError(
                f"Adapter with ID {adapter_id} already exists"
            )

        # Check for duplicate name
        if adapter_name in self._name_index:
            raise AdapterAlreadyExistsError(
                f"Adapter with name {adapter_name} already exists"
            )

        # Store metadata
        self._adapters[adapter_id] = metadata

        # Update name index
        self._name_index[adapter_name] = adapter_id

        # Update model index
        base_model = metadata.base_model
        if base_model not in self._model_index:
            self._model_index[base_model] = []
        self._model_index[base_model].append(adapter_id)

        # Update type index
        adapter_type = metadata.adapter_type.value
        if adapter_type not in self._type_index:
            self._type_index[adapter_type] = []
        self._type_index[adapter_type].append(adapter_id)

        self.logger.info(
            f"Adapter registered: {adapter_name} (ID: {adapter_id})"
        )

    def unregister(self, adapter_id: str) -> None:
        """
        Unregister an adapter.
        
        Args:
            adapter_id: Adapter ID
            
        Raises:
            AdapterNotFoundError: If adapter not found
        """
        if adapter_id not in self._adapters:
            raise AdapterNotFoundError(f"Adapter not found: {adapter_id}")

        metadata = self._adapters[adapter_id]

        # Remove from name index
        if metadata.adapter_name in self._name_index:
            del self._name_index[metadata.adapter_name]

        # Remove from model index
        base_model = metadata.base_model
        if base_model in self._model_index:
            try:
                self._model_index[base_model].remove(adapter_id)
                if not self._model_index[base_model]:
                    del self._model_index[base_model]
            except ValueError:
                pass

        # Remove from type index
        adapter_type = metadata.adapter_type.value
        if adapter_type in self._type_index:
            try:
                self._type_index[adapter_type].remove(adapter_id)
                if not self._type_index[adapter_type]:
                    del self._type_index[adapter_type]
            except ValueError:
                pass

        # Remove metadata
        del self._adapters[adapter_id]

        self.logger.info(f"Adapter unregistered: {adapter_id}")

    def get(self, adapter_id: str) -> AdapterMetadata:
        """
        Get adapter metadata by ID.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            AdapterMetadata
            
        Raises:
            AdapterNotFoundError: If adapter not found
        """
        if adapter_id not in self._adapters:
            raise AdapterNotFoundError(f"Adapter not found: {adapter_id}")

        return self._adapters[adapter_id]

    def get_by_name(self, adapter_name: str) -> Optional[AdapterMetadata]:
        """
        Get adapter metadata by name.
        
        Args:
            adapter_name: Adapter name
            
        Returns:
            AdapterMetadata or None
        """
        adapter_id = self._name_index.get(adapter_name)

        if adapter_id:
            return self._adapters.get(adapter_id)

        return None

    def list_all(self) -> List[AdapterMetadata]:
        """
        List all adapters.
        
        Returns:
            List of adapter metadata
        """
        return list(self._adapters.values())

    def list_by_model(self, model_id: str) -> List[AdapterMetadata]:
        """
        List adapters for a specific model.
        
        Args:
            model_id: Model ID
            
        Returns:
            List of adapter metadata
        """
        adapter_ids = self._model_index.get(model_id, [])
        return [self._adapters[aid] for aid in adapter_ids]

    def list_by_type(self, adapter_type: str) -> List[AdapterMetadata]:
        """
        List adapters of a specific type.
        
        Args:
            adapter_type: Adapter type
            
        Returns:
            List of adapter metadata
        """
        adapter_ids = self._type_index.get(adapter_type, [])
        return [self._adapters[aid] for aid in adapter_ids]

    def exists(self, adapter_id: str) -> bool:
        """
        Check if adapter exists.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            True if exists
        """
        return adapter_id in self._adapters

    def exists_by_name(self, adapter_name: str) -> bool:
        """
        Check if adapter exists by name.
        
        Args:
            adapter_name: Adapter name
            
        Returns:
            True if exists
        """
        return adapter_name in self._name_index

    def get_stats(self) -> Dict[str, any]:
        """
        Get registry statistics.
        
        Returns:
            Statistics dictionary
        """
        return {
            "total_adapters": len(self._adapters),
            "models": len(self._model_index),
            "adapter_types": {
                adapter_type: len(adapter_ids)
                for adapter_type, adapter_ids in self._type_index.items()
            },
        }

    def clear(self) -> None:
        """Clear all adapters from registry."""
        self._adapters.clear()
        self._name_index.clear()
        self._model_index.clear()
        self._type_index.clear()

        self.logger.info("Adapter registry cleared")

    def search(
        self,
        query: str = None,
        model_id: str = None,
        adapter_type: str = None,
    ) -> List[AdapterMetadata]:
        """
        Search adapters with filters.
        
        Args:
            query: Optional name search query
            model_id: Optional model ID filter
            adapter_type: Optional adapter type filter
            
        Returns:
            List of matching adapter metadata
        """
        results = self.list_all()

        # Filter by model
        if model_id:
            results = [a for a in results if a.base_model == model_id]

        # Filter by type
        if adapter_type:
            results = [a for a in results if a.adapter_type.value == adapter_type]

        # Filter by name query
        if query:
            query_lower = query.lower()
            results = [
                a for a in results
                if query_lower in a.adapter_name.lower()
            ]

        return results


# Global instance
adapter_registry = AdapterRegistry()
