"""Tests for LoRA Builder."""

import pytest
import torch.nn as nn
from peft import LoraConfig, PeftModel

from app.peft.exceptions import ConfigurationException, LoRAException
from app.peft.lora.builder import LoRABuilder
from app.peft.schemas import LoRAConfigRequest, TaskType


class SimpleTransformer(nn.Module):
    """Simple transformer-like model for testing."""

    def __init__(self):
        super().__init__()
        self.q_proj = nn.Linear(128, 128)
        self.k_proj = nn.Linear(128, 128)
        self.v_proj = nn.Linear(128, 128)
        self.o_proj = nn.Linear(128, 128)

    def forward(self, x):
        return self.o_proj(self.v_proj(x))


@pytest.fixture
def transformer_model():
    """Create transformer test model."""
    return SimpleTransformer()


@pytest.fixture
def lora_builder():
    """Create LoRA builder instance."""
    return LoRABuilder()


@pytest.fixture
def lora_config_request():
    """Create LoRA config request."""
    return LoRAConfigRequest(
        r=8,
        lora_alpha=16,
        lora_dropout=0.1,
        target_modules=["q_proj", "v_proj"],
        task_type=TaskType.CAUSAL_LM,
    )


class TestLoRABuilder:
    """Test LoRA Builder functionality."""

    def test_initialization(self, lora_builder):
        """Test LoRA builder initialization."""
        assert lora_builder is not None
        assert lora_builder.config_factory is not None
        assert lora_builder.module_detector is not None

    def test_build_config(self, lora_builder, lora_config_request, transformer_model):
        """Test building LoRA config."""
        config = lora_builder.build_config(lora_config_request, model=transformer_model)

        assert isinstance(config, LoraConfig)
        assert config.r == 8
        assert config.lora_alpha == 16
        assert config.lora_dropout == 0.1
        assert config.target_modules == ["q_proj", "v_proj"]

    def test_build_config_auto_detect(self, lora_builder, transformer_model):
        """Test building config with auto-detection."""
        request = LoRAConfigRequest(
            r=8,
            lora_alpha=16,
            target_modules=None,  # Auto-detect
        )

        config = lora_builder.build_config(request, model=transformer_model)

        assert isinstance(config, LoraConfig)
        assert config.target_modules is not None
        assert len(config.target_modules) > 0

    def test_apply_lora(self, lora_builder, transformer_model, lora_config_request):
        """Test applying LoRA to model."""
        # Build config
        config = lora_builder.build_config(lora_config_request, model=transformer_model)

        # Apply LoRA
        peft_model = lora_builder.apply_lora(
            transformer_model, config, adapter_name="test-adapter"
        )

        assert isinstance(peft_model, PeftModel)

        # Verify trainable parameters
        trainable = sum(p.numel() for p in peft_model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in peft_model.parameters())

        assert trainable > 0
        assert trainable < total

    def test_build_and_apply(
        self, lora_builder, transformer_model, lora_config_request
    ):
        """Test build and apply in one step."""
        peft_model, metadata = lora_builder.build_and_apply(
            model=transformer_model,
            params=lora_config_request,
            adapter_name="test-adapter",
            base_model_id="test-model",
        )

        assert isinstance(peft_model, PeftModel)
        assert metadata.adapter_name == "test-adapter"
        assert metadata.rank == 8
        assert metadata.alpha == 16
        assert metadata.trainable_params > 0

    def test_detect_target_modules(self, lora_builder, transformer_model):
        """Test target module detection."""
        detected = lora_builder.detect_target_modules(transformer_model)

        assert isinstance(detected, list)
        assert len(detected) > 0
        # Should detect at least some attention projections
        assert any(proj in detected for proj in ["q_proj", "k_proj", "v_proj"])

    def test_validate_params(self, lora_builder, lora_config_request):
        """Test parameter validation."""
        # Valid params
        assert lora_builder.validate_params(lora_config_request)

        # Invalid rank
        invalid_request = LoRAConfigRequest(
            r=-1,  # Invalid
            lora_alpha=16,
            target_modules=["q_proj"],
        )

        with pytest.raises(ConfigurationException):
            lora_builder.validate_params(invalid_request)

    def test_get_recommended_config(self, lora_builder, transformer_model):
        """Test getting recommended config."""
        recommended = lora_builder.get_recommended_config(
            transformer_model, model_size="base"
        )

        assert isinstance(recommended, dict)
        assert "r" in recommended
        assert "lora_alpha" in recommended
        assert "target_modules" in recommended
        assert len(recommended["target_modules"]) > 0


class TestLoRABuilderEdgeCases:
    """Test LoRA Builder edge cases."""

    def test_build_config_no_model_no_targets(self, lora_builder):
        """Test build config without model or target modules."""
        request = LoRAConfigRequest(
            r=8,
            lora_alpha=16,
            target_modules=None,  # No targets
        )

        with pytest.raises(ConfigurationException):
            lora_builder.build_config(request, model=None)  # No model

    def test_very_high_rank(self, lora_builder, transformer_model):
        """Test with very high rank."""
        request = LoRAConfigRequest(
            r=512,  # Very high
            lora_alpha=1024,
            target_modules=["q_proj"],
        )

        # Should work but log warning
        config = lora_builder.build_config(request, model=transformer_model)
        assert config.r == 512

    def test_zero_dropout(self, lora_builder, transformer_model):
        """Test with zero dropout."""
        request = LoRAConfigRequest(
            r=8,
            lora_alpha=16,
            lora_dropout=0.0,
            target_modules=["q_proj"],
        )

        config = lora_builder.build_config(request, model=transformer_model)
        assert config.lora_dropout == 0.0

    def test_invalid_target_modules(self, lora_builder, transformer_model):
        """Test with invalid target modules."""
        request = LoRAConfigRequest(
            r=8,
            lora_alpha=16,
            target_modules=["nonexistent_module"],
        )

        with pytest.raises(LoRAException):
            lora_builder.build_config(request, model=transformer_model)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
