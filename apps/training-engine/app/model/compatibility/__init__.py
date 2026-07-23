"""Model compatibility engine."""

from typing import Dict, List

from app.logger import training_logger
from app.model.models import (
    CompatibilityCheck,
    CompatibilityStatus,
    ModelConfig,
)


class CompatibilityEngine:
    """Check model compatibility with various components."""

    def __init__(self):
        """Initialize compatibility engine."""
        training_logger.info("Compatibility engine initialized")

    async def check_tokenizer_compatibility(
        self, model_id: str, config: ModelConfig, tokenizer_name: str
    ) -> CompatibilityCheck:
        """Check tokenizer compatibility."""
        training_logger.debug(
            f"Checking tokenizer compatibility: {model_id} <-> {tokenizer_name}"
        )

        errors = []
        warnings = []
        compatible = True

        # Check architecture compatibility
        architecture_tokenizer_map = {
            "llama": ["llama", "sentencepiece"],
            "qwen": ["qwen", "tiktoken"],
            "gemma": ["gemma", "sentencepiece"],
            "mistral": ["mistral", "sentencepiece"],
            "phi": ["phi", "codegen"],
            "gpt": ["gpt2", "tiktoken"],
        }

        supported_tokenizers = architecture_tokenizer_map.get(
            config.architecture.value, []
        )

        if supported_tokenizers and tokenizer_name not in supported_tokenizers:
            warnings.append(
                f"Tokenizer '{tokenizer_name}' may not be compatible with {config.architecture.value}"
            )

        # Check vocabulary size
        if config.vocabulary_size:
            # Future: Compare with tokenizer vocab size
            pass

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.INCOMPATIBLE
            if errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="tokenizer",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "tokenizer_name": tokenizer_name,
                "architecture": config.architecture.value,
            },
        )

    async def check_dataset_compatibility(
        self, model_id: str, config: ModelConfig, dataset_type: str
    ) -> CompatibilityCheck:
        """Check dataset compatibility."""
        training_logger.debug(
            f"Checking dataset compatibility: {model_id} <-> {dataset_type}"
        )

        errors = []
        warnings = []
        compatible = True

        # Check context length
        if config.context_length:
            # Future: Validate against dataset requirements
            if config.context_length < 512:
                warnings.append("Context length may be too short for some datasets")

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="dataset",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "dataset_type": dataset_type,
                "context_length": config.context_length,
            },
        )

    async def check_training_engine_compatibility(
        self, model_id: str, config: ModelConfig
    ) -> CompatibilityCheck:
        """Check training engine compatibility."""
        training_logger.debug(
            f"Checking training engine compatibility: {model_id}"
        )

        errors = []
        warnings = []
        compatible = True

        # Check if architecture is supported
        supported_architectures = [
            "llama",
            "qwen",
            "gemma",
            "mistral",
            "phi",
            "gpt",
            "custom",
        ]

        if config.architecture.value not in supported_architectures:
            warnings.append(
                f"Architecture {config.architecture.value} may require custom implementation"
            )

        # Check training capabilities
        if not config.training_capabilities:
            warnings.append("No training capabilities specified")

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="training_engine",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "architecture": config.architecture.value,
                "training_capabilities": [
                    c.value for c in config.training_capabilities
                ],
            },
        )

    async def check_gpu_compatibility(
        self, model_id: str, config: ModelConfig, available_gpu_memory_gb: float
    ) -> CompatibilityCheck:
        """Check GPU compatibility."""
        training_logger.debug(f"Checking GPU compatibility: {model_id}")

        errors = []
        warnings = []
        compatible = True

        # Check if model requires GPU
        if config.min_gpu_memory_gb:
            if available_gpu_memory_gb < config.min_gpu_memory_gb:
                errors.append(
                    f"Insufficient GPU memory: {available_gpu_memory_gb}GB < {config.min_gpu_memory_gb}GB required"
                )
                compatible = False
            elif available_gpu_memory_gb < config.min_gpu_memory_gb * 1.5:
                warnings.append(
                    "GPU memory is close to minimum requirements, consider using gradient checkpointing"
                )

        # Estimate memory requirements if not specified
        if config.parameter_count and not config.min_gpu_memory_gb:
            # Rough estimate: params * 4 bytes * 2 (model + optimizer)
            estimated_memory_gb = (config.parameter_count * 4 * 2) / (1024**3)

            if available_gpu_memory_gb < estimated_memory_gb:
                warnings.append(
                    f"Estimated memory requirement: {estimated_memory_gb:.1f}GB"
                )

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.INCOMPATIBLE
            if errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="gpu",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "available_memory_gb": available_gpu_memory_gb,
                "required_memory_gb": config.min_gpu_memory_gb,
            },
        )

    async def check_lora_compatibility(
        self, model_id: str, config: ModelConfig
    ) -> CompatibilityCheck:
        """Check LoRA compatibility."""
        training_logger.debug(f"Checking LoRA compatibility: {model_id}")

        errors = []
        warnings = []
        compatible = True

        # Check if architecture supports LoRA
        lora_supported_architectures = [
            "llama",
            "qwen",
            "gemma",
            "mistral",
            "phi",
            "gpt",
        ]

        if config.architecture.value not in lora_supported_architectures:
            errors.append(
                f"LoRA may not be supported for {config.architecture.value}"
            )
            compatible = False

        # Check model type
        if config.model_type.value == "quantized":
            warnings.append("QLoRA should be used for quantized models")

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.INCOMPATIBLE
            if errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="lora",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "architecture": config.architecture.value,
                "model_type": config.model_type.value,
            },
        )

    async def check_peft_compatibility(
        self, model_id: str, config: ModelConfig
    ) -> CompatibilityCheck:
        """Check PEFT compatibility."""
        training_logger.debug(f"Checking PEFT compatibility: {model_id}")

        errors = []
        warnings = []
        compatible = True

        # PEFT is generally compatible with most architectures
        # Check if model is already a PEFT model
        if config.model_type.value in ["lora", "qlora", "peft"]:
            warnings.append("Model is already a PEFT model")

        status = (
            CompatibilityStatus.COMPATIBLE
            if compatible and not errors
            else CompatibilityStatus.WARNING
        )

        return CompatibilityCheck(
            model_id=model_id,
            component="peft",
            status=status,
            compatible=compatible and len(errors) == 0,
            errors=errors,
            warnings=warnings,
            details={
                "architecture": config.architecture.value,
            },
        )

    async def check_all_compatibility(
        self, model_id: str, config: ModelConfig, context: Dict
    ) -> List[CompatibilityCheck]:
        """Check compatibility with all relevant components."""
        training_logger.info(f"Running full compatibility check: {model_id}")

        checks = []

        # Training engine
        checks.append(
            await self.check_training_engine_compatibility(model_id, config)
        )

        # Tokenizer (if provided in context)
        if "tokenizer_name" in context:
            checks.append(
                await self.check_tokenizer_compatibility(
                    model_id, config, context["tokenizer_name"]
                )
            )

        # Dataset (if provided in context)
        if "dataset_type" in context:
            checks.append(
                await self.check_dataset_compatibility(
                    model_id, config, context["dataset_type"]
                )
            )

        # GPU (if provided in context)
        if "available_gpu_memory_gb" in context:
            checks.append(
                await self.check_gpu_compatibility(
                    model_id, config, context["available_gpu_memory_gb"]
                )
            )

        # LoRA
        checks.append(await self.check_lora_compatibility(model_id, config))

        # PEFT
        checks.append(await self.check_peft_compatibility(model_id, config))

        training_logger.info(
            f"Compatibility check complete: {model_id}",
            total_checks=len(checks),
            compatible=sum(1 for c in checks if c.compatible),
        )

        return checks


# Global compatibility engine
compatibility_engine = CompatibilityEngine()
