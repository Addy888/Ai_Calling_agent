"""Tests for metrics manager."""

import pytest
from unittest.mock import Mock, MagicMock

from app.metrics.metrics_manager import MetricsManager
from app.metrics.metrics_collector import MetricsCollector
from app.metrics.metrics_storage import MetricsStorage
from app.metrics.metrics_aggregator import MetricsAggregator
from app.metrics.schemas import TrainingMetrics, SystemMetrics
from app.metrics.exceptions import MetricsException


class TestMetricsManager:
    """Test suite for MetricsManager."""

    def setup_method(self):
        """Set up test fixtures."""
        self.collector = MetricsCollector()
        self.storage = MetricsStorage(max_memory_size=100, persist_to_disk=False)
        self.aggregator = MetricsAggregator()
        
        self.manager = MetricsManager(
            collector=self.collector,
            storage=self.storage,
            aggregator=self.aggregator,
        )
        
        self.job_id = "test_job_manager"

    def test_record_training_metrics(self):
        """Test recording training metrics."""
        metrics = self.manager.record_training_metrics(
            job_id=self.job_id,
            global_step=100,
            epoch=5,
            training_loss=0.45,
            validation_loss=0.52,
            learning_rate=1e-4,
        )
        
        assert isinstance(metrics, TrainingMetrics)
        assert metrics.job_id == self.job_id
        assert metrics.training_loss == 0.45
        
        # Check storage
        stored = self.storage.get_latest_training_metrics(self.job_id)
        assert stored is not None
        assert stored.training_loss == 0.45

    def test_record_system_metrics(self):
        """Test recording system metrics."""
        metrics = self.manager.record_system_metrics(self.job_id)
        
        assert isinstance(metrics, SystemMetrics)
        assert metrics.job_id == self.job_id
        assert metrics.cpu_usage_percent >= 0
        
        # Check storage
        stored = self.storage.get_latest_system_metrics(self.job_id)
        assert stored is not None

    def test_record_model_metrics(self):
        """Test recording model metrics."""
        metrics = self.manager.record_model_metrics(
            job_id=self.job_id,
            model=None,
            total_params=10000000,
            trainable_params=5000000,
        )
        
        assert metrics.job_id == self.job_id
        assert metrics.total_parameters == 10000000

    def test_record_performance_metrics(self):
        """Test recording performance metrics."""
        metrics = self.manager.record_performance_metrics(
            job_id=self.job_id,
            global_step=100,
            samples_processed=10000,
        )
        
        assert metrics.job_id == self.job_id
        assert metrics.samples_per_second > 0

    def test_record_snapshot(self):
        """Test recording complete snapshot."""
        training = self.manager.record_training_metrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=0.45,
            learning_rate=1e-4,
        )
        
        system = self.manager.record_system_metrics(self.job_id)
        
        snapshot = self.manager.record_snapshot(
            job_id=self.job_id,
            global_step=100,
            training_metrics=training,
            system_metrics=system,
        )
        
        assert snapshot.job_id == self.job_id
        assert snapshot.training is not None
        assert snapshot.system is not None

    def test_get_live_metrics(self):
        """Test getting live metrics."""
        # Record some metrics
        self.manager.record_training_metrics(
            job_id=self.job_id,
            global_step=150,
            training_loss=0.35,
            learning_rate=1e-4,
        )
        
        self.manager.record_system_metrics(self.job_id)
        
        # Get live data
        live = self.manager.get_live_metrics(self.job_id)
        
        assert live["job_id"] == self.job_id
        assert live["training_loss"] == 0.35
        assert live["global_step"] == 150

    def test_get_aggregated_metrics(self):
        """Test getting aggregated metrics."""
        # Record multiple metrics
        for i in range(10):
            self.manager.record_training_metrics(
                job_id=self.job_id,
                global_step=i,
                training_loss=1.0 - (i * 0.05),
                learning_rate=1e-4,
            )
        
        # Get aggregations
        aggregated = self.manager.get_aggregated_metrics(self.job_id)
        
        assert "training_loss" in aggregated
        assert aggregated["training_loss"].count == 10

    def test_start_stop_job(self):
        """Test job start/stop tracking."""
        assert not self.manager.is_job_active(self.job_id)
        
        self.manager.start_job(self.job_id)
        assert self.manager.is_job_active(self.job_id)
        
        self.manager.stop_job(self.job_id)
        assert not self.manager.is_job_active(self.job_id)

    def test_export_metrics_json(self):
        """Test exporting metrics to JSON."""
        import tempfile
        from pathlib import Path
        
        # Record some metrics
        self.manager.record_training_metrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=0.45,
            learning_rate=1e-4,
        )
        
        # Export to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name
        
        try:
            self.manager.export_metrics(self.job_id, output_path, format="json")
            
            # Check file exists
            assert Path(output_path).exists()
        finally:
            Path(output_path).unlink(missing_ok=True)

    def test_export_metrics_csv(self):
        """Test exporting metrics to CSV."""
        import tempfile
        from pathlib import Path
        
        # Record some metrics
        self.manager.record_training_metrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=0.45,
            learning_rate=1e-4,
        )
        
        # Export to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            output_path = f.name
        
        try:
            self.manager.export_metrics(self.job_id, output_path, format="csv")
            
            # Check file exists
            assert Path(output_path).exists()
        finally:
            Path(output_path).unlink(missing_ok=True)

    def test_get_stats(self):
        """Test getting manager stats."""
        self.manager.start_job(self.job_id)
        
        stats = self.manager.get_stats()
        
        assert "active_jobs" in stats
        assert "total_jobs" in stats
        assert "storage" in stats
        assert "aggregator" in stats


class TestMetricsManagerErrors:
    """Test suite for error handling."""

    def test_record_metrics_with_invalid_job_id(self):
        """Test that invalid job_id raises error."""
        manager = MetricsManager()
        
        with pytest.raises(MetricsException):
            manager.record_training_metrics(
                job_id=None,
                global_step=100,
                learning_rate=1e-4,
            )

