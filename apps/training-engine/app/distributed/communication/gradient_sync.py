"""Gradient synchronization utilities."""

import time
from typing import Any, Optional, List, Dict

try:
    import torch
    import torch.distributed as dist
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    dist = None

from app.logger import training_logger
from app.distributed.exceptions import SynchronizationException


class GradientSync:
    """
    Gradient synchronization for distributed training.
    
    Provides utilities for syncing gradients across processes
    with performance monitoring.
    """

    def __init__(self):
        """Initialize gradient sync."""
        self.logger = training_logger
        self._sync_times: List[float] = []
        self._sync_count = 0

    def sync_gradients(
        self,
        model: Any,
        average: bool = True,
    ) -> float:
        """
        Synchronize model gradients across all processes.
        
        Args:
            model: Model with gradients
            average: Whether to average gradients
            
        Returns:
            Synchronization time in milliseconds
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return 0.0
        
        try:
            start_time = time.time()
            
            # Get world size
            world_size = dist.get_world_size()
            
            # Synchronize gradients for each parameter
            for param in model.parameters():
                if param.grad is not None:
                    dist.all_reduce(param.grad, op=dist.ReduceOp.SUM)
                    
                    if average:
                        param.grad.div_(world_size)
            
            elapsed = (time.time() - start_time) * 1000  # ms
            self._sync_times.append(elapsed)
            self._sync_count += 1
            
            return elapsed
            
        except Exception as e:
            self.logger.error(f"Gradient synchronization failed: {e}")
            raise SynchronizationException(f"Gradient sync failed: {e}")

    def sync_gradients_bucket(
        self,
        gradients: List[Any],
        bucket_size_mb: int = 25,
    ) -> float:
        """
        Synchronize gradients using bucketing for efficiency.
        
        Args:
            gradients: List of gradient tensors
            bucket_size_mb: Bucket size in MB
            
        Returns:
            Synchronization time in milliseconds
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return 0.0
        
        try:
            start_time = time.time()
            
            world_size = dist.get_world_size()
            bucket_size_bytes = bucket_size_mb * 1024 * 1024
            
            # Group gradients into buckets
            buckets = []
            current_bucket = []
            current_size = 0
            
            for grad in gradients:
                if grad is None:
                    continue
                
                grad_size = grad.numel() * grad.element_size()
                
                if current_size + grad_size > bucket_size_bytes and current_bucket:
                    buckets.append(current_bucket)
                    current_bucket = []
                    current_size = 0
                
                current_bucket.append(grad)
                current_size += grad_size
            
            if current_bucket:
                buckets.append(current_bucket)
            
            # Synchronize each bucket
            for bucket in buckets:
                for grad in bucket:
                    dist.all_reduce(grad, op=dist.ReduceOp.SUM)
                    grad.div_(world_size)
            
            elapsed = (time.time() - start_time) * 1000  # ms
            self._sync_times.append(elapsed)
            
            return elapsed
            
        except Exception as e:
            self.logger.error(f"Bucketed gradient sync failed: {e}")
            raise SynchronizationException(f"Bucketed sync failed: {e}")

    def clip_gradients_distributed(
        self,
        model: Any,
        max_norm: float,
        norm_type: float = 2.0,
    ) -> float:
        """
        Clip gradients in a distributed setting.
        
        Args:
            model: Model with gradients
            max_norm: Maximum gradient norm
            norm_type: Type of norm (2.0 for L2)
            
        Returns:
            Total gradient norm
        """
        if not TORCH_AVAILABLE:
            return 0.0
        
        try:
            # Collect all gradients
            parameters = [p for p in model.parameters() if p.grad is not None]
            
            if len(parameters) == 0:
                return 0.0
            
            # Compute local gradient norm
            device = parameters[0].grad.device
            total_norm = torch.norm(
                torch.stack([
                    torch.norm(p.grad.detach(), norm_type).to(device)
                    for p in parameters
                ]),
                norm_type
            )
            
            # Aggregate across processes
            if dist.is_initialized():
                dist.all_reduce(total_norm, op=dist.ReduceOp.SUM)
                world_size = dist.get_world_size()
                total_norm = total_norm / world_size
            
            # Clip gradients
            clip_coef = max_norm / (total_norm + 1e-6)
            if clip_coef < 1:
                for p in parameters:
                    p.grad.detach().mul_(clip_coef.to(p.grad.device))
            
            return total_norm.item()
            
        except Exception as e:
            self.logger.error(f"Distributed gradient clipping failed: {e}")
            raise SynchronizationException(f"Gradient clipping failed: {e}")

    def check_gradient_health(
        self,
        model: Any,
    ) -> Dict[str, Any]:
        """
        Check gradient health (NaN, Inf, norm).
        
        Args:
            model: Model with gradients
            
        Returns:
            Dictionary with gradient health metrics
        """
        if not TORCH_AVAILABLE:
            return {}
        
        try:
            has_nan = False
            has_inf = False
            total_norm = 0.0
            param_count = 0
            
            for param in model.parameters():
                if param.grad is not None:
                    param_count += 1
                    
                    if torch.isnan(param.grad).any():
                        has_nan = True
                    
                    if torch.isinf(param.grad).any():
                        has_inf = True
                    
                    total_norm += param.grad.norm().item() ** 2
            
            total_norm = total_norm ** 0.5
            
            # Aggregate across processes
            if dist.is_initialized():
                # Convert to tensors for communication
                stats = torch.tensor([
                    float(has_nan),
                    float(has_inf),
                    total_norm,
                    float(param_count),
                ], dtype=torch.float32)
                
                dist.all_reduce(stats, op=dist.ReduceOp.MAX)
                
                has_nan = stats[0].item() > 0
                has_inf = stats[1].item() > 0
                total_norm = stats[2].item()
            
            return {
                "has_nan": has_nan,
                "has_inf": has_inf,
                "total_norm": total_norm,
                "param_count": param_count,
                "is_healthy": not has_nan and not has_inf,
            }
            
        except Exception as e:
            self.logger.error(f"Gradient health check failed: {e}")
            return {"error": str(e)}

    def get_average_sync_time(self) -> float:
        """
        Get average synchronization time.
        
        Returns:
            Average time in milliseconds
        """
        if not self._sync_times:
            return 0.0
        return sum(self._sync_times) / len(self._sync_times)

    def get_total_syncs(self) -> int:
        """
        Get total number of synchronizations.
        
        Returns:
            Sync count
        """
        return self._sync_count

    def reset_metrics(self) -> None:
        """Reset sync metrics."""
        self._sync_times.clear()
        self._sync_count = 0


# Global instance
gradient_sync = GradientSync()
