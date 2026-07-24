"""Integration tests for the complete metrics system."""

import pytest
import asyncio
import tempfile
from pathlib import Path

from app.metrics import (
    metrics_manager,
    metrics_collector,
    metrics_storage,
    metrics_aggregator,
    tensorboard_writer,
    alert_engine,
    training_monitor,
)
from app.metrics.structured_logger import structured_logger
from app.metrics.factory import (
    create_test_metrics_stack,
    create_dev_metrics_stack,
    MetricsConfig,
    MetricsFactory,
)
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    AlertSeverity,
    LogLevel,
)


class TestMetricsIntegration:
    """Integration tests for complete metrics workflow."""

    def test_end_to_end_training_flow(self):
        """Test complete training metrics flow."""
        job_id = "integration_test_job"
        
        # Start job
        metrics_manager.start_job(job_id)
        
        # Simulate training loop
        for step in range(20):
            # Record training metrics
            metrics_manager.record_training_metrics(
                job_id=job_id,
                global_step=step,
                epoch=step // 10,
                training_loss=1.0 - (step * 0.02),
                learning_rate=1e-4,
            )
            
            # System metrics every 5 steps
            if step % 5 == 0:
                metrics_manager.record_system_metrics(job_id)
        
        # Verify data collected
        training_history = metrics_storage.get_training_metrics(job_id)
        assert len(training_history) == 20
        
        system_history = metrics_storage.get_system_metrics(job_id)
        assert len(system_history) == 4  # Every 5 steps = 4 times
        
        # Get live metrics
        live = metrics_manager.get_live_metrics(job_id)
        assert live["job_id"] == job_id
        assert live["global_step"] == 19
        
        # Get aggregated stats
        agg = metrics_manager.get_aggregated_metrics(job_id)
        assert "training_loss" in agg
        assert agg["training_loss"].count == 20
        
        # Stop job
        metrics_manager.stop_job(job_id)
        
        # Cleanup
        metrics_storage.clear_job_metrics(job_id)

    def test_alert_generation_flow(self):
        """Test alert generation and handling."""
        job_id = "alert_test_job"
        
        # Record normal metrics
        for i in range(10):
            metrics = TrainingMetrics(
                job_id=job_id,
                global_step=i,
                training_loss=1.0 + (i * 0.01),
                learning_rate=1e-4,
            )
            alert_engine.check_training_metrics(job_id, metrics)
        
        # Trigger NaN loss
        nan_metrics = TrainingMetrics(
            job_id=job_id,
            global_step=11,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        alerts = alert_engine.check_training_metrics(job_id, nan_metrics)
        
        # Verify alert generated
        assert len(alerts) > 0
        
        # Get all alerts
        all_alerts = alert_engine.get_alerts(job_id)
        assert len(all_alerts) > 0
        
        # Get critical alerts
        critical = alert_engine.get_alerts(
            job_id=job_id,
            severity=AlertSeverity.CRITICAL,
        )
        assert len(critical) > 0
        
        # Acknowledge alert
        alert_id = critical[0].alert_id
        success = alert_engine.acknowledge_alert(job_id, alert_id)
        assert success
        
        # Verify acknowledged
        ack_alerts = alert_engine.get_alerts(
            job_id=job_id,
            acknowledged=True,
        )
        assert len(ack_alerts) > 0
        
        # Cleanup
        alert_engine.clear_job_alerts(job_id)

    def test_structured_logging_flow(self):
        """Test structured logging workflow."""
        job_id = "logging_test_job"
        
        # Log various events
        structured_logger.log_training_event(
            job_id=job_id,
            event="Training started",
            metadata={"epochs": 10},
        )
        
        structured_logger.log_checkpoint_event(
            job_id=job_id,
            event="Checkpoint saved",
            checkpoint_path="/tmp/checkpoint.pt",
        )
        
        structured_logger.log_performance(
            job_id=job_id,
            message="Good throughput",
            metrics={"samples_per_sec": 100},
        )
        
        structured_logger.error(
            job_id=job_id,
            category="error",
            message="Test error",
            error="Something went wrong",
        )
        
        # Query logs
        all_logs = structured_logger.get_logs(job_id)
        assert len(all_logs) >= 4
        
        # Query by category
        training_logs = structured_logger.get_logs(
            job_id=job_id,
            category="training",
        )
        assert len(training_logs) >= 1
        
        # Query errors
        error_logs = structured_logger.get_error_logs(job_id)
        assert len(error_logs) >= 1
        
        # Cleanup
        structured_logger.clear_logs(job_id)

    @pytest.mark.asyncio
    async def test_training_monitor_flow(self):
        """Test training monitor workflow."""
        job_id = "monitor_test_job"
        
        # Start monitoring
        await training_monitor.start_monitoring(job_id)
        
        # Verify monitoring started
        assert training_monitor.is_monitoring(job_id)
        
        # Record some metrics
        metrics_manager.record_training_metrics(
            job_id=job_id,
            global_step=10,
            training_loss=0.5,
            learning_rate=1e-4,
        )
        
        # Wait for monitor check
        await asyncio.sleep(0.5)
        
        # Get status
        status = training_monitor.get_status(job_id)
        assert status.is_monitoring
        
        # Stop monitoring
        await training_monitor.stop_monitoring(job_id)
        
        # Verify stopped
        assert not training_monitor.is_monitoring(job_id)

    def test_export_flow(self):
        """Test metrics export workflow."""
        job_id = "export_test_job"
        
        # Record metrics
        for i in range(10):
            metrics_manager.record_training_metrics(
                job_id=job_id,
                global_step=i,
                training_loss=1.0 - (i * 0.05),
                learning_rate=1e-4,
            )
        
        # Export to JSON
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json_path = f.name
        
        try:
            metrics_manager.export_metrics(job_id, json_path, "json")
            assert Path(json_path).exists()
        finally:
            Path(json_path).unlink(missing_ok=True)
        
        # Export to CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            csv_path = f.name
        
        try:
            metrics_manager.export_metrics(job_id, csv_path, "csv")
            assert Path(csv_path).exists()
        finally:
            Path(csv_path).unlink(missing_ok=True)
        
        # Cleanup
        metrics_storage.clear_job_metrics(job_id)


class TestFactoryIntegration:
    """Integration tests for factory patterns."""

    def test_dev_stack_creation(self):
        """Test development stack creation."""
        stack = create_dev_metrics_stack()
        
        assert "manager" in stack
        assert "tensorboard" in stack
        assert "alert_engine" in stack
        assert "monitor" in stack
        assert "logger" in stack
        
        # Test manager works
        manager = stack["manager"]
        job_id = "dev_stack_test"
        
        manager.start_job(job_id)
        manager.record_training_metrics(
            job_id=job_id,
            global_step=1,
            training_loss=0.5,
            learning_rate=1e-4,
        )
        manager.stop_job(job_id)

    def test_test_stack_creation(self):
        """Test testing stack creation."""
        stack = create_test_metrics_stack()
        
        assert "manager" in stack
        
        # Test with minimal config
        manager = stack["manager"]
        job_id = "test_stack_test"
        
        manager.start_job(job_id)
        manager.record_training_metrics(
            job_id=job_id,
            global_step=1,
            training_loss=0.5,
            learning_rate=1e-4,
        )
        manager.stop_job(job_id)

    def test_custom_config_stack(self):
        """Test custom configuration stack."""
        config = MetricsConfig(
            storage_max_size=100,
            enable_disk_persistence=False,
            aggregation_window_size=50,
        )
        
        stack = MetricsFactory.create_complete_stack(config)
        
        assert "manager" in stack
        assert stack["manager"].storage.max_memory_size == 100


class TestMetricsSnapshot:
    """Integration tests for snapshot functionality."""

    def test_complete_snapshot(self):
        """Test creating complete metric snapshot."""
        job_id = "snapshot_test_job"
        
        # Record all metric types
        training = metrics_manager.record_training_metrics(
            job_id=job_id,
            global_step=100,
            training_loss=0.45,
            learning_rate=1e-4,
        )
        
        system = metrics_manager.record_system_metrics(job_id)
        
        model = metrics_manager.record_model_metrics(
            job_id=job_id,
            total_params=1000000,
            trainable_params=500000,
        )
        
        performance = metrics_manager.record_performance_metrics(
            job_id=job_id,
            global_step=100,
            samples_processed=10000,
        )
        
        # Create snapshot
        snapshot = metrics_manager.record_snapshot(
            job_id=job_id,
            global_step=100,
            training_metrics=training,
            system_metrics=system,
            model_metrics=model,
            performance_metrics=performance,
        )
        
        # Verify snapshot
        assert snapshot.job_id == job_id
        assert snapshot.training is not None
        assert snapshot.system is not None
        assert snapshot.model is not None
        assert snapshot.performance is not None
        
        # Retrieve snapshot
        stored_snapshot = metrics_storage.get_latest_snapshot(job_id)
        assert stored_snapshot is not None
        
        # Cleanup
        metrics_storage.clear_job_metrics(job_id)


class TestAggregationFlow:
    """Integration tests for aggregation workflows."""

    def test_multi_metric_aggregation(self):
        """Test aggregating multiple metrics."""
        job_id = "agg_flow_test"
        
        # Record multiple metrics
        for i in range(50):
            metrics_manager.record_training_metrics(
                job_id=job_id,
                global_step=i,
                training_loss=1.0 - (i * 0.01),
                validation_loss=1.1 - (i * 0.01),
                learning_rate=1e-4,
            )
        
        # Get aggregations
        agg_dict = metrics_manager.get_aggregated_metrics(
            job_id=job_id,
            metric_names=["training_loss", "validation_loss", "learning_rate"],
        )
        
        # Verify all metrics aggregated
        assert "training_loss" in agg_dict
        assert "validation_loss" in agg_dict
        assert "learning_rate" in agg_dict
        
        # Verify stats
        loss_agg = agg_dict["training_loss"]
        assert loss_agg.count == 50
        assert loss_agg.min < loss_agg.max
        assert loss_agg.mean > 0
        
        # Cleanup
        metrics_storage.clear_job_metrics(job_id)


class TestRealWorldScenario:
    """Test realistic training scenarios."""

    def test_training_with_validation(self):
        """Test training with validation phase."""
        job_id = "real_world_test"
        
        metrics_manager.start_job(job_id)
        
        # Simulate 3 epochs with validation
        global_step = 0
        for epoch in range(3):
            # Training phase
            for step in range(10):
                metrics_manager.record_training_metrics(
                    job_id=job_id,
                    global_step=global_step,
                    epoch=epoch,
                    training_loss=1.0 - (global_step * 0.01),
                    learning_rate=1e-4 * (0.9 ** epoch),
                )
                global_step += 1
            
            # Validation phase
            metrics_manager.record_training_metrics(
                job_id=job_id,
                global_step=global_step,
                epoch=epoch,
                validation_loss=1.1 - (epoch * 0.1),
                learning_rate=1e-4 * (0.9 ** epoch),
            )
        
        # Verify data
        history = metrics_storage.get_training_metrics(job_id)
        assert len(history) == 33  # 30 train + 3 val
        
        # Check aggregations
        agg = metrics_manager.get_aggregated_metrics(job_id)
        assert "training_loss" in agg
        assert "validation_loss" in agg
        
        # Export results
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name
        
        try:
            metrics_manager.export_metrics(job_id, output_path, "json")
            assert Path(output_path).exists()
        finally:
            Path(output_path).unlink(missing_ok=True)
        
        # Cleanup
        metrics_manager.stop_job(job_id)
        metrics_storage.clear_job_metrics(job_id)


# Run integration tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
