"""PyTorch FullyShardedDataParallel (FSDP) integration."""

from typing import Any, Optional, Callable

try:
    import torch
    import torch.nn as nn
    from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
    from torch.distributed.fsdp import ShardingStrategy, MixedPrecision, BackwardPrefetch
    from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy
    import torch.distributed as dist
    TORCH_AVAILABLE = True
    FSDP_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    FSDP_AVAILABLE = False
    torch = None
    nn = None
    FSDP = None
    ShardingStrategy = None
    MixedPrecision = None
    dist = None

from app.logger import training_logger
from app.distributed.schemas import DistributedConfig
from app.distributed.exceptions import FSDPException


class FSDPManager:
    """
    Manages PyTorch FullyShardedDataParallel integration.
    
    Provides FSDP model wrapping for memory-efficient distributed training.
    """

    def __init__(self):
        """Initialize FSDP manager."""
        self.logger = training_logger
        self._fsdp_model: Optional[Any] = None

    def wrap_model(
        self,
        model: Any,
        config: DistributedConfig,
        auto_wrap_policy: Optional[Callable] = None,
    ) -> Any:
        """
        Wrap model with FullyShardedDataParallel.
        
        Args:
            model: Model to wrap
            config: Distributed configuration
            auto_wrap_policy: Auto-wrap policy for model layers
            
        Returns:
            FSDP-wrapped model
            
        Raises:
            FSDPException: If wrapping fails
        """
        if not TORCH_AVAILABLE:
            raise FSDPException("PyTorch is not available")
        
        if not FSDP_AVAILABLE:
            raise FSDPException("FSDP is not available in this PyTorch version")
        
        if not dist.is_initialized():
            raise FSDPException("Distributed process group not initialized")
        
        try:
            # Determine sharding strategy
            sharding_strategy = self._get_sharding_strategy(config.fsdp_sharding_strategy)
            
            # Setup mixed precision
            mixed_precision_policy = self._get_mixed_precision_policy(config)
            
            # Setup CPU offload
            cpu_offload = None
            if config.fsdp_offload:
                from torch.distributed.fsdp import CPUOffload
                cpu_offload = CPUOffload(offload_params=True)
            
            # FSDP configuration
            fsdp_kwargs = {
                "sharding_strategy": sharding_strategy,
                "mixed_precision": mixed_precision_policy,
                "device_id": torch.cuda.current_device(),
                "sync_module_states": True,
            }
            
            if cpu_offload:
                fsdp_kwargs["cpu_offload"] = cpu_offload
            
            if auto_wrap_policy and config.fsdp_auto_wrap:
                fsdp_kwargs["auto_wrap_policy"] = auto_wrap_policy
            
            # Wrap model
            self._fsdp_model = FSDP(model, **fsdp_kwargs)
            
            self.logger.info(
                f"Model wrapped with FSDP: "
                f"strategy={config.fsdp_sharding_strategy}, "
                f"offload={config.fsdp_offload}"
            )
            
            return self._fsdp_model
            
        except Exception as e:
            self.logger.error(f"Failed to wrap model with FSDP: {e}")
            raise FSDPException(f"FSDP wrapping failed: {e}")

    def unwrap_model(self, model: Any) -> Any:
        """
        Unwrap FSDP model to get the original model.
        
        Args:
            model: FSDP-wrapped model
            
        Returns:
            Original model
        """
        if FSDP_AVAILABLE and isinstance(model, FSDP):
            return model._fsdp_wrapped_module
        return model

    def get_transformer_auto_wrap_policy(self, transformer_layer_cls: Any) -> Callable:
        """
        Get transformer auto-wrap policy.
        
        Args:
            transformer_layer_cls: Transformer layer class to wrap
            
        Returns:
            Auto-wrap policy function
        """
        if not FSDP_AVAILABLE:
            return None
        
        return transformer_auto_wrap_policy({transformer_layer_cls})

    def save_checkpoint(
        self,
        model: Any,
        optimizer: Any,
        checkpoint_path: str,
    ) -> None:
        """
        Save FSDP checkpoint.
        
        Args:
            model: FSDP model
            optimizer: Optimizer
            checkpoint_path: Path to save checkpoint
        """
        if not FSDP_AVAILABLE:
            raise FSDPException("FSDP not available")
        
        try:
            from torch.distributed.fsdp import FullStateDictConfig, StateDictType
            
            # Get full state dict on rank 0
            with FSDP.state_dict_type(
                model,
                StateDictType.FULL_STATE_DICT,
                FullStateDictConfig(offload_to_cpu=True, rank0_only=True),
            ):
                state_dict = model.state_dict()
                
                if dist.get_rank() == 0:
                    checkpoint = {
                        "model": state_dict,
                        "optimizer": optimizer.state_dict(),
                    }
                    torch.save(checkpoint, checkpoint_path)
                    self.logger.info(f"FSDP checkpoint saved to {checkpoint_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to save FSDP checkpoint: {e}")
            raise FSDPException(f"Checkpoint save failed: {e}")

    def load_checkpoint(
        self,
        model: Any,
        optimizer: Any,
        checkpoint_path: str,
    ) -> None:
        """
        Load FSDP checkpoint.
        
        Args:
            model: FSDP model
            optimizer: Optimizer
            checkpoint_path: Path to load checkpoint from
        """
        if not FSDP_AVAILABLE:
            raise FSDPException("FSDP not available")
        
        try:
            from torch.distributed.fsdp import FullStateDictConfig, StateDictType
            
            # Load checkpoint
            checkpoint = torch.load(checkpoint_path)
            
            # Load model state
            with FSDP.state_dict_type(
                model,
                StateDictType.FULL_STATE_DICT,
                FullStateDictConfig(offload_to_cpu=True, rank0_only=True),
            ):
                model.load_state_dict(checkpoint["model"])
            
            # Load optimizer state
            optimizer.load_state_dict(checkpoint["optimizer"])
            
            self.logger.info(f"FSDP checkpoint loaded from {checkpoint_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to load FSDP checkpoint: {e}")
            raise FSDPException(f"Checkpoint load failed: {e}")

    def _get_sharding_strategy(self, strategy_name: str) -> Any:
        """Get FSDP sharding strategy."""
        if not FSDP_AVAILABLE:
            return None
        
        strategies = {
            "full_shard": ShardingStrategy.FULL_SHARD,
            "shard_grad_op": ShardingStrategy.SHARD_GRAD_OP,
            "no_shard": ShardingStrategy.NO_SHARD,
            "hybrid_shard": ShardingStrategy.HYBRID_SHARD,
        }
        
        return strategies.get(strategy_name, ShardingStrategy.FULL_SHARD)

    def _get_mixed_precision_policy(self, config: DistributedConfig) -> Any:
        """Get mixed precision policy."""
        if not FSDP_AVAILABLE or config.mixed_precision.value == "no":
            return None
        
        dtype = torch.float16 if config.mixed_precision.value == "fp16" else torch.bfloat16
        
        return MixedPrecision(
            param_dtype=dtype,
            reduce_dtype=dtype,
            buffer_dtype=dtype,
        )


# Global instance
fsdp_manager = FSDPManager()
