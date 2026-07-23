"""Tests for Training Session Manager."""

import pytest
from app.models import TrainingConfig, TrainingStatus, TrainingType
from app.sessions import TrainingSessionManager


@pytest.fixture
async def session_manager():
    """Create session manager fixture."""
    return TrainingSessionManager()


@pytest.fixture
def training_config():
    """Create training config fixture."""
    return TrainingConfig(
        training_type=TrainingType.VOICE_CLONING,
        dataset_id="test-dataset-123",
        model_name="test-model",
        batch_size=8,
        num_epochs=3,
        learning_rate=2e-5,
    )


@pytest.mark.asyncio
async def test_create_session(session_manager, training_config):
    """Test session creation."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    assert session.session_id is not None
    assert session.job_id == "job-123"
    assert session.status == TrainingStatus.PENDING
    assert session.progress == 0.0


@pytest.mark.asyncio
async def test_get_session(session_manager, training_config):
    """Test getting a session."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    retrieved = await session_manager.get_session(session.session_id)
    assert retrieved.session_id == session.session_id


@pytest.mark.asyncio
async def test_update_session_status(session_manager, training_config):
    """Test updating session status."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    updated = await session_manager.update_session_status(
        session.session_id,
        TrainingStatus.RUNNING,
    )

    assert updated.status == TrainingStatus.RUNNING
    assert updated.started_at is not None


@pytest.mark.asyncio
async def test_update_progress(session_manager, training_config):
    """Test updating session progress."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    updated = await session_manager.update_progress(
        session.session_id,
        epoch=1,
        step=50,
    )

    assert updated.current_epoch == 1
    assert updated.current_step == 50
    assert updated.progress > 0


@pytest.mark.asyncio
async def test_pause_resume_session(session_manager, training_config):
    """Test pausing and resuming session."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    # Start session
    await session_manager.update_session_status(
        session.session_id,
        TrainingStatus.RUNNING,
    )

    # Pause
    paused = await session_manager.pause_session(session.session_id)
    assert paused.status == TrainingStatus.PAUSED

    # Resume
    resumed = await session_manager.resume_session(session.session_id)
    assert resumed.status == TrainingStatus.RUNNING


@pytest.mark.asyncio
async def test_cancel_session(session_manager, training_config):
    """Test cancelling session."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    cancelled = await session_manager.cancel_session(
        session.session_id,
        reason="User requested",
    )

    assert cancelled.status == TrainingStatus.CANCELLED
    assert cancelled.error_message == "User requested"


@pytest.mark.asyncio
async def test_complete_session(session_manager, training_config):
    """Test completing session."""
    session = await session_manager.create_session(
        job_id="job-123",
        config=training_config,
    )

    completed = await session_manager.complete_session(session.session_id)

    assert completed.status == TrainingStatus.COMPLETED
    assert completed.progress == 100.0
    assert completed.completed_at is not None
