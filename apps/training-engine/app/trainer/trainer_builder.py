"""Trainer Builder - Constructs HuggingFace Trainer with all components."""

import os
from typing import Any, Dict, Optional

import torch
from datasets import Dataset, load_from_disk
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
)

from app.logger import training_logger
from app.trainer.exceptions import TrainerBuildException, DataCollatorException
from app.trainer.trainer_callbacks import create_default_callbacks
from app.trainer.trainer_validation import trainer_validator
from app.trainer.training_arguments import training_arguments_builder
from app.training_executor.models import TrainingContext, TrainingType


class TrainerBuilder:
    """
    Builds HuggingFace Trainer with all required components.
    
    Responsibilities:
    - Load dataset
    - Load tokenizer
    - Load model
    - Create data collator
    - Build training arguments
    - Create callbacks
    - Instantiate Trainer
    """

    def __init__(self):
        """Initialize builder."""
        self.logger = training_logger

    def build(self, context: TrainingContext) -> Trainer:
        """
        Build HuggingFace Trainer.
        
        Args:
            context: Training context
            
        Returns:
            Configured HuggingFace Trainer instance
            
        Raises:
            TrainerBuildException: If build fails
        """
        try:
            job_id = context.job_id

            self.logger.info(f"Building trainer for job {job_id}")

            # Validate context
            trainer_validator.validate_context(context)

            # Step 1: Load tokenizer
            self.logger.info("Loading tokenizer...")
            tokenizer = self._load_tokenizer(context)

            # Step 2: Load dataset
            self.logger.info("Loading dataset...")
            train_dataset, eval_dataset = self._load_dataset(context, tokenizer)

            # Step 3: Load model
            self.logger.info("Loading model...")
            model = self._load_model(context)

            # Step 4: Create data collator
            self.logger.info("Creating data collator...")
            data_collator = self._create_data_collator(context, tokenizer)

            # Step 5: Build training arguments
            self.logger.info("Building training arguments...")
            training_args = training_arguments_builder.build(
                context, output_dir=context.output_dir
            )

            # Step 6: Create callbacks
            self.logger.info("Creating callbacks...")
            callbacks = create_default_callbacks(job_id)

            # Step 7: Instantiate Trainer
            self.logger.info("Instantiating HuggingFace Trainer...")
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=eval_dataset,
                tokenizer=tokenizer,
                data_collator=data_collator,
                callbacks=callbacks,
            )

            self.logger.info(f"Trainer built successfully for job {job_id}")

            return trainer

        except Exception as e:
            self.logger.error(f"Failed to build trainer: {str(e)}")
            raise TrainerBuildException(f"Trainer build failed: {str(e)}")

    def _load_tokenizer(self, context: TrainingContext) -> AutoTokenizer:
        """Load tokenizer."""
        try:
            tokenizer_path = context.tokenizer_metadata.get("tokenizer_path")

            if not tokenizer_path:
                # Fallback to model path
                tokenizer_path = context.model_metadata.get("model_path")

            if not tokenizer_path:
                raise ValueError("Tokenizer path not found in metadata")

            self.logger.info(f"Loading tokenizer from: {tokenizer_path}")

            tokenizer = AutoTokenizer.from_pretrained(
                tokenizer_path,
                trust_remote_code=True,
                use_fast=True,
            )

            # Ensure padding token is set
            if tokenizer.pad_token is None:
                if tokenizer.eos_token:
                    tokenizer.pad_token = tokenizer.eos_token
                    self.logger.info("Set pad_token to eos_token")
                else:
                    tokenizer.add_special_tokens({"pad_token": "[PAD]"})
                    self.logger.info("Added [PAD] as pad_token")

            # Validate tokenizer
            trainer_validator.validate_tokenizer(tokenizer)

            return tokenizer

        except Exception as e:
            self.logger.error(f"Failed to load tokenizer: {str(e)}")
            raise TrainerBuildException(f"Tokenizer loading failed: {str(e)}")

    def _load_dataset(
        self, context: TrainingContext, tokenizer: AutoTokenizer
    ) -> tuple[Optional[Dataset], Optional[Dataset]]:
        """Load train and eval datasets."""
        try:
            dataset_id = context.job.dataset_id
            dataset_metadata = context.dataset_metadata

            self.logger.info(f"Loading dataset: {dataset_id}")

            # Get dataset paths from metadata
            train_path = dataset_metadata.get("train_path")
            eval_path = dataset_metadata.get("eval_path")

            train_dataset = None
            eval_dataset = None

            # Load train dataset
            if train_path and os.path.exists(train_path):
                self.logger.info(f"Loading train dataset from: {train_path}")
                train_dataset = load_from_disk(train_path)

                # Validate dataset
                trainer_validator.validate_dataset(train_dataset)

                self.logger.info(f"Train dataset loaded: {len(train_dataset)} samples")
            else:
                self.logger.warning("Train dataset path not found, will use placeholder")
                # Create a minimal placeholder dataset for testing
                train_dataset = self._create_placeholder_dataset(tokenizer)

            # Load eval dataset (optional)
            if eval_path and os.path.exists(eval_path):
                self.logger.info(f"Loading eval dataset from: {eval_path}")
                eval_dataset = load_from_disk(eval_path)
                self.logger.info(f"Eval dataset loaded: {len(eval_dataset)} samples")

            return train_dataset, eval_dataset

        except Exception as e:
            self.logger.error(f"Failed to load dataset: {str(e)}")
            raise TrainerBuildException(f"Dataset loading failed: {str(e)}")

    def _create_placeholder_dataset(self, tokenizer: AutoTokenizer) -> Dataset:
        """Create a minimal placeholder dataset for testing."""
        self.logger.warning("Creating placeholder dataset for testing")

        # Create simple training examples
        texts = [
            "This is a training example.",
            "Another training sample.",
            "Machine learning is amazing.",
        ]

        # Tokenize
        encodings = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="pt",
        )

        # Create dataset
        dataset = Dataset.from_dict({
            "input_ids": encodings["input_ids"].tolist(),
            "attention_mask": encodings["attention_mask"].tolist(),
        })

        return dataset

    def _load_model(self, context: TrainingContext) -> AutoModelForCausalLM:
        """Load model."""
        try:
            model_path = context.model_metadata.get("model_path")

            if not model_path:
                raise ValueError("Model path not found in metadata")

            self.logger.info(f"Loading model from: {model_path}")

            config = context.job.config

            # Determine dtype
            dtype = torch.float32
            if config.fp16:
                dtype = torch.float16
            elif config.bf16:
                dtype = torch.bfloat16

            # Determine device
            device_map = None
            if not config.use_cpu and torch.cuda.is_available():
                device_map = "auto"

            # Load model
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                trust_remote_code=True,
                torch_dtype=dtype,
                device_map=device_map,
            )

            # Enable gradient checkpointing if configured
            if config.gradient_checkpointing:
                model.gradient_checkpointing_enable()
                self.logger.info("Gradient checkpointing enabled")

            # Validate model
            trainer_validator.validate_model(model)

            return model

        except Exception as e:
            self.logger.error(f"Failed to load model: {str(e)}")
            raise TrainerBuildException(f"Model loading failed: {str(e)}")

    def _create_data_collator(
        self, context: TrainingContext, tokenizer: AutoTokenizer
    ) -> DataCollatorForLanguageModeling:
        """Create data collator."""
        try:
            training_type = context.job.config.training_type

            self.logger.info(f"Creating data collator for {training_type.value}")

            # For Phase 4.4.4.5.2, use standard language modeling collator
            # Future phases will add specialized collators

            if training_type in [
                TrainingType.FULL_FINE_TUNE,
                TrainingType.INSTRUCTION_TUNING,
                TrainingType.CONVERSATION_TUNING,
                TrainingType.DOMAIN_ADAPTATION,
            ]:
                # Standard causal language modeling
                data_collator = DataCollatorForLanguageModeling(
                    tokenizer=tokenizer,
                    mlm=False,  # Causal LM, not masked LM
                )

                self.logger.info("DataCollatorForLanguageModeling created")

                return data_collator

            else:
                raise ValueError(
                    f"Training type {training_type.value} not supported in Phase 4.4.4.5.2"
                )

        except Exception as e:
            self.logger.error(f"Failed to create data collator: {str(e)}")
            raise DataCollatorException(f"Data collator creation failed: {str(e)}")


# Global instance
trainer_builder = TrainerBuilder()
