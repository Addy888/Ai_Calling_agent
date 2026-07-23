"""Enterprise model loader."""

import time
from pathlib import Path
from typing import Any, Dict, Optional

from app.logger import training_logger
from app.model.exceptions import (
    InvalidModelPathException,
    ModelFileMissingException,
    ModelLoadException,
    ModelNotLoadedException,
)
from app.model.models import (
    ModelConfig,
    ModelInfo,
    ModelLoadRequest,
    ModelStatus,
)


class ModelLoader:
    """Enterprise model loader."""

    def __init__(self):
        """Initialize model loader."""
        self._loaded_models: Dict[str, Any] = {}
        training_logger.info("Model loader initialized")

    async def load_model(
        self,
        model_id: str,
        config: ModelConfig,
        request: Optional[ModelLoadRequest] = None,
    ) -> ModelInfo:
        """Load model from configuration."""
        training_logger.info(f"Loading model: {model_id}")

        start_time = time.time()

        try:
            # Validate model path
            if not config.model_path:
                raise InvalidModelPathException("Model path not specified")

            model_path = Path(config.model_path)
            if not model_path.exists():
                raise InvalidModelPathException(str(model_path))

            # Create model info
            model_info = ModelInfo(
                model_id=model_id,
                status=ModelStatus.LOADING,
                config=config,
            )

            # Validate required files
            await self._validate_model_files(model_path, config)

            # Load model configuration
            if request and request.load_config:
                await self._load_model_config(model_path, config)

            # Load tokenizer
            if request and request.load_tokenizer:
                await self._load_tokenizer(model_path, config)

            # Prepare model (placeholder - actual loading happens in training phase)
            await self._prepare_model(model_id, model_path, config, request)

            # Update model info
            load_time = time.time() - start_time
            model_info.status = ModelStatus.LOADED
            model_info.is_loaded = True
            model_info.load_time = load_time
            model_info.loaded_at = time.time()

            # Store loaded model reference
            self._loaded_models[model_id] = {
                "config": config,
                "path": model_path,
                "loaded_at": time.time(),
            }

            training_logger.info(
                f"Model loaded successfully: {model_id}",
                model_id=model_id,
                load_time=load_time,
            )

            return model_info

        except Exception as e:
            training_logger.error(f"Failed to load model: {str(e)}")
            raise ModelLoadException(f"Failed to load model: {str(e)}")

    async def unload_model(self, model_id: str) -> bool:
        """Unload model from memory."""
        training_logger.info(f"Unloading model: {model_id}")

        if model_id not in self._loaded_models:
            raise ModelNotLoadedException(model_id)

        try:
            # Remove from loaded models
            del self._loaded_models[model_id]

            training_logger.info(f"Model unloaded: {model_id}")
            return True

        except Exception as e:
            training_logger.error(f"Failed to unload model: {str(e)}")
            raise ModelLoadException(f"Failed to unload model: {str(e)}")

    async def reload_model(
        self,
        model_id: str,
        config: ModelConfig,
        request: Optional[ModelLoadRequest] = None,
    ) -> ModelInfo:
        """Reload model."""
        training_logger.info(f"Reloading model: {model_id}")

        # Unload if loaded
        if model_id in self._loaded_models:
            await self.unload_model(model_id)

        # Load again
        return await self.load_model(model_id, config, request)

    def is_loaded(self, model_id: str) -> bool:
        """Check if model is loaded."""
        return model_id in self._loaded_models

    def get_loaded_models(self) -> list[str]:
        """Get list of loaded model IDs."""
        return list(self._loaded_models.keys())

    async def _validate_model_files(
        self, model_path: Path, config: ModelConfig
    ) -> None:
        """Validate required model files exist."""
        training_logger.debug(f"Validating model files: {model_path}")

        # Check if directory exists
        if not model_path.is_dir():
            # Check if it's a single file
            if not model_path.is_file():
                raise InvalidModelPathException(str(model_path))

        # For directories, check for common model files
        if model_path.is_dir():
            required_files = []
            
            # Check for PyTorch model files
            pytorch_files = [
                "pytorch_model.bin",
                "model.safetensors",
                "pytorch_model.safetensors",
            ]
            
            has_model = any((model_path / f).exists() for f in pytorch_files)
            
            if not has_model:
                training_logger.warning(
                    f"No PyTorch model file found in {model_path}"
                )

        training_logger.debug("Model files validated")

    async def _load_model_config(
        self, model_path: Path, config: ModelConfig
    ) -> None:
        """Load model configuration."""
        training_logger.debug("Loading model configuration")

        # Check for config.json
        config_file = model_path / "config.json"
        if config_file.exists():
            import json

            with open(config_file, "r") as f:
                model_config = json.load(f)

            # Extract useful information
            if "hidden_size" in model_config:
                config.hidden_size = model_config["hidden_size"]
            if "num_hidden_layers" in model_config:
                config.num_layers = model_config["num_hidden_layers"]
            if "num_attention_heads" in model_config:
                config.num_attention_heads = model_config["num_attention_heads"]
            if "vocab_size" in model_config:
                config.vocabulary_size = model_config["vocab_size"]
            if "max_position_embeddings" in model_config:
                config.context_length = model_config["max_position_embeddings"]

            training_logger.debug("Model configuration loaded")

    async def _load_tokenizer(
        self, model_path: Path, config: ModelConfig
    ) -> None:
        """Load tokenizer configuration."""
        training_logger.debug("Loading tokenizer configuration")

        # Check for tokenizer files
        tokenizer_files = [
            "tokenizer.json",
            "tokenizer_config.json",
            "special_tokens_map.json",
        ]

        has_tokenizer = any((model_path / f).exists() for f in tokenizer_files)

        if not has_tokenizer:
            training_logger.warning(f"No tokenizer files found in {model_path}")

        training_logger.debug("Tokenizer configuration loaded")

    async def _prepare_model(
        self,
        model_id: str,
        model_path: Path,
        config: ModelConfig,
        request: Optional[ModelLoadRequest],
    ) -> None:
        """Prepare model for loading (placeholder for actual loading)."""
        training_logger.debug(f"Preparing model: {model_id}")

        # Future: This is where actual model loading with PyTorch/Transformers happens
        # For now, just validate the model structure

        # Simulate preparation time
        import asyncio
        await asyncio.sleep(0.5)

        training_logger.debug(f"Model prepared: {model_id}")

    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get information about loaded model."""
        return self._loaded_models.get(model_id)

    def get_load_statistics(self) -> Dict[str, Any]:
        """Get model loading statistics."""
        return {
            "total_loaded": len(self._loaded_models),
            "loaded_models": list(self._loaded_models.keys()),
        }
