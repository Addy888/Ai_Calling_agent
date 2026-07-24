"""Worker spawner for managing worker processes."""

import os
from typing import Callable, List, Dict, Any, Optional

try:
    import torch
    import torch.multiprocessing as mp
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    mp = None

from app.logger import training_logger
from app.distributed.exceptions import WorkerException


class WorkerSpawner:
    """
    Spawns and manages worker processes.
    
    Handles worker process lifecycle, environment setup,
    and inter-process communication.
    """

    def __init__(self):
        """Initialize worker spawner."""
        self.logger = training_logger
        self._worker_processes: Dict[int, Any] = {}

    def spawn_workers(
        self,
        worker_fn: Callable,
        num_workers: int,
        worker_args: tuple = (),
        start_method: str = "spawn",
    ) -> List[Any]:
        """
        Spawn worker processes.
        
        Args:
            worker_fn: Worker function to execute
            num_workers: Number of workers to spawn
            worker_args: Arguments to pass to workers
            start_method: Process start method
            
        Returns:
            List of worker processes
            
        Raises:
            WorkerException: If spawning fails
        """
        if not TORCH_AVAILABLE:
            raise WorkerException("PyTorch is not available")
        
        try:
            self.logger.info(f"Spawning {num_workers} workers")
            
            # Set multiprocessing start method
            mp.set_start_method(start_method, force=True)
            
            # Spawn workers
            processes = []
            for rank in range(num_workers):
                process = mp.Process(
                    target=worker_fn,
                    args=(rank, num_workers) + worker_args,
                )
                process.start()
                processes.append(process)
                self._worker_processes[rank] = process
            
            self.logger.info(f"Successfully spawned {num_workers} workers")
            return processes
            
        except Exception as e:
            self.logger.error(f"Failed to spawn workers: {e}")
            raise WorkerException(f"Worker spawning failed: {e}")

    def wait_for_workers(self, timeout: Optional[float] = None) -> List[int]:
        """
        Wait for all workers to complete.
        
        Args:
            timeout: Timeout in seconds
            
        Returns:
            List of worker exit codes
        """
        exit_codes = []
        
        for rank, process in self._worker_processes.items():
            try:
                process.join(timeout=timeout)
                exit_code = process.exitcode
                exit_codes.append(exit_code)
                
                if exit_code != 0:
                    self.logger.warning(f"Worker {rank} exited with code {exit_code}")
                    
            except Exception as e:
                self.logger.error(f"Error waiting for worker {rank}: {e}")
                exit_codes.append(-1)
        
        return exit_codes

    def terminate_worker(self, rank: int) -> None:
        """
        Terminate a specific worker.
        
        Args:
            rank: Worker rank
        """
        if rank not in self._worker_processes:
            self.logger.warning(f"Worker {rank} not found")
            return
        
        try:
            process = self._worker_processes[rank]
            process.terminate()
            process.join(timeout=5)
            
            if process.is_alive():
                process.kill()
            
            self.logger.info(f"Worker {rank} terminated")
            
        except Exception as e:
            self.logger.error(f"Failed to terminate worker {rank}: {e}")

    def terminate_all_workers(self) -> None:
        """Terminate all worker processes."""
        self.logger.info("Terminating all workers")
        
        for rank in list(self._worker_processes.keys()):
            self.terminate_worker(rank)
        
        self._worker_processes.clear()

    def is_worker_alive(self, rank: int) -> bool:
        """
        Check if a worker is alive.
        
        Args:
            rank: Worker rank
            
        Returns:
            True if worker is alive
        """
        if rank not in self._worker_processes:
            return False
        
        process = self._worker_processes[rank]
        return process.is_alive()

    def get_worker_pid(self, rank: int) -> Optional[int]:
        """
        Get PID of a worker process.
        
        Args:
            rank: Worker rank
            
        Returns:
            Process ID or None
        """
        if rank not in self._worker_processes:
            return None
        
        process = self._worker_processes[rank]
        return process.pid

    def setup_worker_environment(
        self,
        rank: int,
        world_size: int,
        master_addr: str = "127.0.0.1",
        master_port: int = 29500,
    ) -> None:
        """
        Setup environment variables for a worker.
        
        Args:
            rank: Worker rank
            world_size: Total number of workers
            master_addr: Master address
            master_port: Master port
        """
        os.environ.update({
            "RANK": str(rank),
            "WORLD_SIZE": str(world_size),
            "LOCAL_RANK": str(rank),
            "MASTER_ADDR": master_addr,
            "MASTER_PORT": str(master_port),
        })

    def cleanup(self) -> None:
        """Cleanup spawner resources."""
        self.terminate_all_workers()


# Global instance
worker_spawner = WorkerSpawner()
