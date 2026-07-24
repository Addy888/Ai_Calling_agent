"""Event system for training engine.

Provides a simple event bus for component communication.
"""

from enum import Enum
from typing import Any, Callable, Dict, List


class EventType(str, Enum):
    """System event types."""

    # Job events
    JOB_CREATED = "job_created"
    JOB_QUEUED = "job_queued"
    JOB_STARTED = "job_started"
    JOB_COMPLETED = "job_completed"
    JOB_FAILED = "job_failed"
    JOB_CANCELLED = "job_cancelled"

    # Training events
    TRAINING_PREPARING = "training_preparing"
    TRAINING_RUNTIME_READY = "training_runtime_ready"
    TRAINING_STARTED = "training_started"
    TRAINING_COMPLETED = "training_completed"
    TRAINING_FAILED = "training_failed"
    TRAINING_CANCELLED = "training_cancelled"

    # PEFT events
    ADAPTER_CREATED = "adapter_created"
    ADAPTER_APPLIED = "adapter_applied"
    ADAPTER_REMOVED = "adapter_removed"
    ADAPTER_VALIDATED = "adapter_validated"
    LORA_CONFIG_CREATED = "lora_config_created"
    LORA_ADAPTER_APPLIED = "lora_adapter_applied"

    # Optimizer events
    OPTIMIZER_CREATED = "optimizer_created"
    OPTIMIZER_UPDATED = "optimizer_updated"
    OPTIMIZER_REMOVED = "optimizer_removed"
    LEARNING_RATE_UPDATED = "learning_rate_updated"

    # Scheduler events
    SCHEDULER_CREATED = "scheduler_created"
    SCHEDULER_STEPPED = "scheduler_stepped"
    SCHEDULER_RESET = "scheduler_reset"
    WARMUP_STARTED = "warmup_started"
    WARMUP_COMPLETED = "warmup_completed"

    # Checkpoint events
    CHECKPOINT_STARTED = "checkpoint_started"
    CHECKPOINT_COMPLETED = "checkpoint_completed"
    CHECKPOINT_FAILED = "checkpoint_failed"
    CHECKPOINT_DELETED = "checkpoint_deleted"
    CHECKPOINT_VALIDATED = "checkpoint_validated"
    
    # Resume events
    RESUME_STARTED = "resume_started"
    RESUME_COMPLETED = "resume_completed"
    RESUME_FAILED = "resume_failed"
    
    # Recovery events
    RECOVERY_STARTED = "recovery_started"
    RECOVERY_COMPLETED = "recovery_completed"
    RECOVERY_FAILED = "recovery_failed"
    
    # Metrics events
    METRICS_UPDATED = "metrics_updated"
    LOGGER_STARTED = "logger_started"
    LOGGER_STOPPED = "logger_stopped"
    TRAINING_STALLED = "training_stalled"
    GPU_WARNING = "gpu_warning"
    MEMORY_WARNING = "memory_warning"
    LOSS_WARNING = "loss_warning"
    ALERT_GENERATED = "alert_generated"
    
    # Distributed training events (Phase 4.4.4.5.7)
    DISTRIBUTED_INITIALIZED = "distributed_initialized"
    DISTRIBUTED_SHUTDOWN = "distributed_shutdown"
    DISTRIBUTED_WORKER_REGISTERED = "distributed_worker_registered"
    DISTRIBUTED_WORKER_FAILED = "distributed_worker_failed"
    DISTRIBUTED_WORKER_RECOVERED = "distributed_worker_recovered"
    DISTRIBUTED_BARRIER_SYNC = "distributed_barrier_sync"
    DISTRIBUTED_CHECKPOINT_SAVED = "distributed_checkpoint_saved"
    DISTRIBUTED_METRICS_COLLECTED = "distributed_metrics_collected"
    CLUSTER_INITIALIZED = "cluster_initialized"
    CLUSTER_NODE_JOINED = "cluster_node_joined"
    CLUSTER_NODE_FAILED = "cluster_node_failed"


class EventBus:
    """Simple event bus for component communication."""

    def __init__(self):
        """Initialize event bus."""
        self._subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable) -> None:
        """
        Subscribe to an event type.

        Args:
            event_type: Event type to subscribe to
            callback: Callback function to invoke
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []

        self._subscribers[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Callable) -> None:
        """
        Unsubscribe from an event type.

        Args:
            event_type: Event type to unsubscribe from
            callback: Callback function to remove
        """
        if event_type in self._subscribers:
            try:
                self._subscribers[event_type].remove(callback)
            except ValueError:
                pass

    def emit(self, event_type: str, data: Dict[str, Any] = None) -> None:
        """
        Emit an event.

        Args:
            event_type: Event type
            data: Event data
        """
        if event_type in self._subscribers:
            event_data = data or {}

            for callback in self._subscribers[event_type]:
                try:
                    callback(event_data)
                except Exception as e:
                    # Log but don't fail on subscriber errors
                    print(f"Error in event subscriber: {str(e)}")

    def clear(self) -> None:
        """Clear all subscribers."""
        self._subscribers.clear()

    def get_subscriber_count(self, event_type: str = None) -> int:
        """
        Get subscriber count.

        Args:
            event_type: Optional specific event type

        Returns:
            Subscriber count
        """
        if event_type:
            return len(self._subscribers.get(event_type, []))

        return sum(len(subs) for subs in self._subscribers.values())


# Global event bus instance
event_bus = EventBus()

__all__ = ["EventBus", "EventType", "event_bus"]
