"""Training runtime manager (orchestration only)."""

import asyncio
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.logger import training_logger
from app.training_executor.exceptions import RuntimeException
from app.training_executor.models import TrainingContext, TrainingJob, TrainingStatus


class RuntimeManager:
    """Manage training runtime environment (orchestration only)."""

    def __init__(self):
        """Initialize runtime manager."""
        self._runtimes: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        training_logger.info("Runtime manager initialized")

    async def initialize_runtime(
        self, job: TrainingJob
    ) -> Dict[str, Any]:
        """Initialize runtime environment for training job."""
        training_logger.info(f"Initializing runtime for job: {job.job_id}")

        try:
            async with self._lock:
                # Create output directories
                base_output_dir = Path(settings.DATA_DIR) / "training_output"
                job_output_dir = base_output_dir / job.job_id
                job_output_dir.mkdir(parents=True, exist_ok=True)

                # Create checkpoint directory
                checkpoint_dir = Path(settings.DATA_DIR) / "checkpoints" / job.job_id
                checkpoint_dir.mkdir(parents=True, exist_ok=True)

                # Create temp directory
                temp_dir = Path(settings.DATA_DIR) / "temp" / job.job_id
                temp_dir.mkdir(parents=True, exist_ok=True)

                # Create runtime info
                runtime_info = {
                    "job_id": job.job_id,
                    "status": TrainingStatus.INITIALIZING,
                    "process_id": os.getpid(),
                    "device": job.config.device,
                    "output_dir": str(job_output_dir),
                    "checkpoint_dir": str(checkpoint_dir),
                    "temp_dir": str(temp_dir),
                    "initialized_at": datetime.utcnow().isoformat(),
                }

                # Store runtime
                self._runtimes[job.job_id] = runtime_info

                training_logger.info(
                    f"Runtime initialized",
                    job_id=job.job_id,
                    output_dir=str(job_output_dir),
                )

                return runtime_info

        except Exception as e:
            training_logger.error(f"Failed to initialize runtime: {str(e)}")
            raise RuntimeException(f"Runtime initialization failed: {str(e)}")

    async def get_runtime(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get runtime information."""
        async with self._lock:
            return self._runtimes.get(job_id)

    async def update_runtime(
        self, job_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update runtime information."""
        async with self._lock:
            if job_id not in self._runtimes:
                return None

            runtime = self._runtimes[job_id]
            runtime.update(updates)
            runtime["updated_at"] = datetime.utcnow().isoformat()

            return runtime

    async def cleanup_runtime(self, job_id: str) -> bool:
        """Cleanup runtime resources."""
        training_logger.info(f"Cleaning up runtime for job: {job_id}")

        try:
            async with self._lock:
                if job_id not in self._runtimes:
                    return False

                runtime = self._runtimes[job_id]

                # Clean temp directory
                temp_dir = runtime.get("temp_dir")
                if temp_dir and Path(temp_dir).exists():
                    try:
                        shutil.rmtree(temp_dir)
                        training_logger.info(f"Temp directory cleaned: {temp_dir}")
                    except Exception as e:
                        training_logger.warning(
                            f"Failed to clean temp directory: {str(e)}"
                        )

                # Remove runtime info
                del self._runtimes[job_id]

                training_logger.info(f"Runtime cleaned up for job: {job_id}")

                return True

        except Exception as e:
            training_logger.error(f"Failed to cleanup runtime: {str(e)}")
            return False

    def get_active_runtimes(self) -> list[str]:
        """Get list of active runtime IDs."""
        return list(self._runtimes.keys())

    async def create_training_context(
        self,
        job: TrainingJob,
        dataset_metadata: Dict[str, Any],
        tokenizer_metadata: Dict[str, Any],
        model_metadata: Dict[str, Any],
    ) -> TrainingContext:
        """Create training context from job and metadata."""
        training_logger.info(f"Creating training context for job: {job.job_id}")

        # Get or initialize runtime
        runtime_info = await self.get_runtime(job.job_id)
        if not runtime_info:
            runtime_info = await self.initialize_runtime(job)

        # Create training context
        context = TrainingContext(
            job_id=job.job_id,
            job=job,
            dataset_metadata=dataset_metadata,
            tokenizer_metadata=tokenizer_metadata,
            model_metadata=model_metadata,
            runtime_info=runtime_info,
            device=job.config.device,
            output_dir=runtime_info.get("output_dir"),
            checkpoint_dir=runtime_info.get("checkpoint_dir"),
            temp_dir=runtime_info.get("temp_dir"),
            is_prepared=False,
            is_validated=False,
        )

        training_logger.info(f"Training context created for job: {job.job_id}")

        return context


# Global runtime manager
runtime_manager = RuntimeManager()
