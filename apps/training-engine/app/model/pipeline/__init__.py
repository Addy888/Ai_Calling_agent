"""Model pipeline for complete model workflow."""

from typing import Dict, List, Optional

from app.logger import training_logger
from app.model.cache import model_cache
from app.model.compatibility import compatibility_engine
from app.model.exceptions import ModelNotFoundException
from app.model.loader import ModelLoader
from app.model.manager import model_manager
from app.model.metadata import metadata_service
from app.model.models import (
    ModelArchitecture,
    ModelConfig,
    ModelInfo,
    ModelLoadRequest,
    ModelMetadata,
    ModelRegistry,
    ModelType,
)
from app.model.registry import model_registry
from app.model.storage import model_storage
from app.model.validator import ModelValidator


class ModelPipeline:
    """Complete model workflow pipeline."""

    def __init__(self):
        """Initialize model pipeline."""
        self.loader = ModelLoader()
        self.validator = ModelValidator()
        training_logger.info("Model pipeline initialized")

    async def register_and_prepare(
        self,
        model_path: str,
        model_name: str,
        architecture: ModelArchitecture,
        model_type: ModelType = ModelType.BASE,
        version: str = "1.0.0",
        validate: bool = True,
        load: bool = False,
        **kwargs,
    ) -> ModelRegistry:
        """
        Complete pipeline: Register → Validate → Prepare → Ready.
        
        This is the main entry point for adding new models.
        """
        training_logger.info(f"Starting model pipeline: {model_name}")

        # Step 1: Generate metadata
        training_logger.info("Step 1: Generating metadata...")
        metadata = await metadata_service.generate_metadata(
            model_path=model_path,
            model_name=model_name,
            architecture=architecture,
            model_type=model_type,
            version=version,
            **kwargs,
        )

        # Step 2: Create configuration
        training_logger.info("Step 2: Creating configuration...")
        config = ModelConfig(
            model_name=model_name,
            architecture=architecture,
            model_type=model_type,
            model_path=model_path,
            parameter_count=metadata.parameter_count,
            context_length=metadata.context_length,
            vocabulary_size=metadata.vocabulary_size,
            supported_languages=metadata.supported_languages,
            training_capabilities=metadata.training_capabilities,
        )

        # Step 3: Validate (if requested)
        if validate:
            training_logger.info("Step 3: Validating model...")
            validation = await self.validator.validate_model(
                metadata.model_id, config
            )

            if not validation.is_valid:
                raise ValueError(
                    f"Model validation failed: {', '.join(validation.errors)}"
                )

        # Step 4: Check compatibility
        training_logger.info("Step 4: Checking compatibility...")
        compatibility_checks = await compatibility_engine.check_all_compatibility(
            metadata.model_id, config, {}
        )

        # Log warnings
        for check in compatibility_checks:
            if check.warnings:
                for warning in check.warnings:
                    training_logger.warning(
                        f"Compatibility warning: {check.component} - {warning}"
                    )

        # Step 5: Register model
        training_logger.info("Step 5: Registering model...")
        registry_entry = await model_manager.register_model(config, metadata)

        # Step 6: Save to storage
        training_logger.info("Step 6: Saving to storage...")
        await model_storage.save_registry(registry_entry)
        await model_storage.save_metadata(metadata)

        # Step 7: Cache metadata
        await model_cache.set_metadata(metadata)

        # Step 8: Load model (if requested)
        if load:
            training_logger.info("Step 7: Loading model...")
            await model_manager.load_model(metadata.model_id)

        training_logger.info(
            f"Model pipeline complete: {model_name}",
            model_id=metadata.model_id,
        )

        return registry_entry

    async def prepare_for_training(
        self,
        model_id: str,
        tokenizer_id: Optional[str] = None,
        dataset_id: Optional[str] = None,
    ) -> Dict:
        """
        Prepare model for training session.
        
        Returns readiness status and any issues.
        """
        training_logger.info(f"Preparing model for training: {model_id}")

        # Get model
        registry_entry = await model_registry.get_model(model_id)

        # Validate training readiness
        readiness = await self.validator.validate_training_readiness(
            model_id, registry_entry.config
        )

        # Check compatibility
        compatibility_context = {}
        if tokenizer_id:
            compatibility_context["tokenizer_id"] = tokenizer_id
        if dataset_id:
            compatibility_context["dataset_id"] = dataset_id

        compatibility_checks = await compatibility_engine.check_all_compatibility(
            model_id, registry_entry.config, compatibility_context
        )

        # Determine if ready
        is_ready = (
            readiness["is_ready"]
            and all(c.compatible for c in compatibility_checks)
        )

        result = {
            "model_id": model_id,
            "is_ready": is_ready,
            "readiness": readiness,
            "compatibility": [c.model_dump() for c in compatibility_checks],
        }

        training_logger.info(
            f"Training preparation complete: {model_id}",
            is_ready=is_ready,
        )

        return result

    async def get_model(self, model_id: str) -> ModelRegistry:
        """Get model from cache or storage."""
        # Try cache first
        cached_info = await model_cache.get(model_id)
        if cached_info:
            return await model_registry.get_model(model_id)

        # Try storage
        registry_entry = await model_storage.load_registry(model_id)
        if registry_entry:
            return registry_entry

        raise ModelNotFoundException(model_id)

    async def delete_model(self, model_id: str) -> bool:
        """Delete model completely."""
        training_logger.info(f"Deleting model: {model_id}")

        # Delete from manager
        success = await model_manager.delete_model(model_id)

        if success:
            # Delete from storage
            await model_storage.delete_registry(model_id)
            await model_storage.delete_metadata(model_id)

            # Delete from cache
            await model_cache.delete(model_id)

        training_logger.info(f"Model deleted: {model_id}")
        return success

    async def list_models(
        self,
        architecture: Optional[str] = None,
        status: Optional[str] = None,
        active_only: bool = False,
    ) -> List[ModelRegistry]:
        """List models with filters."""
        return await model_manager.list_models(
            architecture=architecture,
            status=status,
            active_only=active_only,
        )

    async def get_pipeline_stats(self) -> Dict:
        """Get pipeline statistics."""
        manager_stats = model_manager.get_manager_stats()
        cache_stats = model_cache.get_cache_stats()
        storage_stats = model_storage.get_storage_stats()

        return {
            "manager": manager_stats,
            "cache": cache_stats,
            "storage": storage_stats,
        }


# Global model pipeline
model_pipeline = ModelPipeline()
