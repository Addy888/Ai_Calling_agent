"""Factory for easy metrics system instantiation and configuration."""

from pathlib import Path
from typing import Optional, Dict, Any

from app.metrics.metrics_manager import MetricsManager
from app.metrics.metrics_collector import MetricsCollector
from app.metrics.metrics_storage import MetricsStorage
from app.metrics.metrics_aggregator import MetricsAggregator
from app.metrics.tensorboard_writer import TensorBoardWriter
from app.metrics.alert_engine import AlertEngine
from app.metrics.training_monitor import TrainingMonitor
from app.metrics.structured_logger import StructuredLogger
from app.metrics.schemas import LogLevel


class MetricsConfig:
    """Metrics system configuration."""
    
    def __init__(
        self,
        # Storage config
        storage_max_size: int = 10000,
        storage_dir: Optional[Path] = None,
        enable_disk_persistence: bool = True,
        
        # Aggregation config
        aggregation_window_size: int = 100,
        
        # TensorBoard config
        tensorboard_log_dir: Optional[Path] = None,
        tensorboard_flush_secs: int = 30,
        
        # Alert config
        alert_loss_explosion_threshold: float = 10.0,
        alert_memory_threshold_percent: float = 90.0,
        alert_disk_threshold_percent: float = 90.0,
        alert_gpu_temp_threshold_celsius: float = 85.0,
        
        # Monitor config
        monitor_check_interval_seconds: int = 30,
        monitor_stall_threshold_seconds: int = 300,
        monitor_slowdown_threshold_percent: float = 50.0,
        
        # Logger config
        log_dir: Optional[Path] = None,
        log_level: LogLevel = LogLevel.INFO,
        log_console_output: bool = True,
        log_file_output: bool = True,
        log_max_file_size_mb: int = 100,
        log_max_files: int = 10,
    ):
        """Initialize metrics configuration."""
        self.storage_max_size = storage_max_size
        self.storage_dir = storage_dir or Path("data/metrics")
        self.enable_disk_persistence = enable_disk_persistence
        
        self.aggregation_window_size = aggregation_window_size
        
        self.tensorboard_log_dir = tensorboard_log_dir or Path("logs/tensorboard")
        self.tensorboard_flush_secs = tensorboard_flush_secs
        
        self.alert_loss_explosion_threshold = alert_loss_explosion_threshold
        self.alert_memory_threshold_percent = alert_memory_threshold_percent
        self.alert_disk_threshold_percent = alert_disk_threshold_percent
        self.alert_gpu_temp_threshold_celsius = alert_gpu_temp_threshold_celsius
        
        self.monitor_check_interval_seconds = monitor_check_interval_seconds
        self.monitor_stall_threshold_seconds = monitor_stall_threshold_seconds
        self.monitor_slowdown_threshold_percent = monitor_slowdown_threshold_percent
        
        self.log_dir = log_dir or Path("logs")
        self.log_level = log_level
        self.log_console_output = log_console_output
        self.log_file_output = log_file_output
        self.log_max_file_size_mb = log_max_file_size_mb
        self.log_max_files = log_max_files


