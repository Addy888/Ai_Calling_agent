"""LoRA adapter builder."""

import uuid
from typing import Any, Dict, List, Optional

import torch.nn as nn
from peft import LoraConfig, get_peft_model

from app.events import event_bus
from app.logger import training_logger
from app.peft.exceptions import LoRAException, ConfigurationException
from app.peft.lora.config import LoRAConfigFactory, lora_config_factory
from app.peft.lora.detector import TargetModuleDetector, target_module_detector
from app.peft.schemas import LoRAConfigRequest, AdapterMetadata, AdapterType


class LoRABuilder:
    """
    Builder for LoRA adapters.
    
    Creates LoRA configurations, detects target modules,
    and applies LoRA adapters to models.
    """

    def __init__(
        self,
        config_factory: Optional[LoRAConfigFactory] = None,
        module_detector: Optional[TargetModuleDetector] = None,
    ):
        """
        Initialize LoRA builder.
        
        Args:
            config_factory: Optional LoRAConfigFactory instance
            module_detector: Optional TargetModuleDetector instance
        """
        self.logger = training_logger
        self.config_factory = config_factory or lora_config_factory
        self.module_detector = module_detector or target_module_detector

    def build_config(
        self,
        params: LoRAConfigRequest,
        model: Optional[nn.Module] = None,
    ) -> LoraConfig:
        """
        Build LoRA configuration.
        
        Args:
            params: LoRA configuration parameters
            model: Optional model for auto-detection
            
        Returns:
            PEFT LoraConfig
        """
        self.logger.info("Building LoRA configuration")

        try:
            # Auto-detect target modules if not provided
            target_modules = params.target_modules

            if not target_modules and model is not None:
                self.logger.info("Auto-detecting target modules...")
                target_modules = self.module_detector.auto_detect_target_modules(
                    model
                )

            if not target_modules:
                raise ConfigurationException(
                    "target_modules must be provided or model must be supplied "
                    "for auto-detection"
                )

            # Validate target modules if model provided
            if model is not None:
                self.module_detector.validate_target_modules(
                    model, target_modules
                )

            # Create LoraConfig
            config = self.config_factory.create_from_request(
                params, target_modules=target_modules
            )

            # Validate configuration
            self.config_factory.validate_config(config)

            self.logger.info("LoRA configuration built successfully")

            # Emit event
            event_bus.emit(
                "lora_config_created",
                {
                    "r": config.r,
                    "lora_alpha": config.lora_alpha,
                    "target_modules": config.target_modules,
                },
            )

            return config

        except Exception as e:
            self.logger.error(f"Failed to build LoRA config: {str(e)}")
            raise LoRAException(f"LoRA config build failed: {str(e)}")

    def apply_lora(
        self,
        model: nn.Module,
        config: LoraConfig,
        adapter_name: Optional[str] = None,
    ) -> nn.Module:
        """
        Apply LoRA adapter to model.
        
        Args:
            model: Base PyTorch model
            config: LoRA configuration
            adapter_name: Optional adapter name
            
        Returns:
            PEFT model with LoRA adapter
        """
        self.logger.info("Applying LoRA adapter to model")

        try:
            # Validate model
            if not isinstance(model, nn.Module):
                raise LoRAException("Model must be a PyTorch nn.Module")

            # Apply PEFT
            peft_model = get_peft_model(model, config)

            self.logger.info("LoRA adapter applied successfully")

            # Log trainable parameters
            trainable_params, total_params = self._count_parameters(peft_model)
            trainable_percent = (trainable_params / total_params) * 100

            self.logger.info(
                f"Trainable params: {trainable_params:,} / {total_params:,} "
                f"({trainable_percent:.2f}%)"
            )

            # Emit event
            event_bus.emit(
                "lora_adapter_applied",
                {
                    "adapter_name": adapter_name,
                    "trainable_params": trainable_params,
                    "total_params": total_params,
                    "trainable_percent": trainable_percent,
                },
            )

            return peft_model

        except Exception as e:
            self.logger.error(f"Failed to apply LoRA: {str(e)}")
            raise LoRAException(f"LoRA application failed: {str(e)}")

    def build_and_apply(
        self,
        model: nn.Module,
        params: LoRAConfigRequest,
        adapter_name: Optional[str] = None,
        base_model_id: Optional[str] = None,
    ) -> tuple[nn.Module, AdapterMetadata]:
        """
        Build LoRA config and apply to model.
        
        Args:
            model: Base PyTorch model
            params: LoRA configuration parameters
            adapter_name: Optional adapter name
            base_model_id: Optional base model ID
            
        Returns:
            Tuple of (PEFT model, adapter metadata)
        """
        self.logger.info("Building and applying LoRA adapter")

        # Generate adapter name if not provided
        if not adapter_name:
            adapter_name = f"lora_adapter_{uuid.uuid4().hex[:8]}"

        # Generate adapter ID
        adapter_id = f"adapter_{uuid.uuid4().hex}"

        # Build config
        config = self.build_config(params, model=model)

        # Apply LoRA
        peft_model = self.apply_lora(model, config, adapter_name=adapter_name)

        # Create metadata
        metadata = self._create_metadata(
            adapter_id=adapter_id,
            adapter_name=adapter_name,
            config=config,
            model=peft_model,
            base_model_id=base_model_id,
        )

        self.logger.info(
            f"LoRA adapter built and applied: {adapter_name} (ID: {adapter_id})"
        )

        return peft_model, metadata

    def detect_target_modules(self, model: nn.Module) -> List[str]:
        """
        Detect target modules for LoRA.
        
        Args:
            model: PyTorch model
            
        Returns:
            List of detected target modules
        """
        return self.module_detector.auto_detect_target_modules(model)

    def validate_params(self, params: LoRAConfigRequest) -> bool:
        """
        Validate LoRA parameters.
        
        Args:
            params: LoRA configuration parameters
            
        Returns:
            True if valid
        """
        self.logger.info("Validating LoRA parameters")

        try:
            # Rank validation
            if params.r <= 0:
                raise ConfigurationException("Rank (r) must be positive")

            if params.r > 256:
                self.logger.warning(f"Very high rank: {params.r}")

            # Alpha validation
            if params.lora_alpha <= 0:
                raise ConfigurationException("lora_alpha must be positive")

            # Dropout validation
            if not (0.0 <= params.lora_dropout <= 1.0):
                raise ConfigurationException(
                    "lora_dropout must be between 0 and 1"
                )

            self.logger.info("LoRA parameters validated")

            return True

        except Exception as e:
            self.logger.error(f"LoRA parameter validation failed: {str(e)}")
            raise

    def _count_parameters(self, model: nn.Module) -> tuple[int, int]:
        """
        Count trainable and total parameters.
        
        Args:
            model: PyTorch model
            
        Returns:
            Tuple of (trainable_params, total_params)
        """
        trainable_params = sum(
            p.numel() for p in model.parameters() if p.requires_grad
        )
        total_params = sum(p.numel() for p in model.parameters())

        return trainable_params, total_params

    def _create_metadata(
        self,
        adapter_id: str,
        adapter_name: str,
        config: LoraConfig,
        model: nn.Module,
        base_model_id: Optional[str] = None,
    ) -> AdapterMetadata:
        """
        Create adapter metadata.
        
        Args:
            adapter_id: Adapter ID
            adapter_name: Adapter name
            config: LoRA configuration
            model: PEFT model
            base_model_id: Base model ID
            
        Returns:
            AdapterMetadata
        """
        trainable_params, total_params = self._count_parameters(model)
        trainable_percent = (trainable_params / total_params) * 100

        metadata = AdapterMetadata(
            adapter_id=adapter_id,
            adapter_name=adapter_name,
            adapter_type=AdapterType.LORA,
            base_model=base_model_id or "unknown",
            rank=config.r,
            alpha=config.lora_alpha,
            dropout=config.lora_dropout,
            target_modules=config.target_modules,
            trainable_params=trainable_params,
            frozen_params=total_params - trainable_params,
            trainable_percent=round(trainable_percent, 2),
            task_type=str(config.task_type),
        )

        return metadata

    def get_recommended_config(
        self, model: nn.Module, model_size: str = "base"
    ) -> Dict[str, Any]:
        """
        Get recommended LoRA configuration based on model size.
        
        Args:
            model: PyTorch model
            model_size: Model size hint ("small", "base", "large", "xlarge")
            
        Returns:
            Recommended configuration dict
        """
        # Detect target modules
        target_modules = self.detect_target_modules(model)

        # Recommended configs by model size
        size_configs = {
            "small": {"r": 8, "lora_alpha": 16, "lora_dropout": 0.1},
            "base": {"r": 16, "lora_alpha": 32, "lora_dropout": 0.1},
            "large": {"r": 32, "lora_alpha": 64, "lora_dropout": 0.05},
            "xlarge": {"r": 64, "lora_alpha": 128, "lora_dropout": 0.05},
        }

        config = size_configs.get(model_size, size_configs["base"])
        config["target_modules"] = target_modules

        self.logger.info(
            f"Recommended config for {model_size} model: r={config['r']}, "
            f"alpha={config['lora_alpha']}"
        )

        return config


# Global instance
lora_builder = LoRABuilder()
