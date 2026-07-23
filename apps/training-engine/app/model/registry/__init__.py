"""Model registry for managing model catalog."""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from app.logger import training_logger
from app.model.exceptions import (
    ModelNotFoundException,
    RegistryException,
)
from app.model.models import (
    ModelArchitecture,
    ModelRegistry,
    ModelStatus,
)


class ModelRegistryManager:
    """Manage model registry."""

    def __init__(self):
        """Initialize model registry."""
        self._registry: Dict[str, ModelRegistry] = {}
        self._active_model_id: Optional[str] = None
        self._lock = asyncio.Lock()
        training_logger.info("Model registry initialized")

    async def register_model(self, model_entry: ModelRegistry) -> ModelRegistry:
        """Register a new model."""
        async with self._lock:
            model_id = model_entry.model_id

            if model_id in self._registry:
                training_logger.warning(f"Model already registered: {model_id}")
                # Update existing entry
                existing = self._registry[model_id]
                existing.updated_at = datetime.utcnow()
                existing.status = model_entry.status
                return existing

            self._registry[model_id] = model_entry

            training_logger.info(
                f"Model registered: {model_id}",
                model_id=model_id,
                name=model_entry.name,
                architecture=model_entry.architecture.value,
            )

            return model_entry

    async def get_model(self, model_id: str) -> ModelRegistry:
        """Get model from registry."""
        if model_id not in self._registry:
            raise ModelNotFoundException(model_id)

        return self._registry[model_id]

    async def list_models(
        self,
        architecture: Optional[ModelArchitecture] = None,
        status: Optional[ModelStatus] = None,
        active_only: bool = False,
    ) -> List[ModelRegistry]:
        """List models in registry."""
        models = list(self._registry.values())

        # Filter by architecture
        if architecture:
            models = [m for m in models if m.architecture == architecture]

        # Filter by status
        if status:
            models = [m for m in models if m.status == status]

        # Filter active only
        if active_only:
            models = [m for m in models if m.is_active]

        return models

    async def update_model_status(
        self, model_id: str, status: ModelStatus
    ) -> ModelRegistry:
        """Update model status."""
        async with self._lock:
            model = await self.get_model(model_id)
            model.status = status
            model.updated_at = datetime.utcnow()

            training_logger.info(
                f"Model status updated: {model_id} -> {status.value}",
                model_id=model_id,
                status=status.value,
            )

            return model

    async def activate_model(self, model_id: str) -> ModelRegistry:
        """Activate a model."""
        async with self._lock:
            model = await self.get_model(model_id)

            # Deactivate previously active model
            if self._active_model_id and self._active_model_id != model_id:
                prev_model = self._registry.get(self._active_model_id)
                if prev_model:
                    prev_model.is_active = False

            # Activate new model
            model.is_active = True
            model.status = ModelStatus.ACTIVE
            model.updated_at = datetime.utcnow()
            self._active_model_id = model_id

            training_logger.info(f"Model activated: {model_id}")

            return model

    async def deactivate_model(self, model_id: str) -> ModelRegistry:
        """Deactivate a model."""
        async with self._lock:
            model = await self.get_model(model_id)
            model.is_active = False
            model.status = ModelStatus.INACTIVE
            model.updated_at = datetime.utcnow()

            if self._active_model_id == model_id:
                self._active_model_id = None

            training_logger.info(f"Model deactivated: {model_id}")

            return model

    async def archive_model(self, model_id: str) -> ModelRegistry:
        """Archive a model."""
        async with self._lock:
            model = await self.get_model(model_id)
            model.status = ModelStatus.ARCHIVED
            model.is_active = False
            model.updated_at = datetime.utcnow()

            if self._active_model_id == model_id:
                self._active_model_id = None

            training_logger.info(f"Model archived: {model_id}")

            return model

    async def delete_model(self, model_id: str) -> bool:
        """Delete model from registry."""
        async with self._lock:
            if model_id not in self._registry:
                raise ModelNotFoundException(model_id)

            # Check if model is active
            model = self._registry[model_id]
            if model.is_active:
                raise RegistryException(
                    f"Cannot delete active model: {model_id}"
                )

            # Mark as deleted instead of removing
            model.status = ModelStatus.DELETED
            model.updated_at = datetime.utcnow()

            training_logger.info(f"Model deleted: {model_id}")

            return True

    async def set_default_model(self, model_id: str) -> ModelRegistry:
        """Set model as default."""
        async with self._lock:
            model = await self.get_model(model_id)

            # Remove default flag from other models
            for m in self._registry.values():
                if m.is_default and m.model_id != model_id:
                    m.is_default = False

            # Set as default
            model.is_default = True
            model.updated_at = datetime.utcnow()

            training_logger.info(f"Model set as default: {model_id}")

            return model

    async def get_active_model(self) -> Optional[ModelRegistry]:
        """Get currently active model."""
        if not self._active_model_id:
            return None

        return self._registry.get(self._active_model_id)

    async def get_default_model(self) -> Optional[ModelRegistry]:
        """Get default model."""
        for model in self._registry.values():
            if model.is_default:
                return model
        return None

    def get_registry_stats(self) -> Dict[str, int]:
        """Get registry statistics."""
        stats = {
            "total_models": len(self._registry),
            "active_models": sum(1 for m in self._registry.values() if m.is_active),
            "loaded_models": sum(
                1 for m in self._registry.values() if m.status == ModelStatus.LOADED
            ),
            "archived_models": sum(
                1 for m in self._registry.values() if m.status == ModelStatus.ARCHIVED
            ),
        }

        return stats


# Global registry instance
model_registry = ModelRegistryManager()
