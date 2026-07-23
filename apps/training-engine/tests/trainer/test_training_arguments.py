"""Tests for TrainingArguments Builder."""

import os
import tempfile
from datetime import datetime
from typing import Dict

import pytest
from transformers import TrainingArguments

from app.trainer.training_arguments import (
    TrainingArgumentsBuilder,
    training_arguments_builder,
)
from app.trainer.exceptions import TrainingArgumentsException
from app.training_executor.models import (
    TrainingConfig,
    TrainingContext,
    TrainingJob,
    TrainingStatus,
    TrainingType,
    OptimizerType,
    SchedulerType,
)


@pytest.fixture
def temp_output_dir():
    """Create temporary output directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def training_config() -> TrainingConfig:
    """Create test training configuration."""
    return TrainingConfig(
        training_type=TrainingType.FULL_FINE_TUNE,
        num_train_epochs=3,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        gradient_accumulation_steps=2,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_ratio=0.1,
        warmup_steps=100,
        optimizer_type=OptimizerType.ADAMW_TORCH,
        adam_beta1=0.9,
        adam_beta2=0.999,
        adam_epsilon=1e-8,
        scheduler_type=SchedulerType.LINEAR,
        fp16=False,
        bf16=False,
        max_grad_norm=1.0,
        gradient_checkpointing=False,
        logging_steps=10,
        evaluation_strategy="steps",
        eval_steps=100,
        save_strategy="steps",
        save_steps=500,
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="loss",
        seed=42,
        dataloader_num_workers=0,
        dataloader_pin_memory=True,
        report_to=[],
        push_to_hub=False,
        use_cpu=True,
    )


@pytest.fixture
def training_job(training_config: TrainingConfig) -> TrainingJob:
    """Create test training job."""
    return TrainingJob(
        job_id="test-job-123",
        model_id="model-456",
        dataset_id="dataset-789",
        config=training_config,
        status=TrainingStatus.PENDING,
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def training_context(training_job: TrainingJob, temp_output_dir: str) -> TrainingContext:
    """Create test training context."""
    return TrainingContext(
        job=training_job,
        output_dir=temp_output_dir,
        checkpoint_dir=os.path.join(temp_output_dir, "checkpoints"),
        log_dir=os.path.join(temp_output_dir, "logs"),
        device="cpu",
        dataset_metadata={"dataset_id": "dataset-789"},
        tokenizer_metadata={"tokenizer_path": "/path/to/tokenizer"},
        model_metadata={"model_path": "/path/to/model"},
    )


class TestTrainingArgumentsBuilder:
    """Test TrainingArgumentsBuilder."""

    def test_builder_initialization(self):
        """Test builder can be initialized."""
        builder = TrainingArgumentsBuilder()
        assert builder is not None
        assert builder.logger is not None

    def test_build_training_arguments(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test building TrainingArguments from context."""
        builder = TrainingArgumentsBuilder()

        args = builder.build(training_context, output_dir=temp_output_dir)

        # Verify it's a TrainingArguments instance
        assert isinstance(args, TrainingArguments)

        # Verify output directory
        assert args.output_dir == temp_output_dir
        assert args.overwrite_output_dir is True

        # Verify training parameters
        assert args.num_train_epochs == 3
        assert args.per_device_train_batch_size == 4
        assert args.per_device_eval_batch_size == 4
        assert args.gradient_accumulation_steps == 2

        # Verify learning rate
        assert args.learning_rate == 2e-5
        assert args.weight_decay == 0.01
        assert args.warmup_ratio == 0.1
        assert args.warmup_steps == 100

        # Verify optimizer
        assert args.optim == "adamw_torch"
        assert args.adam_beta1 == 0.9
        assert args.adam_beta2 == 0.999
        assert args.adam_epsilon == 1e-8

        # Verify scheduler
        assert args.lr_scheduler_type == "linear"

        # Verify precision
        assert args.fp16 is False
        assert args.bf16 is False

        # Verify gradient
        assert args.max_grad_norm == 1.0
        assert args.gradient_checkpointing is False

        # Verify logging
        assert args.logging_steps == 10
        assert args.logging_strategy == "steps"
        assert args.logging_first_step is True

        # Verify evaluation
        assert args.evaluation_strategy == "steps"
        assert args.eval_steps == 100

        # Verify saving
        assert args.save_strategy == "steps"
        assert args.save_steps == 500
        assert args.save_total_limit == 3
        assert args.load_best_model_at_end is True
        assert args.metric_for_best_model == "loss"

        # Verify system
        assert args.seed == 42
        assert args.data_seed == 42
        assert args.dataloader_num_workers == 0
        assert args.dataloader_pin_memory is True

        # Verify reporting
        assert args.report_to == []
        assert args.push_to_hub is False

        # Verify device
        assert args.use_cpu is True

    def test_build_with_fp16(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test building with FP16."""
        training_context.job.config.fp16 = True
        training_context.job.config.bf16 = False

        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        assert args.fp16 is True
        assert args.bf16 is False

    def test_build_with_bf16(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test building with BF16."""
        training_context.job.config.fp16 = False
        training_context.job.config.bf16 = True

        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        assert args.fp16 is False
        assert args.bf16 is True

    def test_build_with_both_fp16_bf16(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test that fp16 and bf16 are mutually exclusive."""
        training_context.job.config.fp16 = True
        training_context.job.config.bf16 = True

        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        # When both are True, bf16 takes precedence
        assert args.fp16 is False
        assert args.bf16 is True

    def test_build_creates_output_dir(self, training_context: TrainingContext):
        """Test that output directory is created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = os.path.join(tmpdir, "nonexistent")
            assert not os.path.exists(output_dir)

            builder = TrainingArgumentsBuilder()
            args = builder.build(training_context, output_dir=output_dir)

            assert os.path.exists(output_dir)
            assert args.output_dir == output_dir

    def test_build_with_no_output_dir_override(
        self, training_context: TrainingContext
    ):
        """Test building without output_dir override uses context output_dir."""
        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context)

        assert args.output_dir == training_context.output_dir

    def test_validate_config_success(self, training_config: TrainingConfig):
        """Test successful config validation."""
        builder = TrainingArgumentsBuilder()
        result = builder.validate_config(training_config)

        assert result is True

    def test_validate_config_negative_epochs(self, training_config: TrainingConfig):
        """Test validation fails with negative epochs."""
        training_config.num_train_epochs = -1

        builder = TrainingArgumentsBuilder()

        with pytest.raises(TrainingArgumentsException, match="num_train_epochs must be positive"):
            builder.validate_config(training_config)

    def test_validate_config_zero_epochs(self, training_config: TrainingConfig):
        """Test validation fails with zero epochs."""
        training_config.num_train_epochs = 0

        builder = TrainingArgumentsBuilder()

        with pytest.raises(TrainingArgumentsException, match="num_train_epochs must be positive"):
            builder.validate_config(training_config)

    def test_validate_config_negative_batch_size(self, training_config: TrainingConfig):
        """Test validation fails with negative batch size."""
        training_config.per_device_train_batch_size = -1

        builder = TrainingArgumentsBuilder()

        with pytest.raises(
            TrainingArgumentsException, match="per_device_train_batch_size must be positive"
        ):
            builder.validate_config(training_config)

    def test_validate_config_zero_learning_rate(self, training_config: TrainingConfig):
        """Test validation fails with zero learning rate."""
        training_config.learning_rate = 0

        builder = TrainingArgumentsBuilder()

        with pytest.raises(TrainingArgumentsException, match="learning_rate must be positive"):
            builder.validate_config(training_config)

    def test_validate_config_fp16_and_bf16(self, training_config: TrainingConfig):
        """Test validation fails when both fp16 and bf16 are True."""
        training_config.fp16 = True
        training_config.bf16 = True

        builder = TrainingArgumentsBuilder()

        with pytest.raises(
            TrainingArgumentsException, match="fp16 and bf16 cannot both be True"
        ):
            builder.validate_config(training_config)

    def test_get_total_steps(self, training_config: TrainingConfig):
        """Test total steps calculation."""
        builder = TrainingArgumentsBuilder()

        dataset_size = 1000
        total_steps = builder.get_total_steps(training_config, dataset_size)

        # effective_batch_size = 4 * 2 = 8
        # steps_per_epoch = 1000 // 8 = 125
        # total_steps = 125 * 3 = 375
        expected_steps = 375

        assert total_steps == expected_steps

    def test_get_total_steps_with_different_config(self, training_config: TrainingConfig):
        """Test total steps with different configuration."""
        training_config.per_device_train_batch_size = 8
        training_config.gradient_accumulation_steps = 4
        training_config.num_train_epochs = 5

        builder = TrainingArgumentsBuilder()

        dataset_size = 3200
        total_steps = builder.get_total_steps(training_config, dataset_size)

        # effective_batch_size = 8 * 4 = 32
        # steps_per_epoch = 3200 // 32 = 100
        # total_steps = 100 * 5 = 500
        expected_steps = 500

        assert total_steps == expected_steps

    def test_global_instance(self):
        """Test that global training_arguments_builder instance exists."""
        assert training_arguments_builder is not None
        assert isinstance(training_arguments_builder, TrainingArgumentsBuilder)

    def test_build_with_epoch_evaluation_strategy(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test building with epoch-based evaluation."""
        training_context.job.config.evaluation_strategy = "epoch"
        training_context.job.config.eval_steps = None

        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        assert args.evaluation_strategy == "epoch"
        assert args.eval_steps is None

    def test_build_with_epoch_save_strategy(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test building with epoch-based saving."""
        training_context.job.config.save_strategy = "epoch"
        training_context.job.config.save_steps = None

        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        assert args.save_strategy == "epoch"
        assert args.save_steps is None

    def test_logging_directory_created(
        self, training_context: TrainingContext, temp_output_dir: str
    ):
        """Test that logging directory is set correctly."""
        builder = TrainingArgumentsBuilder()
        args = builder.build(training_context, output_dir=temp_output_dir)

        expected_log_dir = os.path.join(temp_output_dir, "logs")
        assert args.logging_dir == expected_log_dir
