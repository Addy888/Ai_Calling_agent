"""Tests for alert engine."""

import pytest
import math

from app.metrics.alert_engine import AlertEngine
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    Alert,
    AlertType,
    AlertSeverity,
)


class TestAlertEngine:
    """Test suite for AlertEngine."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = AlertEngine()
        self.job_id = "test_job_alerts"

    def test_nan_loss_detection(self):
        """Test NaN loss detection."""
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        alerts = self.engine.check_training_metrics(self.job_id, metrics)
        
        assert len(alerts) > 0
        assert any(a.alert_type == AlertType.NAN_LOSS for a in alerts)
        assert all(a.severity == AlertSeverity.CRITICAL for a in alerts if a.alert_type == AlertType.NAN_LOSS)

    def test_loss_explosion_detection(self):
        """Test loss explosion detection."""
        # Build history of normal losses
        for i in range(15):
            metrics = TrainingMetrics(
                job_id=self.job_id,
                global_step=i,
                training_loss=1.0 + (i * 0.01),
                learning_rate=1e-4,
            )
            self.engine.check_training_metrics(self.job_id, metrics)
        
        # Trigger explosion
        explosion_metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=16,
            training_loss=100.0,  # Sudden huge loss
            learning_rate=1e-4,
        )
        
        alerts = self.engine.check_training_metrics(self.job_id, explosion_metrics)
        
        assert len(alerts) > 0
        assert any(a.alert_type == AlertType.LOSS_EXPLOSION for a in alerts)

    def test_high_gpu_memory_warning(self):
        """Test high GPU memory usage warning."""
        metrics = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            gpu_usage_percent=80.0,
            gpu_memory_used_gb=10.5,
            gpu_memory_total_gb=11.0,  # 95.5% usage
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        
        alerts = self.engine.check_system_metrics(self.job_id, metrics)
        
        assert len(alerts) > 0
        assert any(a.alert_type == AlertType.HIGH_MEMORY_USAGE for a in alerts)

    def test_high_ram_warning(self):
        """Test high RAM usage warning."""
        metrics = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=14.5,
            ram_total_gb=16.0,  # 90.6% usage
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        
        alerts = self.engine.check_system_metrics(self.job_id, metrics)
        
        assert any(a.alert_type == AlertType.HIGH_MEMORY_USAGE for a in alerts)

    def test_low_disk_space_warning(self):
        """Test low disk space warning."""
        metrics = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            disk_usage_gb=480.0,
            disk_total_gb=500.0,  # 96% usage
        )
        
        alerts = self.engine.check_system_metrics(self.job_id, metrics)
        
        assert any(a.alert_type == AlertType.LOW_DISK_SPACE for a in alerts)

    def test_high_gpu_temperature_warning(self):
        """Test high GPU temperature warning."""
        metrics = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            gpu_temperature=90.0,  # High temperature
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        
        alerts = self.engine.check_system_metrics(self.job_id, metrics)
        
        assert any(a.alert_type == AlertType.GPU_FAILURE for a in alerts)

    def test_get_alerts(self):
        """Test getting alerts for a job."""
        # Generate some alerts
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        self.engine.check_training_metrics(self.job_id, metrics)
        
        # Get alerts
        alerts = self.engine.get_alerts(self.job_id)
        
        assert len(alerts) > 0
        assert all(isinstance(a, Alert) for a in alerts)

    def test_get_alerts_by_severity(self):
        """Test filtering alerts by severity."""
        # Generate critical alert
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        self.engine.check_training_metrics(self.job_id, metrics)
        
        # Get critical alerts
        critical_alerts = self.engine.get_alerts(
            self.job_id,
            severity=AlertSeverity.CRITICAL,
        )
        
        assert all(a.severity == AlertSeverity.CRITICAL for a in critical_alerts)

    def test_acknowledge_alert(self):
        """Test acknowledging an alert."""
        # Generate alert
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        generated_alerts = self.engine.check_training_metrics(self.job_id, metrics)
        alert_id = generated_alerts[0].alert_id
        
        # Acknowledge
        success = self.engine.acknowledge_alert(self.job_id, alert_id)
        
        assert success
        
        # Check acknowledged status
        alerts = self.engine.get_alerts(self.job_id)
        acknowledged_alert = next(a for a in alerts if a.alert_id == alert_id)
        assert acknowledged_alert.acknowledged

    def test_get_unacknowledged_alerts(self):
        """Test filtering unacknowledged alerts."""
        # Generate alert
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        self.engine.check_training_metrics(self.job_id, metrics)
        
        # Get unacknowledged
        unack = self.engine.get_alerts(
            self.job_id,
            acknowledged=False,
        )
        
        assert all(not a.acknowledged for a in unack)

    def test_clear_job_alerts(self):
        """Test clearing alerts for a job."""
        # Generate alert
        metrics = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        
        self.engine.check_training_metrics(self.job_id, metrics)
        
        # Clear
        self.engine.clear_job_alerts(self.job_id)
        
        # Should be empty
        alerts = self.engine.get_alerts(self.job_id)
        assert len(alerts) == 0

    def test_get_alert_stats(self):
        """Test getting alert statistics."""
        # Generate multiple alerts with different severities
        # NaN loss (critical)
        metrics1 = TrainingMetrics(
            job_id=self.job_id,
            global_step=100,
            training_loss=float('nan'),
            learning_rate=1e-4,
        )
        self.engine.check_training_metrics(self.job_id, metrics1)
        
        # High GPU memory (warning)
        metrics2 = SystemMetrics(
            job_id=self.job_id,
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            gpu_memory_used_gb=10.0,
            gpu_memory_total_gb=11.0,
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        self.engine.check_system_metrics(self.job_id, metrics2)
        
        # Get stats
        stats = self.engine.get_alert_stats(self.job_id)
        
        assert stats["total_alerts"] > 0
        assert "critical" in stats
        assert "error" in stats
        assert "warning" in stats


class TestAlertEngineThresholds:
    """Test suite for threshold configuration."""

    def test_custom_thresholds(self):
        """Test using custom alert thresholds."""
        engine = AlertEngine()
        
        # Change thresholds
        engine._alert_thresholds["gpu_memory_warning_percent"] = 80.0
        
        # Test with 85% usage (should trigger with 80% threshold)
        metrics = SystemMetrics(
            job_id="test_job",
            cpu_usage_percent=50.0,
            ram_usage_gb=8.0,
            ram_total_gb=16.0,
            gpu_memory_used_gb=8.5,
            gpu_memory_total_gb=10.0,  # 85%
            disk_usage_gb=100.0,
            disk_total_gb=500.0,
        )
        
        alerts = engine.check_system_metrics("test_job", metrics)
        
        assert any(a.alert_type == AlertType.HIGH_MEMORY_USAGE for a in alerts)

