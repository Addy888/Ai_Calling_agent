"""Metrics collection for training, system, and model metrics."""

import os
import platform
import psutil
import time
from datetime import datetime
from typing import Dict, Optional

try:
    import torch
except ImportError:
    torch = None

try:
    import pynvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False
    pynvml = None

from app.logger import training_logger
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
)
from app.metrics.exceptions import MetricsCollectionError


class MetricsCollector:
    """
    Collects metrics from training runtime, system resources, and models.
    """

    def __init__(self):
        """Initialize metrics collector."""
        self.logger = training_logger
        self._nvml_initialized = False
        self._start_time = time.time()
        self._last_step_time = None
        self._step_count = 0
        
        # Initialize NVML for GPU metrics
        if NVML_AVAILABLE and torch and torch.cuda.is_available():
            try:
                pynvml.nvmlInit()
                self._nvml_initialized = True
                self.logger.info("NVML initialized for GPU metrics")
            except Exception as e:
                self.logger.warning(f"Failed to initialize NVML: {e}")

    def collect_training_metrics(
        self,
        job_id: str,
        global_step: int,
        epoch: Optional[int] = None,
        training_loss: Optional[float] = None,
        validation_loss: Optional[float] = None,
        learning_rate: float = 0.0,
        gradient_norm: Optional[float] = None,
        gradient_clipping: Optional[float] = None,
        tokens_processed: Optional[int] = None,
        samples_processed: int = 0,
        batch_time: Optional[float] = None,
    ) -> TrainingMetrics:
        """
        Collect training metrics.
        
        Args:
            job_id: Job identifier
            global_step: Current global step
            epoch: Current epoch
            training_loss: Training loss
            validation_loss: Validation loss
            learning_rate: Current learning rate
            gradient_norm: Gradient norm
            gradient_clipping: Gradient clipping value
            tokens_processed: Tokens processed
            samples_processed: Samples processed
            batch_time: Batch processing time
            
        Returns:
            TrainingMetrics object
        """
        try:
            # Calculate step time
            current_time = time.time()
            step_time = None
            if self._last_step_time is not None:
                step_time = current_time - self._last_step_time
            self._last_step_time = current_time
            
            # Calculate epoch time (estimate)
            elapsed = current_time - self._start_time
            epoch_time = elapsed / max(epoch, 1) if epoch else None
            
            return TrainingMetrics(
                job_id=job_id,
                epoch=epoch,
                global_step=global_step,
                training_loss=training_loss,
                validation_loss=validation_loss,
                learning_rate=learning_rate,
                gradient_norm=gradient_norm,
                gradient_clipping=gradient_clipping,
                tokens_processed=tokens_processed,
                samples_processed=samples_processed,
                batch_time=batch_time,
                step_time=step_time,
                epoch_time=epoch_time,
            )
        except Exception as e:
            self.logger.error(f"Failed to collect training metrics: {e}")
            raise MetricsCollectionError(f"Training metrics collection failed: {e}")

    def collect_system_metrics(self, job_id: str) -> SystemMetrics:
        """
        Collect system resource metrics.
        
        Args:
            job_id: Job identifier
            
        Returns:
            SystemMetrics object
        """
        try:
            # CPU and RAM
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            ram_used_gb = memory.used / (1024 ** 3)
            ram_total_gb = memory.total / (1024 ** 3)
            
            # Disk
            disk = psutil.disk_usage('/')
            disk_used_gb = disk.used / (1024 ** 3)
            disk_total_gb = disk.total / (1024 ** 3)
            
            # Network
            net_io = psutil.net_io_counters()
            network_rx_mb = net_io.bytes_recv / (1024 ** 2)
            network_tx_mb = net_io.bytes_sent / (1024 ** 2)
            
            # GPU metrics
            gpu_usage = None
            gpu_memory_used = None
            gpu_memory_total = None
            gpu_temp = None
            
            if self._nvml_initialized:
                try:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    
                    # GPU utilization
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    gpu_usage = float(util.gpu)
                    
                    # GPU memory
                    mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    gpu_memory_used = mem_info.used / (1024 ** 3)
                    gpu_memory_total = mem_info.total / (1024 ** 3)
                    
                    # GPU temperature
                    try:
                        gpu_temp = float(pynvml.nvmlDeviceGetTemperature(
                            handle, pynvml.NVML_TEMPERATURE_GPU
                        ))
                    except:
                        pass
                        
                except Exception as e:
                    self.logger.debug(f"Failed to collect GPU metrics: {e}")
            
            return SystemMetrics(
                job_id=job_id,
                cpu_usage_percent=cpu_percent,
                ram_usage_gb=ram_used_gb,
                ram_total_gb=ram_total_gb,
                gpu_usage_percent=gpu_usage,
                gpu_memory_used_gb=gpu_memory_used,
                gpu_memory_total_gb=gpu_memory_total,
                gpu_temperature=gpu_temp,
                disk_usage_gb=disk_used_gb,
                disk_total_gb=disk_total_gb,
                network_rx_mb=network_rx_mb,
                network_tx_mb=network_tx_mb,
            )
        except Exception as e:
            self.logger.error(f"Failed to collect system metrics: {e}")
            raise MetricsCollectionError(f"System metrics collection failed: {e}")

    def collect_model_metrics(
        self,
        job_id: str,
        model: Optional[any] = None,
        total_params: Optional[int] = None,
        trainable_params: Optional[int] = None,
        lora_params: Optional[int] = None,
    ) -> ModelMetrics:
        """
        Collect model architecture metrics.
        
        Args:
            job_id: Job identifier
            model: PyTorch model (optional)
            total_params: Total parameters
            trainable_params: Trainable parameters
            lora_params: LoRA parameters
            
        Returns:
            ModelMetrics object
        """
        try:
            # If model is provided and torch available, calculate params
            if model and torch:
                if total_params is None:
                    total_params = sum(p.numel() for p in model.parameters())
                
                if trainable_params is None:
                    trainable_params = sum(
                        p.numel() for p in model.parameters() if p.requires_grad
                    )
            
            # Default values
            if total_params is None:
                total_params = 0
            if trainable_params is None:
                trainable_params = 0
            
            frozen_params = total_params - trainable_params
            
            # Estimate model size (rough calculation: 4 bytes per param for float32)
            model_size_mb = (total_params * 4) / (1024 ** 2)
            
            return ModelMetrics(
                job_id=job_id,
                total_parameters=total_params,
                trainable_parameters=trainable_params,
                frozen_parameters=frozen_params,
                lora_parameters=lora_params,
                model_size_mb=model_size_mb,
            )
        except Exception as e:
            self.logger.error(f"Failed to collect model metrics: {e}")
            raise MetricsCollectionError(f"Model metrics collection failed: {e}")

    def collect_performance_metrics(
        self,
        job_id: str,
        global_step: int,
        samples_processed: int,
        tokens_processed: Optional[int] = None,
        elapsed_seconds: Optional[float] = None,
        total_steps: Optional[int] = None,
    ) -> PerformanceMetrics:
        """
        Collect training performance metrics.
        
        Args:
            job_id: Job identifier
            global_step: Current global step
            samples_processed: Total samples processed
            tokens_processed: Total tokens processed
            elapsed_seconds: Elapsed time
            total_steps: Total training steps
            
        Returns:
            PerformanceMetrics object
        """
        try:
            # Calculate elapsed time
            if elapsed_seconds is None:
                elapsed_seconds = time.time() - self._start_time
            
            # Calculate throughput
            samples_per_second = samples_processed / max(elapsed_seconds, 1.0)
            steps_per_second = global_step / max(elapsed_seconds, 1.0)
            
            tokens_per_second = None
            if tokens_processed:
                tokens_per_second = tokens_processed / max(elapsed_seconds, 1.0)
            
            # Calculate ETA
            eta_seconds = None
            if total_steps and global_step > 0:
                remaining_steps = total_steps - global_step
                eta_seconds = int(remaining_steps / max(steps_per_second, 0.001))
            
            return PerformanceMetrics(
                job_id=job_id,
                global_step=global_step,
                tokens_per_second=tokens_per_second,
                samples_per_second=samples_per_second,
                steps_per_second=steps_per_second,
                eta_seconds=eta_seconds,
                elapsed_seconds=int(elapsed_seconds),
            )
        except Exception as e:
            self.logger.error(f"Failed to collect performance metrics: {e}")
            raise MetricsCollectionError(f"Performance metrics collection failed: {e}")

    def reset_timers(self):
        """Reset internal timers."""
        self._start_time = time.time()
        self._last_step_time = None
        self._step_count = 0

    def __del__(self):
        """Cleanup NVML on destruction."""
        if self._nvml_initialized and NVML_AVAILABLE:
            try:
                pynvml.nvmlShutdown()
            except:
                pass


# Global instance
metrics_collector = MetricsCollector()
