"""Tests for distributed training manager."""

import pytest
from app.distributed.distributed_manager import DistributedTrainingManager
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStrategy,
    DistributedBackend,
)


class TestDistributedTrainingManager:
    """Test distributed training manager."""

    def setup_method(self):
        """Setup test method."""
        self.manager = DistributedTrainingManager()

    def test_initialization_single_device(self):
        """Test initialization for single device."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        status = self.manager.initialize(config)
        
        assert status is not None
        assert status.num_processes == 1
        assert status.is_main_process is True
        assert self.manager.is_initialized()

    def test_get_status_before_init(self):
        """Test getting status before initialization."""
        status = self.manager.get_status()
        
        assert status is not None
        assert status.is_distributed is False
        assert status.num_processes == 1

    def test_is_main_process(self):
        """Test is_main_process check."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.manager.initialize(config)
        
        assert self.manager.is_main_process() is True

    def test_get_rank(self):
        """Test get_rank."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.manager.initialize(config)
        
        rank = self.manager.get_rank()
        assert rank == 0

    def test_get_world_size(self):
        """Test get_world_size."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.manager.initialize(config)
        
        world_size = self.manager.get_world_size()
        assert world_size == 1

    def test_barrier_single_device(self):
        """Test barrier on single device."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.manager.initialize(config)
        
        # Should not raise exception
        self.manager.barrier()

    def test_shutdown(self):
        """Test shutdown."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.manager.initialize(config)
        assert self.manager.is_initialized()
        
        self.manager.shutdown()
        assert not self.manager.is_initialized()
