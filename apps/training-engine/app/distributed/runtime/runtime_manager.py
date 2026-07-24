"""Runtime manager for distributed training execution."""

import time
from typing import Dict, Optional, Any
from datetime import datetime

from app.logger import training_logger


class RuntimeManager:
    """
    Manages distributed training runtime.
    
    Tracks execution state, timing, and resource usage
    during distributed training.
    """

    def __init__(self):
        """Initialize runtime manager."""
        self.logger = training_logger
        self._runtime_stats: Dict[str, Any] = {}
        self._start_time: Optional[float] = None
        self._step_times: list = []
        self._is_running = False

    def start_training(self, job_id: str) -> None:
        """
        Start training runtime tracking.
        
        Args:
            job_id: Job identifier
        """
        self.logger.info(f"Starting runtime tracking for job: {job_id}")
        
        self._runtime_stats = {
            "job_id": job_id,
            "started_at": datetime.utcnow(),
            "total_steps": 0,
            "total_samples": 0,
            "total_tokens": 0,
        }
        
        self._start_time = time.time()
        self._is_running = True

    def record_step(
        self,
        step: int,
        batch_size: int,
        loss: Optional[float] = None,
        learning_rate: Optional[float] = None,
    ) -> None:
        """
        Record a training step.
        
        Args:
            step: Step number
            batch_size: Batch size
            loss: Loss value
            learning_rate: Learning rate
        """
        if not self._is_running:
            return
        
        step_time = time.time()
        
        self._runtime_stats["total_steps"] = step
        self._runtime_stats["total_samples"] += batch_size
        self._runtime_stats["last_step"] = step
        self._runtime_stats["last_loss"] = loss
        self._runtime_stats["last_lr"] = learning_rate
        
        self._step_times.append(step_time)

    def get_runtime_stats(self) -> Dict[str, Any]:
        """
        Get current runtime statistics.
        
        Returns:
            Dictionary with runtime stats
        """
        if not self._is_running:
            return {}
        
        elapsed_time = time.time() - self._start_time if self._start_time else 0
        
        # Calculate throughput
        samples_per_second = 0.0
        if elapsed_time > 0:
            samples_per_second = self._runtime_stats.get("total_samples", 0) / elapsed_time
        
        # Calculate average step time
        avg_step_time = 0.0
        if len(self._step_times) > 1:
            step_intervals = [
                self._step_times[i] - self._step_times[i-1]
                for i in range(1, len(self._step_times))
            ]
            avg_step_time = sum(step_intervals) / len(step_intervals) if step_intervals else 0
        
        return {
            **self._runtime_stats,
            "elapsed_time_seconds": elapsed_time,
            "samples_per_second": samples_per_second,
            "avg_step_time_seconds": avg_step_time,
            "is_running": self._is_running,
        }

    def get_throughput_metrics(self) -> Dict[str, float]:
        """
        Get throughput metrics.
        
        Returns:
            Dictionary with throughput metrics
        """
        stats = self.get_runtime_stats()
        
        return {
            "samples_per_second": stats.get("samples_per_second", 0.0),
            "steps_per_second": 1.0 / stats.get("avg_step_time_seconds", 1.0) if stats.get("avg_step_time_seconds", 0) > 0 else 0.0,
            "elapsed_time": stats.get("elapsed_time_seconds", 0.0),
        }

    def stop_training(self) -> Dict[str, Any]:
        """
        Stop training runtime tracking.
        
        Returns:
            Final runtime statistics
        """
        if not self._is_running:
            return {}
        
        self.logger.info("Stopping runtime tracking")
        
        final_stats = self.get_runtime_stats()
        final_stats["stopped_at"] = datetime.utcnow()
        
        self._is_running = False
        
        return final_stats

    def reset(self) -> None:
        """Reset runtime manager."""
        self._runtime_stats = {}
        self._start_time = None
        self._step_times = []
        self._is_running = False


# Global instance
runtime_manager = RuntimeManager()
