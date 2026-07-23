"""Optimizer and Scheduler validation."""

from typing import Any, Dict, Optional

from app.logger import training_logger
from app.optimizer.exceptions import ConfigurationException, ValidationException
from app.optimizer.schemas import OptimizerConfig, SchedulerConfig


class OptimizerValidator:
    """
    Validates optimizer and scheduler configurations.
    """

    def __init__(self):
        """Initialize validator."""
        self.logger = training_logger

    def validate_optimizer_config(self, config: OptimizerConfig) -> Dict[str, Any]:
        """
        Validate optimizer configuration.
        
        Args:
            config: Optimizer configuration
            
        Returns:
            Validation report
        """
        self.logger.info("Validating optimizer configuration")

        report = {
            "valid": True,
            "issues": [],
            "warnings": [],
        }

        # Learning rate validation
        if config.learning_rate <= 0:
            report["valid"] = False
            report["issues"].append("Learning rate must be positive")
        elif config.learning_rate > 0.1:
            report["warnings"].append(
                f"Learning rate {config.learning_rate} seems high"
            )

        # Weight decay validation
        if config.weight_decay < 0:
            report["valid"] = False
            report["issues"].append("Weight decay cannot be negative")
        elif config.weight_decay > 0.5:
            report["warnings"].append(
                f"Weight decay {config.weight_decay} seems high"
            )

        # Adam parameters validation
        if config.adam_beta1 <= 0 or config.adam_beta1 >= 1:
            report["valid"] = False
            report["issues"].append("adam_beta1 must be in (0, 1)")

        if config.adam_beta2 <= 0 or config.adam_beta2 >= 1:
            report["valid"] = False
            report["issues"].append("adam_beta2 must be in (0, 1)")

        if config.adam_epsilon <= 0:
            report["valid"] = False
            report["issues"].append("adam_epsilon must be positive")

        # Gradient clipping validation
        if config.max_grad_norm is not None:
            if config.max_grad_norm <= 0:
                report["valid"] = False
                report["issues"].append("max_grad_norm must be positive")

        return report

    def validate_scheduler_config(
        self,
        config: SchedulerConfig,
        num_training_steps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Validate scheduler configuration.
        
        Args:
            config: Scheduler configuration
            num_training_steps: Total training steps
            
        Returns:
            Validation report
        """
        self.logger.info("Validating scheduler configuration")

        report = {
            "valid": True,
            "issues": [],
            "warnings": [],
        }

        total_steps = num_training_steps or config.num_training_steps

        # Training steps validation
        if total_steps is not None and total_steps <= 0:
            report["valid"] = False
            report["issues"].append("num_training_steps must be positive")

        # Warmup validation
        if config.warmup_strategy.value == "steps":
            if config.warmup_steps is None:
                report["valid"] = False
                report["issues"].append(
                    "warmup_steps required for STEPS warmup strategy"
                )
            elif config.warmup_steps < 0:
                report["valid"] = False
                report["issues"].append("warmup_steps cannot be negative")
            elif total_steps and config.warmup_steps > total_steps:
                report["valid"] = False
                report["issues"].append(
                    f"warmup_steps ({config.warmup_steps}) > "
                    f"total_steps ({total_steps})"
                )

        if config.warmup_strategy.value == "ratio":
            if config.warmup_ratio < 0 or config.warmup_ratio > 1:
                report["valid"] = False
                report["issues"].append("warmup_ratio must be in [0, 1]")
            elif config.warmup_ratio > 0.5:
                report["warnings"].append(
                    f"warmup_ratio {config.warmup_ratio} is quite high"
                )

        # Scheduler-specific validation
        if config.scheduler_type.value == "cosine_with_restarts":
            if config.num_cycles is not None and config.num_cycles <= 0:
                report["valid"] = False
                report["issues"].append("num_cycles must be positive")

        if config.scheduler_type.value == "polynomial":
            if config.power < 0:
                report["valid"] = False
                report["issues"].append("power must be non-negative")

        return report

    def validate_combined_config(
        self,
        optimizer_config: OptimizerConfig,
        scheduler_config: Optional[SchedulerConfig],
        num_training_steps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Validate combined optimizer and scheduler configuration.
        
        Args:
            optimizer_config: Optimizer configuration
            scheduler_config: Optional scheduler configuration
            num_training_steps: Total training steps
            
        Returns:
            Combined validation report
        """
        self.logger.info("Validating combined configuration")

        # Validate optimizer
        opt_report = self.validate_optimizer_config(optimizer_config)

        # Validate scheduler if provided
        if scheduler_config:
            sched_report = self.validate_scheduler_config(
                scheduler_config, num_training_steps
            )
        else:
            sched_report = {"valid": True, "issues": [], "warnings": []}

        # Combine reports
        report = {
            "valid": opt_report["valid"] and sched_report["valid"],
            "optimizer_valid": opt_report["valid"],
            "scheduler_valid": sched_report["valid"],
            "issues": opt_report["issues"] + sched_report["issues"],
            "warnings": opt_report["warnings"] + sched_report["warnings"],
        }

        if report["valid"]:
            self.logger.info("Configuration validated successfully")
        else:
            self.logger.warning(
                f"Configuration validation failed: {len(report['issues'])} issues"
            )

        return report


# Global instance
optimizer_validator = OptimizerValidator()
