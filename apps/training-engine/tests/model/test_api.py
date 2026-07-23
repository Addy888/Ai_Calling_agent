"""Tests for model API."""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_get_model_stats(client):
    """Test getting model statistics."""
    response = client.get("/api/v1/model/stats")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "total_models" in data
    assert "active_models" in data
    assert "loaded_models" in data


def test_list_models(client):
    """Test listing models."""
    response = client.get("/api/v1/model/list")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "total" in data
    assert "models" in data
    assert isinstance(data["models"], list)


def test_get_system_health(client):
    """Test getting system health."""
    response = client.get("/api/v1/model/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "healthy" in data
    assert "components" in data
    assert "statistics" in data


def test_get_model_not_found(client):
    """Test getting non-existent model."""
    response = client.get("/api/v1/model/non_existent")
    
    assert response.status_code == 404


def test_validate_model_not_found(client):
    """Test validating non-existent model."""
    response = client.post("/api/v1/model/validate?model_id=non_existent")
    
    assert response.status_code == 404
