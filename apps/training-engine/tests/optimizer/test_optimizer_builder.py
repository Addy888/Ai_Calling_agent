"""Tests for optimizer builder."""

import pytest
import torch.nn as nn
from torch.optim import AdamW, SGD

from app.optimizer.builder import OptimizerBuilder
from app.optimizer.exceptions import ConfigurationException, OptimizerException
from app.optimizer.schemas import OptimizerConfig, OptimizerType


class TestOptimizerBuilder:
    """Test optimizer builder."""

    def test_build_adamw_optimizer(self, simple_model, adamw_config):
        """Test building AdamW optimizer."""
        builder = OptimizerBuilder()

        optimizer = builder.build_optimizer(simple_model, adamw_config)

        assert optimizer is not None
        assert isinstance(optimizer, AdamW)
        assert len(optimizer.param_groups) > 0
        assert optimizer.param_groups[0]["lr"] == adamw_config.learning_rate

    def test_build_sgd_optimizer(self, simple_model, sgd_config):
        """Test building SGD optimizer."""
        builder = OptimizerBuilder()

        optimizer = builder.build_optimizer(simple_model, sgd_config)

        assert optimizer is not None
        assert isinstance(optimizer, SGD)
        assert len(optimizer.param_groups) > 0
        assert optimizer.param_groups[0]["lr"] == sgd_config.learning_rate

    def test_build_with_parameter_groups(self, simple_model, optimizer_config):
        """Test building optimizer with parameter groups."""
        builder = OptimizerBuilder()
        optimizer_config.use_parameter_groups = True

        optimizer = builder.build_optimizer(simple_model, optimizer_config)

        assert optimizer is not None
        # Should have at least one parameter group
        assert len(optimizer.param_groups) >= 1

    def test_build_without_parameter_groups(self, simple_model, optimizer_config):
        """Test building optimizer without parameter groups."""
        builder = OptimizerBuilder()
        optimizer_config.use_parameter_groups = False

        optimizer = builder.build_optimizer(simple_model, optimizer_config)

        assert optimizer is not None
        assert len(optimizer.param_groups) == 1

    def test_validate_valid_config(self, optimizer_config):
        """Test validating valid configuration."""
        builder = OptimizerBuilder()

        result = builder.validate_config(optimizer_config)

        assert result is True

    def test_validate_invalid_learning_rate(self, optimizer_config):
        """Test validating invalid learning rate."""
        builder = OptimizerBuilder()
        optimizer_config.learning_rate = -0.01

        with pytest.raises(ConfigurationException):
            builder.validate_config(optimizer_config)

    def test_validate_invalid_weight_decay(self, optimizer_config):
        """Test validating invalid weight decay."""
        builder = OptimizerBuilder()
        optimizer_config.weight_decay = -0.1

        with pytest.raises(ConfigurationException):
            builder.validate_config(optimizer_config)

    def test_validate_invalid_adam_beta(self, optimizer_config):
        """Test validating invalid Adam beta."""
        builder = OptimizerBuilder()
        optimizer_config.adam_beta1 = 1.5

        with pytest.raises(ConfigurationException):
            builder.validate_config(optimizer_config)

    def test_get_optimizer_info(self, simple_model, optimizer_config):
        """Test getting optimizer information."""
        builder = OptimizerBuilder()
        optimizer = builder.build_optimizer(simple_model, optimizer_config)

        info = builder.get_optimizer_info(optimizer)

        assert info is not None
        assert "type" in info
        assert "param_groups" in info
        assert "learning_rates" in info
        assert info["param_groups"] > 0

    def test_build_adafactor_optimizer(self, simple_model):
        """Test building Adafactor optimizer."""
        builder = OptimizerBuilder()
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAFACTOR,
            learning_rate=1e-3,
            weight_decay=0.01,
        )

        optimizer = builder.build_optimizer(simple_model, config)

        assert optimizer is not None
        assert len(optimizer.param_groups) > 0

    def test_build_adam_optimizer(self, simple_model):
        """Test building Adam optimizer (extension interface)."""
        builder = OptimizerBuilder()
        config = OptimizerConfig(
            optimizer_type=OptimizerType.ADAM,
            learning_rate=5e-5,
            weight_decay=0.01,
        )

        optimizer = builder.build_optimizer(simple_model, config)

        assert optimizer is not None
        assert len(optimizer.param_groups) > 0

    def test_build_rmsprop_optimizer(self, simple_model):
        """Test building RMSprop optimizer (extension interface)."""
        builder = OptimizerBuilder()
        config = OptimizerConfig(
            optimizer_type=OptimizerType.RMSPROP,
            learning_rate=0.001,
            weight_decay=0.01,
        )

        optimizer = builder.build_optimizer(simple_model, config)

        assert optimizer is not None
        assert len(optimizer.param_groups) > 0
