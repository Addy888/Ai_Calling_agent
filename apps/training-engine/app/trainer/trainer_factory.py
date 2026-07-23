"""Trainer Factory - Creates trainer instances with dependency injection."""

from typing import Optional

from app.logger import training_logger
from app.trainer.hf_trainer import HFTrainerWrapper, create_hf_trainer
from app.trainer.interfaces import ITrainer
from app.trainer.trainer_builder import TrainerBuilder
from app.training_executor.models import TrainingContext, TrainingType


class TrainerFactory:
    """
    Factory for creating trainer instances.
    
    Responsibilities:
    - Create appropriate trainer based on training type
    - Inject dependencies
    - Validate compatibility
    """

    def __init__(self):
        """Initialize factory."""
        self.logger = training_logger

    def create_trainer(
        self,
        context: TrainingContext,
        trainer_type: Optional[str] = None,
    ) -> ITrainer:
        """
        Create trainer instance.
        
        Args:
            context: Training context
            trainer_type: Optional trainer type override
            
        Returns:
            Trainer instance
        """
        # For Phase 4.4.4.5.2, only HFTrainerWrapper is supported
        training_type = context.job.config.training_type

        self.logger.info(
            f"Creating trainer for training type: {training_type.value}",
            job_id=context.job_id,
        )

        # Validate training type
        self._validate_training_type(training_type)

        # Create HF Trainer wrapper
        trainer = create_hf_trainer()

        self.logger.info(
            f"Trainer created for job {context.job_id}",
            trainer_class=trainer.__class__.__name__,
        )

        return trainer

    def _validate_training_type(self, training_type: TrainingType):
        """Validate training type is supported."""
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

    def create_builder(self) -> TrainerBuilder:
        """
        Create trainer builder instance.
        
        Returns:
            TrainerBuilder instance
        """
        return TrainerBuilder()

    def validate_compatibility(self, context: TrainingContext) -> bool:
        """
        Validate training context compatibility.
        
        Args:
            context: Training context
            
        Returns:
            True if compatible
        """
        try:
            # Validate training type
            self._validate_training_type(context.job.config.training_type)

            # Check required metadata
            if not context.dataset_metadata:
                raise ValueError("Dataset metadata is required")

            if not context.model_metadata:
                raise ValueError("Model metadata is required")

            if not context.tokenizer_metadata:
                raise ValueError("Tokenizer metadata is required")

            self.logger.info(f"Compatibility validated for job {context.job_id}")

            return True

        except Exception as e:
            self.logger.error(f"Compatibility validation failed: {str(e)}")
            return False


# Global factory instance
trainer_factory = TrainerFactory()
