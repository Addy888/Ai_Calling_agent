"""TensorBoard integration for metrics visualization."""

from pathlib import Path
from typing import Dict, Optional

try:
    from torch.utils.tensorboard import SummaryWriter
    TENSORBOARD_AVAILABLE = True
except ImportError:
    TENSORBOARD_AVAILABLE = False
    SummaryWriter = None

from app.logger import training_logger
from app.metrics.schemas import (
    TrainingMetrics,
    SystemMetrics,
    ModelMetrics,
    PerformanceMetrics,
    TensorBoardConfig,
)
from app.metrics.exceptions import TelemetryException


class TensorBoardWriter:
    """
    TensorBoard writer for training metrics.
    """

    def __init__(self, config: Optional[TensorBoardConfig] = None):
        """
        Initialize TensorBoard writer.
        
        Args:
            config: TensorBoard configuration
        """
        self.logger = training_logger
        self.config = config or TensorBoardConfig()
        self._writers: Dict[str, SummaryWriter] = {}
        
        if not TENSORBOARD_AVAILABLE:
            self.logger.warning("TensorBoard not available, metrics will not be written")
            self.config.enabled = False
        
        if self.config.enabled:
            Path(self.config.log_dir).mkdir(parents=True, exist_ok=True)

    def get_writer(self, job_id: str) -> Optional[SummaryWriter]:
        """
        Get or create a SummaryWriter for a job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            SummaryWriter instance or None
        """
        if not self.config.enabled or not TENSORBOARD_AVAILABLE:
            return None
        
        if job_id not in self._writers:
            log_dir = Path(self.config.log_dir) / job_id
            try:
                self._writers[job_id] = SummaryWriter(
                    log_dir=str(log_dir),
                    flush_secs=self.config.flush_seconds,
                )
                self.logger.info(f"Created TensorBoard writer for job: {job_id}")
            except Exception as e:
                self.logger.error(f"Failed to create TensorBoard writer: {e}")
                return None
        
        return self._writers[job_id]

    def write_training_metrics(
        self,
        job_id: str,
        metrics: TrainingMetrics,
    ) -> None:
        """
        Write training metrics to TensorBoard.
        
        Args:
            job_id: Job identifier
            metrics: TrainingMetrics object
        """
        if not self.config.enabled:
            return
        
        try:
            writer = self.get_writer(job_id)
            if not writer:
                return
            
            step = metrics.global_step
            
            # Loss metrics
            if metrics.training_loss is not None:
                writer.add_scalar('Loss/train', metrics.training_loss, step)
            
            if metrics.validation_loss is not None:
                writer.add_scalar('Loss/validation', metrics.validation_loss, step)
            
            # Learning rate
            writer.add_scalar('Learning/rate', metrics.learning_rate, step)
            
            # Gradient metrics
            if metrics.gradient_norm is not None:
                writer.add_scalar('Gradient/norm', metrics.gradient_norm, step)
            
            if metrics.gradient_clipping is not None:
                writer.add_scalar('Gradient/clipping', metrics.gradient_clipping, step)
            
            # Timing metrics
            if metrics.batch_time is not None:
                writer.add_scalar('Time/batch', metrics.batch_time, step)
            
            if metrics.step_time is not None:
                writer.add_scalar('Time/step', metrics.step_time, step)
            
            # Tokens and samples
            if metrics.tokens_processed is not None:
                writer.add_scalar('Data/tokens', metrics.tokens_processed, step)
            
            writer.add_scalar('Data/samples', metrics.samples_processed, step)
            
        except Exception as e:
            self.logger.error(f"Failed to write training metrics: {e}")

    def write_system_metrics(
        self,
        job_id: str,
        metrics: SystemMetrics,
        step: int,
    ) -> None:
        """
        Write system metrics to TensorBoard.
        
        Args:
            job_id: Job identifier
            metrics: SystemMetrics object
            step: Current step
        """
        if not self.config.enabled:
            return
        
        try:
            writer = self.get_writer(job_id)
            if not writer:
                return
            
            # CPU and RAM
            writer.add_scalar('System/CPU_usage', metrics.cpu_usage_percent, step)
            writer.add_scalar('System/RAM_usage_GB', metrics.ram_usage_gb, step)
            
            # GPU metrics
            if metrics.gpu_usage_percent is not None:
                writer.add_scalar('System/GPU_usage', metrics.gpu_usage_percent, step)
            
            if metrics.gpu_memory_used_gb is not None:
                writer.add_scalar('System/GPU_memory_GB', metrics.gpu_memory_used_gb, step)
            
            if metrics.gpu_temperature is not None:
                writer.add_scalar('System/GPU_temp_C', metrics.gpu_temperature, step)
            
            # Disk
            writer.add_scalar('System/Disk_usage_GB', metrics.disk_usage_gb, step)
            
        except Exception as e:
            self.logger.error(f"Failed to write system metrics: {e}")

    def write_model_metrics(
        self,
        job_id: str,
        metrics: ModelMetrics,
        step: int,
    ) -> None:
        """
        Write model metrics to TensorBoard.
        
        Args:
            job_id: Job identifier
            metrics: ModelMetrics object
            step: Current step
        """
        if not self.config.enabled:
            return
        
        try:
            writer = self.get_writer(job_id)
            if not writer:
                return
            
            writer.add_scalar('Model/total_params_M', metrics.total_parameters / 1e6, step)
            writer.add_scalar('Model/trainable_params_M', metrics.trainable_parameters / 1e6, step)
            writer.add_scalar('Model/frozen_params_M', metrics.frozen_parameters / 1e6, step)
            
            if metrics.lora_parameters is not None:
                writer.add_scalar('Model/lora_params_M', metrics.lora_parameters / 1e6, step)
            
            writer.add_scalar('Model/size_MB', metrics.model_size_mb, step)
            
        except Exception as e:
            self.logger.error(f"Failed to write model metrics: {e}")

    def write_performance_metrics(
        self,
        job_id: str,
        metrics: PerformanceMetrics,
    ) -> None:
        """
        Write performance metrics to TensorBoard.
        
        Args:
            job_id: Job identifier
            metrics: PerformanceMetrics object
        """
        if not self.config.enabled:
            return
        
        try:
            writer = self.get_writer(job_id)
            if not writer:
                return
            
            step = metrics.global_step
            
            writer.add_scalar('Performance/samples_per_sec', metrics.samples_per_second, step)
            writer.add_scalar('Performance/steps_per_sec', metrics.steps_per_second, step)
            
            if metrics.tokens_per_second is not None:
                writer.add_scalar('Performance/tokens_per_sec', metrics.tokens_per_second, step)
            
            if metrics.eta_seconds is not None:
                writer.add_scalar('Performance/ETA_hours', metrics.eta_seconds / 3600, step)
            
        except Exception as e:
            self.logger.error(f"Failed to write performance metrics: {e}")

    def write_scalar(
        self,
        job_id: str,
        tag: str,
        value: float,
        step: int,
    ) -> None:
        """
        Write a custom scalar to TensorBoard.
        
        Args:
            job_id: Job identifier
            tag: Metric tag
            value: Metric value
            step: Current step
        """
        if not self.config.enabled:
            return
        
        try:
            writer = self.get_writer(job_id)
            if writer:
                writer.add_scalar(tag, value, step)
        except Exception as e:
            self.logger.error(f"Failed to write scalar: {e}")

    def flush(self, job_id: Optional[str] = None) -> None:
        """
        Flush TensorBoard writer(s).
        
        Args:
            job_id: Optional job ID (flush all if None)
        """
        if not self.config.enabled:
            return
        
        try:
            if job_id:
                writer = self._writers.get(job_id)
                if writer:
                    writer.flush()
            else:
                for writer in self._writers.values():
                    writer.flush()
        except Exception as e:
            self.logger.error(f"Failed to flush TensorBoard writer: {e}")

    def close(self, job_id: Optional[str] = None) -> None:
        """
        Close TensorBoard writer(s).
        
        Args:
            job_id: Optional job ID (close all if None)
        """
        if not self.config.enabled:
            return
        
        try:
            if job_id:
                writer = self._writers.pop(job_id, None)
                if writer:
                    writer.close()
                    self.logger.info(f"Closed TensorBoard writer for job: {job_id}")
            else:
                for job_id, writer in list(self._writers.items()):
                    writer.close()
                    self.logger.info(f"Closed TensorBoard writer for job: {job_id}")
                self._writers.clear()
        except Exception as e:
            self.logger.error(f"Failed to close TensorBoard writer: {e}")


# Global instance
tensorboard_writer = TensorBoardWriter()
