"""Fault tolerance for distributed training."""

from typing import Callable, Dict, List, Optional, Any
from datetime import datetime

from app.logger import training_logger
from app.distributed.exceptions import WorkerFailureError


class FaultTolerance:
    """
    Fault tolerance manager for distributed training.
    
    Handles worker failures, recovery strategies,
    and graceful degradation.
    """

    def __init__(self):
        """Initialize fault tolerance manager."""
        self.logger = training_logger
        self._recovery_hooks: Dict[str, Callable] = {}
        self._failure_history: List[Dict] = []
        self._max_retries = 3
        self._enable_auto_recovery = True

    def register_recovery_hook(
        self,
        hook_name: str,
        hook_fn: Callable,
    ) -> None:
        """
        Register a recovery hook.
        
        Args:
            hook_name: Name of the hook
            hook_fn: Recovery function
        """
        self._recovery_hooks[hook_name] = hook_fn
        self.logger.info(f"Recovery hook registered: {hook_name}")

    def unregister_recovery_hook(self, hook_name: str) -> None:
        """
        Unregister a recovery hook.
        
        Args:
            hook_name: Name of the hook
        """
        if hook_name in self._recovery_hooks:
            del self._recovery_hooks[hook_name]
            self.logger.info(f"Recovery hook unregistered: {hook_name}")

    def handle_worker_failure(
        self,
        worker_rank: int,
        error: Exception,
        context: Optional[Dict] = None,
    ) -> bool:
        """
        Handle worker failure.
        
        Args:
            worker_rank: Failed worker rank
            error: Error that caused failure
            context: Additional context
            
        Returns:
            True if recovery was successful
        """
        self.logger.error(
            f"Worker {worker_rank} failed: {error}"
        )
        
        # Record failure
        failure_record = {
            "worker_rank": worker_rank,
            "error": str(error),
            "timestamp": datetime.utcnow(),
            "context": context or {},
        }
        self._failure_history.append(failure_record)
        
        # Attempt recovery if enabled
        if self._enable_auto_recovery:
            return self._attempt_recovery(worker_rank, error, context)
        
        return False

    def _attempt_recovery(
        self,
        worker_rank: int,
        error: Exception,
        context: Optional[Dict],
    ) -> bool:
        """
        Attempt to recover from worker failure.
        
        Args:
            worker_rank: Failed worker rank
            error: Error that caused failure
            context: Additional context
            
        Returns:
            True if recovery successful
        """
        self.logger.info(f"Attempting recovery for worker {worker_rank}")
        
        # Execute recovery hooks
        for hook_name, hook_fn in self._recovery_hooks.items():
            try:
                self.logger.info(f"Executing recovery hook: {hook_name}")
                hook_fn(worker_rank, error, context)
            except Exception as e:
                self.logger.error(f"Recovery hook {hook_name} failed: {e}")
        
        # For now, return False - actual recovery would need to restart the worker
        return False

    def can_continue_training(
        self,
        failed_workers: List[int],
        total_workers: int,
        min_workers_threshold: float = 0.5,
    ) -> bool:
        """
        Check if training can continue with failed workers.
        
        Args:
            failed_workers: List of failed worker ranks
            total_workers: Total number of workers
            min_workers_threshold: Minimum fraction of workers needed
            
        Returns:
            True if training can continue
        """
        if total_workers == 0:
            return False
        
        active_workers = total_workers - len(failed_workers)
        active_fraction = active_workers / total_workers
        
        can_continue = active_fraction >= min_workers_threshold
        
        if not can_continue:
            self.logger.warning(
                f"Cannot continue training: "
                f"{active_workers}/{total_workers} workers active "
                f"(threshold: {min_workers_threshold * 100}%)"
            )
        
        return can_continue

    def get_failure_statistics(self) -> Dict:
        """
        Get failure statistics.
        
        Returns:
            Dictionary with failure stats
        """
        if not self._failure_history:
            return {
                "total_failures": 0,
                "unique_workers": 0,
                "most_recent_failure": None,
            }
        
        total_failures = len(self._failure_history)
        unique_workers = len(set(f["worker_rank"] for f in self._failure_history))
        most_recent = self._failure_history[-1]
        
        return {
            "total_failures": total_failures,
            "unique_workers": unique_workers,
            "most_recent_failure": {
                "worker_rank": most_recent["worker_rank"],
                "error": most_recent["error"],
                "timestamp": most_recent["timestamp"].isoformat(),
            },
        }

    def enable_auto_recovery(self, enable: bool = True) -> None:
        """
        Enable or disable auto-recovery.
        
        Args:
            enable: Whether to enable auto-recovery
        """
        self._enable_auto_recovery = enable
        self.logger.info(f"Auto-recovery {'enabled' if enable else 'disabled'}")

    def set_max_retries(self, max_retries: int) -> None:
        """
        Set maximum retry attempts.
        
        Args:
            max_retries: Maximum number of retries
        """
        self._max_retries = max_retries
        self.logger.info(f"Max retries set to {max_retries}")

    def graceful_shutdown(
        self,
        workers: List[int],
        timeout_seconds: int = 30,
    ) -> bool:
        """
        Perform graceful shutdown of workers.
        
        Args:
            workers: List of worker ranks to shutdown
            timeout_seconds: Timeout for shutdown
            
        Returns:
            True if shutdown was successful
        """
        self.logger.info(f"Gracefully shutting down {len(workers)} workers")
        
        try:
            # Execute shutdown hooks
            for hook_name in ["pre_shutdown", "shutdown", "post_shutdown"]:
                if hook_name in self._recovery_hooks:
                    self._recovery_hooks[hook_name](workers, timeout_seconds)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Graceful shutdown failed: {e}")
            return False

    def reset_failure_history(self) -> None:
        """Reset failure history."""
        self._failure_history.clear()
        self.logger.info("Failure history reset")

    def cleanup(self) -> None:
        """Cleanup fault tolerance resources."""
        self.logger.info("Cleaning up fault tolerance manager")
        self._recovery_hooks.clear()
        self._failure_history.clear()


# Global instance
fault_tolerance = FaultTolerance()
