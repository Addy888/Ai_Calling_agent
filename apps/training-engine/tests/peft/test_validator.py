"""Tests for PEFT Validator."""

import pytest
import torch.nn as nn

from app.peft.exceptions import CompatibilityException, ConfigurationException
from app.peft.schemas import AdapterType
from app.peft.validator import PEFTValidator


class TestModel(nn.Module):
    """Test model."""

    def __init__(self):
        super().__init__()
        self.linear1 = nn.Linear(10, 5)
        self.linear2 = nn.Linear(5, 2)

    def forward(self, x):
        return self.linear2(self.linear1(x))


@pytest.fixture
def validator():
    """Create validator instance."""
    return PEFTValidator()


@pytest.fixture
def test_model():
    """Create test model."""
    return TestModel()


@pytest.fixture
def valid_lora_config():
    """Create valid LoRA config."""
    return {
        "r": 8,
        "lora_alpha": 16,
        "lora_dropout": 0.1,
        "target_modules": ["linear1", "linear2"],
        "bias": "none",
    }


class TestPEFTValidator:
    """Test PEFT Validator functionality."""

    def test_initialization(self, validator):
        """Test validator initialization."""
        assert validator is not None

    def test_validate_environment(self, validator):
        """Test environment validation."""
        # Should pass with current environment
        result = validator.validate_environment()
        assert result is True

    def test_validate_model(self, validator, test_model):
        """Test model validation."""
        result = validator.validate_model(test_model)
        assert result is True

    def test_validate_model_invalid(self, validator):
        """Test model validation with invalid model."""
        with pytest.raises(CompatibilityException):
            validator.validate_model("not a model")

    def test_validate_adapter_type(self, validator):
        """Test adapter type validation."""
        # Valid type
        result = validator.validate_adapter_type(AdapterType.LORA)
        assert result is True

        # Invalid type (not implemented)
        with pytest.raises(ConfigurationException):
            validator.validate_adapter_type(AdapterType.QLORA)

    def test_validate_lora_config(self, validator, valid_lora_config):
        """Test LoRA config validation."""
        result = validator.validate_lora_config(valid_lora_config)
        assert result is True

    def test_validate_lora_config_missing_rank(self, validator):
        """Test validation with missing rank."""
        config = {
            "lora_alpha": 16,
            "target_modules": ["linear1"],
        }

        with pytest.raises(ConfigurationException):
            validator.validate_lora_config(config)

    def test_validate_lora_config_invalid_rank(self, validator):
        """Test validation with invalid rank."""
        config = {
            "r": -1,  # Invalid
            "lora_alpha": 16,
            "target_modules": ["linear1"],
        }

        with pytest.raises(ConfigurationException):
            validator.validate_lora_config(config)

    def test_validate_lora_config_invalid_dropout(self, validator):
        """Test validation with invalid dropout."""
        config = {
            "r": 8,
            "lora_alpha": 16,
            "lora_dropout": 1.5,  # Invalid (> 1.0)
            "target_modules": ["linear1"],
        }

        with pytest.raises(ConfigurationException):
            validator.validate_lora_config(config)

    def test_validate_lora_config_empty_modules(self, validator):
        """Test validation with empty target modules."""
        config = {
            "r": 8,
            "lora_alpha": 16,
            "target_modules": [],  # Empty
        }

        with pytest.raises(ConfigurationException):
            validator.validate_lora_config(config)

    def test_validate_target_modules(self, validator, test_model):
        """Test target module validation."""
        target_modules = ["linear1", "linear2"]
        result = validator.validate_target_modules(test_model, target_modules)
        assert result is True

    def test_validate_target_modules_invalid(self, validator, test_model):
        """Test validation with invalid target modules."""
        target_modules = ["nonexistent"]

        with pytest.raises(ConfigurationException):
            validator.validate_target_modules(test_model, target_modules)

    def test_get_validation_report(self, validator, test_model, valid_lora_config):
        """Test getting validation report."""
        report = validator.get_validation_report(test_model, valid_lora_config)

        assert isinstance(report, dict)
        assert "valid" in report
        assert "environment_valid" in report
        assert "model_compatible" in report
        assert "config_valid" in report
        assert "target_modules_valid" in report
        assert "issues" in report
        assert "warnings" in report


class TestPEFTValidatorEdgeCases:
    """Test PEFT Validator edge cases."""

    def test_validate_model_no_parameters(self, validator):
        """Test validation of model with no parameters."""

        class EmptyModel(nn.Module):
            def forward(self, x):
                return x

        with pytest.raises(CompatibilityException):
            validator.validate_model(EmptyModel())

    def test_validate_high_rank_warning(self, validator):
        """Test validation with very high rank (should warn)."""
        config = {
            "r": 300,  # Very high
            "lora_alpha": 600,
            "target_modules": ["linear1"],
        }

        # Should pass but log warning
        result = validator.validate_lora_config(config)
        assert result is True

    def test_validate_bias_invalid(self, validator):
        """Test validation with invalid bias."""
        config = {
            "r": 8,
            "lora_alpha": 16,
            "bias": "invalid_bias",
            "target_modules": ["linear1"],
        }

        with pytest.raises(ConfigurationException):
            validator.validate_lora_config(config)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
