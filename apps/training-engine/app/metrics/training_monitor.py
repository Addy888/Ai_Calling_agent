"""Training monitor for continuous health monitoring and anomaly detection."""

import asyncio
import time
from typing import Dict, Optional, Set
from datetime import datetime, timedelta

from app.events import event_bus
from app.logger import training_logger
from app.metrics.metrics_collector import metrics_collector
from app.metrics.metrics_storage import metrics_storage
from app.metrics.alert_engine import alert_engine
from app.metrics.schemas import (
    MonitorStatus,
    Alert,
    AlertType,
    AlertSeverity,
)
from app.metrics.exceptions import MonitorException


class TrainingMonitor:
    """
    Training monitor for continuous health monitoring.
    
    Watches runtime, training progress, GPU, memory, and disk.
    Detects slowdowns, stalls, and failures.
    """

    def __init__(
        self,
        check_interval_seconds: int = 30,
        stall_threshold_seconds: int = 300,  # 5 minutes
        slowdown_threshold_percent: float = 50.0,  # 50% slower
    ):
        """
        Initialize training monitor.
        
        Args:
            check_interval_seconds: Monitoring check interval
            stall_threshold_seconds: Time without progress = stalled
            slowdown_threshold_percent: % slower than average = slowdown
        """
        self.logger = training_logger
        self.check_interval = check_interval_seconds
        self.stall_threshold = stall_threshold_seconds
        self.slowdown_threshold = slowdown_threshold_percent
        
        self._monitoring: Dict[str, bool] = {}
        self._monitor_tasks: Dict[str, asyncio.Task] = {}
        self._last_progress: Dict[str, datetime] = {}
        self._last_step: Dict[str, int] = {}
        self._active_jobs: Set[str] = set()
        
        self.logger.info("Training monitor initialized")

    async def start_monitoring(self, job_id: str) -> None:
        """
        Start monitoring a job.
        
        Args:
            job_id: Job identifier
        """
        if job_id in self._monitoring and self._monitoring[job_id]:
            self.logger.warning(f"Already monitoring job: {job_id}")
            return
        
        self._monitoring[job_id] = True
        self._active_jobs.add(job_id)
        self._last_progress[job_id] = datetime.now()
        self._last_step[job_id] = 0
        
        # Start monitoring task
        task = asyncio.create_task(self._monitor_loop(job_id))
        self._monitor_tasks[job_id] = task
        
        event_bus.emit("logger_started", {
            "job_id": job_id,
            "timestamp": datetime.now().isoformat(),
        })
        
        self.logger.info(f"Started monitoring job: {job_id}")

    async def stop_monitoring(self, job_id: str) -> None:
        """
        Stop monitoring a job.
        
        Args:
            job_id: Job identifier
        """
        if job_id not in self._monitoring:
            return
        
        self._monitoring[job_id] = False
        self._active_jobs.discard(job_id)
        
        # Cancel monitoring task
        if job_id in self._monitor_tasks:
            task = self._monitor_tasks[job_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self._monitor_tasks[job_id]
        
        event_bus.emit("logger_stopped", {
            "job_id": job_id,
            "timestamp": datetime.now().isoformat(),
        })
        
        self.logger.info(f"Stopped monitoring job: {job_id}")

    async def _monitor_loop(self, job_id: str) -> None:
        """
        Main monitoring loop for a job.
        
        Args:
            job_id: Job identifier
        """
        try:
            while self._monitoring.get(job_id, False):
                await self._perform_checks(job_id)
                await asyncio.sleep(self.check_interval)
                
        except asyncio.CancelledError:
            self.logger.info(f"Monitoring cancelled for job: {job_id}")
        except Exception as e:
            self.logger.error(f"Monitoring error for job {job_id}: {e}")
            raise MonitorException(f"Monitoring failed: {e}")

    async def _perform_checks(self, job_id: str) -> None:
        """
        Perform all health checks for a job.
        
        Args:
            job_id: Job identifier
        """
        try:
            # Collect system metrics
            system_metrics = metrics_collector.collect_system_metrics(job_id)
            metrics_storage.store_system_metrics(system_metrics)
            
            # Check for GPU warnings
            if system_metrics.gpu_temperature_celsius:
                if system_metrics.gpu_temperature_celsius > 85.0:
                    await self._generate_gpu_warning(
                        job_id,
                        f"High GPU temperature: {system_metrics.gpu_temperature_celsius}°C"
                    )
            
            # Check for memory warnings
            if system_metrics.ram_usage_percent > 90.0:
                await self._generate_memory_warning(
                    job_id,
                    f"High RAM usage: {system_metrics.ram_usage_percent}%"
                )
            
            if system_metrics.gpu_memory_used_gb and system_metrics.gpu_memory_total_gb:
                gpu_memory_percent = (
                    system_metrics.gpu_memory_used_gb / 
                    system_metrics.gpu_memory_total_gb * 100
                )
                if gpu_memory_percent > 95.0:
                    await self._generate_memory_warning(
                        job_id,
                        f"High GPU memory usage: {gpu_memory_percent:.1f}%"
                    )
            
            # Check for training stalls
            await self._check_training_stall(job_id)
            
            # Check for slowdowns
            await self._check_training_slowdown(job_id)
            
            # Run alert engine checks
            training_metrics = metrics_storage.get_latest_training_metrics(job_id)
            if training_metrics:
                alerts = alert_engine.check_training_metrics(job_id, training_metrics)
                for alert in alerts:
                    await self._handle_alert(alert)
            
        except Exception as e:
            self.logger.error(f"Health check failed for job {job_id}: {e}")

    async def _check_training_stall(self, job_id: str) -> None:
        """
        Check if training has stalled.
        
        Args:
            job_id: Job identifier
        """
        try:
            training_metrics = metrics_storage.get_latest_training_metrics(job_id)
            
            if not training_metrics:
                return
            
            current_step = training_metrics.global_step
            last_step = self._last_step.get(job_id, 0)
            
            if current_step > last_step:
                # Progress detected
                self._last_progress[job_id] = datetime.now()
                self._last_step[job_id] = current_step
                return
            
            # Check time since last progress
            last_progress_time = self._last_progress.get(job_id)
            if not last_progress_time:
                return
            
            time_since_progress = (datetime.now() - last_progress_time).total_seconds()
            
            if time_since_progress > self.stall_threshold:
                await self._generate_stall_warning(
                    job_id,
                    f"No progress for {time_since_progress:.0f} seconds"
                )
                
        except Exception as e:
            self.logger.error(f"Stall check failed for job {job_id}: {e}")

    async def _check_training_slowdown(self, job_id: str) -> None:
        """
        Check if training has slowed down significantly.
        
        Args:
            job_id: Job identifier
        """
        try:
            # Get recent performance metrics
            perf_metrics = metrics_storage.get_performance_metrics(
                job_id,
                limit=100
            )
            
            if len(perf_metrics) < 10:
                return  # Not enough data
            
            # Calculate average samples per second
            recent_speeds = [m.samples_per_second for m in perf_metrics[-10:]]
            historical_speeds = [m.samples_per_second for m in perf_metrics[:-10]]
            
            if not recent_speeds or not historical_speeds:
                return
            
            recent_avg = sum(recent_speeds) / len(recent_speeds)
            historical_avg = sum(historical_speeds) / len(historical_speeds)
            
            # Check for significant slowdown
            if historical_avg > 0:
                slowdown_percent = (
                    (historical_avg - recent_avg) / historical_avg * 100
                )
                
                if slowdown_percent > self.slowdown_threshold:
                    self.logger.warning(
                        f"Training slowdown detected for job {job_id}: "
                        f"{slowdown_percent:.1f}% slower"
                    )
                    
        except Exception as e:
            self.logger.error(f"Slowdown check failed for job {job_id}: {e}")

    async def _generate_gpu_warning(self, job_id: str, message: str) -> None:
        """Generate GPU warning event."""
        event_bus.emit("gpu_warning", {
            "job_id": job_id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        })
        self.logger.warning(f"GPU Warning [{job_id}]: {message}")

    async def _generate_memory_warning(self, job_id: str, message: str) -> None:
        """Generate memory warning event."""
        event_bus.emit("memory_warning", {
            "job_id": job_id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        })
        self.logger.warning(f"Memory Warning [{job_id}]: {message}")

    async def _generate_stall_warning(self, job_id: str, message: str) -> None:
        """Generate training stall warning event."""
        event_bus.emit("training_stalled", {
            "job_id": job_id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        })
        self.logger.warning(f"Training Stalled [{job_id}]: {message}")

    async def _handle_alert(self, alert: Alert) -> None:
        """
        Handle generated alert.
        
        Args:
            alert: Alert to handle
        """
        event_bus.emit("alert_generated", {
            "job_id": alert.job_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
        })
        
        severity_emoji = {
            AlertSeverity.INFO: "ℹ️",
            AlertSeverity.WARNING: "⚠️",
            AlertSeverity.ERROR: "❌",
            AlertSeverity.CRITICAL: "🚨",
        }
        
        emoji = severity_emoji.get(alert.severity, "⚠️")
        self.logger.warning(
            f"{emoji} Alert [{alert.job_id}] {alert.alert_type}: {alert.message}"
        )

    def get_status(self, job_id: Optional[str] = None) -> MonitorStatus:
        """
        Get monitoring status.
        
        Args:
            job_id: Optional job to get status for
            
        Returns:
            MonitorStatus
        """
        if job_id:
            is_active = self._monitoring.get(job_id, False)
            last_check = self._last_progress.get(job_id)
            
            return MonitorStatus(
                is_monitoring=is_active,
                active_jobs=[job_id] if is_active else [],
                last_check_time=last_check,
                total_checks_performed=0,  # Could track this
                alerts_generated=len(alert_engine.get_alerts(job_id)),
            )
        
        # Overall status
        return MonitorStatus(
            is_monitoring=len(self._active_jobs) > 0,
            active_jobs=list(self._active_jobs),
            last_check_time=max(self._last_progress.values()) if self._last_progress else None,
            total_checks_performed=0,
            alerts_generated=sum(
                len(alert_engine.get_alerts(job_id))
                for job_id in self._active_jobs
            ),
        )

    def is_monitoring(self, job_id: str) -> bool:
        """Check if monitoring a job."""
        return self._monitoring.get(job_id, False)

    async def shutdown(self) -> None:
        """Shutdown monitor and cancel all tasks."""
        job_ids = list(self._active_jobs)
        
        for job_id in job_ids:
            await self.stop_monitoring(job_id)
        
        self.logger.info("Training monitor shutdown complete")


# Global instance
training_monitor = TrainingMonitor()

