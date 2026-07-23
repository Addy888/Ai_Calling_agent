"""Scheduler manager."""

import uuid
from typing import Any, Dict, Optional

from torch.optim import Optimizer
from torch.optim.lr_scheduler import LRScheduler

from app.events import event_bus
from app.logger import training_logger
from app.optimizer.exceptions import SchedulerException, SchedulerNotFoundError
from app.optimizer.scheduler.builder import SchedulerBuilder, scheduler_builder
from app.optimizer.schemas import SchedulerConfig, SchedulerMetadata


class SchedulerManager:
    """
    Manages learning rate scheduler lifecycle.
    
    Handles scheduler creation, stepping, and state management.
    """

    def __init__(self, scheduler_builder: Optional[SchedulerBuilder] = None):
        """
        Initialize scheduler manager.
        
        Args:
            scheduler_builder: Optional SchedulerBuilder instance
        """
        self.logger = training_logger
        self.scheduler_builder = scheduler_builder or scheduler_builder
        self._schedulers: Dict[str, LRScheduler] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}

    def create_scheduler(
        self,
        optimizer: Optimizer,
        config: SchedulerConfig,
        optimizer_id: str,
        num_training_steps: int,
    ) -> tuple[str, SchedulerMetadata]:
        """
        Create and register scheduler.
        
        Args:
            optimizer: PyTorch optimizer
            config: Scheduler configuration
            optimizer_id: Associated optimizer ID
            num_training_steps: Total training steps
            
        Returns:
            Tuple of (scheduler_id, metadata)
        """
        self.logger.info(f"Creating {config.scheduler_type.value} scheduler")

        try:
            # Generate scheduler ID
            scheduler_id = f"scheduler_{uuid.uuid4().hex[:8]}"

            # Build scheduler
            scheduler = self.scheduler_builder.build_scheduler(
                optimizer, config, num_training_steps
            )

            # Calculate warmup steps
            if config.warmup_strategy.value == "ratio":
                warmup_steps = int(num_training_steps * config.warmup_ratio)
            elif config.warmup_strategy.value == "steps":
                warmup_steps = config.warmup_steps or 0
            else:
                warmup_steps = 0

            # Get current learning rate
            current_lr = scheduler.get_last_lr()[0] if scheduler.get_last_lr() else 0.0

            # Create metadata
            metadata = SchedulerMetadata(
                scheduler_id=scheduler_id,
                scheduler_type=config.scheduler_type,
                optimizer_id=optimizer_id,
                warmup_steps=warmup_steps,
                total_steps=num_training_steps,
                current_step=0,
                current_lr=current_lr,
                warmup_completed=False,
            )

            # Register scheduler
            self._schedulers[scheduler_id] = scheduler
            self._metadata[scheduler_id] = {
                "config": config.dict(),
                "optimizer_id": optimizer_id,
                "warmup_steps": warmup_steps,
                "total_steps": num_training_steps,
                "current_step": 0,
            }

            # Emit event
            event_bus.emit(
                "scheduler_created",
                {
                    "scheduler_id": scheduler_id,
                    "scheduler_type": config.scheduler_type.value,
                    "optimizer_id": optimizer_id,
                    "warmup_steps": warmup_steps,
                    "total_steps": num_training_steps,
                },
            )

            self.logger.info(f"Scheduler created: {scheduler_id}")

            return scheduler_id, metadata

        except Exception as e:
            self.logger.error(f"Failed to create scheduler: {str(e)}")
            raise SchedulerException(f"Scheduler creation failed: {str(e)}")

    def step_scheduler(self, scheduler_id: str) -> float:
        """
        Step scheduler and return current learning rate.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            Current learning rate
        """
        if scheduler_id not in self._schedulers:
            raise SchedulerNotFoundError(f"Scheduler not found: {scheduler_id}")

        scheduler = self._schedulers[scheduler_id]
        metadata = self._metadata[scheduler_id]

        # Step scheduler
        scheduler.step()

        # Update step counter
        metadata["current_step"] += 1
        current_step = metadata["current_step"]

        # Get current LR
        current_lr = scheduler.get_last_lr()[0]

        # Check warmup completion
        warmup_steps = metadata["warmup_steps"]
        if current_step == warmup_steps and warmup_steps > 0:
            event_bus.emit(
                "warmup_completed",
                {
                    "scheduler_id": scheduler_id,
                    "warmup_steps": warmup_steps,
                    "current_step": current_step,
                },
            )
            self.logger.info(f"Warmup completed for scheduler {scheduler_id}")

        # Emit step event
        if current_step % 100 == 0:  # Log every 100 steps
            event_bus.emit(
                "scheduler_stepped",
                {
                    "scheduler_id": scheduler_id,
                    "current_step": current_step,
                    "current_lr": current_lr,
                },
            )

        return current_lr

    def get_scheduler(self, scheduler_id: str) -> LRScheduler:
        """
        Get scheduler by ID.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            LRScheduler instance
        """
        if scheduler_id not in self._schedulers:
            raise SchedulerNotFoundError(f"Scheduler not found: {scheduler_id}")

        return self._schedulers[scheduler_id]

    def get_current_lr(self, scheduler_id: str) -> float:
        """
        Get current learning rate.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            Current learning rate
        """
        scheduler = self.get_scheduler(scheduler_id)
        lrs = scheduler.get_last_lr()
        return lrs[0] if lrs else 0.0

    def get_metadata(self, scheduler_id: str) -> Dict[str, Any]:
        """
        Get scheduler metadata.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            Metadata dictionary
        """
        if scheduler_id not in self._metadata:
            raise SchedulerNotFoundError(f"Scheduler not found: {scheduler_id}")

        return self._metadata[scheduler_id].copy()

    def reset_scheduler(self, scheduler_id: str) -> None:
        """
        Reset scheduler to initial state.
        
        Args:
            scheduler_id: Scheduler ID
        """
        if scheduler_id not in self._schedulers:
            raise SchedulerNotFoundError(f"Scheduler not found: {scheduler_id}")

        metadata = self._metadata[scheduler_id]
        metadata["current_step"] = 0

        # Reset scheduler's internal state
        scheduler = self._schedulers[scheduler_id]
        scheduler.last_epoch = -1

        self.logger.info(f"Scheduler reset: {scheduler_id}")

        event_bus.emit(
            "scheduler_reset",
            {"scheduler_id": scheduler_id},
        )

    def remove_scheduler(self, scheduler_id: str) -> None:
        """
        Remove scheduler.
        
        Args:
            scheduler_id: Scheduler ID
        """
        if scheduler_id in self._schedulers:
            del self._schedulers[scheduler_id]
        if scheduler_id in self._metadata:
            del self._metadata[scheduler_id]

        self.logger.info(f"Scheduler removed: {scheduler_id}")

    def list_schedulers(self) -> list[str]:
        """
        List all scheduler IDs.
        
        Returns:
            List of scheduler IDs
        """
        return list(self._schedulers.keys())

    def get_warmup_progress(self, scheduler_id: str) -> float:
        """
        Get warmup progress (0.0 to 1.0).
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            Warmup progress
        """
        metadata = self.get_metadata(scheduler_id)
        current_step = metadata["current_step"]
        warmup_steps = metadata["warmup_steps"]

        if warmup_steps == 0:
            return 1.0

        return min(current_step / warmup_steps, 1.0)

    def is_warmup_completed(self, scheduler_id: str) -> bool:
        """
        Check if warmup is completed.
        
        Args:
            scheduler_id: Scheduler ID
            
        Returns:
            True if warmup completed
        """
        return self.get_warmup_progress(scheduler_id) >= 1.0


# Global instance
scheduler_manager = SchedulerManager()
