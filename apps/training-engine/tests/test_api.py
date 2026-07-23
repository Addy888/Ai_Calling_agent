"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "training-engine"
    assert "version" in data


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_readiness_check():
    """Test readiness check endpoint."""
    response = client.get("/readiness")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data


def test_liveness_check():
    """Test liveness check endpoint."""
    response = client.get("/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"


def test_version_info():
    """Test version endpoint."""
    response = client.get("/version")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "python_version" in data
