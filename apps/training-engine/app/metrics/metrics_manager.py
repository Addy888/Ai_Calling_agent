"""Main metrics manager orchestrating collection, storage, and aggregation."""

from typing import Dict, List, Optional

from app.events import event_bus
from app.logger import training_logger
from app.metrics.metrics_collector import MetricsCollector, metrics_collector
from app.metrics.metrics_storage import MetricsStorage, metrics_storage
from app.metrics.metrics_aggregator import MetricsAggregator, metrics_aggregator
from app.metrics.schemas import (
    MetricSnapshot,
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
    AggregatedMetrics,
)
from app.metrics.exceptions import MetricsException


class MetricsManager:
    """
    Main metrics manager.
    
    Orchestrates metric collection, validation, aggregation, storage, and publishing.
    """

    def __init__(
        self,
        collector: Optional[MetricsCollector] = None,
        storage: Optional[MetricsStorage] = None,
        aggregator: Optional[MetricsAggregator] = None,
    ):
        """
        Initialize metrics manager.
        
        Args:
            collector: MetricsCollector instance
            storage: MetricsStorage instance
            aggregator: MetricsAggregator instance
        """
        self.logger = training_logger
        self.collector = collector or metrics_collector
        self.storage = storage or metrics_storage
        self.aggregator = aggregator or metrics_aggregator
        
        self._active_jobs: Dict[str, bool] = {}

    def record_training_metrics(
        self,
        job_id: str,
        global_step: int,
        epoch: Optional[int] = None,
        training_loss: Optional[float] = None,
        validation_loss: Optional[float] = None,
        learning_rate: float = 0.0,
        **kwargs,
    ) -> TrainingMetrics:
        """
        Record training metrics.
        
        Args:
            job_id: Job identifier
            global_step: Current global step
            epoch: Current epoch
            training_loss: Training loss
            validation_loss: Validation loss
            learning_rate: Learning rate
            **kwargs: Additional training metrics
            
        Returns:
            TrainingMetrics object
        """
        try:
            # Collect metrics
            metrics = self.collector.collect_training_metrics(
                job_id=job_id,
                global_step=global_step,
                epoch=epoch,
                training_loss=training_loss,
                validation_loss=validation_loss,
                learning_rate=learning_rate,
                **kwargs,
            )
            
            # Store metrics
            self.storage.store_training_metrics(metrics)
            
            # Update aggregations
            if training_loss is not None:
                self.aggregator.add_value(f"{job_id}_training_loss", training_loss)
            if validation_loss is not None:
                self.aggregator.add_value(f"{job_id}_validation_loss", validation_loss)
            
            self.aggregator.add_value(f"{job_id}_learning_rate", learning_rate)
            
            # Emit event
            event_bus.emit("metrics_updated", {
                "job_id": job_id,
                "metric_type": "training",
                "global_step": global_step,
            })
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to record training metrics: {e}")
            raise MetricsException(f"Failed to record training metrics: {e}")

    def record_system_metrics(self, job_id: str) -> SystemMetrics:
        """
        Record system metrics.
        
        Args:
            job_id: Job identifier
            
        Returns:
            SystemMetrics object
        """
        try:
            # Collect metrics
            metrics = self.collector.collect_system_metrics(job_id)
            
            # Store metrics
            self.storage.store_system_metrics(metrics)
            
            # Update aggregations
            self.aggregator.add_value(
                f"{job_id}_cpu_usage",
                metrics.cpu_usage_percent
            )
            self.aggregator.add_value(
                f"{job_id}_ram_usage",
                metrics.ram_usage_gb
            )
            
            if metrics.gpu_usage_percent is not None:
                self.aggregator.add_value(
                    f"{job_id}_gpu_usage",
                    metrics.gpu_usage_percent
                )
            
            if metrics.gpu_memory_used_gb is not None:
                self.aggregator.add_value(
                    f"{job_id}_gpu_memory",
                    metrics.gpu_memory_used_gb
                )
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to record system metrics: {e}")
            raise MetricsException(f"Failed to record system metrics: {e}")

    def record_model_metrics(
        self,
        job_id: str,
        model: Optional[any] = None,
        **kwargs,
    ) -> ModelMetrics:
        """
        Record model metrics.
        
        Args:
            job_id: Job identifier
            model: PyTorch model
            **kwargs: Additional model metrics
            
        Returns:
            ModelMetrics object
        """
        try:
            # Collect metrics
            metrics = self.collector.collect_model_metrics(
                job_id=job_id,
                model=model,
                **kwargs,
            )
            
            # Store metrics
            self.storage.store_model_metrics(metrics)
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to record model metrics: {e}")
            raise MetricsException(f"Failed to record model metrics: {e}")

    def record_performance_metrics(
        self,
        job_id: str,
        global_step: int,
        samples_processed: int,
        **kwargs,
    ) -> PerformanceMetrics:
        """
        Record performance metrics.
        
        Args:
            job_id: Job identifier
            global_step: Current global step
            samples_processed: Samples processed
            **kwargs: Additional performance metrics
            
        Returns:
            PerformanceMetrics object
        """
        try:
            # Collect metrics
            metrics = self.collector.collect_performance_metrics(
                job_id=job_id,
                global_step=global_step,
                samples_processed=samples_processed,
                **kwargs,
            )
            
            # Store metrics
            self.storage.store_performance_metrics(metrics)
            
            # Update aggregations
            self.aggregator.add_value(
                f"{job_id}_samples_per_second",
                metrics.samples_per_second
            )
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to record performance metrics: {e}")
            raise MetricsException(f"Failed to record performance metrics: {e}")

    def record_snapshot(
        self,
        job_id: str,
        global_step: int,
        training_metrics: Optional[TrainingMetrics] = None,
        system_metrics: Optional[SystemMetrics] = None,
        model_metrics: Optional[ModelMetrics] = None,
        performance_metrics: Optional[PerformanceMetrics] = None,
    ) -> MetricSnapshot:
        """
        Record a complete metric snapshot.
        
        Args:
            job_id: Job identifier
            global_step: Current global step
            training_metrics: Training metrics
            system_metrics: System metrics
            model_metrics: Model metrics
            performance_metrics: Performance metrics
            
        Returns:
            MetricSnapshot object
        """
        try:
            snapshot = MetricSnapshot(
                job_id=job_id,
                global_step=global_step,
                training=training_metrics,
                system=system_metrics,
                model=model_metrics,
                performance=performance_metrics,
            )
            
            self.storage.store_snapshot(snapshot)
            
            return snapshot
            
        except Exception as e:
            self.logger.error(f"Failed to record snapshot: {e}")
            raise MetricsException(f"Failed to record snapshot: {e}")

    def get_live_metrics(self, job_id: str) -> Dict:
        """
        Get current live metrics for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Dictionary with live metrics
        """
        training = self.storage.get_latest_training_metrics(job_id)
        system = self.storage.get_latest_system_metrics(job_id)
        
        return {
            "job_id": job_id,
            "training_loss": training.training_loss if training else None,
            "validation_loss": training.validation_loss if training else None,
            "learning_rate": training.learning_rate if training else 0.0,
            "global_step": training.global_step if training else 0,
            "epoch": training.epoch if training else None,
            "gpu_usage_percent": system.gpu_usage_percent if system else None,
            "gpu_memory_used_gb": system.gpu_memory_used_gb if system else None,
            "cpu_usage_percent": system.cpu_usage_percent if system else None,
            "ram_usage_gb": system.ram_usage_gb if system else None,
        }

    def get_aggregated_metrics(
        self,
        job_id: str,
        metric_names: Optional[List[str]] = None,
    ) -> Dict[str, AggregatedMetrics]:
        """
        Get aggregated metrics for a job.
        
        Args:
            job_id: Job identifier
            metric_names: Optional list of specific metrics to aggregate
            
        Returns:
            Dictionary of aggregated metrics
        """
        if metric_names is None:
            metric_names = [
                "training_loss",
                "validation_loss",
                "learning_rate",
                "gpu_usage",
                "gpu_memory",
            ]
        
        results = {}
        
        for name in metric_names:
            full_name = f"{job_id}_{name}"
            try:
                results[name] = self.aggregator.aggregate(full_name)
            except Exception as e:
                self.logger.debug(f"Could not aggregate {name}: {e}")
        
        return results

    def start_job(self, job_id: str) -> None:
        """Mark a job as active."""
        self._active_jobs[job_id] = True
        self.collector.reset_timers()
        self.logger.info(f"Started metrics collection for job: {job_id}")

    def stop_job(self, job_id: str) -> None:
        """Mark a job as inactive."""
        self._active_jobs[job_id] = False
        self.logger.info(f"Stopped metrics collection for job: {job_id}")

    def is_job_active(self, job_id: str) -> bool:
        """Check if a job is active."""
        return self._active_jobs.get(job_id, False)

    def export_metrics(
        self,
        job_id: str,
        output_path: str,
        format: str = "json",
    ) -> None:
        """
        Export metrics to file.
        
        Args:
            job_id: Job identifier
            output_path: Output file path
            format: Export format (json or csv)
        """
        from pathlib import Path
        
        path = Path(output_path)
        
        if format == "json":
            self.storage.export_to_json(job_id, path)
        elif format == "csv":
            self.storage.export_to_csv(job_id, path)
        else:
            raise MetricsException(f"Unsupported export format: {format}")

    def get_stats(self) -> Dict:
        """Get metrics manager statistics."""
        return {
            "active_jobs": len([j for j, active in self._active_jobs.items() if active]),
            "total_jobs": len(self._active_jobs),
            "storage": self.storage.get_storage_stats(),
            "aggregator": self.aggregator.get_stats(),
        }


# Global instance
metrics_manager = MetricsManager()
