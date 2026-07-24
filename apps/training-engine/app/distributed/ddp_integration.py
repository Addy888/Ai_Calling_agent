"""PyTorch DistributedDataParallel (DDP) integration."""

from typing import Any, Optional

try:
    import torch
    import torch.nn as nn
    from torch.nn.parallel import DistributedDataParallel as DDP
    import torch.distributed as dist
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None
    DDP = None
    dist = None

from app.logger import training_logger
from app.distributed.schemas import DistributedConfig
from app.distributed.exceptions import DDPException


class DDPManager:
    """
    Manages PyTorch DistributedDataParallel integration.
    
    Provides DDP model wrapping and distributed training support.
    """

    def __init__(self):
        """Initialize DDP manager."""
        self.logger = training_logger
        self._ddp_model: Optional[Any] = None

    def wrap_model(
        self,
        model: Any,
        config: DistributedConfig,
        device_id: Optional[int] = None,
    ) -> Any:
        """
        Wrap model with DistributedDataParallel.
        
        Args:
            model: Model to wrap
            config: Distributed configuration
            device_id: Device ID (local rank)
            
        Returns:
            DDP-wrapped model
            
        Raises:
            DDPException: If wrapping fails
        """
        if not TORCH_AVAILABLE:
            raise DDPException("PyTorch is not available")
        
        if not dist.is_initialized():
            raise DDPException("Distributed process group not initialized")
        
        try:
            # Move model to device
            if device_id is not None:
                device = torch.device(f"cuda:{device_id}")
                model = model.to(device)
            
            # Wrap with DDP
            ddp_kwargs = {
                "find_unused_parameters": config.find_unused_parameters,
                "broadcast_buffers": config.broadcast_buffers,
                "bucket_cap_mb": config.bucket_cap_mb,
            }
            
            if device_id is not None:
                ddp_kwargs["device_ids"] = [device_id]
                ddp_kwargs["output_device"] = device_id
            
            self._ddp_model = DDP(model, **ddp_kwargs)
            
            self.logger.info(f"Model wrapped with DDP on device {device_id}")
            
            return self._ddp_model
            
        except Exception as e:
            self.logger.error(f"Failed to wrap model with DDP: {e}")
            raise DDPException(f"DDP wrapping failed: {e}")

    def unwrap_model(self, model: Any) -> Any:
        """
        Unwrap DDP model to get the original model.
        
        Args:
            model: DDP-wrapped model
            
        Returns:
            Original model
        """
        if isinstance(model, DDP):
            return model.module
        return model

    def synchronize_gradients(self) -> None:
        """Manually synchronize gradients across processes."""
        if self._ddp_model is None:
            return
        
        # DDP automatically synchronizes gradients during backward()
        # This method is here for explicit control if needed
        pass

    def join_context(self, model: Any) -> Any:
        """
        Get DDP join context for uneven inputs.
        
        Args:
            model: DDP model
            
        Returns:
            Join context manager
        """
        if not isinstance(model, DDP):
            # Return dummy context manager
            from contextlib import nullcontext
            return nullcontext()
        
        return model.join()


# Global instance
ddp_manager = DDPManager()
