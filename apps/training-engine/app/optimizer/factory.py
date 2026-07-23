"""Optimizer factory for convenient creation."""

from typing import Any, Dict, Optional

import torch.nn as nn

from app.logger import training_logger
from app.optimizer.exceptions import OptimizerException
from app.optimizer.manager import OptimizerManager, optimizer_manager
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


class OptimizerFactory:
    """
    Factory for creating optimizers with preset configurations.
    """

    def __init__(self, optimizer_manager: Optional[OptimizerManager] = None):
        """
        Initialize optimizer factory.
        
        Args:
            optimizer_manager: Optional OptimizerManager instance
        """
        self.logger = training_logger
        self.optimizer_manager = optimizer_manager or optimizer_manager

    def create_adamw(
        self,
        model: nn.Module,
        model_id: str,
        learning_rate: float = 5e-5,
        weight_decay: float = 0.01,
        with_scheduler: bool = False,
        num_training_steps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create AdamW optimizer with optional scheduler.
        
        Args:
            model: PyTorch model
            model_id: Model identifier
            learning_rate: Learning rate
            weight_decay: Weight decay
            with_scheduler: Create linear warmup scheduler
            num_training_steps: Total training steps (required if with_scheduler)
            
        Returns:
            Dictionary with optimizer (and scheduler) info
        """
        self.logger.info(f"Creating AdamW optimizer with lr={learning_rate}")

        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=learning_rate,
            weight_decay=weight_decay,
        )

        if with_scheduler:
            if num_training_steps is None:
                raise OptimizerException(
                    "num_training_steps required when creating scheduler"
                )

            scheduler_config = SchedulerConfig(
                scheduler_type=SchedulerType.LINEAR_WITH_WARMUP,
                warmup_strategy=WarmupStrategy.RATIO,
                warmup_ratio=0.1,
                num_training_steps=num_training_steps,
            )

            return self.optimizer_manager.create_optimizer_with_scheduler(
                model, config, scheduler_config, model_id, num_training_steps
            )
        else:
            optimizer_id, optimizer, metadata = (
                self.optimizer_manager.create_optimizer(model, config, model_id)
            )

            return {
                "optimizer_id": optimizer_id,
                "optimizer": optimizer,
                "optimizer_metadata": metadata,
            }

    def create_sgd(
        self,
        model: nn.Module,
        model_id: str,
        learning_rate: float = 0.01,
        weight_decay: float = 0.01,
    ) -> Dict[str, Any]:
        """
        Create SGD optimizer.
        
        Args:
            model: PyTorch model
            model_id: Model identifier
            learning_rate: Learning rate
            weight_decay: Weight decay
            
        Returns:
            Dictionary with optimizer info
        """
        self.logger.info(f"Creating SGD optimizer with lr={learning_rate}")

        config = OptimizerConfig(
            optimizer_type=OptimizerType.SGD,
            learning_rate=learning_rate,
            weight_decay=weight_decay,
        )

        optimizer_id, optimizer, metadata = (
            self.optimizer_manager.create_optimizer(model, config, model_id)
        )

        return {
            "optimizer_id": optimizer_id,
            "optimizer": optimizer,
            "optimizer_metadata": metadata,
        }

    def create_adafactor(
        self,
        model: nn.Module,
        model_id: str,
        learning_rate: float = 1e-3,
        weight_decay: float = 0.01,
    ) -> Dict[str, Any]:
        """
        Create Adafactor optimizer.
        
        Args:
            model: PyTorch model
            model_id: Model identifier
            learning_rate: Learning rate
            weight_decay: Weight decay
            
        Returns:
            Dictionary with optimizer info
        """
        self.logger.info(f"Creating Adafactor optimizer with lr={learning_rate}")

        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAFACTOR,
            learning_rate=learning_rate,
            weight_decay=weight_decay,
        )

        optimizer_id, optimizer, metadata = (
            self.optimizer_manager.create_optimizer(model, config, model_id)
        )

        return {
            "optimizer_id": optimizer_id,
            "optimizer": optimizer,
            "optimizer_metadata": metadata,
        }

    def create_with_cosine_schedule(
        self,
        model: nn.Module,
        model_id: str,
        learning_rate: float = 5e-5,
        num_training_steps: int = 1000,
        warmup_ratio: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Create AdamW with cosine schedule with warmup.
        
        Args:
            model: PyTorch model
            model_id: Model identifier
            learning_rate: Learning rate
            num_training_steps: Total training steps
            warmup_ratio: Warmup ratio
            
        Returns:
            Dictionary with optimizer and scheduler info
        """
        self.logger.info("Creating AdamW with cosine schedule")

        optimizer_config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAMW,
            learning_rate=learning_rate,
        )

        scheduler_config = SchedulerConfig(
            scheduler_type=SchedulerType.COSINE,
            warmup_strategy=WarmupStrategy.RATIO,
            warmup_ratio=warmup_ratio,
            num_training_steps=num_training_steps,
        )

        return self.optimizer_manager.create_optimizer_with_scheduler(
            model, optimizer_config, scheduler_config, model_id, num_training_steps
        )

    def create_preset(
        self,
        model: nn.Module,
        model_id: str,
        preset: str = "default",
        num_training_steps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create optimizer with preset configuration.
        
        Args:
            model: PyTorch model
            model_id: Model identifier
            preset: Preset name (default, aggressive, conservative)
            num_training_steps: Optional training steps for scheduler
            
        Returns:
            Dictionary with optimizer (and scheduler) info
        """
        presets = {
            "default": {
                "learning_rate": 5e-5,
                "weight_decay": 0.01,
                "warmup_ratio": 0.1,
            },
            "aggressive": {
                "learning_rate": 1e-4,
                "weight_decay": 0.0,
                "warmup_ratio": 0.05,
            },
            "conservative": {
                "learning_rate": 1e-5,
                "weight_decay": 0.1,
                "warmup_ratio": 0.2,
            },
        }

        if preset not in presets:
            raise OptimizerException(
                f"Unknown preset: {preset}. Available: {list(presets.keys())}"
            )

        config_values = presets[preset]

        if num_training_steps:
            return self.create_adamw(
                model=model,
                model_id=model_id,
                learning_rate=config_values["learning_rate"],
                weight_decay=config_values["weight_decay"],
                with_scheduler=True,
                num_training_steps=num_training_steps,
            )
        else:
            return self.create_adamw(
                model=model,
                model_id=model_id,
                learning_rate=config_values["learning_rate"],
                weight_decay=config_values["weight_decay"],
            )


# Global instance
optimizer_factory = OptimizerFactory()
