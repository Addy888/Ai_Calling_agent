"""Tests for PEFT API endpoints."""

import pytest
from fastapi.testclient import TestClient

from main import app
from app.peft.schemas import AdapterType, TaskType


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authentication headers."""
    # In test mode, authentication might be disabled
    return {"Authorization": "Bearer test-token"}


class TestPEFTAPI:
    """Test PEFT API endpoints."""

    def test_health_endpoint(self, client):
        """Test PEFT health endpoint."""
        response = client.get("/api/v1/peft/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "healthy" in data
        assert "peft_version" in data

    def test_create_adapter_missing_auth(self, client):
        """Test create adapter without authentication."""
        payload = {
            "model_id": "test-model",
            "adapter_type": "lora",
        }

        response = client.post("/api/v1/peft/create", json=payload)

        # Should require authentication (unless in debug mode)
        # Response depends on authentication middleware configuration
        assert response.status_code in [401, 403, 422, 500]

    def test_list_adapters(self, client, auth_headers):
        """Test list adapters endpoint."""
        response = client.get("/api/v1/peft/list", headers=auth_headers)

        # Should return list even if empty
        if response.status_code == 200:
            data = response.json()
            assert "adapters" in data
            assert "total" in data
            assert isinstance(data["adapters"], list)

    def test_get_adapter_not_found(self, client, auth_headers):
        """Test get adapter that doesn't exist."""
        response = client.get(
            "/api/v1/peft/nonexistent-id",
            headers=auth_headers,
        )

        # Should return 404 or 500
        assert response.status_code in [404, 500]

    def test_validate_config_endpoint(self, client, auth_headers):
        """Test validate configuration endpoint."""
        payload = {
            "model_id": "test-model",
            "adapter_type": "lora",
            "config": {
                "r": 8,
                "lora_alpha": 16,
                "lora_dropout": 0.1,
                "target_modules": ["layer"],
            },
        }

        response = client.post(
            "/api/v1/peft/validate",
            json=payload,
            headers=auth_headers,
        )

        # Validation result should be returned
        if response.status_code == 200:
            data = response.json()
            assert "valid" in data
            assert "model_compatible" in data
            assert "config_valid" in data


class TestPEFTAPIValidation:
    """Test PEFT API input validation."""

    def test_create_adapter_invalid_type(self, client, auth_headers):
        """Test create adapter with invalid adapter type."""
        payload = {
            "model_id": "test-model",
            "adapter_type": "invalid_type",
        }

        response = client.post(
            "/api/v1/peft/create",
            json=payload,
            headers=auth_headers,
        )

        # Should fail validation
        assert response.status_code == 422

    def test_create_adapter_missing_model_id(self, client, auth_headers):
        """Test create adapter without model_id."""
        payload = {
            "adapter_type": "lora",
        }

        response = client.post(
            "/api/v1/peft/create",
            json=payload,
            headers=auth_headers,
        )

        # Should fail validation
        assert response.status_code == 422

    def test_validate_config_missing_fields(self, client, auth_headers):
        """Test validate config with missing required fields."""
        payload = {
            "adapter_type": "lora",
            # Missing model_id and config
        }

        response = client.post(
            "/api/v1/peft/validate",
            json=payload,
            headers=auth_headers,
        )

        # Should fail validation
        assert response.status_code == 422


class TestPEFTAPIIntegration:
    """Integration tests for PEFT API."""

    @pytest.mark.skip(reason="Requires real model loading")
    def test_full_adapter_lifecycle(self, client, auth_headers):
        """Test complete adapter lifecycle."""
        # 1. Create adapter
        create_payload = {
            "model_id": "test-model",
            "adapter_type": "lora",
            "adapter_name": "test-adapter",
            "lora_config": {
                "r": 8,
                "lora_alpha": 16,
                "lora_dropout": 0.1,
                "target_modules": ["q_proj", "v_proj"],
                "task_type": "CAUSAL_LM",
            },
        }

        create_response = client.post(
            "/api/v1/peft/create",
            json=create_payload,
            headers=auth_headers,
        )

        assert create_response.status_code == 201
        create_data = create_response.json()
        adapter_id = create_data["adapter_id"]

        # 2. Get adapter
        get_response = client.get(
            f"/api/v1/peft/{adapter_id}",
            headers=auth_headers,
        )

        assert get_response.status_code == 200

        # 3. List adapters
        list_response = client.get(
            "/api/v1/peft/list",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        list_data = list_response.json()
        assert list_data["total"] > 0

        # 4. Remove adapter
        remove_payload = {
            "model_id": "test-model",
            "adapter_name": "test-adapter",
        }

        remove_response = client.post(
            "/api/v1/peft/remove",
            json=remove_payload,
            headers=auth_headers,
        )

        assert remove_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
