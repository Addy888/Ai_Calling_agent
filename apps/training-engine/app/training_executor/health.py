"""Training executor health monitoring."""

from datetime import datetime
from typing import Any, Dict

from app.logger import training_logger
from app.training_executor.job_manager import job_manager
from app.training_executor.runtime_manager import runtime_manager


class HealthChecker:
    """Health checker for training executor."""

    def __init__(self):
        """Initialize health checker."""
        training_logger.info("Health checker initialized")

    async def check_health(self) -> Dict[str, Any]:
        """Check overall health of training executor."""
        training_logger.debug("Checking training executor health")

        try:
            # Get job statistics
            job_stats = job_manager.get_stats()

            # Get active runtimes
            active_runtimes = runtime_manager.get_active_runtimes()

            # Determine health status
            healthy = True
            issues = []

            # Check for stuck jobs (could add time-based logic here)
            if job_stats["training"] > 10:
                issues.append("High number of active training jobs")

            if job_stats["failed"] > job_stats["completed"]:
                issues.append("More failed jobs than completed")

            health_status = {
                "healthy": healthy and len(issues) == 0,
                "status": "healthy" if healthy and len(issues) == 0 else "degraded",
                "timestamp": datetime.utcnow().isoformat(),
                "components": {
                    "job_manager": {
                        "healthy": True,
                        "stats": job_stats,
                    },
                    "runtime_manager": {
                        "healthy": True,
                        "active_runtimes": len(active_runtimes),
                    },
                },
                "issues": issues,
            }

            return health_status

        except Exception as e:
            training_logger.error(f"Health check failed: {str(e)}")
            return {
                "healthy": False,
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def check_runtime_health(self, job_id: str) -> Dict[str, Any]:
        """Check health of specific training runtime."""
        training_logger.debug(f"Checking runtime health for job: {job_id}")

        try:
            runtime = await runtime_manager.get_runtime(job_id)

            if not runtime:
                return {
                    "healthy": False,
                    "status": "not_found",
                    "message": f"Runtime not found for job: {job_id}",
                }

            return {
                "healthy": True,
                "status": "active",
                "runtime": runtime,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            training_logger.error(f"Runtime health check failed: {str(e)}")
            return {
                "healthy": False,
                "status": "error",
                "error": str(e),
            }


# Global health checker
health_checker = HealthChecker()
