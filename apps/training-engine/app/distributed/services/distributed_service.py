"""High-level distributed training service."""

from typing import Any, Dict, Optional
from pathlib import Path

from app.logger import training_logger
from app.distributed.distributed_manager import distributed_manager
from app.distributed.device_manager import device_manager
from app.distributed.accelerate_integration import accelerate_manager
from app.distributed.ddp_integration import ddp_manager
from app.distributed.fsdp_integration import fsdp_manager
from app.distributed.deepspeed_integration import deepspeed_manager
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStrategy,
    DistributedStatus,
)
from app.distributed.exceptions import DistributedTrainingException


class DistributedService:
    """
    High-level distributed training service.
    
    Provides unified interface for distributed training
    across different strategies (Accelerate, DDP, FSDP, DeepSpeed).
    """

    def __init__(self):
        """Initialize distributed service."""
        self.logger = training_logger
        self._current_strategy: Optional[DistributedStrategy] = None
        self._is_initialized = False

    def initialize(
        self,
        config: DistributedConfig,
        project_dir: Optional[str] = None,
    ) -> DistributedStatus:
        """
        Initialize distributed training.
        
        Args:
            config: Distributed configuration
            project_dir: Project directory
            
        Returns:
            Distributed status
        """
        try:
            self.logger.info(f"Initializing distributed service: {config.strategy.value}")
            
            # Initialize distributed manager
            status = distributed_manager.initialize(config)
            
            # Initialize strategy-specific components
            if config.strategy == DistributedStrategy.ACCELERATE:
                accelerate_manager.initialize(config, project_dir=project_dir)
            
            self._current_strategy = config.strategy
            self._is_initialized = True
            
            self.logger.info("Distributed service initialized successfully")
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to initialize distributed service: {e}")
            raise DistributedTrainingException(f"Initialization failed: {e}")

    def prepare_for_training(
        self,
        model: Any,
        optimizer: Any,
        train_dataloader: Any,
        eval_dataloader: Optional[Any] = None,
        lr_scheduler: Optional[Any] = None,
        config: Optional[DistributedConfig] = None,
    ) -> tuple:
        """
        Prepare model, optimizer, and dataloaders for distributed training.
        
        Args:
            model: Model to train
            optimizer: Optimizer
            train_dataloader: Training dataloader
            eval_dataloader: Evaluation dataloader
            lr_scheduler: Learning rate scheduler
            config: Distributed configuration
            
        Returns:
            Tuple of prepared components
        """
        if not self._is_initialized:
            raise DistributedTrainingException("Service not initialized")
        
        try:
            # Prepare based on strategy
            if self._current_strategy == DistributedStrategy.ACCELERATE:
                return accelerate_manager.prepare(
                    model,
                    optimizer,
                    train_dataloader,
                    eval_dataloader,
                    lr_scheduler,
                )
            
            elif self._current_strategy == DistributedStrategy.DDP:
                if config:
                    model = ddp_manager.wrap_model(
                        model,
                        config,
                        device_id=distributed_manager.get_local_rank(),
                    )
                return model, optimizer, train_dataloader, eval_dataloader, lr_scheduler
            
            elif self._current_strategy == DistributedStrategy.FSDP:
                if config:
                    model = fsdp_manager.wrap_model(model, config)
                return model, optimizer, train_dataloader, eval_dataloader, lr_scheduler
            
            elif self._current_strategy == DistributedStrategy.DEEPSPEED:
                if config:
                    engine, optimizer, _, lr_scheduler = deepspeed_manager.initialize(
                        model,
                        optimizer,
                        lr_scheduler,
                        config,
                    )
                    return engine, optimizer, train_dataloader, eval_dataloader, lr_scheduler
            
            else:
                # No distributed strategy
                return model, optimizer, train_dataloader, eval_dataloader, lr_scheduler
            
        except Exception as e:
            self.logger.error(f"Failed to prepare for training: {e}")
            raise DistributedTrainingException(f"Preparation failed: {e}")

    def backward(self, loss: Any) -> None:
        """
        Perform backward pass.
        
        Args:
            loss: Loss tensor
        """
        if self._current_strategy == DistributedStrategy.ACCELERATE:
            accelerate_manager.backward(loss)
        elif self._current_strategy == DistributedStrategy.DEEPSPEED:
            deepspeed_manager.backward(loss)
        else:
            loss.backward()

    def unwrap_model(self, model: Any) -> Any:
        """
        Unwrap model from distributed wrapper.
        
        Args:
            model: Wrapped model
            
        Returns:
            Unwrapped model
        """
        if self._current_strategy == DistributedStrategy.ACCELERATE:
            return accelerate_manager.unwrap_model(model)
        elif self._current_strategy == DistributedStrategy.DDP:
            return ddp_manager.unwrap_model(model)
        elif self._current_strategy == DistributedStrategy.FSDP:
            return fsdp_manager.unwrap_model(model)
        else:
            return model

    def is_main_process(self) -> bool:
        """
        Check if this is the main process.
        
        Returns:
            True if main process
        """
        return distributed_manager.is_main_process()

    def wait_for_everyone(self) -> None:
        """Wait for all processes."""
        if self._current_strategy == DistributedStrategy.ACCELERATE:
            accelerate_manager.wait_for_everyone()
        else:
            distributed_manager.barrier()

    def save_checkpoint(
        self,
        output_dir: str,
        model: Any,
        optimizer: Any,
        **kwargs,
    ) -> None:
        """
        Save distributed checkpoint.
        
        Args:
            output_dir: Output directory
            model: Model to save
            optimizer: Optimizer to save
            **kwargs: Additional arguments
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            if self._current_strategy == DistributedStrategy.ACCELERATE:
                accelerate_manager.save_state(output_dir)
            elif self._current_strategy == DistributedStrategy.FSDP:
                fsdp_manager.save_checkpoint(model, optimizer, str(output_path / "checkpoint.pt"))
            elif self._current_strategy == DistributedStrategy.DEEPSPEED:
                deepspeed_manager.save_checkpoint(output_dir)
            else:
                # Standard PyTorch save (only on main process)
                if self.is_main_process():
                    import torch
                    checkpoint = {
                        "model": self.unwrap_model(model).state_dict(),
                        "optimizer": optimizer.state_dict(),
                        **kwargs,
                    }
                    torch.save(checkpoint, output_path / "checkpoint.pt")
            
            self.logger.info(f"Checkpoint saved to {output_dir}")
            
        except Exception as e:
            self.logger.error(f"Failed to save checkpoint: {e}")
            raise DistributedTrainingException(f"Checkpoint save failed: {e}")

    def get_status(self) -> DistributedStatus:
        """
        Get distributed training status.
        
        Returns:
            Distributed status
        """
        return distributed_manager.get_status()

    def get_device_info(self) -> Dict:
        """
        Get device information.
        
        Returns:
            Dictionary with device info
        """
        devices = device_manager.detect_devices()
        
        return {
            "device_count": device_manager.get_device_count(),
            "devices": [d.model_dump() for d in devices],
            "recommended_backend": device_manager.get_recommended_backend().value,
            "recommended_precision": device_manager.get_recommended_precision().value,
        }

    def shutdown(self) -> None:
        """Shutdown distributed service."""
        try:
            self.logger.info("Shutting down distributed service")
            
            distributed_manager.shutdown()
            
            self._is_initialized = False
            self._current_strategy = None
            
        except Exception as e:
            self.logger.error(f"Failed to shutdown distributed service: {e}")


# Global instance
distributed_service = DistributedService()
