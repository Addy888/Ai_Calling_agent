"""Parameter group builder for optimizers."""

from typing import Any, Dict, List, Optional

import torch.nn as nn

from app.logger import training_logger
from app.optimizer.exceptions import ParameterGroupException


class ParameterGroupBuilder:
    """
    Builds parameter groups for optimizers.
    
    Supports weight decay groups, frozen parameters, and custom grouping.
    """

    def __init__(self):
        """Initialize parameter group builder."""
        self.logger = training_logger

    def build_parameter_groups(
        self,
        model: nn.Module,
        learning_rate: float,
        weight_decay: float = 0.01,
        use_weight_decay_groups: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Build parameter groups.
        
        Args:
            model: PyTorch model
            learning_rate: Base learning rate
            weight_decay: Weight decay value
            use_weight_decay_groups: Separate groups for weight decay
            
        Returns:
            List of parameter group dictionaries
        """
        self.logger.info("Building parameter groups")

        try:
            if not use_weight_decay_groups:
                # Single group with all trainable parameters
                return self._build_single_group(model, learning_rate, weight_decay)

            # Separate groups for weight decay and no decay
            return self._build_weight_decay_groups(
                model, learning_rate, weight_decay
            )

        except Exception as e:
            self.logger.error(f"Failed to build parameter groups: {str(e)}")
            raise ParameterGroupException(
                f"Parameter group building failed: {str(e)}"
            )

    def _build_single_group(
        self, model: nn.Module, learning_rate: float, weight_decay: float
    ) -> List[Dict[str, Any]]:
        """
        Build single parameter group.
        
        Args:
            model: PyTorch model
            learning_rate: Learning rate
            weight_decay: Weight decay
            
        Returns:
            Single parameter group
        """
        trainable_params = self.get_trainable_parameters(model)

        group = {
            "params": trainable_params,
            "lr": learning_rate,
            "weight_decay": weight_decay,
        }

        self.logger.info(
            f"Created single parameter group with {len(trainable_params)} parameters"
        )

        return [group]

    def _build_weight_decay_groups(
        self, model: nn.Module, learning_rate: float, weight_decay: float
    ) -> List[Dict[str, Any]]:
        """
        Build parameter groups separated by weight decay.
        
        Typically:
        - Weight decay: weights in Linear, Conv layers
        - No weight decay: biases, LayerNorm, embeddings
        
        Args:
            model: PyTorch model
            learning_rate: Learning rate
            weight_decay: Weight decay value
            
        Returns:
            List of parameter groups
        """
        # Separate parameters
        decay_params = []
        no_decay_params = []

        for name, param in model.named_parameters():
            if not param.requires_grad:
                continue

            # No decay for certain parameter types
            if self._should_exclude_from_weight_decay(name):
                no_decay_params.append(param)
            else:
                decay_params.append(param)

        groups = []

        # Weight decay group
        if decay_params:
            groups.append({
                "params": decay_params,
                "lr": learning_rate,
                "weight_decay": weight_decay,
            })
            self.logger.info(
                f"Weight decay group: {len(decay_params)} parameters"
            )

        # No weight decay group
        if no_decay_params:
            groups.append({
                "params": no_decay_params,
                "lr": learning_rate,
                "weight_decay": 0.0,
            })
            self.logger.info(
                f"No weight decay group: {len(no_decay_params)} parameters"
            )

        if not groups:
            raise ParameterGroupException("No trainable parameters found")

        return groups

    def _should_exclude_from_weight_decay(self, param_name: str) -> bool:
        """
        Check if parameter should be excluded from weight decay.
        
        Args:
            param_name: Parameter name
            
        Returns:
            True if should exclude
        """
        # Common patterns to exclude
        exclude_patterns = [
            "bias",
            "LayerNorm",
            "layer_norm",
            "bn",  # Batch norm
            "ln",  # Layer norm
            "embedding",
        ]

        param_lower = param_name.lower()
        return any(pattern.lower() in param_lower for pattern in exclude_patterns)

    def get_trainable_parameters(self, model: nn.Module) -> List[nn.Parameter]:
        """
        Get all trainable parameters from model.
        
        Args:
            model: PyTorch model
            
        Returns:
            List of trainable parameters
        """
        trainable = [p for p in model.parameters() if p.requires_grad]

        self.logger.info(
            f"Found {len(trainable)} trainable parameters out of "
            f"{sum(1 for _ in model.parameters())} total"
        )

        return trainable

    def get_frozen_parameters(self, model: nn.Module) -> List[nn.Parameter]:
        """
        Get all frozen parameters from model.
        
        Args:
            model: PyTorch model
            
        Returns:
            List of frozen parameters
        """
        frozen = [p for p in model.parameters() if not p.requires_grad]

        self.logger.info(f"Found {len(frozen)} frozen parameters")

        return frozen

    def count_parameters(self, params: List[nn.Parameter]) -> int:
        """
        Count total number of parameters.
        
        Args:
            params: List of parameters
            
        Returns:
            Total parameter count
        """
        return sum(p.numel() for p in params)

    def get_parameter_stats(
        self, model: nn.Module
    ) -> Dict[str, Any]:
        """
        Get parameter statistics.
        
        Args:
            model: PyTorch model
            
        Returns:
            Statistics dictionary
        """
        trainable = self.get_trainable_parameters(model)
        frozen = self.get_frozen_parameters(model)

        trainable_count = self.count_parameters(trainable)
        frozen_count = self.count_parameters(frozen)
        total_count = trainable_count + frozen_count

        stats = {
            "total_parameters": total_count,
            "trainable_parameters": trainable_count,
            "frozen_parameters": frozen_count,
            "trainable_percent": (
                (trainable_count / total_count * 100) if total_count > 0 else 0.0
            ),
        }

        return stats

    def create_custom_groups(
        self,
        model: nn.Module,
        group_configs: List[Dict[str, Any]],
        default_lr: float,
        default_weight_decay: float,
    ) -> List[Dict[str, Any]]:
        """
        Create custom parameter groups.
        
        Args:
            model: PyTorch model
            group_configs: List of group configurations
            default_lr: Default learning rate
            default_weight_decay: Default weight decay
            
        Returns:
            Custom parameter groups
        """
        self.logger.info("Creating custom parameter groups")

        groups = []
        used_params = set()

        for config in group_configs:
            name_patterns = config.get("name_patterns", [])
            lr = config.get("lr", default_lr)
            weight_decay = config.get("weight_decay", default_weight_decay)

            group_params = []

            for name, param in model.named_parameters():
                if not param.requires_grad:
                    continue

                if id(param) in used_params:
                    continue

                # Check if parameter matches any pattern
                if any(pattern in name for pattern in name_patterns):
                    group_params.append(param)
                    used_params.add(id(param))

            if group_params:
                groups.append({
                    "params": group_params,
                    "lr": lr,
                    "weight_decay": weight_decay,
                })
                self.logger.info(
                    f"Custom group '{config.get('name', 'unnamed')}': "
                    f"{len(group_params)} parameters"
                )

        # Add remaining parameters to default group
        remaining = [
            p for p in model.parameters()
            if p.requires_grad and id(p) not in used_params
        ]

        if remaining:
            groups.append({
                "params": remaining,
                "lr": default_lr,
                "weight_decay": default_weight_decay,
            })
            self.logger.info(
                f"Default group: {len(remaining)} parameters"
            )

        return groups


# Global instance
parameter_group_builder = ParameterGroupBuilder()
