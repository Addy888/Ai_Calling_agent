"""Pytest configuration for PEFT tests."""

import pytest
import torch
import torch.nn as nn


@pytest.fixture(scope="session")
def device():
    """Get test device."""
    return torch.device("cpu")  # Use CPU for testing


@pytest.fixture
def simple_linear_model():
    """Create simple linear model."""
    
    class SimpleLinearModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.linear1 = nn.Linear(128, 64)
            self.linear2 = nn.Linear(64, 32)
            self.linear3 = nn.Linear(32, 10)
        
        def forward(self, x):
            x = self.linear1(x)
            x = torch.relu(x)
            x = self.linear2(x)
            x = torch.relu(x)
            x = self.linear3(x)
            return x
    
    return SimpleLinearModel()


@pytest.fixture
def transformer_model():
    """Create transformer-like model."""
    
    class TransformerBlock(nn.Module):
        def __init__(self, d_model=128):
            super().__init__()
            self.q_proj = nn.Linear(d_model, d_model)
            self.k_proj = nn.Linear(d_model, d_model)
            self.v_proj = nn.Linear(d_model, d_model)
            self.o_proj = nn.Linear(d_model, d_model)
            self.gate_proj = nn.Linear(d_model, d_model * 4)
            self.up_proj = nn.Linear(d_model, d_model * 4)
            self.down_proj = nn.Linear(d_model * 4, d_model)
        
        def forward(self, x):
            # Attention
            q = self.q_proj(x)
            k = self.k_proj(x)
            v = self.v_proj(x)
            attn_out = self.o_proj(v)
            
            # MLP
            mlp_out = self.down_proj(self.up_proj(x))
            
            return attn_out + mlp_out
    
    return TransformerBlock()


@pytest.fixture
def sample_input(device):
    """Create sample input tensor."""
    return torch.randn(4, 128, device=device)


@pytest.fixture
def mock_model_id():
    """Mock model ID for testing."""
    return "test-model-123"


@pytest.fixture
def cleanup_adapters():
    """Cleanup adapters after tests."""
    from app.peft.adapter.registry import adapter_registry
    
    yield
    
    # Cleanup after test
    adapter_registry.clear()


# Pytest configuration
def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "requires_gpu: marks tests that require GPU"
    )
