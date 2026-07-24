"""Metrics collector for distributed training."""

import time
from typing import Dict, List, Optional
from datetime import datetime

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

from app.logger import training_logger
from app.distributed.schemas import DistributedMetrics


class MetricsCollector:
    """
    Collects metrics during distributed training.
    
    Tracks GPU usage, memory, communication overhead,
    and training performance metrics.
    """

    def __init__(self):
        """Initialize metrics collector."""
        self.logger = training_logger
        self._metrics_history: List[DistributedMetrics] = []
        self._current_job_id: Optional[str] = None

    def start_collection(self, job_id: str) -> None:
        """
        Start metrics collection.
        
        Args:
            job_id: Job identifier
        """
        self.logger.info(f"Starting metrics collection for job: {job_id}")
        self._current_job_id = job_id
        self._metrics_history = []

    def collect_metrics(
        self,
        job_id: str,
        global_step: int,
        rank: int,
        local_rank: int,
        loss: Optional[float] = None,
        learning_rate: float = 0.0,
        batch_size: int = 1,
        gradient_sync_time_ms: float = 0.0,
        communication_time_ms: float = 0.0,
    ) -> DistributedMetrics:
        """
        Collect metrics for current step.
        
        Args:
            job_id: Job identifier
            global_step: Global training step
            rank: Process rank
            local_rank: Local rank
            loss: Loss value
            learning_rate: Learning rate
            batch_size: Batch size
            gradient_sync_time_ms: Gradient sync time
            communication_time_ms: Communication time
            
        Returns:
            Collected metrics
        """
        # Get GPU metrics
        gpu_memory_used = None
        gpu_memory_total = None
        gpu_utilization = None
        
        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                gpu_memory_used = torch.cuda.memory_allocated(local_rank) / (1024 ** 2)  # MB
                gpu_memory_total = torch.cuda.get_device_properties(local_rank).total_memory / (1024 ** 2)
                
                # GPU utilization requires nvidia-ml-py3
                try:
                    import pynvml
                    pynvml.nvmlInit()
                    handle = pynvml.nvmlDeviceGetHandleByIndex(local_rank)
                    utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    gpu_utilization = float(utilization.gpu)
                except:
                    pass
            except:
                pass
        
        # Calculate throughput
        samples_per_second = batch_size / (gradient_sync_time_ms / 1000.0) if gradient_sync_time_ms > 0 else 0.0
        
        # Create metrics object
        metrics = DistributedMetrics(
            job_id=job_id,
            global_step=global_step,
            rank=rank,
            local_rank=local_rank,
            loss=loss,
            learning_rate=learning_rate,
            gradient_sync_time_ms=gradient_sync_time_ms,
            communication_time_ms=communication_time_ms,
            gpu_memory_used_mb=gpu_memory_used,
            gpu_memory_total_mb=gpu_memory_total,
            gpu_utilization_percent=gpu_utilization,
            samples_per_second=samples_per_second,
        )
        
        # Store in history
        self._metrics_history.append(metrics)
        
        return metrics

    def get_average_metrics(
        self,
        last_n_steps: Optional[int] = None,
    ) -> Dict:
        """
        Get average metrics over recent steps.
        
        Args:
            last_n_steps: Number of recent steps to average
            
        Returns:
            Dictionary with averaged metrics
        """
        if not self._metrics_history:
            return {}
        
        # Get recent metrics
        recent_metrics = self._metrics_history
        if last_n_steps:
            recent_metrics = self._metrics_history[-last_n_steps:]
        
        # Calculate averages
        avg_loss = None
        losses = [m.loss for m in recent_metrics if m.loss is not None]
        if losses:
            avg_loss = sum(losses) / len(losses)
        
        avg_sync_time = sum(m.gradient_sync_time_ms for m in recent_metrics) / len(recent_metrics)
        avg_comm_time = sum(m.communication_time_ms for m in recent_metrics) / len(recent_metrics)
        
        avg_gpu_memory = None
        gpu_memories = [m.gpu_memory_used_mb for m in recent_metrics if m.gpu_memory_used_mb is not None]
        if gpu_memories:
            avg_gpu_memory = sum(gpu_memories) / len(gpu_memories)
        
        avg_gpu_util = None
        gpu_utils = [m.gpu_utilization_percent for m in recent_metrics if m.gpu_utilization_percent is not None]
        if gpu_utils:
            avg_gpu_util = sum(gpu_utils) / len(gpu_utils)
        
        avg_throughput = sum(m.samples_per_second for m in recent_metrics) / len(recent_metrics)
        
        return {
            "avg_loss": avg_loss,
            "avg_gradient_sync_time_ms": avg_sync_time,
            "avg_communication_time_ms": avg_comm_time,
            "avg_gpu_memory_used_mb": avg_gpu_memory,
            "avg_gpu_utilization_percent": avg_gpu_util,
            "avg_samples_per_second": avg_throughput,
            "num_samples": len(recent_metrics),
        }

    def get_metrics_history(
        self,
        last_n_steps: Optional[int] = None,
    ) -> List[Dict]:
        """
        Get metrics history.
        
        Args:
            last_n_steps: Number of recent steps
            
        Returns:
            List of metrics dictionaries
        """
        history = self._metrics_history
        if last_n_steps:
            history = history[-last_n_steps:]
        
        return [m.model_dump() for m in history]

    def get_communication_overhead(self) -> Dict:
        """
        Get communication overhead statistics.
        
        Returns:
            Dictionary with communication overhead info
        """
        if not self._metrics_history:
            return {}
        
        recent = self._metrics_history[-100:]  # Last 100 steps
        
        total_sync_time = sum(m.gradient_sync_time_ms for m in recent)
        total_comm_time = sum(m.communication_time_ms for m in recent)
        
        return {
            "total_gradient_sync_ms": total_sync_time,
            "total_communication_ms": total_comm_time,
            "avg_gradient_sync_ms": total_sync_time / len(recent),
            "avg_communication_ms": total_comm_time / len(recent),
            "samples": len(recent),
        }

    def export_metrics(self, output_file: str) -> None:
        """
        Export metrics to file.
        
        Args:
            output_file: Output file path
        """
        try:
            import json
            
            metrics_data = {
                "job_id": self._current_job_id,
                "exported_at": datetime.utcnow().isoformat(),
                "metrics": self.get_metrics_history(),
            }
            
            with open(output_file, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            
            self.logger.info(f"Metrics exported to {output_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to export metrics: {e}")

    def reset(self) -> None:
        """Reset metrics collector."""
        self._metrics_history = []
        self._current_job_id = None


# Global instance
metrics_collector = MetricsCollector()
