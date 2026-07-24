"""Metrics and monitoring exceptions."""


class MetricsException(Exception):
    """Base exception for metrics operations."""
    pass


class LoggerException(Exception):
    """Base exception for logging operations."""
    pass


class MonitorException(Exception):
    """Base exception for monitoring operations."""
    pass


class TelemetryException(Exception):
    """Base exception for telemetry operations."""
    pass


class AggregationException(Exception):
    """Base exception for aggregation operations."""
    pass


class AlertException(Exception):
    """Base exception for alert operations."""
    pass


class MetricsCollectionError(MetricsException):
    """Raised when metric collection fails."""
    pass


class MetricsValidationError(MetricsException):
    """Raised when metric validation fails."""
    pass


class MetricsStorageError(MetricsException):
    """Raised when metric storage fails."""
    pass


class LoggingError(LoggerException):
    """Raised when logging fails."""
    pass


class MonitoringError(MonitorException):
    """Raised when monitoring fails."""
    pass


class TelemetryError(TelemetryException):
    """Raised when telemetry fails."""
    pass


class AlertGenerationError(AlertException):
    """Raised when alert generation fails."""
    pass
