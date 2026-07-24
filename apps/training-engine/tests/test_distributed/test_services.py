"""Tests for distributed services."""

import pytest
from app.distributed.services.distributed_service import DistributedService
from app.distributed.services.training_coordinator import TrainingCoordinator
from app.distributed.schemas import DistributedConfig, DistributedStrategy


class TestDistributedService:
    """Test distributed service."""

    def setup_method(self):
        """Setup test method."""
        self.service = DistributedService()

    def test_initialization(self):
        """Test service initialization."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        status = self.service.initialize(config)
        
        assert status is not None
        assert self.service._is_initialized is True

    def test_is_main_process(self):
        """Test is_main_process."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.service.initialize(config)
        
        assert self.service.is_main_process() is True

    def test_get_device_info(self):
        """Test get device info."""
        device_info = self.service.get_device_info()
        
        assert "device_count" in device_info
        assert "devices" in device_info
        assert "recommended_backend" in device_info

    def test_get_status(self):
        """Test get status."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.service.initialize(config)
        status = self.service.get_status()
        
        assert status is not None
        assert status.num_processes == 1


class TestTrainingCoordinator:
    """Test training coordinator."""

    def setup_method(self):
        """Setup test method."""
        self.coordinator = TrainingCoordinator()

    def test_start_job(self):
        """Test starting a job."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        result = self.coordinator.start_job("test_job", config)
        
        assert result["status"] == "started"
        assert "test_job" in self.coordinator._active_jobs

    def test_get_job_status(self):
        """Test getting job status."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.coordinator.start_job("test_job", config)
        status = self.coordinator.get_job_status("test_job")
        
        assert status is not None
        assert status["job_id"] == "test_job"

    def test_get_active_jobs(self):
        """Test getting active jobs."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.coordinator.start_job("job1", config)
        self.coordinator.start_job("job2", config)
        
        active = self.coordinator.get_active_jobs()
        
        assert len(active) == 2
        assert "job1" in active
        assert "job2" in active

    def test_stop_job(self):
        """Test stopping a job."""
        config = DistributedConfig(
            strategy=DistributedStrategy.NONE,
            num_processes=1,
        )
        
        self.coordinator.start_job("test_job", config)
        result = self.coordinator.stop_job("test_job")
        
        assert result["status"] == "stopped"
