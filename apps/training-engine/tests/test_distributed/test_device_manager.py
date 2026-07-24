"""Tests for device manager."""

import pytest
from app.distributed.device_manager import device_manager
from app.distributed.schemas import DeviceType, DistributedBackend, MixedPrecision


class TestDeviceManager:
    """Test device manager functionality."""

    def test_detect_devices(self):
        """Test device detection."""
        devices = device_manager.detect_devices()
        
        assert isinstance(devices, list)
        assert len(devices) > 0
        
        # Check first device
        device = devices[0]
        assert device.device_type in [DeviceType.CPU, DeviceType.CUDA, DeviceType.MPS]
        assert device.device_name is not None

    def test_get_device_count(self):
        """Test device count."""
        count = device_manager.get_device_count()
        
        assert isinstance(count, int)
        assert count >= 1

    def test_get_recommended_backend(self):
        """Test recommended backend selection."""
        backend = device_manager.get_recommended_backend()
        
        assert isinstance(backend, DistributedBackend)
        assert backend in [DistributedBackend.NCCL, DistributedBackend.GLOO]

    def test_get_recommended_precision(self):
        """Test recommended precision selection."""
        precision = device_manager.get_recommended_precision()
        
        assert isinstance(precision, MixedPrecision)
        assert precision in [MixedPrecision.NO, MixedPrecision.FP16, MixedPrecision.BF16]

    def test_is_distributed_available(self):
        """Test distributed availability check."""
        is_available = device_manager.is_distributed_available()
        
        assert isinstance(is_available, bool)

    def test_get_optimal_batch_size(self):
        """Test optimal batch size calculation."""
        global_batch_size, grad_accum_steps = device_manager.get_optimal_batch_size(
            model_size_mb=100.0,
            per_device_batch_size=8,
        )
        
        assert isinstance(global_batch_size, int)
        assert isinstance(grad_accum_steps, int)
        assert global_batch_size > 0
        assert grad_accum_steps > 0
