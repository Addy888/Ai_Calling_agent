"""Collective communication operations."""

import time
from typing import Any, Optional, List

try:
    import torch
    import torch.distributed as dist
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    dist = None

from app.logger import training_logger
from app.distributed.exceptions import CommunicationError


class CollectiveOps:
    """
    Collective communication operations.
    
    Provides high-level interface for distributed communication:
    - Broadcast
    - All-Reduce
    - Reduce
    - All-Gather
    - Scatter
    - Barrier
    """

    def __init__(self):
        """Initialize collective operations."""
        self.logger = training_logger
        self._communication_times: List[float] = []

    def broadcast(
        self,
        tensor: Any,
        src: int = 0,
        group: Optional[Any] = None,
    ) -> Any:
        """
        Broadcast tensor from source to all processes.
        
        Args:
            tensor: Tensor to broadcast
            src: Source rank
            group: Process group (default: main group)
            
        Returns:
            Broadcasted tensor
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return tensor
        
        try:
            start_time = time.time()
            
            dist.broadcast(tensor, src=src, group=group)
            
            elapsed = (time.time() - start_time) * 1000  # ms
            self._communication_times.append(elapsed)
            
            return tensor
            
        except Exception as e:
            self.logger.error(f"Broadcast failed: {e}")
            raise CommunicationError(f"Broadcast operation failed: {e}")

    def all_reduce(
        self,
        tensor: Any,
        op: str = "sum",
        group: Optional[Any] = None,
    ) -> Any:
        """
        All-reduce operation across all processes.
        
        Args:
            tensor: Tensor to reduce
            op: Reduction operation (sum, mean, min, max, product)
            group: Process group
            
        Returns:
            Reduced tensor
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return tensor
        
        try:
            start_time = time.time()
            
            # Map operation string to ReduceOp
            reduce_op_map = {
                "sum": dist.ReduceOp.SUM,
                "mean": dist.ReduceOp.SUM,  # Will divide after
                "min": dist.ReduceOp.MIN,
                "max": dist.ReduceOp.MAX,
                "product": dist.ReduceOp.PRODUCT,
            }
            
            reduce_op = reduce_op_map.get(op, dist.ReduceOp.SUM)
            
            dist.all_reduce(tensor, op=reduce_op, group=group)
            
            # Handle mean operation
            if op == "mean":
                world_size = dist.get_world_size(group=group)
                tensor.div_(world_size)
            
            elapsed = (time.time() - start_time) * 1000  # ms
            self._communication_times.append(elapsed)
            
            return tensor
            
        except Exception as e:
            self.logger.error(f"All-reduce failed: {e}")
            raise CommunicationError(f"All-reduce operation failed: {e}")

    def reduce(
        self,
        tensor: Any,
        dst: int = 0,
        op: str = "sum",
        group: Optional[Any] = None,
    ) -> Any:
        """
        Reduce tensor to a destination process.
        
        Args:
            tensor: Tensor to reduce
            dst: Destination rank
            op: Reduction operation
            group: Process group
            
        Returns:
            Reduced tensor (only valid on dst rank)
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return tensor
        
        try:
            reduce_op_map = {
                "sum": dist.ReduceOp.SUM,
                "min": dist.ReduceOp.MIN,
                "max": dist.ReduceOp.MAX,
                "product": dist.ReduceOp.PRODUCT,
            }
            
            reduce_op = reduce_op_map.get(op, dist.ReduceOp.SUM)
            
            dist.reduce(tensor, dst=dst, op=reduce_op, group=group)
            
            return tensor
            
        except Exception as e:
            self.logger.error(f"Reduce failed: {e}")
            raise CommunicationError(f"Reduce operation failed: {e}")

    def all_gather(
        self,
        tensor: Any,
        group: Optional[Any] = None,
    ) -> List[Any]:
        """
        Gather tensors from all processes.
        
        Args:
            tensor: Tensor to gather
            group: Process group
            
        Returns:
            List of tensors from all processes
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return [tensor]
        
        try:
            world_size = dist.get_world_size(group=group)
            
            # Create list to hold gathered tensors
            tensor_list = [torch.zeros_like(tensor) for _ in range(world_size)]
            
            dist.all_gather(tensor_list, tensor, group=group)
            
            return tensor_list
            
        except Exception as e:
            self.logger.error(f"All-gather failed: {e}")
            raise CommunicationError(f"All-gather operation failed: {e}")

    def gather(
        self,
        tensor: Any,
        dst: int = 0,
        group: Optional[Any] = None,
    ) -> Optional[List[Any]]:
        """
        Gather tensors to a destination process.
        
        Args:
            tensor: Tensor to gather
            dst: Destination rank
            group: Process group
            
        Returns:
            List of tensors (only valid on dst rank)
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return [tensor]
        
        try:
            rank = dist.get_rank(group=group)
            world_size = dist.get_world_size(group=group)
            
            if rank == dst:
                tensor_list = [torch.zeros_like(tensor) for _ in range(world_size)]
            else:
                tensor_list = None
            
            dist.gather(tensor, gather_list=tensor_list, dst=dst, group=group)
            
            return tensor_list
            
        except Exception as e:
            self.logger.error(f"Gather failed: {e}")
            raise CommunicationError(f"Gather operation failed: {e}")

    def scatter(
        self,
        tensor_list: Optional[List[Any]],
        tensor: Any,
        src: int = 0,
        group: Optional[Any] = None,
    ) -> Any:
        """
        Scatter tensors from source to all processes.
        
        Args:
            tensor_list: List of tensors to scatter (only required on src rank)
            tensor: Output tensor
            src: Source rank
            group: Process group
            
        Returns:
            Scattered tensor for this process
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return tensor
        
        try:
            dist.scatter(tensor, scatter_list=tensor_list, src=src, group=group)
            return tensor
            
        except Exception as e:
            self.logger.error(f"Scatter failed: {e}")
            raise CommunicationError(f"Scatter operation failed: {e}")

    def reduce_scatter(
        self,
        output: Any,
        input_list: List[Any],
        op: str = "sum",
        group: Optional[Any] = None,
    ) -> Any:
        """
        Reduce and scatter tensors.
        
        Args:
            output: Output tensor
            input_list: List of input tensors
            op: Reduction operation
            group: Process group
            
        Returns:
            Reduced and scattered tensor
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return output
        
        try:
            reduce_op_map = {
                "sum": dist.ReduceOp.SUM,
                "min": dist.ReduceOp.MIN,
                "max": dist.ReduceOp.MAX,
                "product": dist.ReduceOp.PRODUCT,
            }
            
            reduce_op = reduce_op_map.get(op, dist.ReduceOp.SUM)
            
            dist.reduce_scatter(output, input_list, op=reduce_op, group=group)
            
            return output
            
        except Exception as e:
            self.logger.error(f"Reduce-scatter failed: {e}")
            raise CommunicationError(f"Reduce-scatter operation failed: {e}")

    def barrier(
        self,
        group: Optional[Any] = None,
        timeout_seconds: Optional[int] = None,
    ) -> None:
        """
        Synchronization barrier.
        
        Args:
            group: Process group
            timeout_seconds: Timeout in seconds
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return
        
        try:
            if timeout_seconds:
                import datetime
                timeout = datetime.timedelta(seconds=timeout_seconds)
                dist.barrier(group=group, timeout=timeout)
            else:
                dist.barrier(group=group)
                
        except Exception as e:
            self.logger.error(f"Barrier failed: {e}")
            raise CommunicationError(f"Barrier operation failed: {e}")

    def get_average_communication_time(self) -> float:
        """
        Get average communication time.
        
        Returns:
            Average time in milliseconds
        """
        if not self._communication_times:
            return 0.0
        return sum(self._communication_times) / len(self._communication_times)

    def reset_metrics(self) -> None:
        """Reset communication metrics."""
        self._communication_times.clear()


# Global instance
collective_ops = CollectiveOps()
