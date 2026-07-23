"""Tests for Trainer Runtime Management."""

import os
import tempfile
from datetime import datetime
from unittest.mock import Mock, AsyncMock

import pytest

from app.trainer.trainer_runtime import (
    TrainerRuntime,
    TrainerRuntimeManager,
    trainer_runtime_manager,
)
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
            dataset_metadata={"dataset_id": "dataset-789"},
            tokenizer_metadata={"tokenizer_path": "/path/to/tokenizer"},
            model_metadata={"model_path": "/path/to/model"},
        )
        yield context


@pytest.fixture
def mock_trainer():
    """Create mock trainer."""
    trainer = Mock(spec=HFTrainerWrapper)
    trainer.initialize = AsyncMock(return_value={"status": "initialized"})
    trainer.execute = AsyncMock(return_value={
        "status": "completed",
        "duration_seconds": 100.5,
        "metrics": {"loss": 0.25},
        "model_path": "/path/to/model",
    })
    trainer.shutdown = AsyncMock(return_value=True)
    trainer.get_status = Mock(return_value={
        "status": "training",
        "trainer_initialized": True,
    })
    return trainer


class TestTrainerRuntime:
    """Test TrainerRuntime."""

    def test_runtime_initialization(self):
        """Test runtime can be initialized."""
        runtime = TrainerRuntime("test-job-123")
        
        assert runtime is not None
        assert runtime.job_id == "test-job-123"
        assert runtime.logger is not None
        assert runtime._state == "created"
        assert runtime._trainer is None
        assert runtime._context is None

    @pytest.mark.asyncio
    async def test_initialize_runtime(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test runtime initialization."""
        runtime = TrainerRuntime("test-job-123")
        
        result = await runtime.initialize(mock_trainer, training_context)
        
        assert result == {"status": "initialized"}
        assert runtime._trainer is mock_trainer
        assert runtime._context is training_context
        assert runtime._state == "initialized"
        mock_trainer.initialize.assert_called_once_with(training_context)

    @pytest.mark.asyncio
    async def test_start_training(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test starting training."""
        runtime = TrainerRuntime("test-job-123")
        await runtime.initialize(mock_trainer, training_context)
        
        result = await runtime.start_training()
        
        assert result["status"] == "completed"
        assert result["duration_seconds"] == 100.5
        assert runtime._state == "completed"
        assert runtime._started_at is not None
        assert runtime._completed_at is not None
        mock_trainer.execute.assert_called_once_with(training_context)

    @pytest.mark.asyncio
    async def test_start_training_not_initialized(self):
        """Test starting training fails when not initialized."""
        runtime = TrainerRuntime("test-job-123")
        
        with pytest.raises(RuntimeError, match="Runtime not initialized"):
            await runtime.start_training()

    @pytest.mark.asyncio
    async def test_start_training_failure(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test training failure handling."""
        runtime = TrainerRuntime("test-job-123")
        await runtime.initialize(mock_trainer, training_context)
        
        # Make training fail
        mock_trainer.execute = AsyncMock(side_effect=Exception("Training failed"))
        
        with pytest.raises(Exception, match="Training failed"):
            await runtime.start_training()
        
        assert runtime._state == "failed"
        assert runtime._error == "Training failed"
        assert runtime._completed_at is not None

    @pytest.mark.asyncio
    async def test_shutdown_runtime(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test runtime shutdown."""
        runtime = TrainerRuntime("test-job-123")
        await runtime.initialize(mock_trainer, training_context)
        
        result = await runtime.shutdown()
        
        assert result is True
        assert runtime._state == "shutdown"
        mock_trainer.shutdown.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_runtime_without_trainer(self):
        """Test shutdown without trainer."""
        runtime = TrainerRuntime("test-job-123")
        
        result = await runtime.shutdown()
        
        assert result is True
        assert runtime._state == "shutdown"

    def test_get_state_created(self):
        """Test get state when created."""
        runtime = TrainerRuntime("test-job-123")
        
        state = runtime.get_state()
        
        assert state["job_id"] == "test-job-123"
        assert state["state"] == "created"
        assert state["started_at"] is None
        assert state["completed_at"] is None
        assert state["error"] is None

    @pytest.mark.asyncio
    async def test_get_state_training(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test get state during training."""
        runtime = TrainerRuntime("test-job-123")
        await runtime.initialize(mock_trainer, training_context)
        
        # Start training but don't await (simulate ongoing training)
        runtime._state = "training"
        runtime._started_at = datetime.utcnow()
        
        state = runtime.get_state()
        
        assert state["state"] == "training"
        assert state["started_at"] is not None
        assert state["elapsed_seconds"] is not None
        assert state["trainer_status"] is not None

    @pytest.mark.asyncio
    async def test_get_state_completed(
        self, mock_trainer, training_context: TrainingContext
    ):
        """Test get state when completed."""
        runtime = TrainerRuntime("test-job-123")
        await runtime.initialize(mock_trainer, training_context)
        await runtime.start_training()
        
        state = runtime.get_state()
        
        assert state["state"] == "completed"
        assert state["started_at"] is not None
        assert state["completed_at"] is not None

    def test_is_running(self):
        """Test is_running check."""
        runtime = TrainerRuntime("test-job-123")
        
        assert runtime.is_running() is False
        
        runtime._state = "training"
        assert runtime.is_running() is True
        
        runtime._state = "completed"
        assert runtime.is_running() is False

    def test_is_completed(self):
        """Test is_completed check."""
        runtime = TrainerRuntime("test-job-123")
        
        assert runtime.is_completed() is False
        
        runtime._state = "training"
        assert runtime.is_completed() is False
        
        runtime._state = "completed"
        assert runtime.is_completed() is True
        
        runtime._state = "failed"
        assert runtime.is_completed() is True


class TestTrainerRuntimeManager:
    """Test TrainerRuntimeManager."""

    def test_manager_initialization(self):
        """Test manager can be initialized."""
        manager = TrainerRuntimeManager()
        
        assert manager is not None
        assert manager.logger is not None
        assert manager._runtimes == {}

    def test_create_runtime(self):
        """Test creating runtime."""
        manager = TrainerRuntimeManager()
        
        runtime = manager.create_runtime("test-job-123")
        
        assert runtime is not None
        assert isinstance(runtime, TrainerRuntime)
        assert runtime.job_id == "test-job-123"
        assert "test-job-123" in manager._runtimes

    def test_get_runtime_exists(self):
        """Test getting existing runtime."""
        manager = TrainerRuntimeManager()
        created_runtime = manager.create_runtime("test-job-123")
        
        retrieved_runtime = manager.get_runtime("test-job-123")
        
        assert retrieved_runtime is not None
        assert retrieved_runtime is created_runtime

    def test_get_runtime_not_exists(self):
        """Test getting non-existent runtime."""
        manager = TrainerRuntimeManager()
        
        runtime = manager.get_runtime("nonexistent")
        
        assert runtime is None

    @pytest.mark.asyncio
    async def test_shutdown_runtime(self):
        """Test shutting down runtime."""
        manager = TrainerRuntimeManager()
        runtime = manager.create_runtime("test-job-123")
        
        # Mock the shutdown method
        runtime.shutdown = AsyncMock(return_value=True)
        
        result = await manager.shutdown_runtime("test-job-123")
        
        assert result is True
        assert "test-job-123" not in manager._runtimes
        runtime.shutdown.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_runtime_not_exists(self):
        """Test shutting down non-existent runtime."""
        manager = TrainerRuntimeManager()
        
        result = await manager.shutdown_runtime("nonexistent")
        
        assert result is False

    def test_get_all_runtimes_empty(self):
        """Test getting all runtimes when empty."""
        manager = TrainerRuntimeManager()
        
        runtimes = manager.get_all_runtimes()
        
        assert runtimes == {}

    def test_get_all_runtimes(self):
        """Test getting all runtimes."""
        manager = TrainerRuntimeManager()
        
        runtime1 = manager.create_runtime("job-1")
        runtime2 = manager.create_runtime("job-2")
        
        runtimes = manager.get_all_runtimes()
        
        assert len(runtimes) == 2
        assert "job-1" in runtimes
        assert "job-2" in runtimes
        assert runtimes["job-1"]["job_id"] == "job-1"
        assert runtimes["job-2"]["job_id"] == "job-2"

    def test_global_instance(self):
        """Test that global trainer_runtime_manager instance exists."""
        assert trainer_runtime_manager is not None
        assert isinstance(trainer_runtime_manager, TrainerRuntimeManager)

    def test_create_multiple_runtimes(self):
        """Test creating multiple runtimes."""
        manager = TrainerRuntimeManager()
        
        runtime1 = manager.create_runtime("job-1")
        runtime2 = manager.create_runtime("job-2")
        runtime3 = manager.create_runtime("job-3")
        
        assert len(manager._runtimes) == 3
        assert runtime1 is not runtime2
        assert runtime2 is not runtime3

    @pytest.mark.asyncio
    async def test_shutdown_all_runtimes(self):
        """Test shutting down multiple runtimes."""
        manager = TrainerRuntimeManager()
        
        runtime1 = manager.create_runtime("job-1")
        runtime2 = manager.create_runtime("job-2")
        
        # Mock shutdown methods
        runtime1.shutdown = AsyncMock(return_value=True)
        runtime2.shutdown = AsyncMock(return_value=True)
        
        await manager.shutdown_runtime("job-1")
        await manager.shutdown_runtime("job-2")
        
        assert len(manager._runtimes) == 0