class MetricsFactory:
    """
    Factory for creating and configuring metrics system components.
    
    Provides convenience methods for common configurations and
    easy instantiation of the entire metrics stack.
    """

    @staticmethod
    def create_metrics_manager(
        config: Optional[MetricsConfig] = None,
    ) -> MetricsManager:
        """
        Create a complete metrics manager with all components.
        
        Args:
            config: Optional configuration
            
        Returns:
            Configured MetricsManager
        """
        config = config or MetricsConfig()
        
        # Create components
        collector = MetricsCollector()
        
        storage = MetricsStorage(
            max_size=config.storage_max_size,
            storage_dir=config.storage_dir,
            enable_disk_persistence=config.enable_disk_persistence,
        )
        
        aggregator = MetricsAggregator(
            window_size=config.aggregation_window_size,
        )
        
        # Create manager
        manager = MetricsManager(
            collector=collector,
            storage=storage,
            aggregator=aggregator,
        )
        
        return manager

    @staticmethod
    def create_tensorboard_writer(
        config: Optional[MetricsConfig] = None,
    ) -> TensorBoardWriter:
        """
        Create TensorBoard writer.
        
        Args:
            config: Optional configuration
            
        Returns:
            Configured TensorBoardWriter
        """
        config = config or MetricsConfig()
        
        return TensorBoardWriter(
            log_dir=config.tensorboard_log_dir,
            flush_secs=config.tensorboard_flush_secs,
        )

    @staticmethod
    def create_alert_engine(
        config: Optional[MetricsConfig] = None,
    ) -> AlertEngine:
        """
        Create alert engine.
        
        Args:
            config: Optional configuration
            
        Returns:
            Configured AlertEngine
        """
        config = config or MetricsConfig()
        
        return AlertEngine(
            loss_explosion_threshold=config.alert_loss_explosion_threshold,
            memory_threshold_percent=config.alert_memory_threshold_percent,
            disk_threshold_percent=config.alert_disk_threshold_percent,
            gpu_temp_threshold_celsius=config.alert_gpu_temp_threshold_celsius,
        )

    @staticmethod
    def create_training_monitor(
        config: Optional[MetricsConfig] = None,
    ) -> TrainingMonitor:
        """
        Create training monitor.
        
        Args:
            config: Optional configuration
            
        Returns:
            Configured TrainingMonitor
        """
        config = config or MetricsConfig()
        
        return TrainingMonitor(
            check_interval_seconds=config.monitor_check_interval_seconds,
            stall_threshold_seconds=config.monitor_stall_threshold_seconds,
            slowdown_threshold_percent=config.monitor_slowdown_threshold_percent,
        )

    @staticmethod
    def create_structured_logger(
        config: Optional[MetricsConfig] = None,
    ) -> StructuredLogger:
        """
        Create structured logger.
        
        Args:
            config: Optional configuration
            
        Returns:
            Configured StructuredLogger
        """
        config = config or MetricsConfig()
        
        return StructuredLogger(
            log_dir=config.log_dir,
            log_level=config.log_level,
            console_output=config.log_console_output,
            file_output=config.log_file_output,
            max_file_size_mb=config.log_max_file_size_mb,
            max_files=config.log_max_files,
        )

    @staticmethod
    def create_complete_stack(
        config: Optional[MetricsConfig] = None,
    ) -> Dict[str, Any]:
        """
        Create complete metrics stack with all components.
        
        Args:
            config: Optional configuration
            
        Returns:
            Dictionary with all metrics components
        """
        config = config or MetricsConfig()
        
        return {
            "manager": MetricsFactory.create_metrics_manager(config),
            "tensorboard": MetricsFactory.create_tensorboard_writer(config),
            "alert_engine": MetricsFactory.create_alert_engine(config),
            "monitor": MetricsFactory.create_training_monitor(config),
            "logger": MetricsFactory.create_structured_logger(config),
        }

    @staticmethod
    def create_development_config() -> MetricsConfig:
        """
        Create development configuration preset.
        
        Optimized for local development with verbose logging.
        """
        return MetricsConfig(
            storage_max_size=5000,
            enable_disk_persistence=False,
            
            tensorboard_flush_secs=10,
            
            monitor_check_interval_seconds=15,
            
            log_level=LogLevel.DEBUG,
            log_console_output=True,
            log_file_output=False,
        )

    @staticmethod
    def create_production_config() -> MetricsConfig:
        """
        Create production configuration preset.
        
        Optimized for production with persistence and monitoring.
        """
        return MetricsConfig(
            storage_max_size=50000,
            enable_disk_persistence=True,
            
            aggregation_window_size=200,
            
            tensorboard_flush_secs=60,
            
            alert_loss_explosion_threshold=100.0,
            alert_memory_threshold_percent=95.0,
            
            monitor_check_interval_seconds=60,
            monitor_stall_threshold_seconds=600,
            
            log_level=LogLevel.INFO,
            log_console_output=False,
            log_file_output=True,
            log_max_file_size_mb=500,
            log_max_files=30,
        )

    @staticmethod
    def create_testing_config() -> MetricsConfig:
        """
        Create testing configuration preset.
        
        Optimized for unit/integration tests with minimal I/O.
        """
        return MetricsConfig(
            storage_max_size=100,
            enable_disk_persistence=False,
            
            tensorboard_flush_secs=1,
            
            monitor_check_interval_seconds=1,
            monitor_stall_threshold_seconds=5,
            
            log_level=LogLevel.WARNING,
            log_console_output=False,
            log_file_output=False,
        )


# Convenience functions

def create_default_metrics_stack() -> Dict[str, Any]:
    """Create metrics stack with default configuration."""
    return MetricsFactory.create_complete_stack()


def create_dev_metrics_stack() -> Dict[str, Any]:
    """Create metrics stack for development."""
    config = MetricsFactory.create_development_config()
    return MetricsFactory.create_complete_stack(config)


def create_prod_metrics_stack() -> Dict[str, Any]:
    """Create metrics stack for production."""
    config = MetricsFactory.create_production_config()
    return MetricsFactory.create_complete_stack(config)


def create_test_metrics_stack() -> Dict[str, Any]:
    """Create metrics stack for testing."""
    config = MetricsFactory.create_testing_config()
    return MetricsFactory.create_complete_stack(config)

