"""Training execution pipeline (orchestration only)."""

from typing import Dict, Any

from app.dataset.pipeline import dataset_pipeline
from app.logger import training_logger
from app.model.pipeline import model_pipeline
from app.training_executor.event_manager import event_manager
from app.training_executor.exceptions import TrainingException
from app.training_executor.job_manager import job_manager
from app.training_executor.models import TrainingContext, TrainingJob, TrainingStatus
from app.training_executor.runtime_manager import runtime_manager


class TrainingPipeline:
    """Training execution pipeline orchestrator."""

    def __init__(self):
        """Initialize pipeline."""
        training_logger.info("Training pipeline initialized")

    async def execute(self, job: TrainingJob) -> TrainingJob:
        """
        Execute training pipeline.
        
        This orchestrates the flow but delegates actual training to trainer.
        """
        training_logger.info(f"Starting training pipeline for job: {job.job_id}")

        try:
            # Step 1: Validate job
            await self._validate_job(job)

            # Step 2: Load metadata (NOT actual objects)
            dataset_metadata = await self._load_dataset_metadata(job)
            model_metadata = await self._load_model_metadata(job)
            tokenizer_metadata = await self._load_tokenizer_metadata(job)

            # Step 3: Validate compatibility
            await self._validate_compatibility(
                dataset_metadata, model_metadata, tokenizer_metadata
            )

            # Step 4: Initialize runtime
            event_manager.emit_preparing(job.job_id)
            await job_manager.update_status(job.job_id, TrainingStatus.PREPARING)

            runtime_info = await runtime_manager.initialize_runtime(job)

            # Step 5: Create training context
            context = await runtime_manager.create_training_context(
                job=job,
                dataset_metadata=dataset_metadata,
                tokenizer_metadata=tokenizer_metadata,
                model_metadata=model_metadata,
            )

            # Step 6: Emit runtime ready
            event_manager.emit_runtime_ready(
                job.job_id, {"runtime_info": runtime_info}
            )

            # Step 7: Prepare for training
            context.is_prepared = True
            context.is_validated = True

            # Step 8: Update job status to training
            await job_manager.update_status(job.job_id, TrainingStatus.TRAINING)
            event_manager.emit_training_started(job.job_id)

            # Step 9: Delegate to trainer (Phase 4.4.4.5.2 integration)
            training_logger.info(
                f"Pipeline prepared - delegating to HF trainer",
                job_id=job.job_id,
            )

            # Import trainer components
            from app.trainer.trainer_factory import trainer_factory
            from app.trainer.trainer_runtime import trainer_runtime_manager

            # Create trainer
            trainer = trainer_factory.create_trainer(context)

            # Create runtime
            runtime = trainer_runtime_manager.create_runtime(job.job_id)

            # Initialize runtime
            await runtime.initialize(trainer, context)

            # Execute training
            result = await runtime.start_training()

            # Update job status
            await job_manager.update_status(job.job_id, TrainingStatus.COMPLETED)
            event_manager.emit_training_completed(job.job_id)

            # Shutdown runtime
            await trainer_runtime_manager.shutdown_runtime(job.job_id)

            # Step 10: Cleanup
            event_manager.emit_cleanup_started(job.job_id)
            await runtime_manager.cleanup_runtime(job.job_id)
            event_manager.emit_cleanup_finished(job.job_id)

            # Get updated job
            job = await job_manager.get_job(job.job_id)

            training_logger.info(f"Training pipeline completed for job: {job.job_id}")

            return job

        except Exception as e:
            training_logger.error(f"Training pipeline failed: {str(e)}")

            # Update job status
            await job_manager.update_status(
                job.job_id, TrainingStatus.FAILED, error_message=str(e)
            )

            # Emit failure event
            event_manager.emit_training_failed(job.job_id, str(e))

            # Cleanup
            await runtime_manager.cleanup_runtime(job.job_id)

            # Get updated job
            job = await job_manager.get_job(job.job_id)

            raise TrainingException(f"Training pipeline failed: {str(e)}")

    async def _validate_job(self, job: TrainingJob):
        """Validate training job."""
        training_logger.info(f"Validating job: {job.job_id}")

        if not job.model_id:
            raise TrainingException("Model ID is required")

        if not job.dataset_id:
            raise TrainingException("Dataset ID is required")

        if not job.config:
            raise TrainingException("Training configuration is required")

        training_logger.info(f"Job validation passed: {job.job_id}")

    async def _load_dataset_metadata(self, job: TrainingJob) -> Dict[str, Any]:
        """Load dataset metadata."""
        training_logger.info(f"Loading dataset metadata: {job.dataset_id}")

        try:
            dataset = await dataset_pipeline.get_dataset(job.dataset_id)

            metadata = {
                "dataset_id": dataset.dataset_id,
                "name": dataset.metadata.name,
                "dataset_type": dataset.metadata.dataset_type.value,
                "total_records": dataset.metadata.total_records,
                "has_train_split": dataset.train_split is not None,
                "has_validation_split": dataset.validation_split is not None,
            }

            training_logger.info(f"Dataset metadata loaded: {job.dataset_id}")

            return metadata

        except Exception as e:
            training_logger.error(f"Failed to load dataset metadata: {str(e)}")
            raise TrainingException(f"Dataset metadata loading failed: {str(e)}")

    async def _load_model_metadata(self, job: TrainingJob) -> Dict[str, Any]:
        """Load model metadata."""
        training_logger.info(f"Loading model metadata: {job.model_id}")

        try:
            model = await model_pipeline.get_model(job.model_id)

            metadata = {
                "model_id": model.model_id,
                "name": model.name,
                "architecture": model.architecture.value,
                "model_type": model.model_type.value,
                "parameter_count": model.metadata.parameter_count,
                "context_length": model.metadata.context_length,
                "model_path": model.config.model_path,
            }

            training_logger.info(f"Model metadata loaded: {job.model_id}")

            return metadata

        except Exception as e:
            training_logger.error(f"Failed to load model metadata: {str(e)}")
            raise TrainingException(f"Model metadata loading failed: {str(e)}")

    async def _load_tokenizer_metadata(self, job: TrainingJob) -> Dict[str, Any]:
        """Load tokenizer metadata."""
        # For now, use model's tokenizer
        training_logger.info("Loading tokenizer metadata from model")

        try:
            model = await model_pipeline.get_model(job.model_id)

            metadata = {
                "tokenizer_path": model.config.tokenizer_path or model.config.model_path,
                "vocabulary_size": model.config.vocabulary_size,
            }

            training_logger.info("Tokenizer metadata loaded")

            return metadata

        except Exception as e:
            training_logger.error(f"Failed to load tokenizer metadata: {str(e)}")
            raise TrainingException(f"Tokenizer metadata loading failed: {str(e)}")

    async def _validate_compatibility(
        self,
        dataset_metadata: Dict[str, Any],
        model_metadata: Dict[str, Any],
        tokenizer_metadata: Dict[str, Any],
    ):
        """Validate compatibility between components."""
        training_logger.info("Validating component compatibility")

        # Basic validation
        if not dataset_metadata.get("has_train_split"):
            raise TrainingException("Dataset must have a train split")

        # More compatibility checks can be added here

        training_logger.info("Compatibility validation passed")


# Global training pipeline
training_pipeline = TrainingPipeline()
