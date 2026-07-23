"""Training event manager."""

from datetime import datetime
from typing import Any, Dict

from app.events import event_bus, EventType
from app.logger import training_logger
from app.training_executor.models import TrainingEvent


class EventManager:
    """Manage and emit training events."""

    def __init__(self):
        """Initialize event manager."""
        training_logger.info("Event manager initialized")

    def emit_job_created(self, job_id: str, data: Dict[str, Any] = None):
        """Emit job created event."""
        self._emit_event(
            job_id=job_id,
            event_type="job_created",
            message=f"Training job created: {job_id}",
            data=data or {},
            system_event=EventType.JOB_CREATED,
        )

    def emit_job_queued(self, job_id: str, data: Dict[str, Any] = None):
        """Emit job queued event."""
        self._emit_event(
            job_id=job_id,
            event_type="job_queued",
            message=f"Training job queued: {job_id}",
            data=data or {},
            system_event=EventType.JOB_QUEUED,
        )

    def emit_preparing(self, job_id: str, data: Dict[str, Any] = None):
        """Emit preparing event."""
        self._emit_event(
            job_id=job_id,
            event_type="preparing",
            message=f"Preparing training environment for {job_id}",
            data=data or {},
            system_event=EventType.TRAINING_PREPARING,
        )

    def emit_runtime_ready(self, job_id: str, data: Dict[str, Any] = None):
        """Emit runtime ready event."""
        self._emit_event(
            job_id=job_id,
            event_type="runtime_ready",
            message=f"Training runtime ready for {job_id}",
            data=data or {},
            system_event=EventType.TRAINING_RUNTIME_READY,
        )

    def emit_training_started(self, job_id: str, data: Dict[str, Any] = None):
        """Emit training started event."""
        self._emit_event(
            job_id=job_id,
            event_type="training_started",
            message=f"Training started: {job_id}",
            data=data or {},
            system_event=EventType.TRAINING_STARTED,
        )

    def emit_training_completed(self, job_id: str, data: Dict[str, Any] = None):
        """Emit training completed event."""
        self._emit_event(
            job_id=job_id,
            event_type="training_completed",
            message=f"Training completed: {job_id}",
            data=data or {},
            system_event=EventType.TRAINING_COMPLETED,
        )

    def emit_training_failed(
        self, job_id: str, error: str, data: Dict[str, Any] = None
    ):
        """Emit training failed event."""
        event_data = data or {}
        event_data["error"] = error

        self._emit_event(
            job_id=job_id,
            event_type="training_failed",
            message=f"Training failed: {job_id} - {error}",
            data=event_data,
            system_event=EventType.TRAINING_FAILED,
        )

    def emit_training_cancelled(self, job_id: str, data: Dict[str, Any] = None):
        """Emit training cancelled event."""
        self._emit_event(
            job_id=job_id,
            event_type="training_cancelled",
            message=f"Training cancelled: {job_id}",
            data=data or {},
            system_event=EventType.TRAINING_CANCELLED,
        )

    def emit_cleanup_started(self, job_id: str, data: Dict[str, Any] = None):
        """Emit cleanup started event."""
        self._emit_event(
            job_id=job_id,
            event_type="cleanup_started",
            message=f"Cleanup started for {job_id}",
            data=data or {},
        )

    def emit_cleanup_finished(self, job_id: str, data: Dict[str, Any] = None):
        """Emit cleanup finished event."""
        self._emit_event(
            job_id=job_id,
            event_type="cleanup_finished",
            message=f"Cleanup finished for {job_id}",
            data=data or {},
        )

    def _emit_event(
        self,
        job_id: str,
        event_type: str,
        message: str,
        data: Dict[str, Any],
        system_event: EventType = None,
    ):
        """Emit training event."""
        training_logger.info(f"Event: {event_type}", job_id=job_id, message=message)

        # Create training event
        event = TrainingEvent(
            job_id=job_id,
            event_type=event_type,
            message=message,
            data=data,
            timestamp=datetime.utcnow(),
        )

        # Emit to event bus if system event provided
        if system_event:
            event_bus.emit(
                system_event,
                {
                    "job_id": job_id,
                    "event": event.model_dump(),
                },
            )


# Global event manager
event_manager = EventManager()
