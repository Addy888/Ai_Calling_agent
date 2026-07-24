"""Device detection and management for distributed training."""

import os
import platform
from typing import List, Optional, Tuple

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

try:
    import pynvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False
    pynvml = None

from app.logger import training_logger
from app.distributed.schemas import (
    DeviceInfo,
    DeviceType,
    DistributedBackend,
    MixedPrecision,
)
from app.distributed.exceptions import DeviceException


class DeviceManager:
    """
    Device detection and management.
    
    Detects available hardware, capabilities, and recommends
    optimal distributed training configuration.
    """

    def __init__(self):
        """Initialize device manager."""
        self.logger = training_logger
        self._nvml_initialized = False
        
        # Initialize NVML for GPU detection
        if NVML_AVAILABLE and self._has_cuda():
            try:
                pynvml.nvmlInit()
                self._nvml_initialized = True
                self.logger.info("NVML initialized for GPU detection")
            except Exception as e:
                self.logger.warning(f"Failed to initialize NVML: {e}")

    def detect_devices(self) -> List[DeviceInfo]:
        """
        Detect all available devices.
        
        Returns:
            List of DeviceInfo objects
        """
        devices = []
        
        try:
            if self._has_cuda():
                # Detect CUDA devices
                devices.extend(self._detect_cuda_devices())
            elif self._has_mps():
                # Detect Apple Silicon
                devices.append(self._detect_mps_device())
            else:
                # CPU only
                devices.append(self._detect_cpu_device())
        
        except Exception as e:
            self.logger.error(f"Failed to detect devices: {e}")
            raise DeviceException(f"Device detection failed: {e}")
        
        return devices

    def get_device_count(self) -> int:
        """
        Get number of available training devices.
        
        Returns:
            Number of devices
        """
        if self._has_cuda():
            return torch.cuda.device_count()
        else:
            return 1  # CPU or MPS

    def get_recommended_backend(self) -> DistributedBackend:
        """
        Get recommended distributed backend.
        
        Returns:
            Recommended backend
        """
        if self._has_cuda():
            return DistributedBackend.NCCL
        else:
            return DistributedBackend.GLOO

    def get_recommended_precision(self) -> MixedPrecision:
        """
        Get recommended mixed precision mode.
        
        Returns:
            Recommended precision mode
        """
        if not self._has_cuda():
            return MixedPrecision.NO
        
        # Check for BF16 support (Ampere+ GPUs)
        if self._supports_bf16():
            return MixedPrecision.BF16
        
        # Check for FP16 support (most modern GPUs)
        if self._supports_fp16():
            return MixedPrecision.FP16
        
        return MixedPrecision.NO

    def is_distributed_available(self) -> bool:
        """
        Check if distributed training is available.
        
        Returns:
            True if distributed training is possible
        """
        if not TORCH_AVAILABLE:
            return False
        
        if not torch.distributed.is_available():
            return False
        
        # Need at least 2 devices for distributed
        return self.get_device_count() >= 2

    def get_optimal_batch_size(
        self,
        model_size_mb: float,
        per_device_batch_size: int = 8,
    ) -> Tuple[int, int]:
        """
        Calculate optimal batch size configuration.
        
        Args:
            model_size_mb: Model size in MB
            per_device_batch_size: Batch size per device
            
        Returns:
            Tuple of (global_batch_size, gradient_accumulation_steps)
        """
        num_devices = self.get_device_count()
        
        # Calculate global batch size
        global_batch_size = per_device_batch_size * num_devices
        
        # For now, no gradient accumulation
        # (can be enhanced based on available memory)
        gradient_accumulation_steps = 1
        
        return global_batch_size, gradient_accumulation_steps

    def _has_cuda(self) -> bool:
        """Check if CUDA is available."""
        if not TORCH_AVAILABLE:
            return False
        return torch.cuda.is_available()

    def _has_mps(self) -> bool:
        """Check if MPS (Apple Silicon) is available."""
        if not TORCH_AVAILABLE:
            return False
        return hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()

    def _supports_bf16(self) -> bool:
        """Check if BF16 is supported."""
        if not self._has_cuda():
            return False
        
        try:
            # BF16 requires Ampere or newer (compute capability >= 8.0)
            for i in range(torch.cuda.device_count()):
                capability = torch.cuda.get_device_capability(i)
                if capability[0] >= 8:
                    return True
        except:
            pass
        
        return False

    def _supports_fp16(self) -> bool:
        """Check if FP16 is supported."""
        if not self._has_cuda():
            return False
        
        try:
            # FP16 requires compute capability >= 7.0
            for i in range(torch.cuda.device_count()):
                capability = torch.cuda.get_device_capability(i)
                if capability[0] >= 7:
                    return True
        except:
            pass
        
        return True  # Most modern GPUs support FP16

    def _detect_cuda_devices(self) -> List[DeviceInfo]:
        """Detect CUDA devices."""
        devices = []
        
        if not TORCH_AVAILABLE or not torch.cuda.is_available():
            return devices
        
        device_count = torch.cuda.device_count()
        
        for device_id in range(device_count):
            try:
                device_name = torch.cuda.get_device_name(device_id)
                
                # Get memory info
                total_memory = None
                available_memory = None
                if self._nvml_initialized:
                    try:
                        handle = pynvml.nvmlDeviceGetHandleByIndex(device_id)
                        mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                        total_memory = mem_info.total / (1024 ** 3)  # GB
                        available_memory = mem_info.free / (1024 ** 3)  # GB
                    except:
                        pass
                
                # Get compute capability
                capability = torch.cuda.get_device_capability(device_id)
                compute_capability = f"{capability[0]}.{capability[1]}"
                
                # Check precision support
                supports_bf16 = capability[0] >= 8
                supports_fp16 = capability[0] >= 7
                
                device_info = DeviceInfo(
                    device_type=DeviceType.CUDA,
                    device_id=device_id,
                    device_name=device_name,
                    total_memory_gb=total_memory,
                    available_memory_gb=available_memory,
                    compute_capability=compute_capability,
                    supports_bf16=supports_bf16,
                    supports_fp16=supports_fp16,
                )
                
                devices.append(device_info)
                
            except Exception as e:
                self.logger.warning(f"Failed to detect CUDA device {device_id}: {e}")
        
        return devices

    def _detect_mps_device(self) -> DeviceInfo:
        """Detect MPS device (Apple Silicon)."""
        return DeviceInfo(
            device_type=DeviceType.MPS,
            device_id=0,
            device_name="Apple Silicon GPU",
            supports_bf16=False,
            supports_fp16=True,
        )

    def _detect_cpu_device(self) -> DeviceInfo:
        """Detect CPU device."""
        import psutil
        
        cpu_name = platform.processor() or "CPU"
        total_memory = psutil.virtual_memory().total / (1024 ** 3)  # GB
        available_memory = psutil.virtual_memory().available / (1024 ** 3)  # GB
        
        return DeviceInfo(
            device_type=DeviceType.CPU,
            device_id=0,
            device_name=cpu_name,
            total_memory_gb=total_memory,
            available_memory_gb=available_memory,
            supports_bf16=False,
            supports_fp16=False,
        )

    def __del__(self):
        """Cleanup NVML on destruction."""
        if self._nvml_initialized and NVML_AVAILABLE:
            try:
                pynvml.nvmlShutdown()
            except:
                pass


# Global instance
device_manager = DeviceManager()
