"""Tests for Trainer Factory."""

import os
import tempfile
from datetime import datetime

import pytest

from app.trainer.trainer_factory import TrainerFactory, trainer_factory
from app.trainer.trainer_builder import TrainerBuilder
from app.trainer.hf_trainer import HFTrainerWrapper
from app.training_executor.models import (
    TrainingConfig,
    TrainingContext,
    TrainingJob,
    TrainingStatus,
    TrainingType,
)


@pytest.fixture
def training_config() -> TrainingConfig:
    """Create test training configuration."""
    return TrainingConfig(
        training_type=TrainingType.FULL_FINE_TUNE,
        num_train_epochs=1,
        per_device_train_batch_size=1,
        learning_rate=1e-5,
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
def training_context(training_job: TrainingJob) -> TrainingContext:
    """Create test training context."""
    with tempfile.TemporaryDirectory() as tmpdir:
        context = TrainingContext(
            job=training_job,
            output_dir=os.path.join(tmpdir, "output"),
            checkpoint_dir=os.path.join(tmpdir, "checkpoints"),
            log_dir=os.path.join(tmpdir, "logs"),
            device="cpu",
            dataset_metadata={
                "dataset_id": "dataset-789",
                "train_path": "/path/to/train",
            },
            tokenizer_metadata={
                "tokenizer_path": "/path/to/tokenizer",
            },
            model_metadata={
                "model_path": "/path/to/model",
            },
        )
        yield context


class TestTrainerFactory:
    """Test TrainerFactory."""

    def test_factory_initialization(self):
        """Test factory can be initialized."""
        factory = TrainerFactory()
        assert factory is not None
        assert factory.logger is not None

    def test_create_trainer_full_fine_tune(self, training_context: TrainingContext):
        """Test creating trainer for full fine-tuning."""
        training_context.job.config.training_type = TrainingType.FULL_FINE_TUNE

        factory = TrainerFactory()
        trainer = factory.create_trainer(training_context)

        assert trainer is not None
        assert isinstance(trainer, HFTrainerWrapper)

    def test_create_trainer_instruction_tuning(self, training_context: TrainingContext):
        """Test creating trainer for instruction tuning."""
        training_context.job.config.training_type = TrainingType.INSTRUCTION_TUNING

        factory = TrainerFactory()
        trainer = factory.create_trainer(training_context)

        assert trainer is not None
        assert isinstance(trainer, HFTrainerWrapper)

    def test_create_trainer_conversation_tuning(self, training_context: TrainingContext):
        """Test creating trainer for conversation tuning."""
        training_context.job.config.training_type = TrainingType.CONVERSATION_TUNING

        factory = TrainerFactory()
        trainer = factory.create_trainer(training_context)

        assert trainer is not None
        assert isinstance(trainer, HFTrainerWrapper)

    def test_create_trainer_domain_adaptation(self, training_context: TrainingContext):
        """Test creating trainer for domain adaptation."""
        training_context.job.config.training_type = TrainingType.DOMAIN_ADAPTATION

        factory = TrainerFactory()
        trainer = factory.create_trainer(training_context)

        assert trainer is not None
        assert isinstance(trainer, HFTrainerWrapper)

    def test_create_trainer_unsupported_type(self, training_context: TrainingContext):
        """Test creating trainer fails with unsupported type."""
        training_context.job.config.training_type = TrainingType.LORA

        factory = TrainerFactory()

        with pytest.raises(ValueError, match="Training type lora not supported"):
            factory.create_trainer(training_context)

    def test_create_trainer_with_override(self, training_context: TrainingContext):
        """Test creating trainer with trainer_type override."""
        factory = TrainerFactory()
        trainer = factory.create_trainer(training_context, trainer_type="hf_trainer")

        assert trainer is not None
        assert isinstance(trainer, HFTrainerWrapper)

    def test_validate_training_type_supported(self, training_context: TrainingContext):
        """Test training type validation for supported types."""
        factory = TrainerFactory()

        # These should not raise
        factory._validate_training_type(TrainingType.FULL_FINE_TUNE)
        factory._validate_training_type(TrainingType.INSTRUCTION_TUNING)
        factory._validate_training_type(TrainingType.CONVERSATION_TUNING)
        factory._validate_training_type(TrainingType.DOMAIN_ADAPTATION)

    def test_validate_training_type_unsupported(self):
        """Test training type validation for unsupported types."""
        factory = TrainerFactory()

        with pytest.raises(ValueError, match="Training type lora not supported"):
            factory._validate_training_type(TrainingType.LORA)

        with pytest.raises(ValueError, match="Training type qlora not supported"):
            factory._validate_training_type(TrainingType.QLORA)

    def test_create_builder(self):
        """Test creating trainer builder."""
        factory = TrainerFactory()
        builder = factory.create_builder()

        assert builder is not None
        assert isinstance(builder, TrainerBuilder)

    def test_validate_compatibility_success(self, training_context: TrainingContext):
        """Test successful compatibility validation."""
        factory = TrainerFactory()
        result = factory.validate_compatibility(training_context)

        assert result is True

    def test_validate_compatibility_unsupported_type(
        self, training_context: TrainingContext
    ):
        """Test compatibility validation fails with unsupported type."""
        training_context.job.config.training_type = TrainingType.LORA

        factory = TrainerFactory()
        result = factory.validate_compatibility(training_context)

        assert result is False

    def test_validate_compatibility_missing_dataset_metadata(
        self, training_context: TrainingContext
    ):
        """Test compatibility validation fails with missing dataset metadata."""
        training_context.dataset_metadata = None

        factory = TrainerFactory()
        result = factory.validate_compatibility(training_context)

        assert result is False

    def test_validate_compatibility_missing_model_metadata(
        self, training_context: TrainingContext
    ):
        """Test compatibility validation fails with missing model metadata."""
        training_context.model_metadata = None

        factory = TrainerFactory()
        result = factory.validate_compatibility(training_context)

        assert result is False

    def test_validate_compatibility_missing_tokenizer_metadata(
        self, training_context: TrainingContext
    ):
        """Test compatibility validation fails with missing tokenizer metadata."""
        training_context.tokenizer_metadata = None

        factory = TrainerFactory()
        result = factory.validate_compatibility(training_context)

        assert result is False

    def test_global_instance(self):
        """Test that global trainer_factory instance exists."""
        assert trainer_factory is not None
        assert isinstance(trainer_factory, TrainerFactory)

    def test_create_multiple_trainers(self, training_context: TrainingContext):
        """Test creating multiple trainer instances."""
        factory = TrainerFactory()

        trainer1 = factory.create_trainer(training_context)
        trainer2 = factory.create_trainer(training_context)

        assert trainer1 is not None
        assert trainer2 is not None
        assert trainer1 is not trainer2  # Different instances

    def test_factory_logs_creation(self, training_context: TrainingContext, caplog):
        """Test that factory logs trainer creation."""
        import logging
        caplog.set_level(logging.INFO)

        factory = TrainerFactory()
        factory.create_trainer(training_context)

        assert "Creating trainer" in caplog.text
        assert "Trainer created" in caplog.text
