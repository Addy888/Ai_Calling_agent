"""Tests for metrics aggregator."""

import pytest

from app.metrics.metrics_aggregator import MetricsAggregator
from app.metrics.schemas import AggregatedMetrics, AggregationConfig
from app.metrics.exceptions import AggregationException


class TestMetricsAggregator:
    """Test suite for MetricsAggregator."""

    def setup_method(self):
        """Set up test fixtures."""
        config = AggregationConfig(window_size=100)
        self.aggregator = MetricsAggregator(config)

    def test_add_value_and_aggregate(self):
        """Test adding values and aggregating."""
        metric_name = "test_loss"
        
        # Add values
        for i in range(10):
            self.aggregator.add_value(metric_name, float(i))
        
        # Aggregate
        agg = self.aggregator.aggregate(metric_name)
        
        assert isinstance(agg, AggregatedMetrics)
        assert agg.metric_name == metric_name
        assert agg.count == 10
        assert agg.min == 0.0
        assert agg.max == 9.0
        assert agg.mean == 4.5

    def test_aggregate_with_provided_values(self):
        """Test aggregation with directly provided values."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        
        agg = self.aggregator.aggregate("direct_metric", values)
        
        assert agg.count == 5
        assert agg.mean == 3.0
        assert agg.min == 1.0
        assert agg.max == 5.0

    def test_moving_average(self):
        """Test moving average calculation."""
        metric_name = "moving_avg_test"
        
        for i in range(20):
            self.aggregator.add_value(metric_name, float(i))
        
        agg = self.aggregator.aggregate(metric_name)
        
        assert agg.moving_average is not None
        assert agg.moving_average > 0

    def test_std_calculation(self):
        """Test standard deviation calculation."""
        values = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
        
        agg = self.aggregator.aggregate("std_test", values)
        
        assert agg.std is not None
        assert agg.std > 0

    def test_percentiles(self):
        """Test percentile calculation."""
        config = AggregationConfig(
            window_size=100,
            compute_percentiles=True,
            percentiles=[25, 50, 75, 95],
        )
        aggregator = MetricsAggregator(config)
        
        values = list(range(1, 101))  # 1 to 100
        
        agg = aggregator.aggregate("percentile_test", values)
        
        assert 25 in agg.percentiles
        assert 50 in agg.percentiles  # median
        assert 75 in agg.percentiles
        assert 95 in agg.percentiles

    def test_window_size_limit(self):
        """Test that window size is respected."""
        metric_name = "window_test"
        window_size = 50
        
        config = AggregationConfig(window_size=window_size)
        aggregator = MetricsAggregator(config)
        
        # Add more values than window size
        for i in range(100):
            aggregator.add_value(metric_name, float(i))
        
        # Should only have window_size values
        assert aggregator.get_window_size(metric_name) == window_size

    def test_get_moving_average(self):
        """Test getting moving average."""
        metric_name = "ma_test"
        
        for i in range(10):
            self.aggregator.add_value(metric_name, float(i))
        
        ma = self.aggregator.get_moving_average(metric_name)
        
        assert ma is not None
        assert ma == 4.5

    def test_get_latest(self):
        """Test getting latest value."""
        metric_name = "latest_test"
        
        for i in range(5):
            self.aggregator.add_value(metric_name, float(i))
        
        latest = self.aggregator.get_latest(metric_name)
        
        assert latest == 4.0

    def test_clear_metric(self):
        """Test clearing a metric's window."""
        metric_name = "clear_test"
        
        for i in range(10):
            self.aggregator.add_value(metric_name, float(i))
        
        assert self.aggregator.get_window_size(metric_name) == 10
        
        self.aggregator.clear_metric(metric_name)
        
        assert self.aggregator.get_window_size(metric_name) == 0

    def test_clear_all(self):
        """Test clearing all metrics."""
        for i in range(3):
            metric_name = f"metric_{i}"
            self.aggregator.add_value(metric_name, float(i))
        
        self.aggregator.clear_all()
        
        stats = self.aggregator.get_stats()
        assert stats["total_metrics"] == 0

    def test_aggregate_multiple(self):
        """Test aggregating multiple metrics at once."""
        metrics_data = {
            "metric_1": [1.0, 2.0, 3.0],
            "metric_2": [4.0, 5.0, 6.0],
            "metric_3": [7.0, 8.0, 9.0],
        }
        
        results = self.aggregator.aggregate_multiple(metrics_data)
        
        assert len(results) == 3
        assert "metric_1" in results
        assert results["metric_1"].mean == 2.0

    def test_get_stats(self):
        """Test getting aggregator statistics."""
        for i in range(3):
            metric_name = f"metric_{i}"
            self.aggregator.add_value(metric_name, float(i))
        
        stats = self.aggregator.get_stats()
        
        assert stats["total_metrics"] == 3
        assert stats["window_size"] == 100
        assert len(stats["metrics"]) == 3


class TestMetricsAggregatorErrors:
    """Test suite for error handling."""

    def test_aggregate_nonexistent_metric(self):
        """Test aggregating a metric that doesn't exist."""
        aggregator = MetricsAggregator()
        
        with pytest.raises(AggregationException):
            aggregator.aggregate("nonexistent_metric")

    def test_aggregate_empty_values(self):
        """Test aggregating empty values."""
        aggregator = MetricsAggregator()
        
        with pytest.raises(AggregationException):
            aggregator.aggregate("empty_metric", [])

