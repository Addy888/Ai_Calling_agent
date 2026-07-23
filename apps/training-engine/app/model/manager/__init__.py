"""Model manager for coordinating model operations."""

from typing import Dict, List, Optional

from app.logger import training_logger
from app.model.compatibility import compatibility_engine
from app.model.exceptions import ModelNotFoundException
from app.model.loader import ModelLoader
from app.model.models import (
    ModelConfig,
    ModelInfo,
    ModelLoadRequest,
    ModelMetadata,
    ModelRegistry,
    ModelStatus,
)
from app.model.registry import model_registry
from app.model.validator import ModelValidator


class ModelManager:
    """Coordinate all model operations."""

    def __init__(self):
        """Initialize model manager."""
        self.loader = ModelLoader()
        self.validator = ModelValidator()
        training_logger.info("Model manager initialized")

    async def register_model(
        self,
        config: ModelConfig,
        metadata: ModelMetadata,
    ) -> ModelRegistry:
        """Register a new model."""
        training_logger.info(f"Registering model: {metadata.name}")

        # Create registry entry
        registry_entry = ModelRegistry(
            model_id=metadata.model_id,
            name=metadata.name,
            version=metadata.version,
            architecture=config.architecture,
            status=ModelStatus.REGISTERED,
            config=config,
            metadata=metadata,
        )

        # Register in registry
        entry = await model_registry.register_model(registry_entry)

        training_logger.info(
            f"Model registered: {entry.model_id}",
            model_id=entry.model_id,
        )

        return entry

    async def load_model(
        self,
        model_id: str,
        request: Optional[ModelLoadRequest] = None,
    ) -> ModelInfo:
        """Load a model."""
        training_logger.info(f"Loading model: {model_id}")

        # Get model from registry
        registry_entry = await model_registry.get_model(model_id)

        # Update status
        await model_registry.update_model_status(model_id, ModelStatus.LOADING)

        try:
            # Validate if requested
            if request and request.validate:
                validation = await self.validator.validate_model(
                    model_id, registry_entry.config
                )

                if not validation.is_valid:
                    await model_registry.update_model_status(
                        model_id, ModelStatus.FAILED
                    )
                    raise ValueError(
                        f"Model validation failed: {', '.join(validation.errors)}"
                    )

            # Load model
            model_info = await self.loader.load_model(
                model_id, registry_entry.config, request
            )

            # Update registry
            await model_registry.update_model_status(model_id, ModelStatus.LOADED)

            # Update metadata
            registry_entry.metadata.last_used = model_info.loaded_at

            training_logger.info(f"Model loaded: {model_id}")

            return model_info

        except Exception as e:
            await model_registry.update_model_status(model_id, ModelStatus.FAILED)
            training_logger.error(f"Failed to load model: {str(e)}")
            raise

    async def unload_model(self, model_id: str) -> bool:
        """Unload a model."""
        training_logger.info(f"Unloading model: {model_id}")

        # Unload from loader
        success = await self.loader.unload_model(model_id)

        if success:
            # Update registry
            await model_registry.update_model_status(model_id, ModelStatus.REGISTERED)

        return success

    async def reload_model(
        self,
        model_id: str,
        request: Optional[ModelLoadRequest] = None,
    ) -> ModelInfo:
        """Reload a model."""
        training_logger.info(f"Reloading model: {model_id}")

        # Get model from registry
        registry_entry = await model_registry.get_model(model_id)

        # Reload
        model_info = await self.loader.reload_model(
            model_id, registry_entry.config, request
        )

        # Update registry
        await model_registry.update_model_status(model_id, ModelStatus.LOADED)

        return model_info

    async def activate_model(self, model_id: str) -> ModelRegistry:
        """Activate a model."""
        training_logger.info(f"Activating model: {model_id}")

        # Check if model is loaded
        if not self.loader.is_loaded(model_id):
            training_logger.info(f"Model not loaded, loading first: {model_id}")
            await self.load_model(model_id)

        # Activate in registry
        entry = await model_registry.activate_model(model_id)

        training_logger.info(f"Model activated: {model_id}")

        return entry

    async def deactivate_model(self, model_id: str) -> ModelRegistry:
        """Deactivate a model."""
        training_logger.info(f"Deactivating model: {model_id}")

        # Deactivate in registry
        entry = await model_registry.deactivate_model(model_id)

        training_logger.info(f"Model deactivated: {model_id}")

        return entry

    async def archive_model(self, model_id: str) -> ModelRegistry:
        """Archive a model."""
        training_logger.info(f"Archiving model: {model_id}")

        # Unload if loaded
        if self.loader.is_loaded(model_id):
            await self.unload_model(model_id)

        # Archive in registry
        entry = await model_registry.archive_model(model_id)

        training_logger.info(f"Model archived: {model_id}")

        return entry

    async def delete_model(self, model_id: str) -> bool:
        """Delete a model."""
        training_logger.info(f"Deleting model: {model_id}")

        # Unload if loaded
        if self.loader.is_loaded(model_id):
            await self.unload_model(model_id)

        # Delete from registry
        success = await model_registry.delete_model(model_id)

        training_logger.info(f"Model deleted: {model_id}")

        return success

    async def list_models(
        self,
        architecture: Optional[str] = None,
        status: Optional[str] = None,
        active_only: bool = False,
    ) -> List[ModelRegistry]:
        """List models."""
        return await model_registry.list_models(
            architecture=architecture,
            status=status,
            active_only=active_only,
        )

    async def get_model(self, model_id: str) -> ModelRegistry:
        """Get model details."""
        return await model_registry.get_model(model_id)

    async def get_active_model(self) -> Optional[ModelRegistry]:
        """Get active model."""
        return await model_registry.get_active_model()

    async def validate_model(
        self, model_id: str
    ) -> Dict:
        """Validate model."""
        registry_entry = await model_registry.get_model(model_id)

        # Validate model
        validation = await self.validator.validate_model(
            model_id, registry_entry.config
        )

        # Check training readiness
        training_readiness = await self.validator.validate_training_readiness(
            model_id, registry_entry.config
        )

        # Check compatibility
        compatibility_checks = await compatibility_engine.check_all_compatibility(
            model_id, registry_entry.config, {}
        )

        return {
            "validation": validation.model_dump(),
            "training_readiness": training_readiness,
            "compatibility": [c.model_dump() for c in compatibility_checks],
        }

    def get_manager_stats(self) -> Dict:
        """Get manager statistics."""
        registry_stats = model_registry.get_registry_stats()
        loader_stats = self.loader.get_load_statistics()

        return {
            "registry": registry_stats,
            "loader": loader_stats,
        }


# Global model manager
model_manager = ModelManager()
