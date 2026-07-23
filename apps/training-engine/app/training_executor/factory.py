"""Factories for training executor components."""

from typing import Optional

from app.logger import training_logger
from app.training_executor.event_manager import event_manager
from app.training_executor.job_manager import job_manager
from app.training_executor.models import TrainingConfig, TrainingJob, TrainingType
from app.training_executor.runtime_manager import runtime_manager


class TrainingJobFactory:
    """Factory for creating training jobs."""

    @staticmethod
    def create_job(
        model_id: str,
        dataset_id: str,
        config: TrainingConfig,
        tokenizer_id: Optional[str] = None,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs,
    ) -> TrainingJob:
        """Create a new training job."""
        training_logger.info(f"Creating training job for model: {model_id}")

        job = TrainingJob(
            model_id=model_id,
            dataset_id=dataset_id,
            tokenizer_id=tokenizer_id,
            config=config,
            company_id=company_id,
            user_id=user_id,
            project_id=project_id,
            tags=kwargs.get("tags", []),
            metadata=kwargs.get("metadata", {}),
        )

        training_logger.info(
            f"Training job created",
            job_id=job.job_id,
            model_id=model_id,
            dataset_id=dataset_id,
        )

        return job


class TrainingConfigFactory:
    """Factory for creating training configurations."""

    @staticmethod
    def create_lora_config(
        num_epochs: int = 3,
        learning_rate: float = 2e-4,
        batch_size: int = 4,
        lora_r: int = 8,
        lora_alpha: int = 16,
        **kwargs,
    ) -> TrainingConfig:
        """Create configuration for LoRA training."""
        from app.training_executor.models import LoRAConfig

        training_logger.info("Creating LoRA training configuration")

        lora_config = LoRAConfig(
            r=lora_r,
            lora_alpha=lora_alpha,
            lora_dropout=kwargs.get("lora_dropout", 0.05),
            target_modules=kwargs.get("target_modules"),
        )

        config = TrainingConfig(
            training_type=TrainingType.LORA,
            num_train_epochs=num_epochs,
            learning_rate=learning_rate,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            lora_config=lora_config,
            **kwargs,
        )

        return config

    @staticmethod
    def create_full_finetune_config(
        num_epochs: int = 3,
        learning_rate: float = 5e-5,
        batch_size: int = 4,
        **kwargs,
    ) -> TrainingConfig:
        """Create configuration for full fine-tuning."""
        training_logger.info("Creating full fine-tune configuration")

        config = TrainingConfig(
            training_type=TrainingType.FULL_FINE_TUNE,
            num_train_epochs=num_epochs,
            learning_rate=learning_rate,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            **kwargs,
        )

        return config


class TrainingExecutorFactory:
    """Factory for creating training executor instances."""

    @staticmethod
    def create_job_manager():
        """Get job manager instance."""
        return job_manager

    @staticmethod
    def create_runtime_manager():
        """Get runtime manager instance."""
        return runtime_manager

    @staticmethod
    def create_event_manager():
        """Get event manager instance."""
        return event_manager
