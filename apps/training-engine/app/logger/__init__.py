"""Logging configuration for training engine."""

import logging
import sys
from typing import Any, Dict, Optional

# Create logger
training_logger = logging.getLogger("training_engine")
training_logger.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Add formatter to handler
console_handler.setFormatter(formatter)

# Add handler to logger
if not training_logger.handlers:
    training_logger.addHandler(console_handler)

# Prevent propagation to avoid duplicate logs
training_logger.propagate = False


class StructuredLogger:
    """Structured logger with context support."""

    def __init__(self, logger: logging.Logger):
        """
        Initialize structured logger.

        Args:
            logger: Base logger instance
        """
        self.logger = logger

    def _format_message(self, message: str, **kwargs) -> str:
        """
        Format message with structured data.

        Args:
            message: Log message
            **kwargs: Additional structured data

        Returns:
            Formatted message
        """
        if kwargs:
            context_str = " | ".join(f"{k}={v}" for k, v in kwargs.items())
            return f"{message} | {context_str}"
        return message

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self.logger.debug(self._format_message(message, **kwargs))

    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self.logger.info(self._format_message(message, **kwargs))

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self.logger.warning(self._format_message(message, **kwargs))

    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self.logger.error(self._format_message(message, **kwargs))

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self.logger.critical(self._format_message(message, **kwargs))


# Replace training_logger with structured version
training_logger = StructuredLogger(training_logger)


def configure_logging(level: str = "INFO", format_style: str = "default") -> None:
    """
    Configure logging settings.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_style: Format style (default, json, structured)
    """
    logger = logging.getLogger("training_engine")

    # Set level
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    logger.handlers.clear()

    # Create new handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, level.upper()))

    # Set formatter based on style
    if format_style == "json":
        import json

        class JsonFormatter(logging.Formatter):
            def format(self, record):
                log_data = {
                    "timestamp": self.formatTime(record, self.datefmt),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": record.getMessage(),
                }
                if record.exc_info:
                    log_data["exception"] = self.formatException(record.exc_info)
                return json.dumps(log_data)

        formatter = JsonFormatter()
    else:
        # Default or structured format
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)


__all__ = ["training_logger", "configure_logging"]
