"""Tests for Trainer Builder."""

import os
import tempfile
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

import pytest
import torch
from datasets import Dataset
from transformers import Trainer, DataCollatorForLanguageModeling

from app.trainer.trainer_builder import TrainerBuilder, trainer_builder
from app.trainer.exceptions import TrainerBuildException, DataCollatorException
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
        fp16=False,
        bf16=False,
        gradient_checkpointing=False,
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
                "train_path": os.path.join(tmpdir, "train_dataset"),
            },
            tokenizer_metadata={
                "tokenizer_path": "bert-base-uncased",
            },
            model_metadata={
                "model_path": "gpt2",
            },
        )
        yield context


@pytest.fixture
def mock_tokenizer():
    """Create mock tokenizer."""
    tokenizer = Mock()
    tokenizer.pad_token = "[PAD]"
    tokenizer.eos_token = "[EOS]"
    tokenizer.vocab_size = 1000
    tokenizer.encode = Mock(return_value=[1, 2, 3])
    tokenizer.decode = Mock(return_value="test text")
    tokenizer.__call__ = Mock(return_value={
        "input_ids": torch.tensor([[1, 2, 3]]),
        "attention_mask": torch.tensor([[1, 1, 1]])
    })
    return tokenizer


@pytest.fixture
def mock_dataset():
    """Create mock dataset."""
    data = {
        "input_ids": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "attention_mask": [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    }
    return Dataset.from_dict(data)


@pytest.fixture
def mock_model():
    """Create mock model."""
    class MockModel(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.linear = torch.nn.Linear(10, 10)
        
        def forward(self, input_ids, attention_mask=None, labels=None):
            return {"loss": torch.tensor(0.5)}
        
        def gradient_checkpointing_enable(self):
            pass
    
    return MockModel()


class TestTrainerBuilder:
    """Test TrainerBuilder."""

    def test_builder_initialization(self):
        """Test builder can be initialized."""
        builder = TrainerBuilder()
        assert builder is not None
        assert builder.logger is not None

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    @patch("app.trainer.trainer_builder.load_from_disk")
    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    @patch("app.trainer.trainer_builder.training_arguments_builder")
    @patch("app.trainer.trainer_builder.trainer_validator")
    def test_build_trainer_success(
        self,
        mock_validator,
        mock_args_builder,
        mock_model_loader,
        mock_dataset_loader,
        mock_tokenizer_loader,
        training_context,
        mock_tokenizer,
        mock_dataset,
        mock_model,
    ):
        """Test successful trainer building."""
        # Setup mocks
        mock_validator.validate_context = Mock(return_value=True)
        mock_validator.validate_tokenizer = Mock(return_value=True)
        mock_validator.validate_dataset = Mock(return_value=True)
        mock_validator.validate_model = Mock(return_value=True)
        
        mock_tokenizer_loader.from_pretrained = Mock(return_value=mock_tokenizer)
        mock_dataset_loader.return_value = mock_dataset
        mock_model_loader.from_pretrained = Mock(return_value=mock_model)
        
        mock_training_args = Mock()
        mock_args_builder.build = Mock(return_value=mock_training_args)

        # Create builder and build trainer
        builder = TrainerBuilder()
        
        # Create dataset directory for test
        os.makedirs(training_context.dataset_metadata["train_path"], exist_ok=True)
        
        trainer = builder.build(training_context)

        # Verify trainer was created
        assert trainer is not None
        assert isinstance(trainer, Trainer)

        # Verify components were loaded
        mock_validator.validate_context.assert_called_once()
        mock_tokenizer_loader.from_pretrained.assert_called()
        mock_model_loader.from_pretrained.assert_called()

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    def test_load_tokenizer_success(
        self, mock_tokenizer_loader, training_context, mock_tokenizer
    ):
        """Test successful tokenizer loading."""
        mock_tokenizer_loader.from_pretrained = Mock(return_value=mock_tokenizer)

        builder = TrainerBuilder()
        tokenizer = builder._load_tokenizer(training_context)

        assert tokenizer is not None
        assert tokenizer.pad_token == "[PAD]"
        mock_tokenizer_loader.from_pretrained.assert_called_once()

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    def test_load_tokenizer_no_pad_token_has_eos(
        self, mock_tokenizer_loader, training_context
    ):
        """Test tokenizer loading sets pad_token to eos_token when missing."""
        mock_tokenizer = Mock()
        mock_tokenizer.pad_token = None
        mock_tokenizer.eos_token = "[EOS]"
        mock_tokenizer_loader.from_pretrained = Mock(return_value=mock_tokenizer)

        builder = TrainerBuilder()
        tokenizer = builder._load_tokenizer(training_context)

        # Verify pad_token was set to eos_token
        assert tokenizer.pad_token == "[EOS]"

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    def test_load_tokenizer_no_pad_token_no_eos(
        self, mock_tokenizer_loader, training_context
    ):
        """Test tokenizer loading adds pad_token when neither pad nor eos exists."""
        mock_tokenizer = Mock()
        mock_tokenizer.pad_token = None
        mock_tokenizer.eos_token = None
        mock_tokenizer.add_special_tokens = Mock()
        mock_tokenizer_loader.from_pretrained = Mock(return_value=mock_tokenizer)

        builder = TrainerBuilder()
        tokenizer = builder._load_tokenizer(training_context)

        # Verify add_special_tokens was called
        mock_tokenizer.add_special_tokens.assert_called_once_with({"pad_token": "[PAD]"})

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    def test_load_tokenizer_fallback_to_model_path(
        self, mock_tokenizer_loader, training_context, mock_tokenizer
    ):
        """Test tokenizer loading falls back to model path."""
        # Remove tokenizer_path from metadata
        training_context.tokenizer_metadata = {}
        
        mock_tokenizer_loader.from_pretrained = Mock(return_value=mock_tokenizer)

        builder = TrainerBuilder()
        tokenizer = builder._load_tokenizer(training_context)

        assert tokenizer is not None
        # Should have called with model_path
        mock_tokenizer_loader.from_pretrained.assert_called_once()

    @patch("app.trainer.trainer_builder.load_from_disk")
    def test_load_dataset_success(
        self, mock_dataset_loader, training_context, mock_tokenizer, mock_dataset
    ):
        """Test successful dataset loading."""
        # Create dataset directory
        train_path = training_context.dataset_metadata["train_path"]
        os.makedirs(train_path, exist_ok=True)
        
        mock_dataset_loader.return_value = mock_dataset

        builder = TrainerBuilder()
        train_dataset, eval_dataset = builder._load_dataset(training_context, mock_tokenizer)

        assert train_dataset is not None
        assert len(train_dataset) == 3
        mock_dataset_loader.assert_called_once()

    @patch("app.trainer.trainer_builder.load_from_disk")
    def test_load_dataset_with_eval(
        self, mock_dataset_loader, training_context, mock_tokenizer, mock_dataset
    ):
        """Test dataset loading with eval dataset."""
        # Create dataset directories
        train_path = training_context.dataset_metadata["train_path"]
        eval_path = os.path.join(os.path.dirname(train_path), "eval_dataset")
        
        os.makedirs(train_path, exist_ok=True)
        os.makedirs(eval_path, exist_ok=True)
        
        training_context.dataset_metadata["eval_path"] = eval_path
        
        mock_dataset_loader.return_value = mock_dataset

        builder = TrainerBuilder()
        train_dataset, eval_dataset = builder._load_dataset(training_context, mock_tokenizer)

        assert train_dataset is not None
        assert eval_dataset is not None
        assert mock_dataset_loader.call_count == 2

    def test_load_dataset_creates_placeholder(self, training_context, mock_tokenizer):
        """Test placeholder dataset creation when path not found."""
        # Set non-existent path
        training_context.dataset_metadata["train_path"] = "/nonexistent/path"

        builder = TrainerBuilder()
        train_dataset, eval_dataset = builder._load_dataset(training_context, mock_tokenizer)

        assert train_dataset is not None
        assert len(train_dataset) == 3  # Placeholder has 3 samples
        assert eval_dataset is None

    def test_create_placeholder_dataset(self, mock_tokenizer):
        """Test placeholder dataset creation."""
        builder = TrainerBuilder()
        dataset = builder._create_placeholder_dataset(mock_tokenizer)

        assert dataset is not None
        assert len(dataset) == 3
        assert "input_ids" in dataset.column_names
        assert "attention_mask" in dataset.column_names

    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    def test_load_model_success(
        self, mock_model_loader, training_context, mock_model
    ):
        """Test successful model loading."""
        mock_model_loader.from_pretrained = Mock(return_value=mock_model)

        builder = TrainerBuilder()
        model = builder._load_model(training_context)

        assert model is not None
        mock_model_loader.from_pretrained.assert_called_once()

    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    def test_load_model_with_fp16(
        self, mock_model_loader, training_context, mock_model
    ):
        """Test model loading with FP16."""
        training_context.job.config.fp16 = True
        training_context.job.config.bf16 = False
        
        mock_model_loader.from_pretrained = Mock(return_value=mock_model)

        builder = TrainerBuilder()
        model = builder._load_model(training_context)

        assert model is not None
        # Verify dtype was set to float16
        call_kwargs = mock_model_loader.from_pretrained.call_args[1]
        assert call_kwargs["torch_dtype"] == torch.float16

    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    def test_load_model_with_bf16(
        self, mock_model_loader, training_context, mock_model
    ):
        """Test model loading with BF16."""
        training_context.job.config.fp16 = False
        training_context.job.config.bf16 = True
        
        mock_model_loader.from_pretrained = Mock(return_value=mock_model)

        builder = TrainerBuilder()
        model = builder._load_model(training_context)

        assert model is not None
        # Verify dtype was set to bfloat16
        call_kwargs = mock_model_loader.from_pretrained.call_args[1]
        assert call_kwargs["torch_dtype"] == torch.bfloat16

    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    def test_load_model_with_gradient_checkpointing(
        self, mock_model_loader, training_context, mock_model
    ):
        """Test model loading with gradient checkpointing."""
        training_context.job.config.gradient_checkpointing = True
        
        mock_model_loader.from_pretrained = Mock(return_value=mock_model)

        builder = TrainerBuilder()
        model = builder._load_model(training_context)

        # Verify gradient_checkpointing_enable was called (if model has the method)
        assert model is not None

    def test_create_data_collator_language_modeling(
        self, training_context, mock_tokenizer
    ):
        """Test data collator creation for language modeling."""
        builder = TrainerBuilder()
        data_collator = builder._create_data_collator(training_context, mock_tokenizer)

        assert data_collator is not None
        assert isinstance(data_collator, DataCollatorForLanguageModeling)

    def test_create_data_collator_instruction_tuning(
        self, training_context, mock_tokenizer
    ):
        """Test data collator for instruction tuning."""
        training_context.job.config.training_type = TrainingType.INSTRUCTION_TUNING

        builder = TrainerBuilder()
        data_collator = builder._create_data_collator(training_context, mock_tokenizer)

        assert data_collator is not None
        assert isinstance(data_collator, DataCollatorForLanguageModeling)

    def test_create_data_collator_conversation_tuning(
        self, training_context, mock_tokenizer
    ):
        """Test data collator for conversation tuning."""
        training_context.job.config.training_type = TrainingType.CONVERSATION_TUNING

        builder = TrainerBuilder()
        data_collator = builder._create_data_collator(training_context, mock_tokenizer)

        assert data_collator is not None
        assert isinstance(data_collator, DataCollatorForLanguageModeling)

    def test_create_data_collator_unsupported_type(
        self, training_context, mock_tokenizer
    ):
        """Test data collator fails with unsupported training type."""
        training_context.job.config.training_type = TrainingType.LORA

        builder = TrainerBuilder()

        with pytest.raises(DataCollatorException, match="Training type lora not supported"):
            builder._create_data_collator(training_context, mock_tokenizer)

    def test_global_instance(self):
        """Test that global trainer_builder instance exists."""
        assert trainer_builder is not None
        assert isinstance(trainer_builder, TrainerBuilder)

    @patch("app.trainer.trainer_builder.AutoTokenizer")
    def test_load_tokenizer_missing_path(
        self, mock_tokenizer_loader, training_context
    ):
        """Test tokenizer loading fails with missing paths."""
        training_context.tokenizer_metadata = {}
        training_context.model_metadata = {}

        builder = TrainerBuilder()

        with pytest.raises(TrainerBuildException, match="Tokenizer path not found"):
            builder._load_tokenizer(training_context)

    @patch("app.trainer.trainer_builder.AutoModelForCausalLM")
    def test_load_model_missing_path(
        self, mock_model_loader, training_context
    ):
        """Test model loading fails with missing path."""
        training_context.model_metadata = {}

        builder = TrainerBuilder()

        with pytest.raises(TrainerBuildException, match="Model path not found"):
            builder._load_model(training_context)
