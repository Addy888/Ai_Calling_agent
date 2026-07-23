"""Training Arguments Builder for HuggingFace Trainer."""

import os
from typing import Optional

from transformers import TrainingArguments

from app.logger import training_logger
from app.trainer.exceptions import TrainingArgumentsException
from app.training_executor.models import TrainingConfig, TrainingContext


class TrainingArgumentsBuilder:
    """
    Builder for HuggingFace TrainingArguments.
    
    Converts TrainingConfig into HuggingFace TrainingArguments.
    """

    def __init__(self):
        """Initialize builder."""
        self.logger = training_logger

    def build(
        self,
        context: TrainingContext,
        output_dir: Optional[str] = None,
    ) -> TrainingArguments:
        """
        Build TrainingArguments from context.
        
        Args:
            context: Training context
            output_dir: Optional override for output directory
            
        Returns:
            HuggingFace TrainingArguments instance
            
        Raises:
            TrainingArgumentsException: If build fails
        """
        try:
            config = context.job.config

            # Determine output directory
            if output_dir is None:
                output_dir = context.output_dir or "./output"

            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)

            self.logger.info(
                f"Building TrainingArguments for job {context.job_id}",
                output_dir=output_dir,
            )

            # Build arguments
            args = TrainingArguments(
                # Output
                output_dir=output_dir,
                overwrite_output_dir=True,
                
                # Training
                num_train_epochs=config.num_train_epochs,
                per_device_train_batch_size=config.per_device_train_batch_size,
                per_device_eval_batch_size=config.per_device_eval_batch_size,
                gradient_accumulation_steps=config.gradient_accumulation_steps,
                
                # Learning rate
                learning_rate=config.learning_rate,
                weight_decay=config.weight_decay,
                warmup_ratio=config.warmup_ratio,
                warmup_steps=config.warmup_steps,
                
                # Optimizer (use string for HF compatibility)
                optim=config.optimizer_type.value,
                adam_beta1=config.adam_beta1,
                adam_beta2=config.adam_beta2,
                adam_epsilon=config.adam_epsilon,
                
                # Scheduler
                lr_scheduler_type=config.scheduler_type.value,
                
                # Precision
                fp16=config.fp16 and not config.bf16,  # Exclusive
                bf16=config.bf16,
                
                # Gradient management
                max_grad_norm=config.max_grad_norm,
                gradient_checkpointing=config.gradient_checkpointing,
                
                # Logging
                logging_dir=os.path.join(output_dir, "logs"),
                logging_steps=config.logging_steps,
                logging_first_step=True,
                logging_strategy="steps",
                
                # Evaluation
                evaluation_strategy=config.evaluation_strategy,
                eval_steps=config.eval_steps if config.evaluation_strategy == "steps" else None,
                
                # Saving
                save_strategy=config.save_strategy,
                save_steps=config.save_steps if config.save_strategy == "steps" else None,
                save_total_limit=config.save_total_limit,
                load_best_model_at_end=config.load_best_model_at_end,
                metric_for_best_model=config.metric_for_best_model,
                
                # System
                seed=config.seed,
                data_seed=config.seed,
                dataloader_num_workers=config.dataloader_num_workers,
                dataloader_pin_memory=config.dataloader_pin_memory,
                
                # Reporting
                report_to=config.report_to,
                push_to_hub=config.push_to_hub,
                
                # Device
                use_cpu=config.use_cpu,
                
                # Miscellaneous
                remove_unused_columns=True,
                disable_tqdm=False,  # Enable progress bars
                include_inputs_for_metrics=False,
            )

            self.logger.info(
                f"TrainingArguments built successfully for job {context.job_id}",
                num_epochs=args.num_train_epochs,
                batch_size=args.per_device_train_batch_size,
                learning_rate=args.learning_rate,
            )

            return args

        except Exception as e:
            self.logger.error(
                f"Failed to build TrainingArguments: {str(e)}",
                job_id=context.job_id,
            )
            raise TrainingArgumentsException(
                f"Failed to build TrainingArguments: {str(e)}"
            )

    def validate_config(self, config: TrainingConfig) -> bool:
        """
        Validate training configuration.
        
        Args:
            config: Training configuration
            
        Returns:
            True if valid
            
        Raises:
            TrainingArgumentsException: If validation fails
        """
        try:
            # Basic validation
            if config.num_train_epochs <= 0:
                raise ValueError("num_train_epochs must be positive")

            if config.per_device_train_batch_size <= 0:
                raise ValueError("per_device_train_batch_size must be positive")

            if config.learning_rate <= 0:
                raise ValueError("learning_rate must be positive")

            # Check mutually exclusive precision settings
            if config.fp16 and config.bf16:
                raise ValueError("fp16 and bf16 cannot both be True")

            self.logger.info("Training configuration validated successfully")

            return True

        except Exception as e:
            self.logger.error(f"Training configuration validation failed: {str(e)}")
            raise TrainingArgumentsException(
                f"Configuration validation failed: {str(e)}"
            )

    def get_total_steps(self, config: TrainingConfig, dataset_size: int) -> int:
        """
        Calculate total training steps.
        
        Args:
            config: Training configuration
            dataset_size: Number of training samples
            
        Returns:
            Total number of training steps
        """
        effective_batch_size = (
            config.per_device_train_batch_size * config.gradient_accumulation_steps
        )

        steps_per_epoch = dataset_size // effective_batch_size

        total_steps = steps_per_epoch * config.num_train_epochs

        self.logger.info(
            f"Total training steps calculated: {total_steps}",
            dataset_size=dataset_size,
            effective_batch_size=effective_batch_size,
            steps_per_epoch=steps_per_epoch,
            num_epochs=config.num_train_epochs,
        )

        return total_steps


# Global instance
training_arguments_builder = TrainingArgumentsBuilder()
