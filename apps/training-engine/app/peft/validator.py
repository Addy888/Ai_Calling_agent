"""PEFT validation utilities."""

import sys
from typing import Any, Dict, List

import torch
import torch.nn as nn
import transformers
from peft import __version__ as peft_version

from app.logger import training_logger
from app.peft.exceptions import CompatibilityException, ConfigurationException
from app.peft.schemas import AdapterType


class PEFTValidator:
    """Validates PEFT configurations and model compatibility."""

    # Minimum supported versions
    MIN_PEFT_VERSION = "0.7.0"
    MIN_TRANSFORMERS_VERSION = "4.30.0"
    MIN_TORCH_VERSION = "2.0.0"

    def __init__(self):
        """Initialize validator."""
        self.logger = training_logger

    def validate_environment(self) -> bool:
        """
        Validate PEFT environment and dependencies.
        
        Returns:
            True if environment is valid
            
        Raises:
            CompatibilityException: If environment validation fails
        """
        self.logger.info("Validating PEFT environment...")

        issues = []

        # Check PEFT version
        try:
            if not self._check_version(peft_version, self.MIN_PEFT_VERSION):
                issues.append(
                    f"PEFT version {peft_version} is below minimum "
                    f"{self.MIN_PEFT_VERSION}"
                )
        except Exception as e:
            issues.append(f"Failed to check PEFT version: {str(e)}")

        # Check Transformers version
        try:
            tf_version = transformers.__version__
            if not self._check_version(tf_version, self.MIN_TRANSFORMERS_VERSION):
                issues.append(
                    f"Transformers version {tf_version} is below minimum "
                    f"{self.MIN_TRANSFORMERS_VERSION}"
                )
        except Exception as e:
            issues.append(f"Failed to check Transformers version: {str(e)}")

        # Check PyTorch version
        try:
            torch_version = torch.__version__.split("+")[0]  # Remove CUDA suffix
            if not self._check_version(torch_version, self.MIN_TORCH_VERSION):
                issues.append(
                    f"PyTorch version {torch_version} is below minimum "
                    f"{self.MIN_TORCH_VERSION}"
                )
        except Exception as e:
            issues.append(f"Failed to check PyTorch version: {str(e)}")

        # Check Python version
        py_version = f"{sys.version_info.major}.{sys.version_info.minor}"
        if sys.version_info < (3, 10):
            issues.append(
                f"Python version {py_version} is below minimum 3.10"
            )

        if issues:
            error_msg = "Environment validation failed:\n" + "\n".join(
                f"  - {issue}" for issue in issues
            )
            self.logger.error(error_msg)
            raise CompatibilityException(error_msg)

        self.logger.info("PEFT environment validated successfully")
        return True

    def validate_model(self, model: nn.Module) -> bool:
        """
        Validate model compatibility with PEFT.
        
        Args:
            model: PyTorch model
            
        Returns:
            True if compatible
            
        Raises:
            CompatibilityException: If model is not compatible
        """
        self.logger.info("Validating model for PEFT compatibility...")

        if not isinstance(model, nn.Module):
            raise CompatibilityException(
                "Model must be a PyTorch nn.Module"
            )

        # Check if model has parameters
        try:
            param_count = sum(p.numel() for p in model.parameters())
            if param_count == 0:
                raise CompatibilityException("Model has no parameters")

            self.logger.info(f"Model has {param_count:,} parameters")

        except Exception as e:
            raise CompatibilityException(
                f"Failed to count model parameters: {str(e)}"
            )

        # Check if model has linear layers (required for LoRA)
        has_linear = False
        for module in model.modules():
            if isinstance(module, nn.Linear):
                has_linear = True
                break

        if not has_linear:
            self.logger.warning(
                "Model has no Linear layers - LoRA may not be applicable"
            )

        self.logger.info("Model validated for PEFT compatibility")
        return True

    def validate_adapter_type(self, adapter_type: AdapterType) -> bool:
        """
        Validate adapter type is supported.
        
        Args:
            adapter_type: Adapter type
            
        Returns:
            True if supported
            
        Raises:
            ConfigurationException: If adapter type not supported
        """
        supported_types = [AdapterType.LORA]

        if adapter_type not in supported_types:
            raise ConfigurationException(
                f"Adapter type {adapter_type.value} not supported in this phase. "
                f"Supported types: {[t.value for t in supported_types]}"
            )

        return True

    def validate_lora_config(self, config: Dict[str, Any]) -> bool:
        """
        Validate LoRA configuration.
        
        Args:
            config: LoRA configuration dict
            
        Returns:
            True if valid
            
        Raises:
            ConfigurationException: If configuration is invalid
        """
        self.logger.info("Validating LoRA configuration...")

        issues = []

        # Validate rank
        r = config.get("r")
        if r is None:
            issues.append("Missing required field: r (rank)")
        elif not isinstance(r, int) or r <= 0:
            issues.append(f"Invalid rank: {r}, must be positive integer")
        elif r > 256:
            self.logger.warning(f"Very high rank: {r}, may be inefficient")

        # Validate alpha
        lora_alpha = config.get("lora_alpha")
        if lora_alpha is None:
            issues.append("Missing required field: lora_alpha")
        elif not isinstance(lora_alpha, (int, float)) or lora_alpha <= 0:
            issues.append(
                f"Invalid lora_alpha: {lora_alpha}, must be positive"
            )

        # Validate dropout
        lora_dropout = config.get("lora_dropout", 0.0)
        if not isinstance(lora_dropout, (int, float)):
            issues.append(f"Invalid lora_dropout: {lora_dropout}")
        elif not (0.0 <= lora_dropout <= 1.0):
            issues.append(
                f"Invalid lora_dropout: {lora_dropout}, must be in [0, 1]"
            )

        # Validate target_modules
        target_modules = config.get("target_modules")
        if not target_modules:
            issues.append("Missing required field: target_modules")
        elif not isinstance(target_modules, (list, tuple)):
            issues.append("target_modules must be a list or tuple")
        elif len(target_modules) == 0:
            issues.append("target_modules cannot be empty")

        # Validate bias
        bias = config.get("bias", "none")
        valid_bias = ["none", "all", "lora_only"]
        if bias not in valid_bias:
            issues.append(
                f"Invalid bias: {bias}, must be one of {valid_bias}"
            )

        if issues:
            error_msg = "LoRA configuration validation failed:\n" + "\n".join(
                f"  - {issue}" for issue in issues
            )
            self.logger.error(error_msg)
            raise ConfigurationException(error_msg)

        self.logger.info("LoRA configuration validated successfully")
        return True

    def validate_target_modules(
        self, model: nn.Module, target_modules: List[str]
    ) -> bool:
        """
        Validate target modules exist in model.
        
        Args:
            model: PyTorch model
            target_modules: List of target module names/patterns
            
        Returns:
            True if valid
            
        Raises:
            ConfigurationException: If target modules are invalid
        """
        if not target_modules:
            raise ConfigurationException("target_modules cannot be empty")

        # Get all module names
        all_modules = {name for name, _ in model.named_modules() if name}

        # Check if any target module matches
        matched = False
        for target in target_modules:
            # Check exact match
            if target in all_modules:
                matched = True
                break

            # Check suffix match (e.g., "q_proj" matches "layer.0.q_proj")
            for module_name in all_modules:
                if module_name.endswith(target):
                    matched = True
                    break

            if matched:
                break

        if not matched:
            raise ConfigurationException(
                f"No modules matched target_modules: {target_modules}"
            )

        self.logger.info(f"Target modules validated: {target_modules}")
        return True

    def _check_version(self, current: str, minimum: str) -> bool:
        """
        Check if current version meets minimum requirement.
        
        Args:
            current: Current version string
            minimum: Minimum required version string
            
        Returns:
            True if current >= minimum
        """
        try:
            current_parts = [int(x) for x in current.split(".")[:3]]
            minimum_parts = [int(x) for x in minimum.split(".")[:3]]

            # Pad to 3 parts
            while len(current_parts) < 3:
                current_parts.append(0)
            while len(minimum_parts) < 3:
                minimum_parts.append(0)

            return current_parts >= minimum_parts

        except Exception as e:
            self.logger.warning(f"Failed to parse versions: {str(e)}")
            return True  # Assume compatible if parsing fails

    def get_validation_report(
        self, model: nn.Module, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Get comprehensive validation report.
        
        Args:
            model: PyTorch model
            config: PEFT configuration
            
        Returns:
            Validation report dict
        """
        report = {
            "valid": True,
            "environment_valid": False,
            "model_compatible": False,
            "config_valid": False,
            "target_modules_valid": False,
            "issues": [],
            "warnings": [],
        }

        # Validate environment
        try:
            self.validate_environment()
            report["environment_valid"] = True
        except Exception as e:
            report["valid"] = False
            report["issues"].append(f"Environment: {str(e)}")

        # Validate model
        try:
            self.validate_model(model)
            report["model_compatible"] = True
        except Exception as e:
            report["valid"] = False
            report["issues"].append(f"Model: {str(e)}")

        # Validate config
        try:
            self.validate_lora_config(config)
            report["config_valid"] = True
        except Exception as e:
            report["valid"] = False
            report["issues"].append(f"Config: {str(e)}")

        # Validate target modules
        try:
            target_modules = config.get("target_modules", [])
            if target_modules:
                self.validate_target_modules(model, target_modules)
                report["target_modules_valid"] = True
        except Exception as e:
            report["valid"] = False
            report["issues"].append(f"Target modules: {str(e)}")

        return report


# Global instance
peft_validator = PEFTValidator()
