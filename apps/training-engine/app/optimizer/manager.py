"""Optimizer manager - main orchestrator."""

import uuid
from typing import Any, Dict, Optional, Tuple

import torch.nn as nn
from torch.optim import Optimizer
from torch.optim.lr_scheduler import LRScheduler

from app.events import event_bus
from app.logger import training_logger
from app.optimizer.builder import OptimizerBuilder, optimizer_builder
from app.optimizer.exceptions import OptimizerException
from app.optimizer.parameter_groups import (
    ParameterGroupBuilder,
    parameter_group_builder,
)
from app.optimizer.registry import OptimizerRegistry, optimizer_registry
from app.optimizer.scheduler.manager import SchedulerManager, scheduler_manager
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerMetadata,
    ParameterGroupInfo,
    SchedulerConfig,
    SchedulerMetadata,
)
from app.optimizer.validator import OptimizerValidator, optimizer_validator


class OptimizerManager:
    """
    Main optimizer and scheduler orchestrator.
    
    Coordinates all optimization components.
    """

    def __init__(
        self,
        optimizer_builder: Optional[OptimizerBuilder] = None,
        parameter_group_builder: Optional[ParameterGroupBuilder] = None,
        scheduler_manager: Optional[SchedulerManager] = None,
        registry: Optional[OptimizerRegistry] = None,
        validator: Optional[OptimizerValidator] = None,
    ):
        """
        Initialize optimizer manager.
        
        Args:
            optimizer_builder: Optional OptimizerBuilder
            parameter_group_builder: Optional ParameterGroupBuilder
            scheduler_manager: Optional SchedulerManager
            registry: Optional OptimizerRegistry
            validator: Optional OptimizerValidator
        """
        self.logger = training_logger
        self.optimizer_builder = optimizer_builder or optimizer_builder
        self.parameter_group_builder = (
            parameter_group_builder or parameter_group_builder
        )
        self.scheduler_manager = scheduler_manager or scheduler_manager
        self.registry = registry or optimizer_registry
        self.validator = validator or optimizer_validator

    def create_optimizer(
        self,
        model: nn.Module,
        config: OptimizerConfig,
        model_id: str,
    ) -> Tuple[str, Optimizer, OptimizerMetadata]:
        """
        Create and register optimizer.
        
        Args:
            model: PyTorch model
            config: Optimizer configuration
            model_id: Model identifier
            
        Returns:
            Tuple of (optimizer_id, optimizer, metadata)
        """
        self.logger.info(
            f"Creating {config.optimizer_type.value} optimizer for model {model_id}"
        )

        try:
            # Validate configuration
            self.validator.validate_optimizer_config(config)

            # Generate optimizer ID
            optimizer_id = f"optimizer_{uuid.uuid4().hex[:8]}"

            # Build parameter groups
            parameter_groups = self.parameter_group_builder.build_parameter_groups(
                model=model,
                learning_rate=config.learning_rate,
                weight_decay=config.weight_decay,
                use_weight_decay_groups=config.use_parameter_groups,
            )

            # Build optimizer
            optimizer = self.optimizer_builder.build_optimizer(
                model=model,
                config=config,
                parameter_groups=parameter_groups,
            )

            # Get parameter stats
            param_stats = self.parameter_group_builder.get_parameter_stats(model)

            # Create parameter group info
            param_group_info = []
            for i, group in enumerate(parameter_groups):
                param_count = sum(p.numel() for p in group["params"])
                param_group_info.append(
                    ParameterGroupInfo(
                        name=f"group_{i}",
                        num_params=param_count,
                        has_weight_decay=group["weight_decay"] > 0,
                        learning_rate=group["lr"],
                    )
                )

            # Create metadata
            metadata = OptimizerMetadata(
                optimizer_id=optimizer_id,
                optimizer_type=config.optimizer_type,
                learning_rate=config.learning_rate,
                weight_decay=config.weight_decay,
                max_grad_norm=config.max_grad_norm,
                parameter_groups=param_group_info,
                total_parameters=param_stats["total_parameters"],
                trainable_parameters=param_stats["trainable_parameters"],
            )

            # Register optimizer
            self.registry.register(optimizer_id, optimizer, metadata)

            # Emit event
            event_bus.emit(
                "optimizer_created",
                {
                    "optimizer_id": optimizer_id,
                    "optimizer_type": config.optimizer_type.value,
                    "model_id": model_id,
                    "learning_rate": config.learning_rate,
                    "trainable_params": param_stats["trainable_parameters"],
                },
            )

            self.logger.info(f"Optimizer created: {optimizer_id}")

            return optimizer_id, optimizer, metadata

        except Exception as e:
            self.logger.error(f"Failed to create optimizer: {str(e)}")
            raise OptimizerException(f"Optimizer creation failed: {str(e)}")

    def create_scheduler(
        self,
        optimizer_id: str,
        config: SchedulerConfig,
        num_training_steps: int,
    ) -> Tuple[str, LRScheduler, SchedulerMetadata]:
        """
        Create and register scheduler.
        
        Args:
            optimizer_id: Optimizer ID
            config: Scheduler configuration
            num_training_steps: Total training steps
            
        Returns:
            Tuple of (scheduler_id, scheduler, metadata)
        """
        self.logger.info(f"Creating scheduler for optimizer {optimizer_id}")

        try:
            # Validate configuration
            self.validator.validate_scheduler_config(config, num_training_steps)

            # Get optimizer
            optimizer = self.registry.get_optimizer(optimizer_id)

            # Create scheduler
            scheduler_id, metadata = self.scheduler_manager.create_scheduler(
                optimizer=optimizer,
                config=config,
                optimizer_id=optimizer_id,
                num_training_steps=num_training_steps,
            )

            # Get scheduler instance
            scheduler = self.scheduler_manager.get_scheduler(scheduler_id)

            # Map scheduler to optimizer
            self.registry.map_scheduler(scheduler_id, optimizer_id)

            self.logger.info(f"Scheduler created: {scheduler_id}")

            return scheduler_id, scheduler, metadata

        except Exception as e:
            self.logger.error(f"Failed to create scheduler: {str(e)}")
            raise OptimizerException(f"Scheduler creation failed: {str(e)}")

    def create_optimizer_with_scheduler(
        self,
        model: nn.Module,
        optimizer_config: OptimizerConfig,
        scheduler_config: SchedulerConfig,
        model_id: str,
        num_training_steps: int,
    ) -> Dict[str, Any]:
        """
        Create optimizer and scheduler together.
        
        Args:
            model: PyTorch model
            optimizer_config: Optimizer configuration
            scheduler_config: Scheduler configuration
            model_id: Model identifier
            num_training_steps: Total training steps
            
        Returns:
            Dictionary with optimizer and scheduler info
        """
        self.logger.info("Creating optimizer and scheduler")

        # Create optimizer
        optimizer_id, optimizer, opt_metadata = self.create_optimizer(
            model, optimizer_config, model_id
        )

        # Create scheduler
        scheduler_id, scheduler, sched_metadata = self.create_scheduler(
            optimizer_id, scheduler_config, num_training_steps
        )

        return {
            "optimizer_id": optimizer_id,
            "optimizer": optimizer,
            "optimizer_metadata": opt_metadata,
            "scheduler_id": scheduler_id,
            "scheduler": scheduler,
            "scheduler_metadata": sched_metadata,
        }

    def get_optimizer(self, optimizer_id: str) -> Optimizer:
        """Get optimizer by ID."""
        return self.registry.get_optimizer(optimizer_id)

    def get_optimizer_metadata(self, optimizer_id: str) -> OptimizerMetadata:
        """Get optimizer metadata."""
        return self.registry.get_metadata(optimizer_id)

    def get_scheduler(self, scheduler_id: str) -> LRScheduler:
        """Get scheduler by ID."""
        return self.scheduler_manager.get_scheduler(scheduler_id)

    def step_scheduler(self, scheduler_id: str) -> float:
        """Step scheduler and return current LR."""
        return self.scheduler_manager.step_scheduler(scheduler_id)

    def get_current_lr(self, optimizer_id: str) -> float:
        """Get current learning rate from optimizer."""
        optimizer = self.get_optimizer(optimizer_id)
        return optimizer.param_groups[0]["lr"]

    def validate_configuration(
        self,
        optimizer_config: OptimizerConfig,
        scheduler_config: Optional[SchedulerConfig] = None,
        num_training_steps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Validate optimizer and scheduler configuration.
        
        Args:
            optimizer_config: Optimizer configuration
            scheduler_config: Optional scheduler configuration
            num_training_steps: Optional training steps
            
        Returns:
            Validation report
        """
        return self.validator.validate_combined_config(
            optimizer_config, scheduler_config, num_training_steps
        )


# Global instance
optimizer_manager = OptimizerManager()
