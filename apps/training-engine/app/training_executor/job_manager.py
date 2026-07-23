"""Training job manager."""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from app.logger import training_logger
from app.training_executor.exceptions import TrainingJobNotFoundException
from app.training_executor.models import TrainingJob, TrainingStatus


class JobManager:
    """Manage training jobs lifecycle."""

    def __init__(self):
        """Initialize job manager."""
        self._jobs: Dict[str, TrainingJob] = {}
        self._lock = asyncio.Lock()
        training_logger.info("Job manager initialized")

    async def create_job(self, job: TrainingJob) -> TrainingJob:
        """Create and register a new training job."""
        training_logger.info(f"Creating training job: {job.job_id}")

        async with self._lock:
            if job.job_id in self._jobs:
                training_logger.warning(f"Job already exists: {job.job_id}")
                return self._jobs[job.job_id]

            job.status = TrainingStatus.PENDING
            job.created_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()

            self._jobs[job.job_id] = job

            training_logger.info(f"Job created: {job.job_id}", job_id=job.job_id)

            return job

    async def get_job(self, job_id: str) -> TrainingJob:
        """Get training job by ID."""
        async with self._lock:
            if job_id not in self._jobs:
                raise TrainingJobNotFoundException(job_id)

            return self._jobs[job_id]

    async def update_job(self, job: TrainingJob) -> TrainingJob:
        """Update training job."""
        async with self._lock:
            if job.job_id not in self._jobs:
                raise TrainingJobNotFoundException(job.job_id)

            job.updated_at = datetime.utcnow()
            self._jobs[job.job_id] = job

            training_logger.debug(f"Job updated: {job.job_id}", job_id=job.job_id)

            return job

    async def update_status(
        self, job_id: str, status: TrainingStatus, error_message: Optional[str] = None
    ) -> TrainingJob:
        """Update job status."""
        training_logger.info(f"Updating job status: {job_id} -> {status.value}")

        async with self._lock:
            if job_id not in self._jobs:
                raise TrainingJobNotFoundException(job_id)

            job = self._jobs[job_id]
            old_status = job.status
            job.status = status
            job.updated_at = datetime.utcnow()

            # Update timing based on status
            if status == TrainingStatus.TRAINING and not job.started_at:
                job.started_at = datetime.utcnow()
            elif status in [
                TrainingStatus.COMPLETED,
                TrainingStatus.FAILED,
                TrainingStatus.STOPPED,
            ]:
                job.completed_at = datetime.utcnow()
            elif status == TrainingStatus.PAUSED:
                job.paused_at = datetime.utcnow()

            # Set error message if provided
            if error_message:
                job.error_message = error_message

            training_logger.info(
                f"Job status updated: {old_status.value} -> {status.value}",
                job_id=job_id,
            )

            return job

    async def list_jobs(
        self,
        status: Optional[TrainingStatus] = None,
        company_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[TrainingJob]:
        """List training jobs with optional filters."""
        async with self._lock:
            jobs = list(self._jobs.values())

            # Apply filters
            if status:
                jobs = [j for j in jobs if j.status == status]

            if company_id:
                jobs = [j for j in jobs if j.company_id == company_id]

            # Sort by created_at descending
            jobs.sort(key=lambda j: j.created_at, reverse=True)

            # Apply limit
            jobs = jobs[:limit]

            return jobs

    async def delete_job(self, job_id: str) -> bool:
        """Delete training job."""
        training_logger.info(f"Deleting job: {job_id}")

        async with self._lock:
            if job_id not in self._jobs:
                return False

            # Don't allow deletion of running jobs
            job = self._jobs[job_id]
            if job.status == TrainingStatus.TRAINING:
                training_logger.warning(
                    f"Cannot delete running job: {job_id}", job_id=job_id
                )
                return False

            del self._jobs[job_id]

            training_logger.info(f"Job deleted: {job_id}")

            return True

    async def cancel_job(self, job_id: str) -> TrainingJob:
        """Cancel training job."""
        training_logger.info(f"Cancelling job: {job_id}")

        async with self._lock:
            if job_id not in self._jobs:
                raise TrainingJobNotFoundException(job_id)

            job = self._jobs[job_id]

            # Only allow cancelling pending or paused jobs
            if job.status not in [TrainingStatus.PENDING, TrainingStatus.PAUSED]:
                training_logger.warning(
                    f"Cannot cancel job in status: {job.status.value}",
                    job_id=job_id,
                )
                return job

            job.status = TrainingStatus.STOPPED
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()

            training_logger.info(f"Job cancelled: {job_id}")

            return job

    def get_active_job_ids(self) -> List[str]:
        """Get list of active job IDs."""
        return [
            job_id
            for job_id, job in self._jobs.items()
            if job.status
            in [
                TrainingStatus.INITIALIZING,
                TrainingStatus.PREPARING,
                TrainingStatus.TRAINING,
            ]
        ]

    def get_stats(self) -> Dict[str, int]:
        """Get job statistics."""
        stats = {
            "total": len(self._jobs),
            "pending": 0,
            "training": 0,
            "completed": 0,
            "failed": 0,
            "paused": 0,
            "stopped": 0,
        }

        for job in self._jobs.values():
            if job.status == TrainingStatus.PENDING:
                stats["pending"] += 1
            elif job.status == TrainingStatus.TRAINING:
                stats["training"] += 1
            elif job.status == TrainingStatus.COMPLETED:
                stats["completed"] += 1
            elif job.status == TrainingStatus.FAILED:
                stats["failed"] += 1
            elif job.status == TrainingStatus.PAUSED:
                stats["paused"] += 1
            elif job.status == TrainingStatus.STOPPED:
                stats["stopped"] += 1

        return stats


# Global job manager
job_manager = JobManager()
