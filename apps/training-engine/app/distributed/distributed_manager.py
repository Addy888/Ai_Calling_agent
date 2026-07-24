"""Distributed training manager - coordinates distributed training operations."""

import os
import socket
from typing import Dict, List, Optional, Any
from datetime import datetime

try:
    import torch
    import torch.distributed as dist
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    dist = None

from app.logger import training_logger
from app.events import event_bus
from app.distributed.device_manager import device_manager
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStrategy,
    DistributedStatus,
    WorkerInfo,
    WorkerStatus,
    ProcessGroupInfo,
    DistributedBackend,
)
from app.distributed.exceptions import (
    DistributedTrainingException,
    DistributedInitializationError,
    ProcessGroupException,
)


class DistributedTrainingManager:
    """
    Manages distributed training orchestration.
    
    Coordinates initialization, worker management, synchronization,
    and health monitoring for distributed training.
    """

    def __init__(self):
        """Initialize distributed training manager."""
        self.logger = training_logger
        self._is_initialized = False
        self._config: Optional[DistributedConfig] = None
        self._process_group_info: Optional[ProcessGroupInfo] = None
        self._workers: Dict[int, WorkerInfo] = {}
        self._active_jobs: Dict[str, bool] = {}

    def initialize(self, config: DistributedConfig) -> DistributedStatus:
        """
        Initialize distributed training environment.
        
        Args:
            config: Distributed training configuration
            
        Returns:
            DistributedStatus with initialization info
            
        Raises:
            DistributedInitializationError: If initialization fails
        """
        if not TORCH_AVAILABLE:
            raise DistributedInitializationError("PyTorch is not available")
        
        self.logger.info("Initializing distributed training environment")
        
        try:
            # Store configuration
            self._config = config
            
            # Auto-detect settings if not specified
            if config.num_processes is None:
                config.num_processes = device_manager.get_device_count()
            
            if config.backend is None:
                config.backend = device_manager.get_recommended_backend()
            
            # Check if we're already in a distributed environment
            if self._is_distributed_environment():
                self._init_from_environment()
            else:
                # For single process, set minimal config
                self._init_single_process()
            
            # Detect devices
            devices = device_manager.detect_devices()
            
            # Create status
            status = DistributedStatus(
                is_distributed=self._is_initialized and config.num_processes > 1,
                strategy=config.strategy,
                num_processes=config.num_processes,
                num_machines=config.num_machines,
                current_machine_rank=config.machine_rank,
                world_size=self._process_group_info.world_size if self._process_group_info else 1,
                rank=self._process_group_info.rank if self._process_group_info else 0,
                local_rank=self._process_group_info.local_rank if self._process_group_info else 0,
                is_main_process=self._process_group_info.is_main_process if self._process_group_info else True,
                devices=devices,
                backend=config.backend.value if config.backend else "none",
                all_workers_ready=True,
            )
            
            self._is_initialized = True
            
            # Emit event
            event_bus.emit("distributed_initialized", {
                "strategy": config.strategy.value,
                "num_processes": config.num_processes,
                "backend": str(config.backend),
            })
            
            self.logger.info(f"Distributed environment initialized: {config.strategy.value}")
            
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to initialize distributed environment: {e}")
            raise DistributedInitializationError(f"Initialization failed: {e}")

    def is_initialized(self) -> bool:
        """Check if distributed training is initialized."""
        return self._is_initialized

    def is_distributed(self) -> bool:
        """Check if running in distributed mode."""
        if not self._is_initialized:
            return False
        return self._config.num_processes > 1 if self._config else False

    def is_main_process(self) -> bool:
        """Check if this is the main process."""
        if not self._is_initialized or not self._process_group_info:
            return True
        return self._process_group_info.is_main_process

    def get_rank(self) -> int:
        """Get current process rank."""
        if not self._is_initialized or not self._process_group_info:
            return 0
        return self._process_group_info.rank

    def get_world_size(self) -> int:
        """Get total number of processes."""
        if not self._is_initialized or not self._process_group_info:
            return 1
        return self._process_group_info.world_size

    def get_local_rank(self) -> int:
        """Get local rank (within node)."""
        if not self._is_initialized or not self._process_group_info:
            return 0
        return self._process_group_info.local_rank

    def get_status(self) -> DistributedStatus:
        """
        Get current distributed training status.
        
        Returns:
            DistributedStatus
        """
        if not self._is_initialized or not self._config:
            return DistributedStatus(
                is_distributed=False,
                strategy=DistributedStrategy.NONE,
                num_processes=1,
                num_machines=1,
                current_machine_rank=0,
                world_size=1,
                rank=0,
                local_rank=0,
                is_main_process=True,
                devices=device_manager.detect_devices(),
                backend="none",
                all_workers_ready=True,
            )
        
        return DistributedStatus(
            is_distributed=self.is_distributed(),
            strategy=self._config.strategy,
            num_processes=self._config.num_processes,
            num_machines=self._config.num_machines,
            current_machine_rank=self._config.machine_rank,
            world_size=self.get_world_size(),
            rank=self.get_rank(),
            local_rank=self.get_local_rank(),
            is_main_process=self.is_main_process(),
            devices=device_manager.detect_devices(),
            backend=self._config.backend.value if self._config.backend else "none",
            all_workers_ready=self._check_all_workers_ready(),
        )

    def barrier(self, timeout_seconds: Optional[int] = None) -> None:
        """
        Synchronization barrier across all processes.
        
        Args:
            timeout_seconds: Timeout in seconds
            
        Raises:
            ProcessGroupException: If barrier fails
        """
        if not self.is_distributed():
            return
        
        if not dist.is_initialized():
            return
        
        try:
            timeout = None
            if timeout_seconds:
                import datetime
                timeout = datetime.timedelta(seconds=timeout_seconds)
            
            dist.barrier(timeout=timeout)
            
        except Exception as e:
            self.logger.error(f"Barrier synchronization failed: {e}")
            raise ProcessGroupException(f"Barrier failed: {e}")

    def broadcast(self, tensor: Any, src: int = 0) -> Any:
        """
        Broadcast tensor from source rank to all processes.
        
        Args:
            tensor: Tensor to broadcast
            src: Source rank
            
        Returns:
            Broadcasted tensor
        """
        if not self.is_distributed() or not dist.is_initialized():
            return tensor
        
        try:
            dist.broadcast(tensor, src=src)
            return tensor
        except Exception as e:
            self.logger.error(f"Broadcast failed: {e}")
            raise ProcessGroupException(f"Broadcast failed: {e}")

    def all_reduce(self, tensor: Any, op: str = "sum") -> Any:
        """
        All-reduce operation across all processes.
        
        Args:
            tensor: Tensor to reduce
            op: Reduction operation (sum, mean, min, max)
            
        Returns:
            Reduced tensor
        """
        if not self.is_distributed() or not dist.is_initialized():
            return tensor
        
        try:
            reduce_op = {
                "sum": dist.ReduceOp.SUM,
                "mean": dist.ReduceOp.SUM,  # Will divide by world_size
                "min": dist.ReduceOp.MIN,
                "max": dist.ReduceOp.MAX,
            }.get(op, dist.ReduceOp.SUM)
            
            dist.all_reduce(tensor, op=reduce_op)
            
            if op == "mean":
                tensor = tensor / self.get_world_size()
            
            return tensor
            
        except Exception as e:
            self.logger.error(f"All-reduce failed: {e}")
            raise ProcessGroupException(f"All-reduce failed: {e}")

    def shutdown(self) -> None:
        """Shutdown distributed training environment."""
        if not self._is_initialized:
            return
        
        self.logger.info("Shutting down distributed environment")
        
        try:
            if dist.is_initialized():
                dist.destroy_process_group()
            
            self._is_initialized = False
            self._process_group_info = None
            self._workers.clear()
            
            event_bus.emit("distributed_shutdown", {
                "timestamp": datetime.utcnow().isoformat(),
            })
            
        except Exception as e:
            self.logger.error(f"Failed to shutdown distributed environment: {e}")

    def _is_distributed_environment(self) -> bool:
        """Check if running in a distributed environment."""
        return any([
            "RANK" in os.environ,
            "LOCAL_RANK" in os.environ,
            "WORLD_SIZE" in os.environ,
            dist.is_initialized() if TORCH_AVAILABLE else False,
        ])

    def _init_from_environment(self) -> None:
        """Initialize from existing distributed environment."""
        try:
            # Get distributed parameters from environment
            rank = int(os.environ.get("RANK", 0))
            local_rank = int(os.environ.get("LOCAL_RANK", 0))
            world_size = int(os.environ.get("WORLD_SIZE", 1))
            
            # Initialize process group if not already done
            if not dist.is_initialized():
                backend = self._config.backend.value if self._config.backend else "nccl"
                dist.init_process_group(backend=backend)
            
            # Get master address and port
            master_addr = os.environ.get("MASTER_ADDR", "localhost")
            master_port = int(os.environ.get("MASTER_PORT", 29500))
            
            # Create process group info
            self._process_group_info = ProcessGroupInfo(
                world_size=world_size,
                rank=rank,
                local_rank=local_rank,
                local_world_size=torch.cuda.device_count() if torch.cuda.is_available() else 1,
                is_main_process=(rank == 0),
                backend=dist.get_backend(),
                master_addr=master_addr,
                master_port=master_port,
            )
            
            # Register this worker
            self._register_worker(rank, local_rank)
            
        except Exception as e:
            self.logger.error(f"Failed to initialize from environment: {e}")
            raise DistributedInitializationError(f"Environment initialization failed: {e}")

    def _init_single_process(self) -> None:
        """Initialize for single process (non-distributed)."""
        self._process_group_info = ProcessGroupInfo(
            world_size=1,
            rank=0,
            local_rank=0,
            local_world_size=1,
            is_main_process=True,
            backend="none",
            master_addr="localhost",
            master_port=29500,
        )

    def _register_worker(self, rank: int, local_rank: int) -> None:
        """Register a worker process."""
        try:
            devices = device_manager.detect_devices()
            device = devices[local_rank] if local_rank < len(devices) else devices[0]
            
            worker = WorkerInfo(
                rank=rank,
                local_rank=local_rank,
                world_size=self.get_world_size(),
                status=WorkerStatus.READY,
                device=device,
                pid=os.getpid(),
                hostname=socket.gethostname(),
            )
            
            self._workers[rank] = worker
            
        except Exception as e:
            self.logger.error(f"Failed to register worker {rank}: {e}")

    def _check_all_workers_ready(self) -> bool:
        """Check if all workers are ready."""
        if not self._workers:
            return True
        
        return all(
            w.status == WorkerStatus.READY
            for w in self._workers.values()
        )


# Global instance
distributed_manager = DistributedTrainingManager()
