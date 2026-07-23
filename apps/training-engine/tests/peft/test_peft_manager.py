"""Tests for PEFT Manager."""

import pytest
import torch
import torch.nn as nn
from peft import PeftModel

from app.peft.exceptions import PEFTException
from app.peft.manager import PEFTManager
from app.peft.schemas import AdapterType, CreatePEFTRequest, LoRAConfigRequest, TaskType


class SimpleModel(nn.Module):
    """Simple model for testing."""

    def __init__(self):
        super().__init__()
        self.layer1 = nn.Linear(100, 50)
        self.layer2 = nn.Linear(50, 10)

    def forward(self, x):
        x = self.layer1(x)
        x = self.layer2(x)
        return x


@pytest.fixture
def simple_model():
    """Create simple test model."""
    return SimpleModel()


@pytest.fixture
def peft_manager():
    """Create PEFT manager instance."""
    return PEFTManager()


@pytest.fixture
def lora_config_request():
    """Create LoRA config request."""
    return LoRAConfigRequest(
        r=4,
        lora_alpha=8,
        lora_dropout=0.1,
        target_modules=["layer1", "layer2"],
        task_type=TaskType.CAUSAL_LM,
    )


@pytest.fixture
def create_peft_request(lora_config_request):
    """Create PEFT request."""
    return CreatePEFTRequest(
        model_id="test-model",
        adapter_type=AdapterType.LORA,
        adapter_name="test-adapter",
        lora_config=lora_config_request,
    )


class TestPEFTManager:
    """Test PEFT Manager functionality."""

    def test_initialization(self, peft_manager):
        """Test PEFT manager initialization."""
        assert peft_manager is not None
        assert peft_manager.lora_builder is not None
        assert peft_manager.adapter_manager is not None
        assert peft_manager.validator is not None

    def test_create_lora_adapter(
        self, peft_manager, simple_model, create_peft_request
    ):
        """Test creating LoRA adapter."""
        # Create adapter
        peft_model, metadata = peft_manager.create_adapter(
            simple_model, create_peft_request
        )

        # Verify PEFT model
        assert isinstance(peft_model, PeftModel)

        # Verify metadata
        assert metadata.adapter_id is not None
        assert metadata.adapter_name == "test-adapter"
        assert metadata.adapter_type == AdapterType.LORA
        assert metadata.rank == 4
        assert metadata.alpha == 8
        assert metadata.trainable_params > 0
        assert metadata.frozen_params > 0

    def test_create_adapter_invalid_type(
        self, peft_manager, simple_model
    ):
        """Test creating adapter with invalid type."""
        request = CreatePEFTRequest(
            model_id="test-model",
            adapter_type=AdapterType.QLORA,  # Not implemented
        )

        with pytest.raises(PEFTException):
            peft_manager.create_adapter(simple_model, request)

    def test_validate_configuration(
        self, peft_manager, simple_model, lora_config_request
    ):
        """Test configuration validation."""
        config_dict = {
            "r": lora_config_request.r,
            "lora_alpha": lora_config_request.lora_alpha,
            "lora_dropout": lora_config_request.lora_dropout,
            "target_modules": lora_config_request.target_modules,
        }

        result = peft_manager.validate_configuration(
            simple_model, AdapterType.LORA, config_dict
        )

        assert isinstance(result, dict)
        assert "valid" in result

    def test_list_adapters(self, peft_manager, simple_model, create_peft_request):
        """Test listing adapters."""
        # Create adapter
        peft_manager.create_adapter(simple_model, create_peft_request)

        # List adapters
        adapters = peft_manager.list_adapters()

        assert len(adapters) > 0
        assert isinstance(adapters, list)

    def test_get_adapter_info(
        self, peft_manager, simple_model, create_peft_request
    ):
        """Test getting adapter info."""
        # Create adapter
        _, metadata = peft_manager.create_adapter(
            simple_model, create_peft_request
        )

        # Get info
        info = peft_manager.get_adapter_info(metadata.adapter_id)

        assert info is not None
        assert info["adapter_id"] == metadata.adapter_id
        assert info["adapter_name"] == metadata.adapter_name

    def test_trainable_parameters_reduced(
        self, peft_manager, simple_model, create_peft_request
    ):
        """Test that LoRA reduces trainable parameters."""
        # Count original parameters
        original_params = sum(p.numel() for p in simple_model.parameters())

        # Create adapter
        peft_model, metadata = peft_manager.create_adapter(
            simple_model, create_peft_request
        )

        # Verify trainable params are less than total
        assert metadata.trainable_params < original_params
        assert metadata.trainable_percent < 100.0


class TestPEFTManagerEdgeCases:
    """Test PEFT Manager edge cases."""

    def test_empty_target_modules(self, peft_manager, simple_model):
        """Test with empty target modules."""
        request = CreatePEFTRequest(
            model_id="test-model",
            adapter_type=AdapterType.LORA,
            lora_config=LoRAConfigRequest(
                r=4,
                lora_alpha=8,
                target_modules=[],  # Empty
            ),
        )

        with pytest.raises(PEFTException):
            peft_manager.create_adapter(simple_model, request)

    def test_invalid_rank(self, peft_manager, simple_model):
        """Test with invalid rank."""
        request = CreatePEFTRequest(
            model_id="test-model",
            adapter_type=AdapterType.LORA,
            lora_config=LoRAConfigRequest(
                r=0,  # Invalid
                lora_alpha=8,
                target_modules=["layer1"],
            ),
        )

        with pytest.raises(PEFTException):
            peft_manager.create_adapter(simple_model, request)

    def test_invalid_alpha(self, peft_manager, simple_model):
        """Test with invalid alpha."""
        request = CreatePEFTRequest(
            model_id="test-model",
            adapter_type=AdapterType.LORA,
            lora_config=LoRAConfigRequest(
                r=4,
                lora_alpha=-1,  # Invalid
                target_modules=["layer1"],
            ),
        )

        with pytest.raises(PEFTException):
            peft_manager.create_adapter(simple_model, request)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
