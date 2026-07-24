"""
Enterprise Distributed Training Engine.

Supports multi-GPU and multi-node training with:
- Hugging Face Accelerate
- PyTorch DDP (DistributedDataParallel)
- PyTorch FSDP (FullyShardedDataParallel)
- DeepSpeed integration

This module provides a unified interface for distributed training
while maintaining compatibility with the existing Training Executor.
"""

from app.distributed.distributed_manager import DistributedTrainingManager, distributed_manager
from app.distributed.device_manager import DeviceManager, device_manager
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStrategy,
    ProcessGroupInfo,
    WorkerInfo,
    DistributedStatus,
)

__all__ = [
    "DistributedTrainingManager",
    "distributed_manager",
    "DeviceManager",
    "device_manager",
    "DistributedConfig",
    "DistributedStrategy",
    "ProcessGroupInfo",
    "WorkerInfo",
    "DistributedStatus",
]

__version__ = "1.0.0"
__phase__ = "4.4.4.5.7"
