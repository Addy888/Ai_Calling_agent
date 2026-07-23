"""Model storage module."""

import json
from pathlib import Path
from typing import Optional, List

import aiofiles

from app.config import settings
from app.logger import training_logger
from app.model.models import ModelRegistry, ModelMetadata, ModelConfig


class ModelStorage:
    """Store and retrieve models from file system."""

    def __init__(self, storage_dir: Optional[str] = None):
        """Initialize model storage."""
        self.storage_dir = Path(storage_dir or settings.MODEL_STORAGE_DIR or "models")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Registry storage
        self.registry_dir = self.storage_dir / "registry"
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata storage
        self.metadata_dir = self.storage_dir / "metadata"
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        
        training_logger.info(f"Model storage initialized: {self.storage_dir}")

    async def save_registry(self, registry: ModelRegistry) -> Path:
        """Save model registry entry."""
        file_path = self.registry_dir / f"{registry.model_id}.json"

        training_logger.info(f"Saving registry: {registry.model_id}")

        try:
            async with aiofiles.open(file_path, mode="w", encoding="utf-8") as f:
                await f.write(registry.model_dump_json(indent=2))

            training_logger.info(
                f"Registry saved: {registry.model_id}",
                path=str(file_path),
            )

            return file_path

        except Exception as e:
            training_logger.error(f"Failed to save registry: {str(e)}")
            raise

    async def load_registry(self, model_id: str) -> Optional[ModelRegistry]:
        """Load model registry entry."""
        file_path = self.registry_dir / f"{model_id}.json"

        if not file_path.exists():
            training_logger.warning(f"Registry file not found: {model_id}")
            return None

        training_logger.info(f"Loading registry: {model_id}")

        try:
            async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
                content = await f.read()
                data = json.loads(content)
                registry = ModelRegistry(**data)

            training_logger.info(f"Registry loaded: {model_id}")
            return registry

        except Exception as e:
            training_logger.error(f"Failed to load registry: {str(e)}")
            raise

    async def delete_registry(self, model_id: str) -> bool:
        """Delete model registry entry."""
        file_path = self.registry_dir / f"{model_id}.json"

        if not file_path.exists():
            return False

        try:
            file_path.unlink()
            training_logger.info(f"Registry deleted: {model_id}")
            return True

        except Exception as e:
            training_logger.error(f"Failed to delete registry: {str(e)}")
            raise

    async def exists(self, model_id: str) -> bool:
        """Check if model registry exists."""
        file_path = self.registry_dir / f"{model_id}.json"
        return file_path.exists()

    async def list_models(self) -> List[str]:
        """List all model IDs in storage."""
        registry_files = self.registry_dir.glob("*.json")
        return [f.stem for f in registry_files]

    async def save_metadata(self, metadata: ModelMetadata) -> Path:
        """Save model metadata."""
        file_path = self.metadata_dir / f"{metadata.model_id}.json"

        training_logger.info(f"Saving metadata: {metadata.model_id}")

        try:
            async with aiofiles.open(file_path, mode="w", encoding="utf-8") as f:
                await f.write(metadata.model_dump_json(indent=2))

            training_logger.info(f"Metadata saved: {metadata.model_id}")
            return file_path

        except Exception as e:
            training_logger.error(f"Failed to save metadata: {str(e)}")
            raise

    async def load_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        """Load model metadata."""
        file_path = self.metadata_dir / f"{model_id}.json"

        if not file_path.exists():
            training_logger.warning(f"Metadata file not found: {model_id}")
            return None

        training_logger.info(f"Loading metadata: {model_id}")

        try:
            async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
                content = await f.read()
                data = json.loads(content)
                metadata = ModelMetadata(**data)

            training_logger.info(f"Metadata loaded: {model_id}")
            return metadata

        except Exception as e:
            training_logger.error(f"Failed to load metadata: {str(e)}")
            raise

    async def delete_metadata(self, model_id: str) -> bool:
        """Delete model metadata."""
        file_path = self.metadata_dir / f"{model_id}.json"

        if not file_path.exists():
            return False

        try:
            file_path.unlink()
            training_logger.info(f"Metadata deleted: {model_id}")
            return True

        except Exception as e:
            training_logger.error(f"Failed to delete metadata: {str(e)}")
            raise

    async def save_config(self, model_id: str, config: ModelConfig) -> Path:
        """Save model configuration."""
        config_dir = self.storage_dir / "configs"
        config_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = config_dir / f"{model_id}.json"

        training_logger.info(f"Saving config: {model_id}")

        try:
            async with aiofiles.open(file_path, mode="w", encoding="utf-8") as f:
                await f.write(config.model_dump_json(indent=2))

            training_logger.info(f"Config saved: {model_id}")
            return file_path

        except Exception as e:
            training_logger.error(f"Failed to save config: {str(e)}")
            raise

    async def archive_model(self, model_id: str) -> bool:
        """Archive model to archive directory."""
        archive_dir = self.storage_dir / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)

        training_logger.info(f"Archiving model: {model_id}")

        try:
            # Move registry to archive
            registry_file = self.registry_dir / f"{model_id}.json"
            if registry_file.exists():
                archive_file = archive_dir / f"{model_id}.json"
                registry_file.rename(archive_file)

            # Move metadata to archive
            metadata_file = self.metadata_dir / f"{model_id}.json"
            if metadata_file.exists():
                archive_metadata = archive_dir / f"{model_id}_metadata.json"
                metadata_file.rename(archive_metadata)

            training_logger.info(f"Model archived: {model_id}")
            return True

        except Exception as e:
            training_logger.error(f"Failed to archive model: {str(e)}")
            raise

    def get_storage_stats(self) -> dict:
        """Get storage statistics."""
        registry_count = len(list(self.registry_dir.glob("*.json")))
        metadata_count = len(list(self.metadata_dir.glob("*.json")))
        
        archive_dir = self.storage_dir / "archive"
        archive_count = len(list(archive_dir.glob("*.json"))) if archive_dir.exists() else 0

        return {
            "total_registries": registry_count,
            "total_metadata": metadata_count,
            "archived_models": archive_count,
            "storage_path": str(self.storage_dir),
        }


# Global storage instance
model_storage = ModelStorage()
