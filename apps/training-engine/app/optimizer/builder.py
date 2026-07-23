"""Optimizer builder."""

from typing import Any, Dict, List, Optional

import torch.nn as nn
from torch.optim import SGD, Adam, AdamW, Optimizer, RMSprop
from transformers.optimization import Adafactor

from app.logger import training_logger
from app.optimizer.exceptions import ConfigurationException, OptimizerException
from app.optimizer.parameter_groups import (
    ParameterGroupBuilder,
    parameter_group_builder,
)
from app.optimizer.schemas import OptimizerConfig, OptimizerType


class OptimizerBuilder:
    """
    Builds optimizers with proper configuration.
    
    Supports AdamW, SGD, Adafactor and extension interfaces for others.
    """

    def __init__(
        self, parameter_group_builder: Optional[ParameterGroupBuilder] = None
    ):
        """
        Initialize optimizer builder.
        
        Args:
            parameter_group_builder: Optional ParameterGroupBuilder instance
        """
        self.logger = training_logger
        self.parameter_group_builder = (
            parameter_group_builder or parameter_group_builder
        )

    def build_optimizer(
        self,
        model: nn.Module,
        config: OptimizerConfig,
        parameter_groups: Optional[List[Dict[str, Any]]] = None,
    ) -> Optimizer:
        """
        Build optimizer.
        
        Args:
            model: PyTorch model
            config: Optimizer configuration
            parameter_groups: Optional custom parameter groups
            
        Returns:
            Configured optimizer
        """
        self.logger.info(
            f"Building {config.optimizer_type.value} optimizer with "
            f"lr={config.learning_rate}, wd={config.weight_decay}"
        )

        try:
            # Build parameter groups if not provided
            if parameter_groups is None:
                parameter_groups = self.parameter_group_builder.build_parameter_groups(
                    model=model,
                    learning_rate=config.learning_rate,
                    weight_decay=config.weight_decay,
                    use_weight_decay_groups=config.use_parameter_groups,
                )

            # Create optimizer based on type
            if config.optimizer_type == OptimizerType.ADAMW:
                optimizer = self._create_adamw(config, parameter_groups)
            elif config.optimizer_type == OptimizerType.SGD:
                optimizer = self._create_sgd(config, parameter_groups)
            elif config.optimizer_type == OptimizerType.ADAFACTOR:
                optimizer = self._create_adafactor(config, parameter_groups)
            elif config.optimizer_type == OptimizerType.ADAM:
                optimizer = self._create_adam(config, parameter_groups)
            elif config.optimizer_type == OptimizerType.RMSPROP:
                optimizer = self._create_rmsprop(config, parameter_groups)
            else:
                raise OptimizerException(
                    f"Optimizer type {config.optimizer_type.value} not implemented"
                )

            self.logger.info(
                f"Optimizer created with {len(parameter_groups)} parameter groups"
            )

            return optimizer

        except Exception as e:
            self.logger.error(f"Failed to build optimizer: {str(e)}")
            raise OptimizerException(f"Optimizer build failed: {str(e)}")

    def _create_adamw(
        self, config: OptimizerConfig, parameter_groups: List[Dict[str, Any]]
    ) -> AdamW:
        """Create AdamW optimizer."""
        return AdamW(
            parameter_groups,
            lr=config.learning_rate,
            betas=(config.adam_beta1, config.adam_beta2),
            eps=config.adam_epsilon,
            weight_decay=config.weight_decay,
        )

    def _create_sgd(
        self, config: OptimizerConfig, parameter_groups: List[Dict[str, Any]]
    ) -> SGD:
        """Create SGD optimizer."""
        return SGD(
            parameter_groups,
            lr=config.learning_rate,
            momentum=0.9,  # Standard momentum
            weight_decay=config.weight_decay,
        )

    def _create_adafactor(
        self, config: OptimizerConfig, parameter_groups: List[Dict[str, Any]]
    ) -> Adafactor:
        """Create Adafactor optimizer."""
        return Adafactor(
            parameter_groups,
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
            scale_parameter=True,
            relative_step=False,
        )

    def _create_adam(
        self, config: OptimizerConfig, parameter_groups: List[Dict[str, Any]]
    ) -> Adam:
        """Create Adam optimizer (extension interface)."""
        self.logger.warning(
            "Adam optimizer is an extension interface - AdamW is recommended"
        )
        return Adam(
            parameter_groups,
            lr=config.learning_rate,
            betas=(config.adam_beta1, config.adam_beta2),
            eps=config.adam_epsilon,
            weight_decay=config.weight_decay,
        )

    def _create_rmsprop(
        self, config: OptimizerConfig, parameter_groups: List[Dict[str, Any]]
    ) -> RMSprop:
        """Create RMSprop optimizer (extension interface)."""
        self.logger.warning("RMSprop optimizer is an extension interface")
        return RMSprop(
            parameter_groups,
            lr=config.learning_rate,
            alpha=0.99,
            eps=config.adam_epsilon,
            weight_decay=config.weight_decay,
        )

    def validate_config(self, config: OptimizerConfig) -> bool:
        """
        Validate optimizer configuration.
        
        Args:
            config: Optimizer configuration
            
        Returns:
            True if valid
            
        Raises:
            ConfigurationException: If configuration is invalid
        """
        self.logger.info("Validating optimizer configuration")

        issues = []

        # Validate learning rate
        if config.learning_rate <= 0:
            issues.append("Learning rate must be positive")
        elif config.learning_rate > 1.0:
            issues.append("Learning rate seems too high (> 1.0)")

        # Validate weight decay
        if config.weight_decay < 0:
            issues.append("Weight decay cannot be negative")
        elif config.weight_decay > 1.0:
            issues.append("Weight decay seems too high (> 1.0)")

        # Validate Adam parameters
        if config.adam_beta1 <= 0 or config.adam_beta1 >= 1:
            issues.append("adam_beta1 must be in (0, 1)")

        if config.adam_beta2 <= 0 or config.adam_beta2 >= 1:
            issues.append("adam_beta2 must be in (0, 1)")

        if config.adam_epsilon <= 0:
            issues.append("adam_epsilon must be positive")

        # Validate gradient clipping
        if config.max_grad_norm is not None and config.max_grad_norm <= 0:
            issues.append("max_grad_norm must be positive")

        if issues:
            error_msg = "Optimizer configuration validation failed:\n" + "\n".join(
                f"  - {issue}" for issue in issues
            )
            self.logger.error(error_msg)
            raise ConfigurationException(error_msg)

        self.logger.info("Optimizer configuration validated successfully")
        return True

    def get_optimizer_info(self, optimizer: Optimizer) -> Dict[str, Any]:
        """
        Get optimizer information.
        
        Args:
            optimizer: PyTorch optimizer
            
        Returns:
            Optimizer information dictionary
        """
        info = {
            "type": type(optimizer).__name__,
            "param_groups": len(optimizer.param_groups),
            "state_size": len(optimizer.state),
        }

        # Get learning rates from parameter groups
        lrs = [group["lr"] for group in optimizer.param_groups]
        info["learning_rates"] = lrs
        info["base_lr"] = lrs[0] if lrs else 0.0

        return info


# Global instance
optimizer_builder = OptimizerBuilder()
