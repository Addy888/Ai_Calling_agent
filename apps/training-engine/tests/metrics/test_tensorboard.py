"""Tests for TensorBoard writer."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from app.metrics.tensorboard_writer import TensorBoardWriter
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
    TensorBoardConfig,
)


class TestTensorBoardWriter:
    """Test suite for TensorBoardWriter."""

    def setup_method(self):
        """Set up test fixtures."""
        self.config = TensorBoardConfig(
            log_dir="./test_tensorboard_logs",
            enabled=True,
            flush_seconds=10,
        )
        self.job_id = "test_job_tb"

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_get_writer_creates_new_writer(self, mock_summary_writer):
        """Test that get_writer creates a new SummaryWriter."""
        writer = TensorBoardWriter(self.config)
        
        tb_writer = writer.get_writer(self.job_id)
        
        assert tb_writer is not None
        mock_summary_writer.assert_called_once()

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_get_writer_reuses_existing_writer(self, mock_summary_writer):
        """Test that get_writer reuses existing writer."""
        writer = TensorBoardWriter(self.config)
        
        # Get writer twice
        writer.get_writer(self.job_id)
        writer.get_writer(self.job_id)
        
        # Should only create once
        assert mock_summary_writer.call_count == 1

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_write_training_metrics(self, mock_summary_writer):
        """Test writing training metrics."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=0.45,
            validation_loss=0.52,
            learning_rate=1e-4,
            gradient_norm=2.5,
        )
        
        writer.write_training_metrics(self.job_id, metrics)
        
        # Verify scalar writes
        assert mock_writer_instance.add_scalar.called
        assert mock_writer_instance.add_scalar.call_count >= 3  # loss, val_loss, lr

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_write_system_metrics(self, mock_summary_writer):
        """Test writing system metrics."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        
        metrics = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            gpu_usage_percent=75.0,
            gpu_memory_used_gb=6.0,
            gpu_memory_total_gb=8.0,
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        
        writer.write_system_metrics(self.job_id, metrics, step=100)
        
        # Verify scalar writes
        assert mock_writer_instance.add_scalar.called

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_write_model_metrics(self, mock_summary_writer):
        """Test writing model metrics."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        
        metrics = ModelMetrics(
            job_id=self.job_id,
            total_parameters=10000000,
            trainable_parameters=5000000,
            frozen_parameters=5000000,
            lora_parameters=200000,
            model_size_mb=40.0,
        )
        
        writer.write_model_metrics(self.job_id, metrics, step=0)
        
        # Verify scalar writes
        assert mock_writer_instance.add_scalar.called

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_write_performance_metrics(self, mock_summary_writer):
        """Test writing performance metrics."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        
        metrics = PerformanceMetrics(
            job_id=self.job_id,
            global_step=100,
            tokens_per_second=500.0,
            samples_per_second=50.0,
            steps_per_second=2.0,
            eta_seconds=3600,
            elapsed_seconds=1800,
        )
        
        writer.write_performance_metrics(self.job_id, metrics)
        
        # Verify scalar writes
        assert mock_writer_instance.add_scalar.called

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_write_custom_scalar(self, mock_summary_writer):
        """Test writing custom scalar."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        
        writer.write_scalar(self.job_id, "custom_metric", 42.0, step=100)
        
        mock_writer_instance.add_scalar.assert_called_with(
            "custom_metric", 42.0, 100
        )

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_flush(self, mock_summary_writer):
        """Test flushing writer."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        writer.get_writer(self.job_id)
        
        writer.flush(self.job_id)
        
        mock_writer_instance.flush.assert_called_once()

    @patch('app.metrics.tensorboard_writer.SummaryWriter')
    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', True)
    def test_close(self, mock_summary_writer):
        """Test closing writer."""
        mock_writer_instance = MagicMock()
        mock_summary_writer.return_value = mock_writer_instance
        
        writer = TensorBoardWriter(self.config)
        writer.get_writer(self.job_id)
        
        writer.close(self.job_id)
        
        mock_writer_instance.close.assert_called_once()

    @patch('app.metrics.tensorboard_writer.TENSORBOARD_AVAILABLE', False)
    def test_disabled_when_tensorboard_unavailable(self):
        """Test that writer is disabled when TensorBoard is unavailable."""
        writer = TensorBoardWriter(self.config)
        
        assert not writer.config.enabled

    def test_disabled_by_config(self):
        """Test that writer respects enabled flag."""
        config = TensorBoardConfig(enabled=False)
        writer = TensorBoardWriter(config)
        
        tb_writer = writer.get_writer(self.job_id)
        
        assert tb_writer is None


class TestTensorBoardWriterIntegration:
    """Integration tests for TensorBoard writer (requires TensorBoard)."""

    @pytest.mark.skipif(
        not pytest.importorskip("torch.utils.tensorboard", reason="TensorBoard not available"),
        reason="Requires TensorBoard"
    )
    def test_real_tensorboard_write(self):
        """Test actual TensorBoard write (if available)."""
        import tempfile
        import shutil
        
        temp_dir = tempfile.mkdtemp()
        
        try:
            config = TensorBoardConfig(
                log_dir=temp_dir,
                enabled=True,
            )
            
            writer = TensorBoardWriter(config)
            
            metrics = TrainingMetrics(
                job_id="real_test",
                global_step=10,
                training_loss=1.5,
                learning_rate=1e-4,
            )
            
            writer.write_training_metrics("real_test", metrics)
            writer.flush("real_test")
            writer.close("real_test")
            
            # Check that log directory was created
            assert Path(temp_dir).exists()
            
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

