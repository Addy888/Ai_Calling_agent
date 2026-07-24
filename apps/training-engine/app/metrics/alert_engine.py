"""Alert engine for detecting anomalies and generating alerts."""

import uuid
import math
from datetime import datetime
from typing import Dict, List, Optional
from collections import deque

from app.events import event_bus
from app.logger import training_logger
from app.metrics.schemas import (
    Alert,
    AlertType,
    AlertSeverity,
    TrainingMetrics,
    SystemMetrics,
)
from app.metrics.exceptions import AlertGenerationError


class AlertEngine:
    """
    Monitors metrics and generates alerts for anomalies.
    """

    def __init__(self):
        """Initialize alert engine."""
        self.logger = training_logger
        self._alerts: Dict[str, List[Alert]] = {}  # job_id -> alerts
        self._loss_history: Dict[str, deque] = {}  # job_id -> loss values
        self._alert_thresholds = {
            "loss_explosion_multiplier": 10.0,
            "gpu_memory_warning_percent": 90.0,
            "ram_warning_percent": 90.0,
            "disk_warning_percent": 95.0,
            "gpu_temp_warning": 85.0,
            "loss_spike_threshold": 5.0,
        }

    def check_training_metrics(
        self,
        job_id: str,
        metrics: TrainingMetrics,
    ) -> List[Alert]:
        """
        Check training metrics for anomalies.
        
        Args:
            job_id: Job identifier
            metrics: TrainingMetrics object
            
        Returns:
            List of generated alerts
        """
        alerts = []
        
        try:
            # Check for NaN loss
            if metrics.training_loss is not None:
                if math.isnan(metrics.training_loss):
                    alert = self._generate_alert(
                        job_id=job_id,
                        alert_type=AlertType.NAN_LOSS,
                        severity=AlertSeverity.CRITICAL,
                        message=f"NaN training loss detected at step {metrics.global_step}",
                        metric_name="training_loss",
                        metric_value=float('nan'),
                        context={
                            "global_step": metrics.global_step,
                            "epoch": metrics.epoch,
                        },
                    )
                    alerts.append(alert)
                else:
                    # Check for loss explosion
                    alert = self._check_loss_explosion(job_id, metrics)
                    if alert:
                        alerts.append(alert)
            
            # Check validation loss
            if metrics.validation_loss is not None and math.isnan(metrics.validation_loss):
                alert = self._generate_alert(
                    job_id=job_id,
                    alert_type=AlertType.NAN_LOSS,
                    severity=AlertSeverity.CRITICAL,
                    message=f"NaN validation loss detected at step {metrics.global_step}",
                    metric_name="validation_loss",
                    metric_value=float('nan'),
                    context={
                        "global_step": metrics.global_step,
                        "epoch": metrics.epoch,
                    },
                )
                alerts.append(alert)
            
        except Exception as e:
            self.logger.error(f"Failed to check training metrics: {e}")
        
        return alerts

    def check_system_metrics(
        self,
        job_id: str,
        metrics: SystemMetrics,
    ) -> List[Alert]:
        """
        Check system metrics for resource issues.
        
        Args:
            job_id: Job identifier
            metrics: SystemMetrics object
            
        Returns:
            List of generated alerts
        """
        alerts = []
        
        try:
            # Check GPU memory
            if metrics.gpu_memory_used_gb is not None and metrics.gpu_memory_total_gb:
                usage_percent = (metrics.gpu_memory_used_gb / metrics.gpu_memory_total_gb) * 100
                if usage_percent >= self._alert_thresholds["gpu_memory_warning_percent"]:
                    alert = self._generate_alert(
                        job_id=job_id,
                        alert_type=AlertType.HIGH_MEMORY_USAGE,
                        severity=AlertSeverity.WARNING if usage_percent < 95 else AlertSeverity.ERROR,
                        message=f"High GPU memory usage: {usage_percent:.1f}%",
                        metric_name="gpu_memory_percent",
                        metric_value=usage_percent,
                        threshold=self._alert_thresholds["gpu_memory_warning_percent"],
                    )
                    alerts.append(alert)
            
            # Check RAM
            if metrics.ram_total_gb:
                ram_percent = (metrics.ram_usage_gb / metrics.ram_total_gb) * 100
                if ram_percent >= self._alert_thresholds["ram_warning_percent"]:
                    alert = self._generate_alert(
                        job_id=job_id,
                        alert_type=AlertType.HIGH_MEMORY_USAGE,
                        severity=AlertSeverity.WARNING,
                        message=f"High RAM usage: {ram_percent:.1f}%",
                        metric_name="ram_percent",
                        metric_value=ram_percent,
                        threshold=self._alert_thresholds["ram_warning_percent"],
                    )
                    alerts.append(alert)
            
            # Check disk space
            if metrics.disk_total_gb:
                disk_percent = (metrics.disk_usage_gb / metrics.disk_total_gb) * 100
                if disk_percent >= self._alert_thresholds["disk_warning_percent"]:
                    alert = self._generate_alert(
                        job_id=job_id,
                        alert_type=AlertType.LOW_DISK_SPACE,
                        severity=AlertSeverity.WARNING if disk_percent < 98 else AlertSeverity.ERROR,
                        message=f"Low disk space: {disk_percent:.1f}% used",
                        metric_name="disk_percent",
                        metric_value=disk_percent,
                        threshold=self._alert_thresholds["disk_warning_percent"],
                    )
                    alerts.append(alert)
            
            # Check GPU temperature
            if metrics.gpu_temperature is not None:
                if metrics.gpu_temperature >= self._alert_thresholds["gpu_temp_warning"]:
                    alert = self._generate_alert(
                        job_id=job_id,
                        alert_type=AlertType.GPU_FAILURE,
                        severity=AlertSeverity.WARNING,
                        message=f"High GPU temperature: {metrics.gpu_temperature:.1f}°C",
                        metric_name="gpu_temperature",
                        metric_value=metrics.gpu_temperature,
                        threshold=self._alert_thresholds["gpu_temp_warning"],
                    )
                    alerts.append(alert)
            
        except Exception as e:
            self.logger.error(f"Failed to check system metrics: {e}")
        
        return alerts

    def _check_loss_explosion(
        self,
        job_id: str,
        metrics: TrainingMetrics,
    ) -> Optional[Alert]:
        """Check for loss explosion."""
        if metrics.training_loss is None:
            return None
        
        # Initialize history
        if job_id not in self._loss_history:
            self._loss_history[job_id] = deque(maxlen=100)
        
        history = self._loss_history[job_id]
        
        # Need at least 10 points for comparison
        if len(history) >= 10:
            avg_loss = sum(history) / len(history)
            
            # Check if current loss is much higher than average
            if metrics.training_loss > avg_loss * self._alert_thresholds["loss_explosion_multiplier"]:
                alert = self._generate_alert(
                    job_id=job_id,
                    alert_type=AlertType.LOSS_EXPLOSION,
                    severity=AlertSeverity.ERROR,
                    message=f"Loss explosion detected: {metrics.training_loss:.4f} vs avg {avg_loss:.4f}",
                    metric_name="training_loss",
                    metric_value=metrics.training_loss,
                    threshold=avg_loss * self._alert_thresholds["loss_explosion_multiplier"],
                    context={
                        "global_step": metrics.global_step,
                        "average_loss": avg_loss,
                    },
                )
                
                history.append(metrics.training_loss)
                return alert
        
        history.append(metrics.training_loss)
        return None

    def _generate_alert(
        self,
        job_id: str,
        alert_type: AlertType,
        severity: AlertSeverity,
        message: str,
        metric_name: Optional[str] = None,
        metric_value: Optional[float] = None,
        threshold: Optional[float] = None,
        context: Optional[Dict] = None,
    ) -> Alert:
        """Generate an alert."""
        alert_id = f"alert_{uuid.uuid4().hex[:8]}"
        
        alert = Alert(
            alert_id=alert_id,
            alert_type=alert_type,
            severity=severity,
            job_id=job_id,
            message=message,
            metric_name=metric_name,
            metric_value=metric_value,
            threshold=threshold,
            context=context or {},
        )
        
        # Store alert
        if job_id not in self._alerts:
            self._alerts[job_id] = []
        self._alerts[job_id].append(alert)
        
        # Emit event
        event_bus.emit("alert_generated", {
            "alert_id": alert_id,
            "job_id": job_id,
            "alert_type": alert_type.value,
            "severity": severity.value,
            "message": message,
        })
        
        # Log alert
        log_level = "WARNING"
        if severity == AlertSeverity.ERROR:
            log_level = "ERROR"
        elif severity == AlertSeverity.CRITICAL:
            log_level = "CRITICAL"
        
        self.logger.log(
            getattr(self.logger, log_level.lower()).__self__.__class__.__name__,
            f"[ALERT] {message}"
        )
        
        return alert

    def get_alerts(
        self,
        job_id: str,
        severity: Optional[AlertSeverity] = None,
        acknowledged: Optional[bool] = None,
    ) -> List[Alert]:
        """
        Get alerts for a job.
        
        Args:
            job_id: Job identifier
            severity: Filter by severity
            acknowledged: Filter by acknowledgment status
            
        Returns:
            List of alerts
        """
        alerts = self._alerts.get(job_id, [])
        
        # Apply filters
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]
        
        return alerts

    def acknowledge_alert(self, job_id: str, alert_id: str) -> bool:
        """Acknowledge an alert."""
        alerts = self._alerts.get(job_id, [])
        
        for alert in alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                self.logger.info(f"Alert acknowledged: {alert_id}")
                return True
        
        return False

    def clear_job_alerts(self, job_id: str) -> None:
        """Clear all alerts for a job."""
        if job_id in self._alerts:
            del self._alerts[job_id]
        if job_id in self._loss_history:
            del self._loss_history[job_id]

    def get_alert_stats(self, job_id: Optional[str] = None) -> Dict:
        """Get alert statistics."""
        if job_id:
            alerts = self._alerts.get(job_id, [])
        else:
            alerts = [a for alerts_list in self._alerts.values() for a in alerts_list]
        
        return {
            "total_alerts": len(alerts),
            "critical": sum(1 for a in alerts if a.severity == AlertSeverity.CRITICAL),
            "error": sum(1 for a in alerts if a.severity == AlertSeverity.ERROR),
            "warning": sum(1 for a in alerts if a.severity == AlertSeverity.WARNING),
            "info": sum(1 for a in alerts if a.severity == AlertSeverity.INFO),
            "unacknowledged": sum(1 for a in alerts if not a.acknowledged),
        }


# Global instance
alert_engine = AlertEngine()
