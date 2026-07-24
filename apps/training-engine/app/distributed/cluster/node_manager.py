"""Node-level management for distributed workers."""

import os
import psutil
from typing import Dict, List, Optional
from datetime import datetime

from app.logger import training_logger


class NodeManager:
    """
    Manages workers on a single node.
    
    Monitors resources, tracks worker processes,
    and manages local GPU allocation.
    """

    def __init__(self):
        """Initialize node manager."""
        self.logger = training_logger
        self._local_workers: Dict[int, Dict] = {}  # local_rank -> worker_info
        self._resource_allocations: Dict[int, Dict] = {}  # local_rank -> resources

    def register_local_worker(
        self,
        local_rank: int,
        global_rank: int,
        pid: int,
        device_id: Optional[int] = None,
    ) -> None:
        """
        Register a worker process on this node.
        
        Args:
            local_rank: Local rank within node
            global_rank: Global rank across cluster
            pid: Process ID
            device_id: GPU device ID
        """
        worker_info = {
            "local_rank": local_rank,
            "global_rank": global_rank,
            "pid": pid,
            "device_id": device_id,
            "status": "active",
            "registered_at": datetime.utcnow(),
            "last_heartbeat": datetime.utcnow(),
        }
        
        self._local_workers[local_rank] = worker_info
        self.logger.info(
            f"Local worker registered: local_rank={local_rank}, "
            f"global_rank={global_rank}, pid={pid}"
        )

    def unregister_local_worker(self, local_rank: int) -> None:
        """
        Unregister a worker process.
        
        Args:
            local_rank: Local rank
        """
        if local_rank in self._local_workers:
            worker_info = self._local_workers.pop(local_rank)
            self.logger.info(f"Local worker unregistered: local_rank={local_rank}")

    def update_worker_heartbeat(self, local_rank: int) -> None:
        """
        Update worker heartbeat timestamp.
        
        Args:
            local_rank: Local rank
        """
        if local_rank in self._local_workers:
            self._local_workers[local_rank]["last_heartbeat"] = datetime.utcnow()

    def is_worker_alive(self, local_rank: int) -> bool:
        """
        Check if a worker process is alive.
        
        Args:
            local_rank: Local rank
            
        Returns:
            True if worker is alive
        """
        if local_rank not in self._local_workers:
            return False
        
        worker = self._local_workers[local_rank]
        pid = worker.get("pid")
        
        if pid is None:
            return False
        
        try:
            return psutil.pid_exists(pid)
        except:
            return False

    def get_worker_info(self, local_rank: int) -> Optional[Dict]:
        """
        Get information about a worker.
        
        Args:
            local_rank: Local rank
            
        Returns:
            Worker information dictionary
        """
        return self._local_workers.get(local_rank)

    def get_all_workers(self) -> Dict[int, Dict]:
        """
        Get all workers on this node.
        
        Returns:
            Dictionary of workers
        """
        return self._local_workers.copy()

    def allocate_device(self, local_rank: int, device_id: int) -> None:
        """
        Allocate a device to a worker.
        
        Args:
            local_rank: Local rank
            device_id: Device ID to allocate
        """
        self._resource_allocations[local_rank] = {
            "device_id": device_id,
            "allocated_at": datetime.utcnow(),
        }
        
        if local_rank in self._local_workers:
            self._local_workers[local_rank]["device_id"] = device_id

    def get_device_allocation(self, local_rank: int) -> Optional[int]:
        """
        Get device allocation for a worker.
        
        Args:
            local_rank: Local rank
            
        Returns:
            Device ID or None
        """
        allocation = self._resource_allocations.get(local_rank)
        return allocation.get("device_id") if allocation else None

    def get_node_resources(self) -> Dict:
        """
        Get node resource information.
        
        Returns:
            Dictionary with resource information
        """
        try:
            # CPU information
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory information
            memory = psutil.virtual_memory()
            memory_total_gb = memory.total / (1024 ** 3)
            memory_available_gb = memory.available / (1024 ** 3)
            memory_percent = memory.percent
            
            # GPU information
            gpu_info = []
            try:
                import torch
                if torch.cuda.is_available():
                    for i in range(torch.cuda.device_count()):
                        gpu_info.append({
                            "device_id": i,
                            "name": torch.cuda.get_device_name(i),
                            "memory_allocated_mb": torch.cuda.memory_allocated(i) / (1024 ** 2),
                            "memory_reserved_mb": torch.cuda.memory_reserved(i) / (1024 ** 2),
                        })
            except:
                pass
            
            return {
                "cpu_count": cpu_count,
                "cpu_percent": cpu_percent,
                "memory_total_gb": memory_total_gb,
                "memory_available_gb": memory_available_gb,
                "memory_percent": memory_percent,
                "gpus": gpu_info,
                "num_workers": len(self._local_workers),
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get node resources: {e}")
            return {}

    def get_worker_resource_usage(self, local_rank: int) -> Optional[Dict]:
        """
        Get resource usage for a specific worker.
        
        Args:
            local_rank: Local rank
            
        Returns:
            Resource usage dictionary
        """
        if local_rank not in self._local_workers:
            return None
        
        worker = self._local_workers[local_rank]
        pid = worker.get("pid")
        
        if pid is None:
            return None
        
        try:
            process = psutil.Process(pid)
            
            cpu_percent = process.cpu_percent(interval=0.1)
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 ** 2)
            
            return {
                "local_rank": local_rank,
                "pid": pid,
                "cpu_percent": cpu_percent,
                "memory_mb": memory_mb,
                "status": process.status(),
            }
            
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return None

    def cleanup(self) -> None:
        """Cleanup node resources."""
        self.logger.info("Cleaning up node resources")
        self._local_workers.clear()
        self._resource_allocations.clear()


# Global instance
node_manager = NodeManager()
