"""DeepSpeed integration for distributed training."""

import json
from typing import Any, Dict, Optional
from pathlib import Path

try:
    import deepspeed
    DEEPSPEED_AVAILABLE = True
except ImportError:
    DEEPSPEED_AVAILABLE = False
    deepspeed = None

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

from app.logger import training_logger
from app.distributed.schemas import DistributedConfig, DeepSpeedConfig
from app.distributed.exceptions import DeepSpeedException


class DeepSpeedManager:
    """
    Manages DeepSpeed integration.
    
    Provides DeepSpeed initialization and configuration management
    for ZeRO-optimized distributed training.
    """

    def __init__(self):
        """Initialize DeepSpeed manager."""
        self.logger = training_logger
        self._engine: Optional[Any] = None
        self._config: Optional[Dict] = None

    def is_available(self) -> bool:
        """Check if DeepSpeed is available."""
        return DEEPSPEED_AVAILABLE

    def initialize(
        self,
        model: Any,
        optimizer: Optional[Any] = None,
        lr_scheduler: Optional[Any] = None,
        config: Optional[DistributedConfig] = None,
        config_params: Optional[Dict] = None,
    ) -> tuple:
        """
        Initialize DeepSpeed engine.
        
        Args:
            model: Model to optimize
            optimizer: Optimizer (can be None if DeepSpeed manages it)
            lr_scheduler: Learning rate scheduler
            config: Distributed configuration
            config_params: DeepSpeed configuration parameters
            
        Returns:
            Tuple of (engine, optimizer, train_dataloader, lr_scheduler)
            
        Raises:
            DeepSpeedException: If initialization fails
        """
        if not DEEPSPEED_AVAILABLE:
            raise DeepSpeedException(
                "DeepSpeed is not installed. Install with: pip install deepspeed"
            )
        
        if not TORCH_AVAILABLE:
            raise DeepSpeedException("PyTorch is not available")
        
        try:
            # Load DeepSpeed configuration
            ds_config = self._load_config(config, config_params)
            self._config = ds_config
            
            # Initialize DeepSpeed
            model_engine, optimizer, _, lr_scheduler = deepspeed.initialize(
                model=model,
                optimizer=optimizer,
                lr_scheduler=lr_scheduler,
                config=ds_config,
            )
            
            self._engine = model_engine
            
            self.logger.info(
                f"DeepSpeed initialized: "
                f"ZeRO stage={ds_config.get('zero_optimization', {}).get('stage', 0)}"
            )
            
            return model_engine, optimizer, None, lr_scheduler
            
        except Exception as e:
            self.logger.error(f"Failed to initialize DeepSpeed: {e}")
            raise DeepSpeedException(f"DeepSpeed initialization failed: {e}")

    def backward(self, loss: Any) -> None:
        """
        Perform backward pass with DeepSpeed.
        
        Args:
            loss: Loss tensor
        """
        if self._engine is None:
            raise DeepSpeedException("DeepSpeed engine not initialized")
        
        self._engine.backward(loss)

    def step(self) -> None:
        """Perform optimizer step with DeepSpeed."""
        if self._engine is None:
            raise DeepSpeedException("DeepSpeed engine not initialized")
        
        self._engine.step()

    def save_checkpoint(
        self,
        save_dir: str,
        tag: Optional[str] = None,
        client_state: Optional[Dict] = None,
    ) -> None:
        """
        Save DeepSpeed checkpoint.
        
        Args:
            save_dir: Directory to save checkpoint
            tag: Checkpoint tag
            client_state: Additional state to save
        """
        if self._engine is None:
            raise DeepSpeedException("DeepSpeed engine not initialized")
        
        try:
            self._engine.save_checkpoint(
                save_dir=save_dir,
                tag=tag,
                client_state=client_state,
            )
            self.logger.info(f"DeepSpeed checkpoint saved to {save_dir}")
        except Exception as e:
            self.logger.error(f"Failed to save DeepSpeed checkpoint: {e}")
            raise DeepSpeedException(f"Checkpoint save failed: {e}")

    def load_checkpoint(
        self,
        load_dir: str,
        tag: Optional[str] = None,
        load_optimizer_states: bool = True,
        load_lr_scheduler_states: bool = True,
    ) -> Dict:
        """
        Load DeepSpeed checkpoint.
        
        Args:
            load_dir: Directory to load checkpoint from
            tag: Checkpoint tag
            load_optimizer_states: Whether to load optimizer state
            load_lr_scheduler_states: Whether to load scheduler state
            
        Returns:
            Client state dictionary
        """
        if self._engine is None:
            raise DeepSpeedException("DeepSpeed engine not initialized")
        
        try:
            _, client_state = self._engine.load_checkpoint(
                load_dir=load_dir,
                tag=tag,
                load_optimizer_states=load_optimizer_states,
                load_lr_scheduler_states=load_lr_scheduler_states,
            )
            self.logger.info(f"DeepSpeed checkpoint loaded from {load_dir}")
            return client_state
        except Exception as e:
            self.logger.error(f"Failed to load DeepSpeed checkpoint: {e}")
            raise DeepSpeedException(f"Checkpoint load failed: {e}")

    def get_train_batch_size(self) -> int:
        """Get effective training batch size."""
        if self._engine is None:
            return 0
        return self._engine.train_batch_size()

    def get_config(self) -> Optional[Dict]:
        """Get current DeepSpeed configuration."""
        return self._config

    def _load_config(
        self,
        config: Optional[DistributedConfig],
        config_params: Optional[Dict],
    ) -> Dict:
        """
        Load DeepSpeed configuration.
        
        Args:
            config: Distributed configuration
            config_params: DeepSpeed configuration parameters
            
        Returns:
            DeepSpeed configuration dictionary
        """
        # Priority: config_params > config.deepspeed_config > config.deepspeed_config_file > default
        
        if config_params:
            return config_params
        
        if config and config.deepspeed_config:
            return config.deepspeed_config
        
        if config and config.deepspeed_config_file:
            config_file = Path(config.deepspeed_config_file)
            if config_file.exists():
                with open(config_file, 'r') as f:
                    return json.load(f)
        
        # Return default configuration
        return self._get_default_config()

    def _get_default_config(self) -> Dict:
        """Get default DeepSpeed configuration."""
        return {
            "train_batch_size": 32,
            "train_micro_batch_size_per_gpu": 8,
            "gradient_accumulation_steps": 4,
            "gradient_clipping": 1.0,
            "zero_optimization": {
                "stage": 2,
                "offload_optimizer": {
                    "device": "cpu",
                    "pin_memory": True
                },
                "allgather_partitions": True,
                "allgather_bucket_size": 2e8,
                "overlap_comm": True,
                "reduce_scatter": True,
                "reduce_bucket_size": 2e8,
                "contiguous_gradients": True,
            },
            "fp16": {
                "enabled": False,
            },
            "bf16": {
                "enabled": False,
            },
            "steps_per_print": 100,
            "wall_clock_breakdown": False,
        }

    def create_config_from_schema(self, config_schema: DeepSpeedConfig) -> Dict:
        """
        Create DeepSpeed config dictionary from Pydantic schema.
        
        Args:
            config_schema: DeepSpeedConfig schema
            
        Returns:
            Configuration dictionary
        """
        config_dict = config_schema.model_dump(exclude_none=True)
        return config_dict


# Global instance
deepspeed_manager = DeepSpeedManager()
