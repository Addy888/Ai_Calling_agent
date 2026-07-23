"""HuggingFace Trainer Callbacks for event tracking and monitoring."""

from datetime import datetime
from typing import Optional

from transformers import TrainerCallback, TrainerControl, TrainerState, TrainingArguments

from app.events import event_bus
from app.logger import training_logger
from app.training_executor.models import TrainingMetrics


class TrainingEventCallback(TrainerCallback):
    """
    Callback to emit training events to the event bus.
    
    This callback tracks training progress and emits events that can be
    consumed by the frontend or other services.
    """

    def __init__(self, job_id: str):
        """
        Initialize callback.
        
        Args:
            job_id: Training job ID
        """
        self.job_id = job_id
        self.start_time: Optional[datetime] = None
        self.last_log_time: Optional[datetime] = None

    def on_train_begin(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called at the beginning of training."""
        self.start_time = datetime.utcnow()

        training_logger.info(
            f"Training started for job {self.job_id}",
            num_epochs=args.num_train_epochs,
            batch_size=args.per_device_train_batch_size,
        )

        # Emit training started event
        event_bus.emit(
            "trainer_training_started",
            {
                "job_id": self.job_id,
                "num_epochs": args.num_train_epochs,
                "batch_size": args.per_device_train_batch_size,
                "learning_rate": args.learning_rate,
                "timestamp": self.start_time.isoformat(),
            },
        )

    def on_train_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called at the end of training."""
        end_time = datetime.utcnow()

        if self.start_time:
            duration = (end_time - self.start_time).total_seconds()
        else:
            duration = None

        training_logger.info(
            f"Training completed for job {self.job_id}",
            duration_seconds=duration,
        )

        # Emit training finished event
        event_bus.emit(
            "trainer_training_finished",
            {
                "job_id": self.job_id,
                "duration_seconds": duration,
                "global_step": state.global_step,
                "timestamp": end_time.isoformat(),
            },
        )

    def on_epoch_begin(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called at the beginning of an epoch."""
        training_logger.info(
            f"Epoch {state.epoch} started for job {self.job_id}",
            global_step=state.global_step,
        )

        # Emit epoch started event
        event_bus.emit(
            "trainer_epoch_started",
            {
                "job_id": self.job_id,
                "epoch": state.epoch,
                "global_step": state.global_step,
            },
        )

    def on_epoch_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called at the end of an epoch."""
        training_logger.info(
            f"Epoch {state.epoch} completed for job {self.job_id}",
            global_step=state.global_step,
        )

        # Emit epoch completed event
        event_bus.emit(
            "trainer_epoch_completed",
            {
                "job_id": self.job_id,
                "epoch": state.epoch,
                "global_step": state.global_step,
            },
        )

    def on_step_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called at the end of a training step."""
        # Only log periodically to avoid overwhelming the system
        current_time = datetime.utcnow()

        should_log = (
            self.last_log_time is None
            or (current_time - self.last_log_time).total_seconds() >= 10
        )

        if should_log and state.global_step % args.logging_steps == 0:
            self.last_log_time = current_time

            # Get progress
            max_steps = state.max_steps or 1
            progress = (state.global_step / max_steps) * 100 if max_steps > 0 else 0

            # Emit step event
            event_bus.emit(
                "trainer_step",
                {
                    "job_id": self.job_id,
                    "global_step": state.global_step,
                    "max_steps": max_steps,
                    "progress_percentage": progress,
                    "epoch": state.epoch,
                },
            )

    def on_log(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        logs: Optional[dict] = None,
        **kwargs,
    ):
        """Called when logging occurs."""
        if logs:
            training_logger.debug(
                f"Training logs for job {self.job_id}",
                step=state.global_step,
                logs=logs,
            )

            # Emit log event with metrics
            event_bus.emit(
                "trainer_metrics",
                {
                    "job_id": self.job_id,
                    "global_step": state.global_step,
                    "epoch": state.epoch,
                    "loss": logs.get("loss"),
                    "learning_rate": logs.get("learning_rate"),
                    "metrics": logs,
                },
            )

    def on_save(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Called when a checkpoint is saved."""
        training_logger.info(
            f"Checkpoint saved for job {self.job_id}",
            step=state.global_step,
            epoch=state.epoch,
        )

        # Emit checkpoint saved event
        event_bus.emit(
            "trainer_checkpoint_saved",
            {
                "job_id": self.job_id,
                "global_step": state.global_step,
                "epoch": state.epoch,
            },
        )

    def on_evaluate(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        metrics: Optional[dict] = None,
        **kwargs,
    ):
        """Called after evaluation."""
        if metrics:
            training_logger.info(
                f"Evaluation completed for job {self.job_id}",
                step=state.global_step,
                metrics=metrics,
            )

            # Emit evaluation event
            event_bus.emit(
                "trainer_evaluation",
                {
                    "job_id": self.job_id,
                    "global_step": state.global_step,
                    "epoch": state.epoch,
                    "eval_metrics": metrics,
                },
            )


class ProgressLoggingCallback(TrainerCallback):
    """Callback for detailed progress logging."""

    def __init__(self, job_id: str, log_interval: int = 100):
        """
        Initialize callback.
        
        Args:
            job_id: Training job ID
            log_interval: Steps between progress logs
        """
        self.job_id = job_id
        self.log_interval = log_interval

    def on_step_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        """Log progress at intervals."""
        if state.global_step % self.log_interval == 0:
            max_steps = state.max_steps or 1
            progress = (state.global_step / max_steps) * 100 if max_steps > 0 else 0

            training_logger.info(
                f"Training progress for job {self.job_id}",
                step=state.global_step,
                max_steps=max_steps,
                progress=f"{progress:.1f}%",
                epoch=state.epoch,
            )


def create_default_callbacks(job_id: str) -> list:
    """
    Create default callback list for training.
    
    Args:
        job_id: Training job ID
        
    Returns:
        List of callbacks
    """
    return [
        TrainingEventCallback(job_id),
        ProgressLoggingCallback(job_id),
    ]
