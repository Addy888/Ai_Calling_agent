"""Model metadata service."""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import os

from app.logger import training_logger
from app.model.models import (
    ModelArchitecture,
    ModelMetadata,
    ModelType,
    ModelSource,
    TrainingCapability,
)


class MetadataService:
    """Generate and manage model metadata."""

    def __init__(self):
        """Initialize metadata service."""
        training_logger.info("Metadata service initialized")

    async def generate_metadata(
        self,
        model_path: str,
        model_name: str,
        architecture: ModelArchitecture,
        model_type: ModelType = ModelType.BASE,
        version: str = "1.0.0",
        **kwargs,
    ) -> ModelMetadata:
        """Generate metadata for a model."""
        training_logger.info(f"Generating metadata: {model_name}")

        # Extract model info from path
        model_files = await self._scan_model_files(model_path)
        total_size_mb = await self._calculate_model_size(model_path)

        # Detect architecture-specific features
        specs = await self._detect_model_specs(model_path, architecture)

        # Create metadata
        metadata = ModelMetadata(
            name=model_name,
            version=version,
            architecture=architecture,
            model_type=model_type,
            description=kwargs.get("description"),
            author=kwargs.get("author"),
            organization=kwargs.get("organization"),
            license=kwargs.get("license"),
            parameter_count=specs.get("parameter_count"),
            context_length=specs.get("context_length"),
            vocabulary_size=specs.get("vocabulary_size"),
            supported_languages=kwargs.get("supported_languages", ["en"]),
            training_capabilities=self._get_default_capabilities(model_type),
            source=kwargs.get("source", ModelSource.LOCAL),
            source_url=kwargs.get("source_url"),
            model_files=model_files,
            total_size_mb=total_size_mb,
            compatible_tokenizers=kwargs.get("compatible_tokenizers", []),
            compatible_datasets=kwargs.get("compatible_datasets", []),
            tags=kwargs.get("tags", []),
            extra_metadata=kwargs.get("extra_metadata", {}),
        )

        training_logger.info(
            f"Metadata generated: {model_name}",
            model_id=metadata.model_id,
            size_mb=total_size_mb,
        )

        return metadata

    async def update_metadata(
        self,
        metadata: ModelMetadata,
        **updates,
    ) -> ModelMetadata:
        """Update model metadata."""
        training_logger.info(f"Updating metadata: {metadata.model_id}")

        # Update fields
        for key, value in updates.items():
            if hasattr(metadata, key):
                setattr(metadata, key, value)

        # Update timestamp
        metadata.updated_at = datetime.utcnow()

        training_logger.info(f"Metadata updated: {metadata.model_id}")

        return metadata

    async def enrich_metadata(
        self,
        metadata: ModelMetadata,
        config_data: Optional[Dict[str, Any]] = None,
    ) -> ModelMetadata:
        """Enrich metadata with additional information."""
        training_logger.info(f"Enriching metadata: {metadata.model_id}")

        if config_data:
            # Extract from config
            if "num_parameters" in config_data:
                metadata.parameter_count = config_data["num_parameters"]
            
            if "max_position_embeddings" in config_data:
                metadata.context_length = config_data["max_position_embeddings"]
            
            if "vocab_size" in config_data:
                metadata.vocabulary_size = config_data["vocab_size"]

        # Add compatible tokenizers based on architecture
        if not metadata.compatible_tokenizers:
            metadata.compatible_tokenizers = self._get_compatible_tokenizers(
                metadata.architecture
            )

        metadata.updated_at = datetime.utcnow()

        training_logger.info(f"Metadata enriched: {metadata.model_id}")

        return metadata

    def get_metadata_summary(self, metadata: ModelMetadata) -> Dict[str, Any]:
        """Get metadata summary."""
        return {
            "model_id": metadata.model_id,
            "name": metadata.name,
            "version": metadata.version,
            "architecture": metadata.architecture.value,
            "model_type": metadata.model_type.value,
            "parameter_count": metadata.parameter_count,
            "context_length": metadata.context_length,
            "vocabulary_size": metadata.vocabulary_size,
            "total_size_mb": metadata.total_size_mb,
            "supported_languages": metadata.supported_languages,
            "training_capabilities": [c.value for c in metadata.training_capabilities],
            "model_files_count": len(metadata.model_files),
            "source": metadata.source.value,
            "created_at": metadata.created_at.isoformat(),
            "training_count": metadata.training_count,
            "inference_count": metadata.inference_count,
        }

    async def _scan_model_files(self, model_path: str) -> List[str]:
        """Scan model directory for files."""
        path = Path(model_path)
        
        if not path.exists():
            return []

        if path.is_file():
            return [path.name]

        # Scan directory
        files = []
        for file_path in path.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(path)
                files.append(str(relative_path))

        return files

    async def _calculate_model_size(self, model_path: str) -> float:
        """Calculate total model size in MB."""
        path = Path(model_path)
        
        if not path.exists():
            return 0.0

        if path.is_file():
            return path.stat().st_size / (1024 * 1024)

        # Calculate directory size
        total_size = 0
        for file_path in path.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size

        return total_size / (1024 * 1024)

    async def _detect_model_specs(
        self,
        model_path: str,
        architecture: ModelArchitecture,
    ) -> Dict[str, Any]:
        """Detect model specifications from config files."""
        path = Path(model_path)
        specs = {}

        # Try to load config.json
        config_file = path / "config.json" if path.is_dir() else None
        
        if config_file and config_file.exists():
            import json
            
            try:
                with open(config_file, "r") as f:
                    config = json.load(f)

                # Extract specs
                specs["parameter_count"] = config.get("num_parameters")
                specs["context_length"] = config.get("max_position_embeddings")
                specs["vocabulary_size"] = config.get("vocab_size")
                specs["hidden_size"] = config.get("hidden_size")
                specs["num_layers"] = config.get("num_hidden_layers")

            except Exception as e:
                training_logger.warning(f"Failed to parse config.json: {str(e)}")

        return specs

    def _get_default_capabilities(self, model_type: ModelType) -> List[TrainingCapability]:
        """Get default training capabilities for model type."""
        if model_type == ModelType.BASE:
            return [
                TrainingCapability.FULL_FINE_TUNE,
                TrainingCapability.LORA,
                TrainingCapability.QLORA,
                TrainingCapability.PEFT,
            ]
        elif model_type == ModelType.FINE_TUNED:
            return [
                TrainingCapability.LORA,
                TrainingCapability.ADAPTER,
            ]
        elif model_type == ModelType.LORA:
            return [TrainingCapability.LORA]
        elif model_type == ModelType.QLORA:
            return [TrainingCapability.QLORA]
        else:
            return []

    def _get_compatible_tokenizers(self, architecture: ModelArchitecture) -> List[str]:
        """Get compatible tokenizers for architecture."""
        tokenizer_map = {
            ModelArchitecture.LLAMA: ["llama", "llama2", "llama3"],
            ModelArchitecture.QWEN: ["qwen", "qwen2"],
            ModelArchitecture.GEMMA: ["gemma"],
            ModelArchitecture.MISTRAL: ["mistral"],
            ModelArchitecture.DEEPSEEK: ["deepseek"],
            ModelArchitecture.PHI: ["phi", "phi2", "phi3"],
            ModelArchitecture.GPT: ["gpt2", "gpt-neox"],
            ModelArchitecture.BERT: ["bert"],
            ModelArchitecture.T5: ["t5"],
        }

        return tokenizer_map.get(architecture, [])

    async def validate_metadata(self, metadata: ModelMetadata) -> Dict[str, Any]:
        """Validate metadata completeness."""
        issues = []
        warnings = []

        # Check required fields
        if not metadata.name:
            issues.append("Model name is required")

        if not metadata.architecture:
            issues.append("Model architecture is required")

        # Check optional but important fields
        if not metadata.parameter_count:
            warnings.append("Parameter count not specified")

        if not metadata.context_length:
            warnings.append("Context length not specified")

        if not metadata.supported_languages:
            warnings.append("Supported languages not specified")

        if not metadata.model_files:
            warnings.append("No model files detected")

        return {
            "is_valid": len(issues) == 0,
            "errors": issues,
            "warnings": warnings,
        }


# Global metadata service
metadata_service = MetadataService()
