"""Metrics storage for runtime memory and persistence."""

import json
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.logger import training_logger
from app.metrics.schemas import (
    MetricSnapshot,
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
)
from app.metrics.exceptions import MetricsStorageError


class MetricsStorage:
    """
    Stores metrics in memory with optional persistence to disk.
    """

    def __init__(
        self,
        max_memory_size: int = 10000,
        persist_to_disk: bool = True,
        storage_dir: str = "./metrics_storage",
    ):
        """
        Initialize metrics storage.
        
        Args:
            max_memory_size: Maximum metrics to keep in memory per job
            persist_to_disk: Whether to persist to disk
            storage_dir: Directory for persistent storage
        """
        self.logger = training_logger
        self.max_memory_size = max_memory_size
        self.persist_to_disk = persist_to_disk
        self.storage_dir = Path(storage_dir)
        
        if self.persist_to_disk:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory storage: job_id -> deque of MetricSnapshot
        self._metrics: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_memory_size)
        )
        
        # Separate storage for different metric types
        self._training_metrics: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_memory_size)
        )
        self._system_metrics: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_memory_size)
        )
        self._model_metrics: Dict[str, List] = defaultdict(list)
        self._performance_metrics: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_memory_size)
        )

    def store_snapshot(self, snapshot: MetricSnapshot) -> None:
        """
        Store a complete metric snapshot.
        
        Args:
            snapshot: MetricSnapshot to store
        """
        try:
            job_id = snapshot.job_id
            self._metrics[job_id].append(snapshot)
            
            # Store individual components
            if snapshot.training:
                self._training_metrics[job_id].append(snapshot.training)
            
            if snapshot.system:
                self._system_metrics[job_id].append(snapshot.system)
            
            if snapshot.model:
                # Model metrics typically don't change often
                if not self._model_metrics[job_id] or \
                   self._model_metrics[job_id][-1].total_parameters != snapshot.model.total_parameters:
                    self._model_metrics[job_id].append(snapshot.model)
            
            if snapshot.performance:
                self._performance_metrics[job_id].append(snapshot.performance)
            
            # Persist to disk if enabled
            if self.persist_to_disk:
                self._persist_snapshot(snapshot)
                
        except Exception as e:
            self.logger.error(f"Failed to store snapshot: {e}")
            raise MetricsStorageError(f"Failed to store snapshot: {e}")

    def store_training_metrics(self, metrics: TrainingMetrics) -> None:
        """Store training metrics."""
        job_id = metrics.job_id
        self._training_metrics[job_id].append(metrics)

    def store_system_metrics(self, metrics: SystemMetrics) -> None:
        """Store system metrics."""
        job_id = metrics.job_id
        self._system_metrics[job_id].append(metrics)

    def store_model_metrics(self, metrics: ModelMetrics) -> None:
        """Store model metrics."""
        job_id = metrics.job_id
        self._model_metrics[job_id].append(metrics)

    def store_performance_metrics(self, metrics: PerformanceMetrics) -> None:
        """Store performance metrics."""
        job_id = metrics.job_id
        self._performance_metrics[job_id].append(metrics)

    def get_snapshots(
        self,
        job_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: Optional[int] = None,
    ) -> List[MetricSnapshot]:
        """
        Retrieve metric snapshots for a job.
        
        Args:
            job_id: Job identifier
            start_time: Start time filter
            end_time: End time filter
            limit: Maximum number of snapshots to return
            
        Returns:
            List of MetricSnapshot objects
        """
        snapshots = list(self._metrics.get(job_id, []))
        
        # Apply time filters
        if start_time:
            snapshots = [s for s in snapshots if s.timestamp >= start_time]
        if end_time:
            snapshots = [s for s in snapshots if s.timestamp <= end_time]
        
        # Apply limit
        if limit:
            snapshots = snapshots[-limit:]
        
        return snapshots

    def get_training_metrics(
        self,
        job_id: str,
        limit: Optional[int] = None,
    ) -> List[TrainingMetrics]:
        """Get training metrics for a job."""
        metrics = list(self._training_metrics.get(job_id, []))
        if limit:
            metrics = metrics[-limit:]
        return metrics

    def get_system_metrics(
        self,
        job_id: str,
        limit: Optional[int] = None,
    ) -> List[SystemMetrics]:
        """Get system metrics for a job."""
        metrics = list(self._system_metrics.get(job_id, []))
        if limit:
            metrics = metrics[-limit:]
        return metrics

    def get_model_metrics(self, job_id: str) -> List[ModelMetrics]:
        """Get model metrics for a job."""
        return self._model_metrics.get(job_id, [])

    def get_performance_metrics(
        self,
        job_id: str,
        limit: Optional[int] = None,
    ) -> List[PerformanceMetrics]:
        """Get performance metrics for a job."""
        metrics = list(self._performance_metrics.get(job_id, []))
        if limit:
            metrics = metrics[-limit:]
        return metrics

    def get_latest_snapshot(self, job_id: str) -> Optional[MetricSnapshot]:
        """Get the latest snapshot for a job."""
        snapshots = self._metrics.get(job_id)
        return snapshots[-1] if snapshots else None

    def get_latest_training_metrics(self, job_id: str) -> Optional[TrainingMetrics]:
        """Get the latest training metrics for a job."""
        metrics = self._training_metrics.get(job_id)
        return metrics[-1] if metrics else None

    def get_latest_system_metrics(self, job_id: str) -> Optional[SystemMetrics]:
        """Get the latest system metrics for a job."""
        metrics = self._system_metrics.get(job_id)
        return metrics[-1] if metrics else None

    def clear_job_metrics(self, job_id: str) -> None:
        """Clear all metrics for a job."""
        if job_id in self._metrics:
            del self._metrics[job_id]
        if job_id in self._training_metrics:
            del self._training_metrics[job_id]
        if job_id in self._system_metrics:
            del self._system_metrics[job_id]
        if job_id in self._model_metrics:
            del self._model_metrics[job_id]
        if job_id in self._performance_metrics:
            del self._performance_metrics[job_id]

    def get_storage_stats(self) -> Dict:
        """Get storage statistics."""
        return {
            "jobs": len(self._metrics),
            "total_snapshots": sum(len(q) for q in self._metrics.values()),
            "total_training_metrics": sum(len(q) for q in self._training_metrics.values()),
            "total_system_metrics": sum(len(q) for q in self._system_metrics.values()),
            "total_model_metrics": sum(len(l) for l in self._model_metrics.values()),
            "total_performance_metrics": sum(len(q) for q in self._performance_metrics.values()),
        }

    def export_to_json(self, job_id: str, output_path: Path) -> None:
        """
        Export metrics to JSON file.
        
        Args:
            job_id: Job identifier
            output_path: Output file path
        """
        try:
            snapshots = self.get_snapshots(job_id)
            
            data = {
                "job_id": job_id,
                "export_time": datetime.utcnow().isoformat(),
                "total_snapshots": len(snapshots),
                "snapshots": [
                    json.loads(s.model_dump_json()) for s in snapshots
                ],
            }
            
            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            self.logger.info(f"Exported metrics to {output_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to export metrics: {e}")
            raise MetricsStorageError(f"Export failed: {e}")

    def export_to_csv(self, job_id: str, output_path: Path) -> None:
        """
        Export metrics to CSV file.
        
        Args:
            job_id: Job identifier
            output_path: Output file path
        """
        try:
            import csv
            
            training_metrics = self.get_training_metrics(job_id)
            
            if not training_metrics:
                self.logger.warning(f"No metrics to export for job {job_id}")
                return
            
            # Write training metrics
            with open(output_path, 'w', newline='') as f:
                fieldnames = [
                    'timestamp', 'global_step', 'epoch', 'training_loss',
                    'validation_loss', 'learning_rate', 'gradient_norm',
                    'samples_processed', 'batch_time', 'step_time'
                ]
                
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for m in training_metrics:
                    writer.writerow({
                        'timestamp': m.timestamp.isoformat(),
                        'global_step': m.global_step,
                        'epoch': m.epoch,
                        'training_loss': m.training_loss,
                        'validation_loss': m.validation_loss,
                        'learning_rate': m.learning_rate,
                        'gradient_norm': m.gradient_norm,
                        'samples_processed': m.samples_processed,
                        'batch_time': m.batch_time,
                        'step_time': m.step_time,
                    })
            
            self.logger.info(f"Exported metrics to CSV: {output_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to export CSV: {e}")
            raise MetricsStorageError(f"CSV export failed: {e}")

    def _persist_snapshot(self, snapshot: MetricSnapshot) -> None:
        """Persist a snapshot to disk."""
        try:
            job_dir = self.storage_dir / snapshot.job_id
            job_dir.mkdir(parents=True, exist_ok=True)
            
            # Append to daily file
            date_str = snapshot.timestamp.strftime("%Y%m%d")
            file_path = job_dir / f"metrics_{date_str}.jsonl"
            
            with open(file_path, 'a') as f:
                f.write(snapshot.model_dump_json() + '\n')
                
        except Exception as e:
            self.logger.debug(f"Failed to persist snapshot: {e}")


# Global instance
metrics_storage = MetricsStorage()
