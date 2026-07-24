"""Structured logger for JSON-based training event logging."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum

from app.metrics.schemas import LogLevel, LogEntry
from app.metrics.exceptions import LoggerException


class StructuredLogger:
    """
    Structured logger with JSON output.
    
    Provides structured logging for training events, errors, runtime,
    checkpoints, and performance with multiple log levels and rotation.
    """

    def __init__(
        self,
        log_dir: Path = None,
        log_level: LogLevel = LogLevel.INFO,
        console_output: bool = True,
        file_output: bool = True,
        max_file_size_mb: int = 100,
        max_files: int = 10,
    ):
        """
        Initialize structured logger.
        
        Args:
            log_dir: Directory for log files
            log_level: Minimum log level
            console_output: Enable console output
            file_output: Enable file output
            max_file_size_mb: Max log file size before rotation
            max_files: Max number of rotated files
        """
        self.log_dir = log_dir or Path("logs")
        self.log_level = log_level
        self.console_output = console_output
        self.file_output = file_output
        self.max_file_size = max_file_size_mb * 1024 * 1024  # Convert to bytes
        self.max_files = max_files
        
        # Create log directory
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory log storage
        self._logs: Dict[str, List[LogEntry]] = {}
        self._max_memory_logs = 10000
        
        # Log files by job
        self._log_files: Dict[str, Path] = {}
        
        # Level ordering
        self._level_order = {
            LogLevel.TRACE: 0,
            LogLevel.DEBUG: 1,
            LogLevel.INFO: 2,
            LogLevel.WARNING: 3,
            LogLevel.ERROR: 4,
            LogLevel.CRITICAL: 5,
        }

    def _should_log(self, level: LogLevel) -> bool:
        """Check if level should be logged."""
        return self._level_order[level] >= self._level_order[self.log_level]

    def _create_log_entry(
        self,
        job_id: str,
        level: LogLevel,
        message: str,
        category: str,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        stack_trace: Optional[str] = None,
    ) -> LogEntry:
        """Create a log entry."""
        return LogEntry(
            job_id=job_id,
            timestamp=datetime.now(),
            level=level,
            category=category,
            message=message,
            metadata=metadata or {},
            error=error,
            stack_trace=stack_trace,
        )

    def _store_log(self, entry: LogEntry) -> None:
        """Store log entry in memory."""
        if entry.job_id not in self._logs:
            self._logs[entry.job_id] = []
        
        logs = self._logs[entry.job_id]
        logs.append(entry)
        
        # Limit memory usage
        if len(logs) > self._max_memory_logs:
            self._logs[entry.job_id] = logs[-self._max_memory_logs:]

    def _write_to_file(self, entry: LogEntry) -> None:
        """Write log entry to file."""
        if not self.file_output:
            return
        
        try:
            # Get or create log file for job
            if entry.job_id not in self._log_files:
                timestamp = datetime.now().strftime("%Y%m%d")
                log_file = self.log_dir / f"{entry.job_id}_{timestamp}.jsonl"
                self._log_files[entry.job_id] = log_file
            
            log_file = self._log_files[entry.job_id]
            
            # Check file size and rotate if needed
            if log_file.exists() and log_file.stat().st_size > self.max_file_size:
                self._rotate_log_file(log_file)
            
            # Write JSON line
            with open(log_file, "a", encoding="utf-8") as f:
                json.dump(entry.dict(), f, default=str)
                f.write("\n")
                
        except Exception as e:
            # Don't fail on logging errors
            if self.console_output:
                print(f"Failed to write log: {e}")

    def _rotate_log_file(self, log_file: Path) -> None:
        """Rotate log file."""
        try:
            # Find existing rotated files
            base_name = log_file.stem
            extension = log_file.suffix
            
            existing_rotations = sorted(
                self.log_dir.glob(f"{base_name}.*.gz"),
                reverse=True
            )
            
            # Delete oldest if at max
            if len(existing_rotations) >= self.max_files - 1:
                for old_file in existing_rotations[self.max_files - 2:]:
                    old_file.unlink()
            
            # Compress and rotate current file
            import gzip
            rotated_path = self.log_dir / f"{base_name}.1.gz"
            
            with open(log_file, "rb") as f_in:
                with gzip.open(rotated_path, "wb") as f_out:
                    f_out.writelines(f_in)
            
            # Clear current file
            log_file.unlink()
            
        except Exception as e:
            if self.console_output:
                print(f"Failed to rotate log file: {e}")

    def _write_to_console(self, entry: LogEntry) -> None:
        """Write log entry to console."""
        if not self.console_output:
            return
        
        level_colors = {
            LogLevel.TRACE: "\033[90m",      # Gray
            LogLevel.DEBUG: "\033[36m",      # Cyan
            LogLevel.INFO: "\033[32m",       # Green
            LogLevel.WARNING: "\033[33m",    # Yellow
            LogLevel.ERROR: "\033[31m",      # Red
            LogLevel.CRITICAL: "\033[35m",   # Magenta
        }
        
        reset = "\033[0m"
        color = level_colors.get(entry.level, "")
        
        timestamp = entry.timestamp.strftime("%H:%M:%S")
        
        print(
            f"{color}[{timestamp}] {entry.level.value.upper():8s}{reset} "
            f"[{entry.job_id}] {entry.category}: {entry.message}"
        )
        
        if entry.error:
            print(f"  Error: {entry.error}")
        
        if entry.stack_trace:
            print(f"  Stack Trace:\n{entry.stack_trace}")

    def _log(
        self,
        job_id: str,
        level: LogLevel,
        category: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        stack_trace: Optional[str] = None,
    ) -> None:
        """Internal logging method."""
        if not self._should_log(level):
            return
        
        entry = self._create_log_entry(
            job_id=job_id,
            level=level,
            message=message,
            category=category,
            metadata=metadata,
            error=error,
            stack_trace=stack_trace,
        )
        
        self._store_log(entry)
        self._write_to_file(entry)
        self._write_to_console(entry)

    # Public logging methods

    def trace(
        self,
        job_id: str,
        category: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log trace message."""
        self._log(job_id, LogLevel.TRACE, category, message, metadata)

    def debug(
        self,
        job_id: str,
        category: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log debug message."""
        self._log(job_id, LogLevel.DEBUG, category, message, metadata)

    def info(
        self,
        job_id: str,
        category: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log info message."""
        self._log(job_id, LogLevel.INFO, category, message, metadata)

    def warning(
        self,
        job_id: str,
        category: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log warning message."""
        self._log(job_id, LogLevel.WARNING, category, message, metadata)

    def error(
        self,
        job_id: str,
        category: str,
        message: str,
        error: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log error message."""
        self._log(
            job_id,
            LogLevel.ERROR,
            category,
            message,
            metadata,
            error,
            stack_trace,
        )

    def critical(
        self,
        job_id: str,
        category: str,
        message: str,
        error: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log critical message."""
        self._log(
            job_id,
            LogLevel.CRITICAL,
            category,
            message,
            metadata,
            error,
            stack_trace,
        )

    # Specialized logging methods

    def log_training_event(
        self,
        job_id: str,
        event: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log training event."""
        self.info(job_id, "training", event, metadata)

    def log_checkpoint_event(
        self,
        job_id: str,
        event: str,
        checkpoint_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log checkpoint event."""
        meta = metadata or {}
        if checkpoint_path:
            meta["checkpoint_path"] = checkpoint_path
        
        self.info(job_id, "checkpoint", event, meta)

    def log_performance(
        self,
        job_id: str,
        message: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log performance metrics."""
        self.info(job_id, "performance", message, metrics)

    def log_runtime_event(
        self,
        job_id: str,
        event: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log runtime event."""
        self.info(job_id, "runtime", event, metadata)

    def log_exception(
        self,
        job_id: str,
        exception: Exception,
        context: Optional[str] = None,
    ) -> None:
        """Log exception with stack trace."""
        import traceback
        
        stack_trace = "".join(traceback.format_exception(
            type(exception),
            exception,
            exception.__traceback__
        ))
        
        message = context or "Exception occurred"
        
        self.error(
            job_id=job_id,
            category="error",
            message=message,
            error=str(exception),
            stack_trace=stack_trace,
        )

    # Query methods

    def get_logs(
        self,
        job_id: str,
        level: Optional[LogLevel] = None,
        category: Optional[str] = None,
        limit: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[LogEntry]:
        """
        Get logs with filtering.
        
        Args:
            job_id: Job identifier
            level: Filter by log level
            category: Filter by category
            limit: Limit number of logs
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List of log entries
        """
        logs = self._logs.get(job_id, [])
        
        # Apply filters
        if level:
            logs = [log for log in logs if log.level == level]
        
        if category:
            logs = [log for log in logs if log.category == category]
        
        if start_time:
            logs = [log for log in logs if log.timestamp >= start_time]
        
        if end_time:
            logs = [log for log in logs if log.timestamp <= end_time]
        
        # Apply limit
        if limit:
            logs = logs[-limit:]
        
        return logs

    def get_error_logs(
        self,
        job_id: str,
        limit: Optional[int] = None,
    ) -> List[LogEntry]:
        """Get error logs."""
        logs = self._logs.get(job_id, [])
        error_logs = [
            log for log in logs
            if log.level in [LogLevel.ERROR, LogLevel.CRITICAL]
        ]
        
        if limit:
            error_logs = error_logs[-limit:]
        
        return error_logs

    def get_runtime_logs(
        self,
        job_id: str,
        limit: Optional[int] = None,
    ) -> List[LogEntry]:
        """Get runtime logs."""
        return self.get_logs(job_id, category="runtime", limit=limit)

    def clear_logs(self, job_id: str) -> None:
        """Clear logs for a job."""
        if job_id in self._logs:
            del self._logs[job_id]

    def get_stats(self) -> Dict[str, Any]:
        """Get logger statistics."""
        total_logs = sum(len(logs) for logs in self._logs.values())
        
        return {
            "total_jobs": len(self._logs),
            "total_logs": total_logs,
            "log_files": len(self._log_files),
            "log_level": self.log_level.value,
            "console_output": self.console_output,
            "file_output": self.file_output,
        }


# Global instance
structured_logger = StructuredLogger()

