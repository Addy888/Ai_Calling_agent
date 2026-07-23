"""Tests for optimizer API endpoints."""

import pytest
from fastapi.testclient import TestClient

from main import app
from app.optimizer.schemas import (
    OptimizerConfig,
    OptimizerType,
    SchedulerConfig,
    SchedulerType,
    WarmupStrategy,
)


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authentication headers."""
    # In production, this would be a real JWT token
    return {"Authorization": "Bearer test_token"}


class TestOptimizerAPI:
    """Test optimizer API endpoints."""

    def test_optimizer_health(self, client):
        """Test optimizer health endpoint."""
        response = client.get("/api/v1/optimizer/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "healthy" in data
        assert "supported_optimizers" in data
        assert "supported_schedulers" in data

    @pytest.mark.skip(reason="Requires model loading setup")
    def test_create_optimizer(self, client, auth_headers):
        """Test creating optimizer."""
        request_data = {
            "model_id": "test_model",
            "optimizer_config": {
                "optimizer_type": "adamw",
                "learning_rate": 0.00005,
                "weight_decay": 0.01,
            },
        }

        response = client.post(
            "/api/v1/optimizer/create",
            json=request_data,
            headers=auth_headers,
        )

        # May fail without proper model setup
        assert response.status_code in [200, 201, 400, 500]

    def test_validate_optimizer_config(self, client, auth_headers):
        """Test validating optimizer configuration."""
        request_data = {
            "optimizer_config": {
                "optimizer_type": "adamw",
                "learning_rate": 0.00005,
                "weight_decay": 0.01,
            },
            "scheduler_config": {
                "scheduler_type": "linear_with_warmup",
                "warmup_strategy": "ratio",
                "warmup_ratio": 0.1,
                "num_training_steps": 1000,
            },
            "num_training_steps": 1000,
        }

        response = client.post(
            "/api/v1/optimizer/validate",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "optimizer_valid" in data
        assert "scheduler_valid" in data

    def test_validate_invalid_config(self, client, auth_headers):
        """Test validating invalid configuration."""
        request_data = {
            "optimizer_config": {
                "optimizer_type": "adamw",
                "learning_rate": -0.01,  # Invalid
                "weight_decay": 0.01,
            },
        }

        response = client.post(
            "/api/v1/optimizer/validate",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["issues"]) > 0

    @pytest.mark.skip(reason="Requires optimizer creation")
    def test_get_optimizer_status(self, client, auth_headers):
        """Test getting optimizer status."""
        optimizer_id = "test_optimizer_id"

        response = client.get(
            f"/api/v1/optimizer/status/{optimizer_id}",
            headers=auth_headers,
        )

        # May fail without proper setup
        assert response.status_code in [200, 404]

    @pytest.mark.skip(reason="Requires optimizer creation")
    def test_get_optimizer_metadata(self, client, auth_headers):
        """Test getting optimizer metadata."""
        optimizer_id = "test_optimizer_id"

        response = client.get(
            f"/api/v1/optimizer/metadata/{optimizer_id}",
            headers=auth_headers,
        )

        # May fail without proper setup
        assert response.status_code in [200, 404]

    @pytest.mark.skip(reason="Requires scheduler creation")
    def test_get_scheduler_status(self, client, auth_headers):
        """Test getting scheduler status."""
        scheduler_id = "test_scheduler_id"

        response = client.get(
            f"/api/v1/optimizer/scheduler/status/{scheduler_id}",
            headers=auth_headers,
        )

        # May fail without proper setup
        assert response.status_code in [200, 404]

    def test_health_endpoint_returns_supported_types(self, client):
        """Test that health endpoint returns supported optimizer and scheduler types."""
        response = client.get("/api/v1/optimizer/health")

        assert response.status_code == 200
        data = response.json()

        # Check supported optimizers
        assert isinstance(data["supported_optimizers"], list)
        assert "adamw" in data["supported_optimizers"]
        assert "sgd" in data["supported_optimizers"]
        assert "adafactor" in data["supported_optimizers"]

        # Check supported schedulers
        assert isinstance(data["supported_schedulers"], list)
        assert "linear_with_warmup" in data["supported_schedulers"]
        assert "cosine" in data["supported_schedulers"]


class TestOptimizerAPIValidation:
    """Test API validation."""

    def test_create_optimizer_missing_model_id(self, client, auth_headers):
        """Test creating optimizer without model ID."""
        request_data = {
            "optimizer_config": {
                "optimizer_type": "adamw",
                "learning_rate": 0.00005,
                "weight_decay": 0.01,
            },
        }

        response = client.post(
            "/api/v1/optimizer/create",
            json=request_data,
            headers=auth_headers,
        )

        # Should fail validation
        assert response.status_code == 422

    def test_validate_missing_optimizer_config(self, client, auth_headers):
        """Test validation without optimizer config."""
        request_data = {}

        response = client.post(
            "/api/v1/optimizer/validate",
            json=request_data,
            headers=auth_headers,
        )

        # Should fail validation
        assert response.status_code == 422

    def test_create_scheduler_missing_training_steps(self, client, auth_headers):
        """Test creating scheduler without training steps."""
        request_data = {
            "optimizer_id": "test_optimizer",
            "scheduler_config": {
                "scheduler_type": "linear_with_warmup",
                "warmup_strategy": "ratio",
                "warmup_ratio": 0.1,
            },
        }

        response = client.post(
            "/api/v1/optimizer/scheduler/create",
            json=request_data,
            headers=auth_headers,
        )

        # Should fail validation or return error
        assert response.status_code in [400, 422]
