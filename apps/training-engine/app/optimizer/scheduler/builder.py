"""Scheduler builder."""

from typing import Any, Dict, Optional

from torch.optim import Optimizer
from torch.optim.lr_scheduler import (
    ConstantLR,
    CosineAnnealingLR,
    LinearLR,
    PolynomialLR,
    LRScheduler,
)
from transformers import (
    get_constant_schedule,
    get_constant_schedule_with_warmup,
    get_cosine_schedule_with_warmup,
    get_cosine_with_hard_restarts_schedule_with_warmup,
    get_linear_schedule_with_warmup,
    get_polynomial_decay_schedule_with_warmup,
)

from app.logger import training_logger
from app.optimizer.exceptions import ConfigurationException, SchedulerException
from app.optimizer.schemas import SchedulerConfig, SchedulerType, WarmupStrategy


class SchedulerBuilder:
    """
    Builds learning rate schedulers.
    
    Supports multiple scheduler types with warmup capabilities.
    """

    def __init__(self):
        """Initialize scheduler builder."""
        self.logger = training_logger

    def build_scheduler(
        self,
        optimizer: Optimizer,
        config: SchedulerConfig,
        num_training_steps: Optional[int] = None,
    ) -> LRScheduler:
        """
        Build learning rate scheduler.
        
        Args:
            optimizer: PyTorch optimizer
            config: Scheduler configuration
            num_training_steps: Total training steps
            
        Returns:
            Configured scheduler
        """
        self.logger.info(f"Building {config.scheduler_type.value} scheduler")

        try:
            # Determine total steps
            total_steps = num_training_steps or config.num_training_steps
            if total_steps is None:
                raise SchedulerException(
                    "num_training_steps must be provided either in config or as argument"
                )

            # Calculate warmup steps
            warmup_steps = self._calculate_warmup_steps(config, total_steps)

            self.logger.info(
                f"Scheduler: warmup={warmup_steps}, total={total_steps}"
            )

            # Create scheduler based on type
            scheduler_type = config.scheduler_type

            if scheduler_type == SchedulerType.LINEAR:
                scheduler = LinearLR(optimizer, total_iters=total_steps)
            elif scheduler_type == SchedulerType.COSINE:
                scheduler = CosineAnnealingLR(optimizer, T_max=total_steps)
            elif scheduler_type == SchedulerType.COSINE_WITH_RESTARTS:
                scheduler = get_cosine_with_hard_restarts_schedule_with_warmup(
                    optimizer,
                    num_warmup_steps=warmup_steps,
                    num_training_steps=total_steps,
                    num_cycles=config.num_cycles or 1,
                )
            elif scheduler_type == SchedulerType.POLYNOMIAL:
                scheduler = get_polynomial_decay_schedule_with_warmup(
                    optimizer,
                    num_warmup_steps=warmup_steps,
                    num_training_steps=total_steps,
                    lr_end=config.lr_end or 0.0,
                    power=config.power,
                )
            elif scheduler_type == SchedulerType.CONSTANT:
                scheduler = get_constant_schedule(optimizer)
            elif scheduler_type == SchedulerType.CONSTANT_WITH_WARMUP:
                scheduler = get_constant_schedule_with_warmup(
                    optimizer, num_warmup_steps=warmup_steps
                )
            elif scheduler_type == SchedulerType.LINEAR_WITH_WARMUP:
                scheduler = get_linear_schedule_with_warmup(
                    optimizer,
                    num_warmup_steps=warmup_steps,
                    num_training_steps=total_steps,
                )
            else:
                raise SchedulerException(
                    f"Scheduler type {scheduler_type.value} not implemented"
                )

            self.logger.info("Scheduler created successfully")

            return scheduler

        except Exception as e:
            self.logger.error(f"Failed to build scheduler: {str(e)}")
            raise SchedulerException(f"Scheduler build failed: {str(e)}")

    def _calculate_warmup_steps(
        self, config: SchedulerConfig, total_steps: int
    ) -> int:
        """
        Calculate warmup steps based on strategy.
        
        Args:
            config: Scheduler configuration
            total_steps: Total training steps
            
        Returns:
            Number of warmup steps
        """
        if config.warmup_strategy == WarmupStrategy.NONE:
            return 0

        if config.warmup_strategy == WarmupStrategy.STEPS:
            if config.warmup_steps is None:
                raise ConfigurationException(
                    "warmup_steps must be provided when using STEPS strategy"
                )
            return config.warmup_steps

        # RATIO strategy
        warmup_steps = int(total_steps * config.warmup_ratio)

        self.logger.info(
            f"Calculated warmup: {warmup_steps} steps "
            f"({config.warmup_ratio:.1%} of {total_steps})"
        )

        return warmup_steps

    def validate_config(
        self, config: SchedulerConfig, num_training_steps: Optional[int] = None
    ) -> bool:
        """
        Validate scheduler configuration.
        
        Args:
            config: Scheduler configuration
            num_training_steps: Total training steps for validation
            
        Returns:
            True if valid
            
        Raises:
            ConfigurationException: If configuration is invalid
        """
        self.logger.info("Validating scheduler configuration")

        issues = []

        # Validate training steps
        total_steps = num_training_steps or config.num_training_steps
        if total_steps is not None and total_steps <= 0:
            issues.append("num_training_steps must be positive")

        # Validate warmup configuration
        if config.warmup_strategy == WarmupStrategy.STEPS:
            if config.warmup_steps is None:
                issues.append(
                    "warmup_steps required when using STEPS warmup strategy"
                )
            elif config.warmup_steps < 0:
                issues.append("warmup_steps cannot be negative")
            elif total_steps and config.warmup_steps > total_steps:
                issues.append(
                    f"warmup_steps ({config.warmup_steps}) cannot exceed "
                    f"total steps ({total_steps})"
                )

        if config.warmup_strategy == WarmupStrategy.RATIO:
            if config.warmup_ratio < 0 or config.warmup_ratio > 1:
                issues.append("warmup_ratio must be in [0, 1]")

        # Validate scheduler-specific parameters
        if config.scheduler_type == SchedulerType.COSINE_WITH_RESTARTS:
            if config.num_cycles is not None and config.num_cycles <= 0:
                issues.append("num_cycles must be positive")

        if config.scheduler_type == SchedulerType.POLYNOMIAL:
            if config.power < 0:
                issues.append("power must be non-negative")
            if config.lr_end is not None and config.lr_end < 0:
                issues.append("lr_end must be non-negative")

        if issues:
            error_msg = "Scheduler configuration validation failed:\n" + "\n".join(
                f"  - {issue}" for issue in issues
            )
            self.logger.error(error_msg)
            raise ConfigurationException(error_msg)

        self.logger.info("Scheduler configuration validated successfully")
        return True

    def get_scheduler_info(self, scheduler: LRScheduler) -> Dict[str, Any]:
        """
        Get scheduler information.
        
        Args:
            scheduler: PyTorch scheduler
            
        Returns:
            Scheduler information dictionary
        """
        info = {
            "type": type(scheduler).__name__,
            "last_epoch": getattr(scheduler, "last_epoch", -1),
        }

        # Get current learning rates
        try:
            lrs = scheduler.get_last_lr()
            info["current_lrs"] = lrs
            info["base_lr"] = lrs[0] if lrs else 0.0
        except Exception:
            info["current_lrs"] = []
            info["base_lr"] = 0.0

        return info


# Global instance
scheduler_builder = SchedulerBuilder()
