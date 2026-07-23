"""HuggingFace Trainer Wrapper - Production wrapper around HF Trainer."""

import asyncio
import traceback
from datetime import datetime
from typing import Any, Dict, Optional

from transformers import Trainer

from app.events import event_bus
from app.logger import training_logger
from app.trainer.exceptions import TrainerException, TrainerInitializationException
from app.trainer.trainer_builder import trainer_builder
from app.training_executor.models import TrainingContext, TrainingStatus


class HFTrainerWrapper:
    """
    Production wrapper around HuggingFace Trainer.
    
    Provides:
    - Async/sync bridge
    - Event emission
    - Error handling
    - Status tracking
    - Graceful shutdown
    """

    def __init__(self):
        """Initialize wrapper."""
        self.logger = training_logger
        self._trainer: Optional[Trainer] = None
        self._context: Optional[TrainingContext] = None
        self._status = "uninitialized"
        self._started_at: Optional[datetime] = None
        self._completed_at: Optional[datetime] = None

    async def initialize(self, context: TrainingContext) -> Dict[str, Any]:
        """
        Initialize trainer with context.
        
        Args:
            context: Training context
            
        Returns:
            Initialization result
            
        Raises:
            TrainerInitializationException: If initialization fails
        """
        try:
            job_id = context.job_id

            self.logger.info(f"Initializing HFTrainerWrapper for job {job_id}")

            self._context = context
            self._status = "initializing"

            # Emit initialization started event
            event_bus.emit(
                "trainer_initializing",
                {
                    "job_id": job_id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            # Build trainer (run in executor to avoid blocking)
            loop = asyncio.get_event_loop()
            self._trainer = await loop.run_in_executor(
                None, trainer_builder.build, context
            )

            self._status = "initialized"

            # Emit initialization completed event
            event_bus.emit(
                "trainer_initialized",
                {
                    "job_id": job_id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            self.logger.info(f"HFTrainerWrapper initialized for job {job_id}")

            return {
                "status": "initialized",
                "job_id": job_id,
                "trainer_type": "HuggingFaceTrainer",
            }

        except Exception as e:
            self.logger.error(f"Trainer initialization failed: {str(e)}")
            self.logger.error(traceback.format_exc())

            self._status = "failed"

            # Emit initialization failed event
            event_bus.emit(
                "trainer_initialization_failed",
                {
                    "job_id": context.job_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            raise TrainerInitializationException(
                f"Trainer initialization failed: {str(e)}"
            )

    async def execute(self, context: TrainingContext) -> Dict[str, Any]:
        """
        Execute training.
        
        Args:
            context: Training context
            
        Returns:
            Training results
            
        Raises:
            TrainerException: If training fails
        """
        try:
            job_id = context.job_id

            self.logger.info(f"Starting training execution for job {job_id}")

            # Initialize if not already done
            if self._trainer is None:
                await self.initialize(context)

            self._status = "training"
            self._started_at = datetime.utcnow()

            # Emit training started event
            event_bus.emit(
                "trainer_execution_started",
                {
                    "job_id": job_id,
                    "timestamp": self._started_at.isoformat(),
                },
            )

            # Execute training (run in executor to avoid blocking)
            loop = asyncio.get_event_loop()
            train_result = await loop.run_in_executor(
                None, self._train_sync
            )

            self._completed_at = datetime.utcnow()
            self._status = "completed"

            # Calculate duration
            duration = (self._completed_at - self._started_at).total_seconds()

            # Emit training completed event
            event_bus.emit(
                "trainer_execution_completed",
                {
                    "job_id": job_id,
                    "duration_seconds": duration,
                    "timestamp": self._completed_at.isoformat(),
                },
            )

            self.logger.info(
                f"Training execution completed for job {job_id}",
                duration_seconds=duration,
            )

            # Build result
            result = {
                "status": "completed",
                "job_id": job_id,
                "duration_seconds": duration,
                "metrics": train_result.metrics if train_result else {},
                "model_path": context.output_dir,
            }

            return result

        except Exception as e:
            self.logger.error(f"Training execution failed: {str(e)}")
            self.logger.error(traceback.format_exc())

            self._status = "failed"

            # Emit training failed event
            event_bus.emit(
                "trainer_execution_failed",
                {
                    "job_id": context.job_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            raise TrainerException(f"Training execution failed: {str(e)}")

    def _train_sync(self):
        """Synchronous training execution."""
        if self._trainer is None:
            raise TrainerException("Trainer not initialized")

        self.logger.info("Executing HuggingFace Trainer.train()")

        # Call HuggingFace Trainer.train()
        train_result = self._trainer.train()

        self.logger.info("HuggingFace Trainer.train() completed")

        # Save final model
        if self._context:
            self.logger.info("Saving final model...")
            self._trainer.save_model(self._context.output_dir)
            self.logger.info(f"Model saved to {self._context.output_dir}")

        return train_result

    async def shutdown(self) -> bool:
        """
        Shutdown trainer gracefully.
        
        Returns:
            True if shutdown successful
        """
        try:
            job_id = self._context.job_id if self._context else "unknown"

            self.logger.info(f"Shutting down trainer for job {job_id}")

            # Emit shutdown event
            event_bus.emit(
                "trainer_shutdown",
                {
                    "job_id": job_id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            # Cleanup trainer
            if self._trainer is not None:
                # HuggingFace Trainer doesn't have explicit cleanup
                # Just clear the reference
                self._trainer = None

            self._status = "shutdown"

            self.logger.info(f"Trainer shutdown completed for job {job_id}")

            return True

        except Exception as e:
            self.logger.error(f"Trainer shutdown failed: {str(e)}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        Get trainer status.
        
        Returns:
            Status information
        """
        status = {
            "status": self._status,
            "trainer_initialized": self._trainer is not None,
            "started_at": self._started_at.isoformat() if self._started_at else None,
            "completed_at": self._completed_at.isoformat() if self._completed_at else None,
        }

        if self._started_at and self._status == "training":
            elapsed = (datetime.utcnow() - self._started_at).total_seconds()
            status["elapsed_seconds"] = elapsed

        return status


def create_hf_trainer() -> HFTrainerWrapper:
    """
    Create HFTrainerWrapper instance.
    
    Returns:
        HFTrainerWrapper instance
    """
    return HFTrainerWrapper()
