"""Tests for Queue Manager."""

import pytest
from app.models import TrainingConfig, TrainingJob, TrainingStatus, TrainingType
from app.queue import QueueManager


@pytest.fixture
async def queue_manager():
    """Create queue manager fixture."""
    return QueueManager(queue_type="memory")


@pytest.fixture
def training_job():
    """Create training job fixture."""
    config = TrainingConfig(
        training_type=TrainingType.VOICE_CLONING,
        dataset_id="test-dataset",
        model_name="test-model",
        batch_size=8,
        num_epochs=3,
        learning_rate=2e-5,
    )
    
    return TrainingJob(
        user_id="user-123",
        project_id="project-123",
        training_config=config,
    )


@pytest.mark.asyncio
async def test_add_job(queue_manager, training_job):
    """Test adding job to queue."""
    success = await queue_manager.add_job(training_job)
    assert success is True

    size = await queue_manager.get_queue_size()
    assert size == 1


@pytest.mark.asyncio
async def test_get_next_job(queue_manager, training_job):
    """Test getting next job from queue."""
    await queue_manager.add_job(training_job)

    job = await queue_manager.get_next_job()
    assert job is not None
    assert job.job_id == training_job.job_id


@pytest.mark.asyncio
async def test_get_job(queue_manager, training_job):
    """Test getting job by ID."""
    await queue_manager.add_job(training_job)

    job = await queue_manager.get_job(training_job.job_id)
    assert job is not None
    assert job.job_id == training_job.job_id


@pytest.mark.asyncio
async def test_update_job_status(queue_manager, training_job):
    """Test updating job status."""
    await queue_manager.add_job(training_job)

    success = await queue_manager.update_job_status(
        training_job.job_id,
        TrainingStatus.RUNNING,
    )
    assert success is True

    job = await queue_manager.get_job(training_job.job_id)
    assert job.status == TrainingStatus.RUNNING


@pytest.mark.asyncio
async def test_cancel_job(queue_manager, training_job):
    """Test cancelling job."""
    await queue_manager.add_job(training_job)

    success = await queue_manager.cancel_job(training_job.job_id)
    assert success is True

    job = await queue_manager.get_job(training_job.job_id)
    assert job.status == TrainingStatus.CANCELLED


@pytest.mark.asyncio
async def test_job_priority(queue_manager):
    """Test job priority ordering."""
    # Create jobs with different priorities
    job1 = TrainingJob(
        user_id="user-1",
        project_id="project-1",
        training_config=TrainingConfig(
            training_type=TrainingType.VOICE_CLONING,
            dataset_id="dataset-1",
            model_name="model-1",
        ),
        priority=0,
    )

    job2 = TrainingJob(
        user_id="user-2",
        project_id="project-2",
        training_config=TrainingConfig(
            training_type=TrainingType.VOICE_CLONING,
            dataset_id="dataset-2",
            model_name="model-2",
        ),
        priority=10,
    )

    # Add in order: low priority, high priority
    await queue_manager.add_job(job1)
    await queue_manager.add_job(job2)

    # Should get high priority job first
    next_job = await queue_manager.get_next_job()
    assert next_job.job_id == job2.job_id
