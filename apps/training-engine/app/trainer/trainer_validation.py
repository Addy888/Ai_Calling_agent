"""Trainer validation utilities."""

from typing import Any, Dict, Optional

import torch

from app.logger import training_logger
from app.trainer.exceptions import TrainerValidationException
from app.training_executor.models import TrainingContext, TrainingType


class TrainerValidator:
    """Validates training components before trainer creation."""

    def __init__(self):
        """Initialize validator."""
        self.logger = training_logger

    def validate_context(self, context: TrainingContext) -> bool:
        """
        Validate training context.
        
        Args:
            context: Training context to validate
            
        Returns:
            True if valid
            
        Raises:
            TrainerValidationException: If validation fails
        """
        try:
            self.logger.info(f"Validating training context for job {context.job_id}")

            # Validate job
            if not context.job:
                raise ValueError("Training job is missing")

            # Validate config
            if not context.job.config:
                raise ValueError("Training configuration is missing")

            # Validate metadata
            self._validate_metadata(context)

            # Validate directories
            self._validate_directories(context)

            # Validate device
            self._validate_device(context)

            # Validate training type
            self._validate_training_type(context)

            self.logger.info(f"Training context validated successfully for job {context.job_id}")

            return True

        except Exception as e:
            self.logger.error(f"Training context validation failed: {str(e)}")
            raise TrainerValidationException(
                f"Context validation failed: {str(e)}"
            )

    def _validate_metadata(self, context: TrainingContext):
        """Validate metadata."""
        if not context.dataset_metadata:
            raise ValueError("Dataset metadata is missing")

        if not context.model_metadata:
            raise ValueError("Model metadata is missing")

        if not context.tokenizer_metadata:
            raise ValueError("Tokenizer metadata is missing")

    def _validate_directories(self, context: TrainingContext):
        """Validate directories."""
        if not context.output_dir:
            raise ValueError("Output directory is missing")

        if not context.checkpoint_dir:
            raise ValueError("Checkpoint directory is missing")

    def _validate_device(self, context: TrainingContext):
        """Validate device configuration."""
        device = context.device or "cpu"

        if device == "cuda" and not torch.cuda.is_available():
            self.logger.warning("CUDA requested but not available, will use CPU")
            context.device = "cpu"

        self.logger.info(f"Device validated: {context.device}")

    def _validate_training_type(self, context: TrainingContext):
        """Validate training type."""
        training_type = context.job.config.training_type

        # For Phase 4.4.4.5.2, only support basic types
        supported_types = [
            TrainingType.FULL_FINE_TUNE,
            TrainingType.INSTRUCTION_TUNING,
            TrainingType.CONVERSATION_TUNING,
            TrainingType.DOMAIN_ADAPTATION,
        ]

        if training_type not in supported_types:
            raise ValueError(
                f"Training type {training_type.value} not supported in Phase 4.4.4.5.2. "
                f"Supported types: {[t.value for t in supported_types]}"
            )

    def validate_dataset(self, dataset: Any) -> bool:
        """
        Validate dataset.
        
        Args:
            dataset: Dataset to validate
            
        Returns:
            True if valid
            
        Raises:
            TrainerValidationException: If validation fails
        """
        try:
            if dataset is None:
                raise ValueError("Dataset is None")

            # Check if it's a HuggingFace dataset
            if not hasattr(dataset, "__len__"):
                raise ValueError("Dataset must have __len__ method")

            dataset_size = len(dataset)

            if dataset_size == 0:
                raise ValueError("Dataset is empty")

            self.logger.info(f"Dataset validated: {dataset_size} samples")

            return True

        except Exception as e:
            self.logger.error(f"Dataset validation failed: {str(e)}")
            raise TrainerValidationException(
                f"Dataset validation failed: {str(e)}"
            )

    def validate_tokenizer(self, tokenizer: Any) -> bool:
        """
        Validate tokenizer.
        
        Args:
            tokenizer: Tokenizer to validate
            
        Returns:
            True if valid
            
        Raises:
            TrainerValidationException: If validation fails
        """
        try:
            if tokenizer is None:
                raise ValueError("Tokenizer is None")

            # Check required methods
            required_methods = ["encode", "decode", "__call__"]
            for method in required_methods:
                if not hasattr(tokenizer, method):
                    raise ValueError(f"Tokenizer missing required method: {method}")

            # Ensure padding token is set
            if tokenizer.pad_token is None:
                self.logger.warning("Tokenizer pad_token is None, will be set to eos_token")

            self.logger.info("Tokenizer validated successfully")

            return True

        except Exception as e:
            self.logger.error(f"Tokenizer validation failed: {str(e)}")
            raise TrainerValidationException(
                f"Tokenizer validation failed: {str(e)}"
            )

    def validate_model(self, model: Any) -> bool:
        """
        Validate model.
        
        Args:
            model: Model to validate
            
        Returns:
            True if valid
            
        Raises:
            TrainerValidationException: If validation fails
        """
        try:
            if model is None:
                raise ValueError("Model is None")

            # Check if it's a PyTorch module
            if not isinstance(model, torch.nn.Module):
                raise ValueError("Model must be a PyTorch nn.Module")

            # Count parameters
            total_params = sum(p.numel() for p in model.parameters())
            trainable_params = sum(
                p.numel() for p in model.parameters() if p.requires_grad
            )

            self.logger.info(
                f"Model validated: {total_params:,} total params, "
                f"{trainable_params:,} trainable"
            )

            return True

        except Exception as e:
            self.logger.error(f"Model validation failed: {str(e)}")
            raise TrainerValidationException(
                f"Model validation failed: {str(e)}"
            )

    def validate_training_arguments(self, training_args: Any) -> bool:
        """
        Validate training arguments.
        
        Args:
            training_args: TrainingArguments instance
            
        Returns:
            True if valid
            
        Raises:
            TrainerValidationException: If validation fails
        """
        try:
            if training_args is None:
                raise ValueError("TrainingArguments is None")

            # Check required attributes
            required_attrs = [
                "output_dir",
                "num_train_epochs",
                "per_device_train_batch_size",
                "learning_rate",
            ]

            for attr in required_attrs:
                if not hasattr(training_args, attr):
                    raise ValueError(f"TrainingArguments missing attribute: {attr}")

            self.logger.info("TrainingArguments validated successfully")

            return True

        except Exception as e:
            self.logger.error(f"TrainingArguments validation failed: {str(e)}")
            raise TrainerValidationException(
                f"TrainingArguments validation failed: {str(e)}"
            )


# Global instance
trainer_validator = TrainerValidator()
