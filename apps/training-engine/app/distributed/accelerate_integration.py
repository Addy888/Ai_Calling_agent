"""Hugging Face Accelerate integration for distributed training."""

from typing import Any, Dict, Optional
from pathlib import Path

try:
    from accelerate import Accelerator
    from accelerate.utils import DistributedType, set_seed
    ACCELERATE_AVAILABLE = True
except ImportError:
    ACCELERATE_AVAILABLE = False
    Accelerator = None
    DistributedType = None

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

from app.logger import training_logger
from app.distributed.schemas import DistributedConfig, MixedPrecision
from app.distributed.device_manager import device_manager
from app.distributed.exceptions import AccelerateException


class AccelerateManager:
    """
    Manages Hugging Face Accelerate integration.
    
    Provides simplified distributed training with automatic
    device placement, gradient synchronization, and mixed precision.
    """

    def __init__(self):
        """Initialize Accelerate manager."""
        self.logger = training_logger
        self._accelerator: Optional[Accelerator] = None
        self._is_initialized = False

    def initialize(
        self,
        config: DistributedConfig,
        project_dir: Optional[str] = None,
        logging_dir: Optional[str] = None,
    ) -> Accelerator:
        """
        Initialize Accelerate.
        
        Args:
            config: Distributed configuration
            project_dir: Project directory for logging
            logging_dir: Logging directory
            
        Returns:
            Initialized Accelerator instance
            
        Raises:
            AccelerateException: If initialization fails
        """
        if not ACCELERATE_AVAILABLE:
            raise AccelerateException("Accelerate is not installed. Install with: pip install accelerate")
        
        if not TORCH_AVAILABLE:
            raise AccelerateException("PyTorch is not available")
        
        try:
            self.logger.info("Initializing Accelerate")
            
            # Convert mixed precision to Accelerate format
            mixed_precision = config.mixed_precision.value
            
            # Determine distributed type
            num_processes = config.num_processes or device_manager.get_device_count()
            
            if num_processes == 1:
                distributed_type = None
            elif config.strategy.value == "deepspeed":
                distributed_type = DistributedType.DEEPSPEED
            elif config.strategy.value == "fsdp":
                distributed_type = DistributedType.FSDP
            else:
                distributed_type = DistributedType.MULTI_GPU if num_processes > 1 else None
            
            # Create accelerator
            kwargs = {
                "mixed_precision": mixed_precision,
                "gradient_accumulation_steps": config.gradient_accumulation_steps,
            }
            
            if project_dir:
                kwargs["project_dir"] = project_dir
            
            if logging_dir:
                kwargs["log_with"] = "tensorboard"
                kwargs["logging_dir"] = logging_dir
            
            # DeepSpeed config
            if config.deepspeed_config_file:
                kwargs["deepspeed_plugin"] = config.deepspeed_config_file
            elif config.deepspeed_config:
                kwargs["deepspeed_plugin"] = config.deepspeed_config
            
            # FSDP config
            if config.strategy.value == "fsdp":
                from accelerate import FullyShardedDataParallelPlugin
                
                fsdp_plugin = FullyShardedDataParallelPlugin(
                    sharding_strategy=config.fsdp_sharding_strategy,
                    cpu_offload=config.fsdp_offload,
                    auto_wrap_policy=config.fsdp_auto_wrap,
                )
                kwargs["fsdp_plugin"] = fsdp_plugin
            
            self._accelerator = Accelerator(**kwargs)
            self._is_initialized = True
            
            self.logger.info(
                f"Accelerate initialized: "
                f"device={self._accelerator.device}, "
                f"num_processes={self._accelerator.num_processes}, "
                f"mixed_precision={mixed_precision}"
            )
            
            return self._accelerator
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Accelerate: {e}")
            raise AccelerateException(f"Accelerate initialization failed: {e}")

    def prepare(
        self,
        model: Any,
        optimizer: Any,
        train_dataloader: Any,
        eval_dataloader: Optional[Any] = None,
        lr_scheduler: Optional[Any] = None,
    ) -> tuple:
        """
        Prepare model, optimizer, and dataloaders for distributed training.
        
        Args:
            model: Model to prepare
            optimizer: Optimizer to prepare
            train_dataloader: Training dataloader
            eval_dataloader: Evaluation dataloader (optional)
            lr_scheduler: Learning rate scheduler (optional)
            
        Returns:
            Tuple of prepared objects
            
        Raises:
            AccelerateException: If not initialized or preparation fails
        """
        if not self._is_initialized or not self._accelerator:
            raise AccelerateException("Accelerate not initialized. Call initialize() first.")
        
        try:
            # Prepare components
            prepared = [model, optimizer, train_dataloader]
            
            if eval_dataloader is not None:
                prepared.append(eval_dataloader)
            
            if lr_scheduler is not None:
                prepared.append(lr_scheduler)
            
            prepared_objects = self._accelerator.prepare(*prepared)
            
            self.logger.info("Model, optimizer, and dataloaders prepared for distributed training")
            
            return prepared_objects
            
        except Exception as e:
            self.logger.error(f"Failed to prepare for distributed training: {e}")
            raise AccelerateException(f"Preparation failed: {e}")

    def backward(self, loss: Any) -> None:
        """
        Backward pass with automatic gradient synchronization.
        
        Args:
            loss: Loss tensor
        """
        if not self._is_initialized or not self._accelerator:
            raise AccelerateException("Accelerate not initialized")
        
        self._accelerator.backward(loss)

    def unwrap_model(self, model: Any) -> Any:
        """
        Unwrap model from distributed wrapper.
        
        Args:
            model: Wrapped model
            
        Returns:
            Unwrapped model
        """
        if not self._is_initialized or not self._accelerator:
            return model
        
        return self._accelerator.unwrap_model(model)

    def save_state(self, output_dir: str) -> None:
        """
        Save training state (model, optimizer, scheduler, etc.).
        
        Args:
            output_dir: Output directory
        """
        if not self._is_initialized or not self._accelerator:
            raise AccelerateException("Accelerate not initialized")
        
        try:
            self._accelerator.save_state(output_dir)
            self.logger.info(f"Training state saved to {output_dir}")
        except Exception as e:
            self.logger.error(f"Failed to save state: {e}")
            raise AccelerateException(f"Save state failed: {e}")

    def load_state(self, input_dir: str) -> None:
        """
        Load training state.
        
        Args:
            input_dir: Input directory
        """
        if not self._is_initialized or not self._accelerator:
            raise AccelerateException("Accelerate not initialized")
        
        try:
            self._accelerator.load_state(input_dir)
            self.logger.info(f"Training state loaded from {input_dir}")
        except Exception as e:
            self.logger.error(f"Failed to load state: {e}")
            raise AccelerateException(f"Load state failed: {e}")

    def wait_for_everyone(self) -> None:
        """Wait for all processes to reach this point."""
        if not self._is_initialized or not self._accelerator:
            return
        
        self._accelerator.wait_for_everyone()

    def is_main_process(self) -> bool:
        """Check if this is the main process."""
        if not self._is_initialized or not self._accelerator:
            return True
        
        return self._accelerator.is_main_process

    def is_local_main_process(self) -> bool:
        """Check if this is the local main process."""
        if not self._is_initialized or not self._accelerator:
            return True
        
        return self._accelerator.is_local_main_process

    def get_device(self) -> Any:
        """Get current device."""
        if not self._is_initialized or not self._accelerator:
            return torch.device("cpu")
        
        return self._accelerator.device

    def get_process_index(self) -> int:
        """Get current process index."""
        if not self._is_initialized or not self._accelerator:
            return 0
        
        return self._accelerator.process_index

    def get_num_processes(self) -> int:
        """Get total number of processes."""
        if not self._is_initialized or not self._accelerator:
            return 1
        
        return self._accelerator.num_processes

    def print(self, *args, **kwargs) -> None:
        """Print only on main process."""
        if not self._is_initialized or not self._accelerator:
            print(*args, **kwargs)
            return
        
        self._accelerator.print(*args, **kwargs)

    def gather(self, tensor: Any) -> Any:
        """
        Gather tensor from all processes.
        
        Args:
            tensor: Tensor to gather
            
        Returns:
            Gathered tensor (on main process)
        """
        if not self._is_initialized or not self._accelerator:
            return tensor
        
        return self._accelerator.gather(tensor)

    def reduce(self, tensor: Any, reduction: str = "sum") -> Any:
        """
        Reduce tensor across all processes.
        
        Args:
            tensor: Tensor to reduce
            reduction: Reduction operation (sum, mean)
            
        Returns:
            Reduced tensor
        """
        if not self._is_initialized or not self._accelerator:
            return tensor
        
        return self._accelerator.reduce(tensor, reduction=reduction)

    def free_memory(self) -> None:
        """Free memory by clearing cache."""
        if not self._is_initialized or not self._accelerator:
            return
        
        self._accelerator.free_memory()

    def get_accelerator(self) -> Optional[Accelerator]:
        """Get the Accelerator instance."""
        return self._accelerator

    @property
    def accelerator(self) -> Optional[Accelerator]:
        """Get the Accelerator instance (property)."""
        return self._accelerator


# Global instance
accelerate_manager = AccelerateManager()
