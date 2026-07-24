"""Health monitoring for distributed training workers."""

import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import deque

from app.logger import training_logger
from app.distributed.schemas import WorkerInfo, WorkerStatus


class HealthMonitor:
    """
    Monitors health of distributed training workers.
    
    Tracks worker heartbeats, detects failures,
    and provides health status reporting.
    """

    def __init__(self):
        """Initialize health monitor."""
        self.logger = training_logger
        self._worker_heartbeats: Dict[int, datetime] = {}
        self._worker_health_history: Dict[int, deque] = {}
        self._failed_workers: set = set()
        self._heartbeat_timeout_seconds = 60
        self._health_check_interval = 10

    def register_worker(self, worker_rank: int) -> None:
        """
        Register a worker for health monitoring.
        
        Args:
            worker_rank: Worker rank
        """
        self._worker_heartbeats[worker_rank] = datetime.utcnow()
        self._worker_health_history[worker_rank] = deque(maxlen=100)
        self.logger.info(f"Worker {worker_rank} registered for health monitoring")

    def update_heartbeat(self, worker_rank: int) -> None:
        """
        Update worker heartbeat.
        
        Args:
            worker_rank: Worker rank
        """
        self._worker_heartbeats[worker_rank] = datetime.utcnow()
        
        # Record health check
        self._worker_health_history[worker_rank].append({
            "timestamp": datetime.utcnow(),
            "status": "healthy",
        })

    def check_worker_health(self, worker_rank: int) -> bool:
        """
        Check if a worker is healthy.
        
        Args:
            worker_rank: Worker rank
            
        Returns:
            True if worker is healthy
        """
        if worker_rank in self._failed_workers:
            return False
        
        if worker_rank not in self._worker_heartbeats:
            return False
        
        last_heartbeat = self._worker_heartbeats[worker_rank]
        time_since_heartbeat = datetime.utcnow() - last_heartbeat
        
        is_healthy = time_since_heartbeat.total_seconds() < self._heartbeat_timeout_seconds
        
        if not is_healthy:
            self.mark_worker_failed(worker_rank, "Heartbeat timeout")
        
        return is_healthy

    def mark_worker_failed(self, worker_rank: int, reason: str = "") -> None:
        """
        Mark a worker as failed.
        
        Args:
            worker_rank: Worker rank
            reason: Failure reason
        """
        self._failed_workers.add(worker_rank)
        
        if worker_rank in self._worker_health_history:
            self._worker_health_history[worker_rank].append({
                "timestamp": datetime.utcnow(),
                "status": "failed",
                "reason": reason,
            })
        
        self.logger.error(f"Worker {worker_rank} marked as failed: {reason}")

    def mark_worker_recovered(self, worker_rank: int) -> None:
        """
        Mark a failed worker as recovered.
        
        Args:
            worker_rank: Worker rank
        """
        if worker_rank in self._failed_workers:
            self._failed_workers.remove(worker_rank)
        
        self._worker_heartbeats[worker_rank] = datetime.utcnow()
        
        if worker_rank in self._worker_health_history:
            self._worker_health_history[worker_rank].append({
                "timestamp": datetime.utcnow(),
                "status": "recovered",
            })
        
        self.logger.info(f"Worker {worker_rank} recovered")

    def get_healthy_workers(self) -> List[int]:
        """
        Get list of healthy worker ranks.
        
        Returns:
            List of healthy worker ranks
        """
        healthy = []
        for worker_rank in self._worker_heartbeats.keys():
            if self.check_worker_health(worker_rank):
                healthy.append(worker_rank)
        return healthy

    def get_failed_workers(self) -> List[int]:
        """
        Get list of failed worker ranks.
        
        Returns:
            List of failed worker ranks
        """
        return list(self._failed_workers)

    def get_worker_health_status(self, worker_rank: int) -> Dict:
        """
        Get detailed health status for a worker.
        
        Args:
            worker_rank: Worker rank
            
        Returns:
            Dictionary with health status
        """
        if worker_rank not in self._worker_heartbeats:
            return {
                "worker_rank": worker_rank,
                "status": "unknown",
                "registered": False,
            }
        
        last_heartbeat = self._worker_heartbeats[worker_rank]
        time_since_heartbeat = datetime.utcnow() - last_heartbeat
        is_healthy = self.check_worker_health(worker_rank)
        
        return {
            "worker_rank": worker_rank,
            "status": "healthy" if is_healthy else "unhealthy",
            "registered": True,
            "last_heartbeat": last_heartbeat.isoformat(),
            "seconds_since_heartbeat": time_since_heartbeat.total_seconds(),
            "is_failed": worker_rank in self._failed_workers,
        }

    def get_cluster_health_summary(self) -> Dict:
        """
        Get overall cluster health summary.
        
        Returns:
            Dictionary with cluster health information
        """
        total_workers = len(self._worker_heartbeats)
        healthy_workers = len(self.get_healthy_workers())
        failed_workers = len(self._failed_workers)
        
        health_percentage = (healthy_workers / total_workers * 100) if total_workers > 0 else 0
        
        return {
            "total_workers": total_workers,
            "healthy_workers": healthy_workers,
            "failed_workers": failed_workers,
            "health_percentage": health_percentage,
            "is_healthy": failed_workers == 0,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_worker_uptime(self, worker_rank: int) -> Optional[float]:
        """
        Get worker uptime in seconds.
        
        Args:
            worker_rank: Worker rank
            
        Returns:
            Uptime in seconds or None
        """
        if worker_rank not in self._worker_health_history:
            return None
        
        history = self._worker_health_history[worker_rank]
        if not history:
            return None
        
        # Find first healthy record
        first_record = history[0]
        first_time = first_record["timestamp"]
        
        uptime = (datetime.utcnow() - first_time).total_seconds()
        return uptime

    def cleanup(self) -> None:
        """Cleanup health monitor resources."""
        self.logger.info("Cleaning up health monitor")
        self._worker_heartbeats.clear()
        self._worker_health_history.clear()
        self._failed_workers.clear()


# Global instance
health_monitor = HealthMonitor()
