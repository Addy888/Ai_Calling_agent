"""LoRA configuration factory."""

from typing import Any, Dict, List, Optional

from peft import LoraConfig, TaskType as PeftTaskType

from app.logger import training_logger
from app.peft.exceptions import ConfigurationException
from app.peft.schemas import LoRAConfigRequest, TaskType, LoRABias


class LoRAConfigFactory:
    """
    Factory for creating and validating LoRA configurations.
    
    Handles conversion between API schemas and PEFT LoraConfig objects.
    """

    def __init__(self):
        """Initialize LoRA config factory."""
        self.logger = training_logger

    def create_from_request(
        self,
        request: LoRAConfigRequest,
        target_modules: Optional[List[str]] = None,
    ) -> LoraConfig:
        """
        Create LoraConfig from request.
        
        Args:
            request: LoRA configuration request
            target_modules: Optional override target modules
            
        Returns:
            PEFT LoraConfig
        """
        self.logger.info("Creating LoraConfig from request")

        try:
            # Use provided target_modules or from request
            modules = target_modules or request.target_modules

            if not modules:
                raise ConfigurationException(
                    "target_modules must be provided"
                )

            # Convert TaskType enum
            task_type = self._convert_task_type(request.task_type)

            # Convert bias enum
            bias = self._convert_bias(request.bias)

            # Create LoraConfig
            config = LoraConfig(
                r=request.r,
                lora_alpha=request.lora_alpha,
                lora_dropout=request.lora_dropout,
                bias=bias,
                target_modules=modules,
                modules_to_save=request.modules_to_save,
                task_type=task_type,
                inference_mode=request.inference_mode,
                fan_in_fan_out=request.fan_in_fan_out,
            )

            self.logger.info(
                f"LoraConfig created: r={config.r}, alpha={config.lora_alpha}, "
                f"modules={config.target_modules}"
            )

            return config

        except Exception as e:
            self.logger.error(f"Failed to create LoraConfig: {str(e)}")
            raise ConfigurationException(
                f"LoraConfig creation failed: {str(e)}"
            )

    def create_from_dict(
        self, config_dict: Dict[str, Any]
    ) -> LoraConfig:
        """
        Create LoraConfig from dictionary.
        
        Args:
            config_dict: Configuration dictionary
            
        Returns:
            PEFT LoraConfig
        """
        self.logger.info("Creating LoraConfig from dict")

        try:
            # Convert task_type if string
            if "task_type" in config_dict and isinstance(
                config_dict["task_type"], str
            ):
                config_dict["task_type"] = self._convert_task_type_str(
                    config_dict["task_type"]
                )

            # Create LoraConfig
            config = LoraConfig(**config_dict)

            self.logger.info("LoraConfig created from dict")

            return config

        except Exception as e:
            self.logger.error(f"Failed to create LoraConfig from dict: {str(e)}")
            raise ConfigurationException(
                f"LoraConfig creation from dict failed: {str(e)}"
            )

    def validate_config(self, config: LoraConfig) -> bool:
        """
        Validate LoraConfig.
        
        Args:
            config: LoraConfig to validate
            
        Returns:
            True if valid
            
        Raises:
            ConfigurationException: If configuration is invalid
        """
        self.logger.info("Validating LoraConfig")

        issues = []

        # Validate rank
        if config.r <= 0:
            issues.append("Rank (r) must be positive")
        elif config.r > 256:
            self.logger.warning(f"Very high rank: {config.r}")

        # Validate alpha
        if config.lora_alpha <= 0:
            issues.append("lora_alpha must be positive")

        # Validate dropout
        if not isinstance(config.lora_dropout, (int, float)):
            issues.append("lora_dropout must be numeric")
        elif not (0.0 <= config.lora_dropout <= 1.0):
            issues.append("lora_dropout must be in [0, 1]")

        # Validate target modules
        if not config.target_modules:
            issues.append("target_modules cannot be empty")
        elif not isinstance(config.target_modules, (list, tuple)):
            issues.append("target_modules must be a list or tuple")

        # Validate task type
        if config.task_type is None:
            issues.append("task_type is required")

        if issues:
            error_msg = "LoraConfig validation failed:\n" + "\n".join(
                f"  - {issue}" for issue in issues
            )
            self.logger.error(error_msg)
            raise ConfigurationException(error_msg)

        self.logger.info("LoraConfig validated successfully")
        return True

    def get_config_dict(self, config: LoraConfig) -> Dict[str, Any]:
        """
        Convert LoraConfig to dictionary.
        
        Args:
            config: LoraConfig instance
            
        Returns:
            Configuration dictionary
        """
        return {
            "r": config.r,
            "lora_alpha": config.lora_alpha,
            "lora_dropout": config.lora_dropout,
            "bias": config.bias,
            "target_modules": config.target_modules,
            "modules_to_save": config.modules_to_save,
            "task_type": str(config.task_type),
            "inference_mode": config.inference_mode,
            "fan_in_fan_out": config.fan_in_fan_out,
        }

    def _convert_task_type(self, task_type: TaskType) -> PeftTaskType:
        """
        Convert API TaskType to PEFT TaskType.
        
        Args:
            task_type: API TaskType enum
            
        Returns:
            PEFT TaskType
        """
        mapping = {
            TaskType.CAUSAL_LM: PeftTaskType.CAUSAL_LM,
            TaskType.SEQ_2_SEQ_LM: PeftTaskType.SEQ_2_SEQ_LM,
            TaskType.SEQ_CLS: PeftTaskType.SEQ_CLS,
            TaskType.TOKEN_CLS: PeftTaskType.TOKEN_CLS,
            TaskType.QUESTION_ANS: PeftTaskType.QUESTION_ANS,
        }

        return mapping.get(task_type, PeftTaskType.CAUSAL_LM)

    def _convert_task_type_str(self, task_type_str: str) -> PeftTaskType:
        """
        Convert task type string to PEFT TaskType.
        
        Args:
            task_type_str: Task type string
            
        Returns:
            PEFT TaskType
        """
        task_type_upper = task_type_str.upper()

        if hasattr(PeftTaskType, task_type_upper):
            return getattr(PeftTaskType, task_type_upper)

        # Default to CAUSAL_LM
        self.logger.warning(
            f"Unknown task type: {task_type_str}, using CAUSAL_LM"
        )
        return PeftTaskType.CAUSAL_LM

    def _convert_bias(self, bias: LoRABias) -> str:
        """
        Convert API LoRABias to PEFT bias string.
        
        Args:
            bias: API LoRABias enum
            
        Returns:
            PEFT bias string
        """
        return bias.value


# Global instance
lora_config_factory = LoRAConfigFactory()
