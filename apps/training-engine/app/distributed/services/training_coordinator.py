"""Training coordinator for distributed training."""

from typing import Dict, Optional, Any
from datetime import datetime

from app.logger import training_logger
from app.distributed.distributed_manager import distributed_manager
from app.distributed.health.health_monitor import health_monitor
from app.distributed.health.fault_tolerance import fault_tolerance
from app.distributed.cluster.cluster_manager import cluster_manager
from app.distributed.communication.collective_ops import collective_ops
from app.distributed.communication.gradient_sync import gradient_sync
from app.distributed.schemas import DistributedConfig
from app.distributed.exceptions import DistributedTrainingException


class TrainingCoordinator:
    """
    Coordinates distributed training execution.
    
    Manages the full lifecycle of distributed training,
    including initialization, execution, monitoring, and cleanup.
    """

    def __init__(self):
        """Initialize training coordinator."""
        self.logger = training_logger
        self._active_jobs: Dict[str, Dict] = {}
        self._is_coordinating = False

    def start_job(
        self,
        job_id: str,
        config: DistributedConfig,
    ) -> Dict:
        """
        Start a distributed training job.
        
        Args:
            job_id: Job identifier
            config: Distributed configuration
            
        Returns:
            Job status dictionary
        """
        try:
            self.logger.info(f"Starting distributed training job: {job_id}")
            
            # Initialize distributed environment
            status = distributed_manager.initialize(config)
            
            # Initialize cluster if multi-node
            if config.num_machines > 1:
                cluster_manager.initialize_cluster(
                    num_nodes=config.num_machines,
                    node_rank=config.machine_rank,
                    master_addr=config.main_process_ip or "127.0.0.1",
                    master_port=config.main_process_port,
                )
            
            # Register workers with health monitor
            for rank in range(config.num_processes):
                health_monitor.register_worker(rank)
            
            # Store job info
            job_info = {
                "job_id": job_id,
                "config": config,
                "status": "running",
                "started_at": datetime.utcnow(),
                "distributed_status": status,
            }
            
            self._active_jobs[job_id] = job_info
            self._is_coordinating = True
            
            self.logger.info(f"Job {job_id} started successfully")
            
            return {
                "job_id": job_id,
                "status": "started",
                "message": "Distributed training job started",
            }
            
        except Exception as e:
            self.logger.error(f"Failed to start job {job_id}: {e}")
            raise DistributedTrainingException(f"Job start failed: {e}")

    def stop_job(
        self,
        job_id: str,
        graceful: bool = True,
    ) -> Dict:
        """
        Stop a distributed training job.
        
        Args:
            job_id: Job identifier
            graceful: Whether to perform graceful shutdown
            
        Returns:
            Job status dictionary
        """
        try:
            self.logger.info(f"Stopping job: {job_id} (graceful={graceful})")
            
            if job_id not in self._active_jobs:
                return {
                    "job_id": job_id,
                    "status": "not_found",
                    "message": "Job not found",
                }
            
            # Perform graceful shutdown if requested
            if graceful:
                workers = health_monitor.get_healthy_workers()
                fault_tolerance.graceful_shutdown(workers)
            
            # Cleanup distributed resources
            distributed_manager.shutdown()
            cluster_manager.cleanup()
            health_monitor.cleanup()
            
            # Update job status
            if job_id in self._active_jobs:
                self._active_jobs[job_id]["status"] = "stopped"
                self._active_jobs[job_id]["stopped_at"] = datetime.utcnow()
            
            self._is_coordinating = False
            
            self.logger.info(f"Job {job_id} stopped successfully")
            
            return {
                "job_id": job_id,
                "status": "stopped",
                "message": "Job stopped successfully",
            }
            
        except Exception as e:
            self.logger.error(f"Failed to stop job {job_id}: {e}")
            raise DistributedTrainingException(f"Job stop failed: {e}")

    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """
        Get status of a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job status dictionary or None
        """
        if job_id not in self._active_jobs:
            return None
        
        job_info = self._active_jobs[job_id]
        
        # Get current distributed status
        distributed_status = distributed_manager.get_status()
        
        # Get health status
        health_summary = health_monitor.get_cluster_health_summary()
        
        return {
            "job_id": job_id,
            "status": job_info["status"],
            "started_at": job_info["started_at"].isoformat(),
            "distributed_status": distributed_status.model_dump(),
            "health_summary": health_summary,
        }

    def monitor_training(self, job_id: str) -> Dict:
        """
        Monitor training progress and health.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Monitoring data
        """
        if job_id not in self._active_jobs:
            return {"error": "Job not found"}
        
        try:
            # Check worker health
            healthy_workers = health_monitor.get_healthy_workers()
            failed_workers = health_monitor.get_failed_workers()
            
            # Get communication metrics
            avg_comm_time = collective_ops.get_average_communication_time()
            avg_sync_time = gradient_sync.get_average_sync_time()
            
            # Get cluster health
            cluster_health = cluster_manager.get_cluster_health()
            
            return {
                "job_id": job_id,
                "timestamp": datetime.utcnow().isoformat(),
                "healthy_workers": healthy_workers,
                "failed_workers": failed_workers,
                "communication_time_ms": avg_comm_time,
                "gradient_sync_time_ms": avg_sync_time,
                "cluster_health": cluster_health,
            }
            
        except Exception as e:
            self.logger.error(f"Failed to monitor job {job_id}: {e}")
            return {"error": str(e)}

    def handle_worker_failure(
        self,
        job_id: str,
        worker_rank: int,
        error: Exception,
    ) -> bool:
        """
        Handle worker failure during training.
        
        Args:
            job_id: Job identifier
            worker_rank: Failed worker rank
            error: Error that caused failure
            
        Returns:
            True if recovery was successful
        """
        self.logger.error(f"Worker {worker_rank} failed in job {job_id}: {error}")
        
        # Mark worker as failed
        health_monitor.mark_worker_failed(worker_rank, str(error))
        
        # Attempt recovery
        recovered = fault_tolerance.handle_worker_failure(
            worker_rank,
            error,
            context={"job_id": job_id},
        )
        
        if recovered:
            health_monitor.mark_worker_recovered(worker_rank)
        
        return recovered

    def synchronize_workers(self, timeout_seconds: int = 300) -> bool:
        """
        Synchronize all workers.
        
        Args:
            timeout_seconds: Timeout in seconds
            
        Returns:
            True if synchronization succeeded
        """
        try:
            distributed_manager.barrier(timeout_seconds=timeout_seconds)
            return True
        except Exception as e:
            self.logger.error(f"Worker synchronization failed: {e}")
            return False

    def get_active_jobs(self) -> Dict[str, Dict]:
        """
        Get all active jobs.
        
        Returns:
            Dictionary of active jobs
        """
        return {
            job_id: {
                "job_id": job_info["job_id"],
                "status": job_info["status"],
                "started_at": job_info["started_at"].isoformat(),
            }
            for job_id, job_info in self._active_jobs.items()
        }

    def cleanup_all(self) -> None:
        """Cleanup all jobs and resources."""
        self.logger.info("Cleaning up all jobs")
        
        for job_id in list(self._active_jobs.keys()):
            try:
                self.stop_job(job_id, graceful=True)
            except:
                pass
        
        self._active_jobs.clear()
        self._is_coordinating = False


# Global instance
training_coordinator = TrainingCoordinator()
