"""Tests for health monitor."""

import pytest
from datetime import datetime, timedelta
from app.distributed.health.health_monitor import HealthMonitor


class TestHealthMonitor:
    """Test health monitor functionality."""

    def setup_method(self):
        """Setup test method."""
        self.monitor = HealthMonitor()

    def test_register_worker(self):
        """Test worker registration."""
        worker_rank = 0
        
        self.monitor.register_worker(worker_rank)
        
        assert worker_rank in self.monitor._worker_heartbeats
        assert worker_rank in self.monitor._worker_health_history

    def test_update_heartbeat(self):
        """Test heartbeat update."""
        worker_rank = 0
        
        self.monitor.register_worker(worker_rank)
        initial_time = self.monitor._worker_heartbeats[worker_rank]
        
        # Update heartbeat
        self.monitor.update_heartbeat(worker_rank)
        updated_time = self.monitor._worker_heartbeats[worker_rank]
        
        assert updated_time >= initial_time

    def test_check_worker_health_healthy(self):
        """Test health check for healthy worker."""
        worker_rank = 0
        
        self.monitor.register_worker(worker_rank)
        self.monitor.update_heartbeat(worker_rank)
        
        is_healthy = self.monitor.check_worker_health(worker_rank)
        
        assert is_healthy is True

    def test_mark_worker_failed(self):
        """Test marking worker as failed."""
        worker_rank = 0
        
        self.monitor.register_worker(worker_rank)
        self.monitor.mark_worker_failed(worker_rank, "Test failure")
        
        assert worker_rank in self.monitor._failed_workers

    def test_mark_worker_recovered(self):
        """Test marking worker as recovered."""
        worker_rank = 0
        
        self.monitor.register_worker(worker_rank)
        self.monitor.mark_worker_failed(worker_rank)
        self.monitor.mark_worker_recovered(worker_rank)
        
        assert worker_rank not in self.monitor._failed_workers

    def test_get_healthy_workers(self):
        """Test getting healthy workers."""
        self.monitor.register_worker(0)
        self.monitor.register_worker(1)
        self.monitor.update_heartbeat(0)
        self.monitor.update_heartbeat(1)
        
        healthy = self.monitor.get_healthy_workers()
        
        assert len(healthy) == 2
        assert 0 in healthy
        assert 1 in healthy

    def test_get_failed_workers(self):
        """Test getting failed workers."""
        self.monitor.register_worker(0)
        self.monitor.mark_worker_failed(0)
        
        failed = self.monitor.get_failed_workers()
        
        assert len(failed) == 1
        assert 0 in failed

    def test_get_cluster_health_summary(self):
        """Test cluster health summary."""
        self.monitor.register_worker(0)
        self.monitor.register_worker(1)
        self.monitor.update_heartbeat(0)
        self.monitor.update_heartbeat(1)
        
        summary = self.monitor.get_cluster_health_summary()
        
        assert summary["total_workers"] == 2
        assert summary["healthy_workers"] == 2
        assert summary["failed_workers"] == 0
        assert summary["is_healthy"] is True
