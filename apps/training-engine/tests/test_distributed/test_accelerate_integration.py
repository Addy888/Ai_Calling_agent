"""Tests for Accelerate integration."""

import pytest
from app.distributed.accelerate_integration import accelerate_manager, ACCELERATE_AVAILABLE
from app.distributed.schemas import DistributedConfig, DistributedStrategy, MixedPrecision


@pytest.mark.skipif(not ACCELERATE_AVAILABLE, reason="Accelerate not available")
class TestAccelerateIntegration:
    """Test Accelerate integration."""

    def test_initialize_accelerate(self):
        """Test Accelerate initialization."""
        config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=1,
            mixed_precision=MixedPrecision.NO,
        )
        
        accelerator = accelerate_manager.initialize(config)
        
        assert accelerator is not None
        assert accelerate_manager._is_initialized

    def test_is_main_process(self):
        """Test is_main_process check."""
        config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=1,
        )
        
        accelerate_manager.initialize(config)
        
        assert accelerate_manager.is_main_process() is True

    def test_get_device(self):
        """Test get_device."""
        config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=1,
        )
        
        accelerate_manager.initialize(config)
        
        device = accelerate_manager.get_device()
        assert device is not None

    def test_get_num_processes(self):
        """Test get_num_processes."""
        config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=1,
        )
        
        accelerate_manager.initialize(config)
        
        num_processes = accelerate_manager.get_num_processes()
        assert num_processes >= 1

    def test_wait_for_everyone(self):
        """Test wait_for_everyone."""
        config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=1,
        )
        
        accelerate_manager.initialize(config)
        
        # Should not raise exception
        accelerate_manager.wait_for_everyone()
