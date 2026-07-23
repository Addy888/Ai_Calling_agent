"""Tests for Trainer Validation."""

import os
import tempfile
from datetime import datetime

import pytest
import torch
from datasets import Dataset
from transformers import AutoTokenizer, PreTrainedTokenizer

from app.trainer.trainer_validation import TrainerValidator, trainer_validator
from app.trainer.exceptions import TrainerValidationException
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


@pytest.fixture
def mock_dataset():
    """Create mock HuggingFace dataset."""
    data = {
        "input_ids": [[1, 2, 3], [4, 5, 6]],
        "attention_mask": [[1, 1, 1], [1, 1, 1]],
    }
    return Dataset.from_dict(data)


@pytest.fixture
def mock_tokenizer():
    """Create mock tokenizer."""
    class MockTokenizer:
        """Mock tokenizer for testing."""
        
        def __init__(self):
            self.pad_token = "[PAD]"
            self.eos_token = "[EOS]"
            self.vocab_size = 1000
        
        def encode(self, text):
            return [1, 2, 3]
        
        def decode(self, ids):
            return "test text"
        
        def __call__(self, text, **kwargs):
            return {"input_ids": [1, 2, 3], "attention_mask": [1, 1, 1]}
    
    return MockTokenizer()


@pytest.fixture
def mock_model():
    """Create mock PyTorch model."""
    class MockModel(torch.nn.Module):
        """Mock model for testing."""
        
        def __init__(self):
            super().__init__()
            self.linear = torch.nn.Linear(10, 10)
        
        def forward(self, x):
            return self.linear(x)
    
    return MockModel()


