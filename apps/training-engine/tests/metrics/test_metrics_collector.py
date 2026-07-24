"""Tests for metrics collector."""

import pytest
from unittest.mock import Mock, patch

from app.metrics.metrics_collector import MetricsCollector
from app.metrics.schemas import TrainingMetrics, SystemMetrics, ModelMetrics
from app.metrics.exceptions import MetricsCollectionError


class TestMetricsCollector:
    """Test suite for MetricsCollector."""

    def setup_method(self):
        """Set up test fixtures."""
        self.collector = MetricsCollector()
        self.job_id = "test_job_123"

    def test_collect_training_metrics_basic(self):
        """Test basic training metrics collection."""
        metrics = self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=100,
            epoch=5,
            training_loss=0.45,
            validation_loss=0.52,
            learning_rate=1e-4,
        )
        
        assert isinstance(metrics, TrainingMetrics)
        assert metrics.job_id == self.job_id
        assert metrics.global_step == 100
        assert metrics.epoch == 5
        assert metrics.training_loss == 0.45
        assert metrics.validation_loss == 0.52
        assert metrics.learning_rate == 1e-4

    def test_collect_training_metrics_with_gradients(self):
        """Test training metrics with gradient information."""
        metrics = self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=50,
            training_loss=1.2,
            learning_rate=5e-5,
            gradient_norm=3.5,
            gradient_clipping=1.0,
        )
        
        assert metrics.gradient_norm == 3.5
        assert metrics.gradient_clipping == 1.0

    def test_collect_training_metrics_step_time(self):
        """Test that step time is calculated."""
        # First call initializes timer
        self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=1,
            training_loss=1.0,
            learning_rate=1e-4,
        )
        
        # Second call should have step_time
        import time
        time.sleep(0.01)
        
        metrics = self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=2,
            training_loss=0.9,
            learning_rate=1e-4,
        )
        
        assert metrics.step_time is not None
        assert metrics.step_time > 0

    def test_collect_system_metrics(self):
        """Test system metrics collection."""
        metrics = self.collector.collect_system_metrics(self.job_id)
        
        assert isinstance(metrics, SystemMetrics)
        assert metrics.job_id == self.job_id
        assert metrics.cpu_usage_percent >= 0
        assert metrics.ram_usage_gb >= 0
        assert metrics.ram_total_gb > 0
        assert metrics.disk_usage_gb >= 0
        assert metrics.disk_total_gb > 0

    def test_collect_model_metrics_with_model(self):
        """Test model metrics collection with mock model."""
        # Mock PyTorch model
        mock_model = Mock()
        mock_param = Mock()
        mock_param.numel = Mock(return_value=1000)
        mock_param.requires_grad = True
        
        mock_model.parameters = Mock(return_value=[mock_param, mock_param, mock_param])
        
        with patch('app.metrics.metrics_collector.torch'):
            metrics = self.collector.collect_model_metrics(
                job_id=self.job_id,
                model=mock_model,
            )
        
        assert isinstance(metrics, ModelMetrics)
        assert metrics.job_id == self.job_id
        assert metrics.total_parameters == 3000
        assert metrics.trainable_parameters == 3000

    def test_collect_model_metrics_with_manual_counts(self):
        """Test model metrics with manual parameter counts."""
        metrics = self.collector.collect_model_metrics(
            job_id=self.job_id,
            total_params=10000000,
            trainable_params=5000000,
            lora_params=200000,
        )
        
        assert metrics.total_parameters == 10000000
        assert metrics.trainable_parameters == 5000000
        assert metrics.frozen_parameters == 5000000
        assert metrics.lora_parameters == 200000

    def test_collect_performance_metrics(self):
        """Test performance metrics collection."""
        metrics = self.collector.collect_performance_metrics(
            job_id=self.job_id,
            global_step=100,
            samples_processed=10000,
            tokens_processed=50000,
            elapsed_seconds=120.0,
            total_steps=1000,
        )
        
        assert metrics.job_id == self.job_id
        assert metrics.global_step == 100
        assert metrics.samples_per_second > 0
        assert metrics.steps_per_second > 0
        assert metrics.tokens_per_second is not None
        assert metrics.eta_seconds is not None

    def test_reset_timers(self):
        """Test timer reset."""
        self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=1,
            training_loss=1.0,
            learning_rate=1e-4,
        )
        
        self.collector.reset_timers()
        
        # After reset, step_time should be None again
        metrics = self.collector.collect_training_metrics(
            job_id=self.job_id,
            global_step=2,
            training_loss=0.9,
            learning_rate=1e-4,
        )
        
        assert metrics.step_time is None


class TestMetricsCollectorGPU:
    """Test suite for GPU metrics (may be skipped if no GPU)."""

    def setup_method(self):
        """Set up test fixtures."""
        self.collector = MetricsCollector()
        self.job_id = "test_job_gpu"

    def test_collect_system_metrics_gpu_available(self):
        """Test GPU metrics when available."""
        metrics = self.collector.collect_system_metrics(self.job_id)
        
        # GPU metrics may or may not be available
        if self.collector._nvml_initialized:
            assert metrics.gpu_usage_percent is not None
            assert metrics.gpu_memory_used_gb is not None
        else:
            assert metrics.gpu_usage_percent is None


class TestMetricsCollectorErrors:
    """Test suite for error handling."""

    def test_collect_training_metrics_exception(self):
        """Test that exceptions are properly raised."""
        collector = MetricsCollector()
        
        # Pass invalid parameters to trigger error
        with pytest.raises(MetricsCollectionError):
            collector.collect_training_metrics(
                job_id=None,  # Invalid
                global_step=100,
                learning_rate=1e-4,
            )

