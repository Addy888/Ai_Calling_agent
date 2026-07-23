"""Model validator for validation checks."""

from pathlib import Path
from typing import Dict, List

from app.logger import training_logger
from app.model.models import (
    ModelConfig,
    ModelValidationResult,
)


class ModelValidator:
    """Validate model configuration and files."""

    def __init__(self):
        """Initialize model validator."""
        training_logger.info("Model validator initialized")

    async def validate_model(
        self, model_id: str, config: ModelConfig
    ) -> ModelValidationResult:
        """Validate model configuration and files."""
        training_logger.info(f"Validating model: {model_id}")

        errors: List[str] = []
        warnings: List[str] = []
        file_checks: Dict[str, bool] = {}

        # Validate model path
        if not config.model_path:
            errors.append("Model path not specified")
            return ModelValidationResult(
                model_id=model_id,
                is_valid=False,
                errors=errors,
            )

        model_path = Path(config.model_path)

        # Check if path exists
        if not model_path.exists():
            errors.append(f"Model path does not exist: {model_path}")
        else:
            file_checks["model_path_exists"] = True

        # Validate model files
        file_checks.update(await self._validate_model_files(model_path))

        # Validate configuration
        config_valid = await self._validate_configuration(config)
        file_checks["config_valid"] = config_valid

        if not config_valid:
            warnings.append("Some configuration values are missing")

        # Validate tokenizer
        tokenizer_compatible = await self._validate_tokenizer(model_path, config)
        file_checks["tokenizer_compatible"] = tokenizer_compatible

        if not tokenizer_compatible:
            warnings.append("Tokenizer files not found or incompatible")

        # Check for critical errors
        is_valid = len(errors) == 0

        result = ModelValidationResult(
            model_id=model_id,
            is_valid=is_valid,
            file_checks=file_checks,
            config_valid=config_valid,
            tokenizer_compatible=tokenizer_compatible,
            errors=errors,
            warnings=warnings,
        )

        training_logger.info(
            f"Model validation complete: {model_id}",
            is_valid=is_valid,
            errors=len(errors),
            warnings=len(warnings),
        )

        return result

    async def _validate_model_files(self, model_path: Path) -> Dict[str, bool]:
        """Validate model files exist."""
        checks = {}

        if not model_path.is_dir():
            checks["is_directory"] = model_path.is_file()
            return checks

        checks["is_directory"] = True

        # Check for PyTorch model files
        pytorch_files = [
            "pytorch_model.bin",
            "model.safetensors",
            "pytorch_model.safetensors",
            "model.bin",
        ]

        has_model_file = False
        for file in pytorch_files:
            file_path = model_path / file
            if file_path.exists():
                checks[f"has_{file}"] = True
                has_model_file = True

        checks["has_model_file"] = has_model_file

        # Check for config file
        config_file = model_path / "config.json"
        checks["has_config"] = config_file.exists()

        return checks

    async def _validate_configuration(self, config: ModelConfig) -> bool:
        """Validate model configuration."""
        # Check if essential config is present
        if not config.model_name:
            return False

        if not config.architecture:
            return False

        return True

    async def _validate_tokenizer(
        self, model_path: Path, config: ModelConfig
    ) -> bool:
        """Validate tokenizer compatibility."""
        if not model_path.is_dir():
            return False

        # Check for tokenizer files
        tokenizer_files = [
            "tokenizer.json",
            "tokenizer_config.json",
            "tokenizer.model",
            "vocab.json",
        ]

        has_tokenizer = any((model_path / f).exists() for f in tokenizer_files)

        return has_tokenizer

    async def validate_training_readiness(
        self, model_id: str, config: ModelConfig
    ) -> Dict[str, bool]:
        """Validate if model is ready for training."""
        checks = {
            "model_files_exist": False,
            "config_valid": False,
            "tokenizer_present": False,
            "architecture_supported": False,
            "sufficient_specs": False,
        }

        # Validate model
        result = await self.validate_model(model_id, config)
        checks["model_files_exist"] = result.file_checks.get("has_model_file", False)
        checks["config_valid"] = result.config_valid
        checks["tokenizer_present"] = result.tokenizer_compatible

        # Check architecture
        supported_architectures = [
            "llama",
            "qwen",
            "gemma",
            "mistral",
            "phi",
            "gpt",
        ]
        checks["architecture_supported"] = (
            config.architecture.value in supported_architectures
        )

        # Check specs (if provided)
        if config.parameter_count and config.context_length:
            checks["sufficient_specs"] = True

        return checks
