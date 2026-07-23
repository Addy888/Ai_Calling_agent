"""Trainer Health Monitoring."""

from datetime import datetime
from typing import Any, Dict

from app.logger import training_logger
from app.trainer.trainer_runtime import trainer_runtime_manager


class TrainerHealthChecker:
    """Health checker for trainer service."""

    def __init__(self):
        """Initialize health checker."""
        self.logger = training_logger

    async def check_health(self) -> Dict[str, Any]:
        """
        Check trainer service health.
        
        Returns:
            Health status
        """
        try:
            # Get all runtimes
            runtimes = trainer_runtime_manager.get_all_runtimes()

            # Count active and completed trainers
            active_count = sum(
                1 for r in runtimes.values() if r["state"] == "training"
            )

            completed_count = sum(
                1 for r in runtimes.values() if r["state"] in ["completed", "failed"]
            )

            total_count = len(runtimes)

            # Determine health status
            healthy = True
            status = "healthy"

            # Check for issues
            issues = []

            # Check for failed trainers
            failed_count = sum(
                1 for r in runtimes.values() if r["state"] == "failed"
            )

            if failed_count > 0:
                issues.append(f"{failed_count} failed trainers")

            health = {
                "status": status,
                "healthy": healthy,
                "active_trainers": active_count,
                "completed_trainers": completed_count,
                "failed_trainers": failed_count,
                "total_trainers": total_count,
                "issues": issues,
                "timestamp": datetime.utcnow().isoformat(),
            }

            return health

        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")

            return {
                "status": "unhealthy",
                "healthy": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def get_runtime_stats(self) -> Dict[str, Any]:
        """
        Get runtime statistics.
        
        Returns:
            Runtime statistics
        """
        try:
            runtimes = trainer_runtime_manager.get_all_runtimes()

            stats = {
                "total_runtimes": len(runtimes),
                "states": {},
                "runtimes": runtimes,
            }

            # Count by state
            for runtime in runtimes.values():
                state = runtime["state"]
                stats["states"][state] = stats["states"].get(state, 0) + 1

            return stats

        except Exception as e:
            self.logger.error(f"Failed to get runtime stats: {str(e)}")

            return {
                "error": str(e),
            }


# Global health checker
trainer_health_checker = TrainerHealthChecker()
