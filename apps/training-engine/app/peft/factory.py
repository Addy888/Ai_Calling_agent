"""PEFT Factory for creating PEFT components."""

from typing import Any, Dict, Optional

import torch.nn as nn

from app.logger import training_logger
from app.peft.exceptions import PEFTException, ConfigurationException
from app.peft.lora.builder import LoRABuilder, lora_builder
from app.peft.manager import PEFTManager, peft_manager
from app.peft.schemas import (
    AdapterType,
    CreatePEFTRequest,
    LoRAConfigRequest,
    TaskType,
)


class PEFTFactory:
    """
    Factory for creating PEFT components.
    
    Provides convenient methods for creating adapters with
    preset configurations and common patterns.
    """

    def __init__(
        self,
        peft_manager: Optional[PEFTManager] = None,
        lora_builder: Optional[LoRABuilder] = None,
    ):
        """
        Initialize PEFT factory.
        
        Args:
            peft_manager: Optional PEFTManager instance
            lora_builder: Optional LoRABuilder instance
        """
        self.logger = training_logger
        self.peft_manager = peft_manager or peft_manager
        self.lora_builder = lora_builder or lora_builder

    def create_lora(
        self,
        model: nn.Module,
        model_id: str,
        rank: int = 8,
        alpha: int = 16,
        dropout: float = 0.1,
        target_modules: Optional[list[str]] = None,
        adapter_name: Optional[str] = None,
        task_type: TaskType = TaskType.CAUSAL_LM,
    ) -> tuple[nn.Module, Dict[str, Any]]:
        """
        Create LoRA adapter with simplified parameters.
        
        Args:
            model: Base PyTorch model
            model_id: Model identifier
            rank: LoRA rank (default: 8)
            alpha: LoRA alpha (default: 16)
            dropout: LoRA dropout (default: 0.1)
            target_modules: Optional target modules (auto-detect if None)
            adapter_name: Optional adapter name
            task_type: Task type (default: CAUSAL_LM)
            
        Returns:
            Tuple of (PEFT model, metadata dict)
        """
        self.logger.info(f"Creating LoRA adapter with rank={rank}, alpha={alpha}")

        try:
            # Create LoRA config request
            lora_config = LoRAConfigRequest(
                r=rank,
                lora_alpha=alpha,
                lora_dropout=dropout,
                target_modules=target_modules,
                task_type=task_type,
            )

            # Create PEFT request
            request = CreatePEFTRequest(
                model_id=model_id,
                adapter_type=AdapterType.LORA,
                adapter_name=adapter_name,
                lora_config=lora_config,
            )

            # Create adapter
            peft_model, metadata = self.peft_manager.create_adapter(
                model, request
            )

            return peft_model, metadata.model_dump()

        except Exception as e:
            self.logger.error(f"Failed to create LoRA adapter: {str(e)}")
            raise PEFTException(f"LoRA creation failed: {str(e)}")

    def create_lora_preset(
        self,
        model: nn.Module,
        model_id: str,
        preset: str = "balanced",
        adapter_name: Optional[str] = None,
        task_type: TaskType = TaskType.CAUSAL_LM,
    ) -> tuple[nn.Module, Dict[str, Any]]:
        """
        Create LoRA adapter with preset configuration.
        
        Args:
            model: Base PyTorch model
            model_id: Model identifier
            preset: Preset name ('fast', 'balanced', 'quality')
            adapter_name: Optional adapter name
            task_type: Task type
            
        Returns:
            Tuple of (PEFT model, metadata dict)
        """
        self.logger.info(f"Creating LoRA adapter with preset: {preset}")

        # Preset configurations
        presets = {
            "fast": {"rank": 4, "alpha": 8, "dropout": 0.1},
            "balanced": {"rank": 16, "alpha": 32, "dropout": 0.1},
            "quality": {"rank": 64, "alpha": 128, "dropout": 0.05},
        }

        if preset not in presets:
            raise ConfigurationException(
                f"Unknown preset: {preset}. Available: {list(presets.keys())}"
            )

        config = presets[preset]

        return self.create_lora(
            model=model,
            model_id=model_id,
            rank=config["rank"],
            alpha=config["alpha"],
            dropout=config["dropout"],
            adapter_name=adapter_name,
            task_type=task_type,
        )

    def create_lora_for_model_size(
        self,
        model: nn.Module,
        model_id: str,
        model_size: str = "base",
        adapter_name: Optional[str] = None,
        task_type: TaskType = TaskType.CAUSAL_LM,
    ) -> tuple[nn.Module, Dict[str, Any]]:
        """
        Create LoRA adapter optimized for model size.
        
        Args:
            model: Base PyTorch model
            model_id: Model identifier
            model_size: Model size ('small', 'base', 'large', 'xlarge')
            adapter_name: Optional adapter name
            task_type: Task type
            
        Returns:
            Tuple of (PEFT model, metadata dict)
        """
        self.logger.info(
            f"Creating LoRA adapter optimized for model size: {model_size}"
        )

        # Get recommended config from builder
        recommended = self.lora_builder.get_recommended_config(
            model, model_size=model_size
        )

        return self.create_lora(
            model=model,
            model_id=model_id,
            rank=recommended["r"],
            alpha=recommended["lora_alpha"],
            dropout=recommended["lora_dropout"],
            target_modules=recommended.get("target_modules"),
            adapter_name=adapter_name,
            task_type=task_type,
        )

    def create_from_request(
        self,
        model: nn.Module,
        request: CreatePEFTRequest,
    ) -> tuple[nn.Module, Dict[str, Any]]:
        """
        Create adapter from PEFT request.
        
        Args:
            model: Base PyTorch model
            request: PEFT creation request
            
        Returns:
            Tuple of (PEFT model, metadata dict)
        """
        self.logger.info(
            f"Creating {request.adapter_type.value} adapter from request"
        )

        try:
            peft_model, metadata = self.peft_manager.create_adapter(
                model, request
            )

            return peft_model, metadata.model_dump()

        except Exception as e:
            self.logger.error(f"Failed to create adapter from request: {str(e)}")
            raise PEFTException(
                f"Adapter creation from request failed: {str(e)}"
            )

    def get_recommended_config(
        self,
        model: nn.Module,
        adapter_type: AdapterType = AdapterType.LORA,
        optimization: str = "balanced",
    ) -> Dict[str, Any]:
        """
        Get recommended configuration for model.
        
        Args:
            model: PyTorch model
            adapter_type: Adapter type
            optimization: Optimization target ('speed', 'balanced', 'quality')
            
        Returns:
            Recommended configuration dictionary
        """
        if adapter_type != AdapterType.LORA:
            raise PEFTException(
                f"Adapter type {adapter_type.value} not supported"
            )

        # Map optimization to model size preset
        optimization_map = {
            "speed": "small",
            "balanced": "base",
            "quality": "large",
        }

        model_size = optimization_map.get(optimization, "base")

        # Get recommended config
        recommended = self.lora_builder.get_recommended_config(
            model, model_size=model_size
        )

        return {
            "adapter_type": adapter_type.value,
            "optimization": optimization,
            "config": recommended,
            "description": f"Optimized for {optimization}",
        }

    def detect_target_modules(
        self,
        model: nn.Module,
        preset: str = "default",
    ) -> Dict[str, Any]:
        """
        Detect target modules for model.
        
        Args:
            model: PyTorch model
            preset: Detection preset
            
        Returns:
            Detection result dictionary
        """
        try:
            # Detect modules
            detected = self.lora_builder.detect_target_modules(model)

            # Get module stats
            stats = self.lora_builder.module_detector.get_module_stats(model)

            return {
                "detected_modules": detected,
                "preset": preset,
                "stats": stats,
                "recommended": detected[:5] if detected else [],
            }

        except Exception as e:
            self.logger.error(f"Failed to detect target modules: {str(e)}")
            raise PEFTException(
                f"Target module detection failed: {str(e)}"
            )


# Global instance
peft_factory = PEFTFactory()
