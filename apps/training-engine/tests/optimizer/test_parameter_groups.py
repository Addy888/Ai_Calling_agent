"""Tests for parameter group builder."""

import pytest
import torch.nn as nn

from app.optimizer.parameter_groups import ParameterGroupBuilder
from app.optimizer.exceptions import ParameterGroupException


class TestParameterGroupBuilder:
    """Test parameter group builder."""

    def test_build_single_group(self, simple_model):
        """Test building single parameter group."""
        builder = ParameterGroupBuilder()

        groups = builder.build_parameter_groups(
            model=simple_model,
            learning_rate=5e-5,
            weight_decay=0.01,
            use_weight_decay_groups=False,
        )

        assert len(groups) == 1
        assert groups[0]["lr"] == 5e-5
        assert groups[0]["weight_decay"] == 0.01
        assert len(groups[0]["params"]) > 0

    def test_build_weight_decay_groups(self, simple_model):
        """Test building parameter groups with weight decay separation."""
        builder = ParameterGroupBuilder()

        groups = builder.build_parameter_groups(
            model=simple_model,
            learning_rate=5e-5,
            weight_decay=0.01,
            use_weight_decay_groups=True,
        )

        # Should have at least one group
        assert len(groups) >= 1

        # Check that some groups have different weight decay
        weight_decays = [g["weight_decay"] for g in groups]
        # At least one group should have weight decay
        assert any(wd > 0 for wd in weight_decays)

    def test_get_trainable_parameters(self, simple_model):
        """Test getting trainable parameters."""
        builder = ParameterGroupBuilder()

        trainable = builder.get_trainable_parameters(simple_model)

        # All parameters should be trainable by default
        total_params = sum(1 for _ in simple_model.parameters())
        assert len(trainable) == total_params

    def test_get_frozen_parameters(self, simple_model):
        """Test getting frozen parameters."""
        builder = ParameterGroupBuilder()

        # Freeze some parameters
        for i, param in enumerate(simple_model.parameters()):
            if i % 2 == 0:
                param.requires_grad = False

        frozen = builder.get_frozen_parameters(simple_model)

        assert len(frozen) > 0

    def test_count_parameters(self, simple_model):
        """Test counting parameters."""
        builder = ParameterGroupBuilder()

        params = list(simple_model.parameters())
        count = builder.count_parameters(params)

        assert count > 0
        # Verify count matches actual parameter count
        expected_count = sum(p.numel() for p in params)
        assert count == expected_count

    def test_get_parameter_stats(self, simple_model):
        """Test getting parameter statistics."""
        builder = ParameterGroupBuilder()

        stats = builder.get_parameter_stats(simple_model)

        assert "total_parameters" in stats
        assert "trainable_parameters" in stats
        assert "frozen_parameters" in stats
        assert "trainable_percent" in stats

        assert stats["total_parameters"] > 0
        assert stats["trainable_parameters"] > 0
        assert stats["trainable_percent"] >= 0
        assert stats["trainable_percent"] <= 100

    def test_should_exclude_from_weight_decay(self):
        """Test parameter exclusion logic."""
        builder = ParameterGroupBuilder()

        # Biases should be excluded
        assert builder._should_exclude_from_weight_decay("model.linear.bias")

        # LayerNorm should be excluded
        assert builder._should_exclude_from_weight_decay("model.layer_norm.weight")

        # Embeddings should be excluded
        assert builder._should_exclude_from_weight_decay("model.embedding.weight")

        # Regular weights should not be excluded
        assert not builder._should_exclude_from_weight_decay("model.linear.weight")

    def test_create_custom_groups(self, simple_model):
        """Test creating custom parameter groups."""
        builder = ParameterGroupBuilder()

        group_configs = [
            {
                "name": "linear_layers",
                "name_patterns": ["linear"],
                "lr": 1e-4,
                "weight_decay": 0.01,
            },
            {
                "name": "norm_layers",
                "name_patterns": ["norm"],
                "lr": 5e-5,
                "weight_decay": 0.0,
            },
        ]

        groups = builder.create_custom_groups(
            model=simple_model,
            group_configs=group_configs,
            default_lr=5e-5,
            default_weight_decay=0.01,
        )

        # Should have created groups
        assert len(groups) > 0

        # Check learning rates
        lrs = [g["lr"] for g in groups]
        assert 1e-4 in lrs or 5e-5 in lrs

    def test_empty_model_raises_exception(self):
        """Test that empty model raises exception."""
        builder = ParameterGroupBuilder()

        class EmptyModel(nn.Module):
            def __init__(self):
                super().__init__()

        empty_model = EmptyModel()

        with pytest.raises(ParameterGroupException):
            builder.build_parameter_groups(
                model=empty_model,
                learning_rate=5e-5,
                weight_decay=0.01,
                use_weight_decay_groups=True,
            )
