"""Tests for communication operations."""

import pytest
from app.distributed.communication.collective_ops import CollectiveOps
from app.distributed.communication.gradient_sync import GradientSync

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class TestCollectiveOps:
    """Test collective operations."""

    def setup_method(self):
        """Setup test method."""
        self.ops = CollectiveOps()

    def test_initialization(self):
        """Test initialization."""
        assert self.ops._communication_times == []

    def test_get_average_communication_time_empty(self):
        """Test average communication time with no data."""
        avg_time = self.ops.get_average_communication_time()
        assert avg_time == 0.0

    def test_reset_metrics(self):
        """Test metrics reset."""
        self.ops._communication_times = [10.0, 20.0, 30.0]
        self.ops.reset_metrics()
        assert len(self.ops._communication_times) == 0


@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch not available")
class TestGradientSync:
    """Test gradient synchronization."""

    def setup_method(self):
        """Setup test method."""
        self.sync = GradientSync()

    def test_initialization(self):
        """Test initialization."""
        assert self.sync._sync_count == 0
        assert len(self.sync._sync_times) == 0

    def test_get_average_sync_time_empty(self):
        """Test average sync time with no data."""
        avg_time = self.sync.get_average_sync_time()
        assert avg_time == 0.0

    def test_get_total_syncs(self):
        """Test total syncs counter."""
        total = self.sync.get_total_syncs()
        assert total == 0

    def test_reset_metrics(self):
        """Test metrics reset."""
        self.sync._sync_count = 10
        self.sync._sync_times = [1.0, 2.0, 3.0]
        
        self.sync.reset_metrics()
        
        assert self.sync._sync_count == 0
        assert len(self.sync._sync_times) == 0

    def test_check_gradient_health_no_model(self):
        """Test gradient health check with no gradients."""
        # Create a simple model
        model = torch.nn.Linear(10, 10)
        
        health = self.sync.check_gradient_health(model)
        
        assert "has_nan" in health
        assert "has_inf" in health
        assert "is_healthy" in health
