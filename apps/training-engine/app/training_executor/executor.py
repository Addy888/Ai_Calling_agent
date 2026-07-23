"""Enterprise Training Executor Core."""

import asyncio
from typing import List, Optional

from app.logger import training_logger
from app.training_executor.event_manager import event_manager
from app.training_executor.exceptions import TrainingException
from app.training_executor.factory import TrainingJobFactory
from app.training_executor.job_manager import job_manager
from app.training_executor.models import TrainingConfig, TrainingJob, TrainingStatus
from app.training_executor.pipeline import training_pipeline
from app.training_executor.runtime_manager import runtime_manager


class TrainingExecutor:
    """
    Enterprise Training Executor Core.
    
    Responsible for orchestration only - does not contain actual training logic.
    """

    def __init__(self):
        """Initialize training executor."""
        self._execution_tasks = {}
        self._lock = asyncio.Lock()
        training_logger.info("Training executor initialized")

    async def submit_job(
        self,
        model_id: str,
        dataset_id: str,
        config: TrainingConfig,
        tokenizer_id: Optional[str] = None,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs,
    ) -> TrainingJob:
        """Submit a training job."""
        training_logger.info(f"Submitting training job for model: {model_id}")

        try:
            # Create job
            job = TrainingJobFactory.create_job(
                model_id=model_id,
                dataset_id=dataset_id,
                config=config,
                tokenizer_id=tokenizer_id,
                company_id=company_id,
                user_id=user_id,
                project_id=project_id,
                **kwargs,
            )

            # Register job
            job = await job_manager.create_job(job)

            # Emit job created event
            event_manager.emit_job_created(
                job.job_id,
                {
                    "model_id": model_id,
                    "dataset_id": dataset_id,
                    "training_type": config.training_type.value,
                },
            )

            training_logger.info(f"Training job submitted: {job.job_id}")

            return job

        except Exception as e:
            training_logger.error(f"Failed to submit job: {str(e)}")
            raise TrainingException(f"Job submission failed: {str(e)}")

    async def start_training(self, job_id: str) -> TrainingJob:
        """Start training for a job."""
        training_logger.info(f"Starting training for job: {job_id}")

        try:
            # Get job
            job = await job_manager.get_job(job_id)

            # Check if already running
            if job.status == TrainingStatus.TRAINING:
                training_logger.warning(f"Job already running: {job_id}")
                return job

            # Update status to queued
            await job_manager.update_status(job_id, TrainingStatus.PENDING)
            event_manager.emit_job_queued(job_id)

            # Execute pipeline in background
            async with self._lock:
                task = asyncio.create_task(self._execute_job(job))
                self._execution_tasks[job_id] = task

            training_logger.info(f"Training started for job: {job_id}")

            return job

        except Exception as e:
            training_logger.error(f"Failed to start training: {str(e)}")
            raise TrainingException(f"Training start failed: {str(e)}")

    async def _execute_job(self, job: TrainingJob):
        """Execute training job in background."""
        training_logger.info(f"Executing training job: {job.job_id}")

        try:
            # Execute pipeline
            result_job = await training_pipeline.execute(job)

            training_logger.info(f"Training job executed: {job.job_id}")

            return result_job

        except Exception as e:
            training_logger.error(f"Training job execution failed: {str(e)}")

            # Update job status
            await job_manager.update_status(
                job.job_id, TrainingStatus.FAILED, error_message=str(e)
            )

        finally:
            # Remove from execution tasks
            async with self._lock:
                if job.job_id in self._execution_tasks:
                    del self._execution_tasks[job.job_id]

    async def pause_training(self, job_id: str) -> TrainingJob:
        """Pause training (limited support)."""
        training_logger.info(f"Pausing training: {job_id}")

        try:
            job = await job_manager.get_job(job_id)

            if job.status != TrainingStatus.TRAINING:
                training_logger.warning(
                    f"Cannot pause job in status: {job.status.value}"
                )
                return job

            # Pause is not fully implemented yet
            training_logger.warning("Pause functionality is limited")

            return job

        except Exception as e:
            training_logger.error(f"Failed to pause training: {str(e)}")
            raise TrainingException(f"Training pause failed: {str(e)}")

    async def resume_training(self, job_id: str) -> TrainingJob:
        """Resume paused training."""
        training_logger.info(f"Resuming training: {job_id}")

        try:
            job = await job_manager.get_job(job_id)

            if job.status != TrainingStatus.PAUSED:
                training_logger.warning(
                    f"Cannot resume job in status: {job.status.value}"
                )
                return job

            # Resume training
            return await self.start_training(job_id)

        except Exception as e:
            training_logger.error(f"Failed to resume training: {str(e)}")
            raise TrainingException(f"Training resume failed: {str(e)}")

    async def cancel_training(self, job_id: str) -> TrainingJob:
        """Cancel training job."""
        training_logger.info(f"Cancelling training: {job_id}")

        try:
            # Cancel job
            job = await job_manager.cancel_job(job_id)

            # Emit cancelled event
            event_manager.emit_training_cancelled(job_id)

            # Cancel execution task if running
            async with self._lock:
                if job_id in self._execution_tasks:
                    task = self._execution_tasks[job_id]
                    task.cancel()
                    del self._execution_tasks[job_id]

            # Cleanup runtime
            await runtime_manager.cleanup_runtime(job_id)

            training_logger.info(f"Training cancelled: {job_id}")

            return job

        except Exception as e:
            training_logger.error(f"Failed to cancel training: {str(e)}")
            raise TrainingException(f"Training cancellation failed: {str(e)}")

    async def get_job(self, job_id: str) -> TrainingJob:
        """Get training job."""
        return await job_manager.get_job(job_id)

    async def list_jobs(
        self,
        status: Optional[TrainingStatus] = None,
        company_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[TrainingJob]:
        """List training jobs."""
        return await job_manager.list_jobs(
            status=status, company_id=company_id, limit=limit
        )

    async def delete_job(self, job_id: str) -> bool:
        """Delete training job."""
        return await job_manager.delete_job(job_id)

    def get_executor_stats(self) -> dict:
        """Get executor statistics."""
        job_stats = job_manager.get_stats()
        active_runtimes = runtime_manager.get_active_runtimes()

        return {
            "jobs": job_stats,
            "active_runtimes": len(active_runtimes),
            "executing_tasks": len(self._execution_tasks),
        }


# Global training executor
training_executor = TrainingExecutor()
