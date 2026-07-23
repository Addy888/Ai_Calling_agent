"""Trainer Runtime Management."""

from datetime import datetime
from typing import Any, Dict, Optional

from app.logger import training_logger
from app.trainer.interfaces import ITrainer
from app.training_executor.models import TrainingContext


class TrainerRuntime:
    """
    Manages trainer runtime state and lifecycle.
    
    Responsibilities:
    - Track runtime state
    - Manage training session
    - Monitor execution status
    - Coordinate graceful shutdown
    """

    def __init__(self, job_id: str):
        """
        Initialize runtime.
        
        Args:
            job_id: Training job ID
        """
        self.job_id = job_id
        self.logger = training_logger

        self._trainer: Optional[ITrainer] = None
        self._context: Optional[TrainingContext] = None
        self._state = "created"
        self._started_at: Optional[datetime] = None
        self._completed_at: Optional[datetime] = None
        self._error: Optional[str] = None

    async def initialize(
        self,
        trainer: ITrainer,
        context: TrainingContext,
    ) -> Dict[str, Any]:
        """
        Initialize runtime with trainer and context.
        
        Args:
            trainer: Trainer instance
            context: Training context
            
        Returns:
            Initialization result
        """
        self.logger.info(f"Initializing trainer runtime for job {self.job_id}")

        self._trainer = trainer
        self._context = context
        self._state = "initialized"

        # Initialize trainer
        result = await trainer.initialize(context)

        self.logger.info(f"Trainer runtime initialized for job {self.job_id}")

        return result

    async def start_training(self) -> Dict[str, Any]:
        """
        Start training execution.
        
        Returns:
            Training result
        """
        if self._trainer is None or self._context is None:
            raise RuntimeError("Runtime not initialized")

        self.logger.info(f"Starting training for job {self.job_id}")

        self._state = "training"
        self._started_at = datetime.utcnow()

        try:
            # Execute training
            result = await self._trainer.execute(self._context)

            self._completed_at = datetime.utcnow()
            self._state = "completed"

            self.logger.info(f"Training completed for job {self.job_id}")

            return result

        except Exception as e:
            self._state = "failed"
            self._error = str(e)
            self._completed_at = datetime.utcnow()

            self.logger.error(f"Training failed for job {self.job_id}: {str(e)}")

            raise

    async def shutdown(self) -> bool:
        """
        Shutdown runtime gracefully.
        
        Returns:
            True if shutdown successful
        """
        self.logger.info(f"Shutting down trainer runtime for job {self.job_id}")

        if self._trainer:
            await self._trainer.shutdown()

        self._state = "shutdown"

        self.logger.info(f"Trainer runtime shutdown for job {self.job_id}")

        return True

    def get_state(self) -> Dict[str, Any]:
        """
        Get runtime state.
        
        Returns:
            Runtime state information
        """
        state = {
            "job_id": self.job_id,
            "state": self._state,
            "started_at": self._started_at.isoformat() if self._started_at else None,
            "completed_at": self._completed_at.isoformat() if self._completed_at else None,
            "error": self._error,
        }

        if self._started_at and not self._completed_at:
            elapsed = (datetime.utcnow() - self._started_at).total_seconds()
            state["elapsed_seconds"] = elapsed

        if self._trainer:
            state["trainer_status"] = self._trainer.get_status()

        return state

    def is_running(self) -> bool:
        """Check if training is running."""
        return self._state == "training"

    def is_completed(self) -> bool:
        """Check if training is completed."""
        return self._state in ["completed", "failed"]


class TrainerRuntimeManager:
    """Manages multiple trainer runtimes."""

    def __init__(self):
        """Initialize runtime manager."""
        self.logger = training_logger
        self._runtimes: Dict[str, TrainerRuntime] = {}

    def create_runtime(self, job_id: str) -> TrainerRuntime:
        """
        Create trainer runtime.
        
        Args:
            job_id: Training job ID
            
        Returns:
            TrainerRuntime instance
        """
        self.logger.info(f"Creating trainer runtime for job {job_id}")

        runtime = TrainerRuntime(job_id)
        self._runtimes[job_id] = runtime

        return runtime

    def get_runtime(self, job_id: str) -> Optional[TrainerRuntime]:
        """
        Get trainer runtime.
        
        Args:
            job_id: Training job ID
            
        Returns:
            TrainerRuntime or None
        """
        return self._runtimes.get(job_id)

    async def shutdown_runtime(self, job_id: str) -> bool:
        """
        Shutdown runtime.
        
        Args:
            job_id: Training job ID
            
        Returns:
            True if shutdown successful
        """
        runtime = self._runtimes.get(job_id)

        if runtime:
            await runtime.shutdown()
            del self._runtimes[job_id]
            return True

        return False

    def get_all_runtimes(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all runtime states.
        
        Returns:
            Dict of runtime states
        """
        return {
            job_id: runtime.get_state()
            for job_id, runtime in self._runtimes.items()
        }


# Global runtime manager
trainer_runtime_manager = TrainerRuntimeManager()