class TestTrainerValidator:
    """Test TrainerValidator."""

    def test_validator_initialization(self):
        """Test validator can be initialized."""
        validator = TrainerValidator()
        assert validator is not None
        assert validator.logger is not None

    def test_validate_context_success(self, training_context: TrainingContext):
        """Test successful context validation."""
        validator = TrainerValidator()
        result = validator.validate_context(training_context)

        assert result is True

    def test_validate_context_missing_job(self, training_context: TrainingContext):
        """Test validation fails with missing job."""
        training_context.job = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Training job is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_config(self, training_context: TrainingContext):
        """Test validation fails with missing config."""
        training_context.job.config = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Training configuration is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_dataset_metadata(
        self, training_context: TrainingContext
    ):
        """Test validation fails with missing dataset metadata."""
        training_context.dataset_metadata = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Dataset metadata is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_model_metadata(
        self, training_context: TrainingContext
    ):
        """Test validation fails with missing model metadata."""
        training_context.model_metadata = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Model metadata is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_tokenizer_metadata(
        self, training_context: TrainingContext
    ):
        """Test validation fails with missing tokenizer metadata."""
        training_context.tokenizer_metadata = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Tokenizer metadata is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_output_dir(
        self, training_context: TrainingContext
    ):
        """Test validation fails with missing output directory."""
        training_context.output_dir = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Output directory is missing"):
            validator.validate_context(training_context)

    def test_validate_context_missing_checkpoint_dir(
        self, training_context: TrainingContext
    ):
        """Test validation fails with missing checkpoint directory."""
        training_context.checkpoint_dir = None

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Checkpoint directory is missing"):
            validator.validate_context(training_context)

    def test_validate_context_unsupported_training_type(
        self, training_context: TrainingContext
    ):
        """Test validation fails with unsupported training type."""
        # Set an unsupported training type (e.g., LORA)
        training_context.job.config.training_type = TrainingType.LORA

        validator = TrainerValidator()

        with pytest.raises(
            TrainerValidationException, match="Training type lora not supported"
        ):
            validator.validate_context(training_context)

    def test_validate_dataset_success(self, mock_dataset):
        """Test successful dataset validation."""
        validator = TrainerValidator()
        result = validator.validate_dataset(mock_dataset)

        assert result is True

    def test_validate_dataset_none(self):
        """Test validation fails with None dataset."""
        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Dataset is None"):
            validator.validate_dataset(None)

    def test_validate_dataset_no_len(self):
        """Test validation fails with dataset without __len__."""
        class NoLenDataset:
            """Dataset without __len__ method."""
            pass

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Dataset must have __len__ method"):
            validator.validate_dataset(NoLenDataset())

    def test_validate_dataset_empty(self):
        """Test validation fails with empty dataset."""
        empty_dataset = Dataset.from_dict({"input_ids": []})

        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Dataset is empty"):
            validator.validate_dataset(empty_dataset)

    def test_validate_tokenizer_success(self, mock_tokenizer):
        """Test successful tokenizer validation."""
        validator = TrainerValidator()
        result = validator.validate_tokenizer(mock_tokenizer)

        assert result is True

    def test_validate_tokenizer_none(self):
        """Test validation fails with None tokenizer."""
        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Tokenizer is None"):
            validator.validate_tokenizer(None)

    def test_validate_tokenizer_missing_encode(self):
        """Test validation fails with tokenizer missing encode method."""
        class NoEncodeTokenizer:
            """Tokenizer without encode method."""
            def decode(self, ids):
                return "test"
            def __call__(self, text):
                return {}

        validator = TrainerValidator()

        with pytest.raises(
            TrainerValidationException, match="Tokenizer missing required method: encode"
        ):
            validator.validate_tokenizer(NoEncodeTokenizer())

    def test_validate_tokenizer_missing_decode(self):
        """Test validation fails with tokenizer missing decode method."""
        class NoDecodeTokenizer:
            """Tokenizer without decode method."""
            def encode(self, text):
                return [1, 2, 3]
            def __call__(self, text):
                return {}

        validator = TrainerValidator()

        with pytest.raises(
            TrainerValidationException, match="Tokenizer missing required method: decode"
        ):
            validator.validate_tokenizer(NoDecodeTokenizer())

    def test_validate_tokenizer_no_pad_token(self):
        """Test validation warns about missing pad token."""
        class NoPadTokenizer:
            """Tokenizer without pad_token."""
            pad_token = None
            
            def encode(self, text):
                return [1, 2, 3]
            def decode(self, ids):
                return "test"
            def __call__(self, text):
                return {}

        validator = TrainerValidator()
        
        # Should still pass but log warning
        result = validator.validate_tokenizer(NoPadTokenizer())
        assert result is True

    def test_validate_model_success(self, mock_model):
        """Test successful model validation."""
        validator = TrainerValidator()
        result = validator.validate_model(mock_model)

        assert result is True

    def test_validate_model_none(self):
        """Test validation fails with None model."""
        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="Model is None"):
            validator.validate_model(None)

    def test_validate_model_not_nn_module(self):
        """Test validation fails with non-nn.Module model."""
        class NotAModule:
            """Not a PyTorch module."""
            pass

        validator = TrainerValidator()

        with pytest.raises(
            TrainerValidationException, match="Model must be a PyTorch nn.Module"
        ):
            validator.validate_model(NotAModule())

    def test_validate_training_arguments_success(self):
        """Test successful training arguments validation."""
        class MockTrainingArgs:
            """Mock training arguments."""
            output_dir = "/tmp/output"
            num_train_epochs = 3
            per_device_train_batch_size = 4
            learning_rate = 2e-5

        validator = TrainerValidator()
        result = validator.validate_training_arguments(MockTrainingArgs())

        assert result is True

    def test_validate_training_arguments_none(self):
        """Test validation fails with None training arguments."""
        validator = TrainerValidator()

        with pytest.raises(TrainerValidationException, match="TrainingArguments is None"):
            validator.validate_training_arguments(None)

    def test_validate_training_arguments_missing_output_dir(self):
        """Test validation fails with missing output_dir."""
        class NoOutputDir:
            """Training arguments without output_dir."""
            num_train_epochs = 3
            per_device_train_batch_size = 4
            learning_rate = 2e-5

        validator = TrainerValidator()

        with pytest.raises(
            TrainerValidationException,
            match="TrainingArguments missing attribute: output_dir"
        ):
            validator.validate_training_arguments(NoOutputDir())

    def test_global_instance(self):
        """Test that global trainer_validator instance exists."""
        assert trainer_validator is not None
        assert isinstance(trainer_validator, TrainerValidator)

    def test_device_validation_cuda_unavailable(self, training_context: TrainingContext):
        """Test device validation when CUDA requested but unavailable."""
        # This test assumes CUDA is not available in test environment
        training_context.device = "cuda"
        training_context.job.config.use_cpu = False

        validator = TrainerValidator()
        
        # Validation should still pass but device should be changed to cpu
        result = validator.validate_context(training_context)
        assert result is True
        
        # Device should be changed to cpu if CUDA not available
        if not torch.cuda.is_available():
            assert training_context.device == "cpu"
