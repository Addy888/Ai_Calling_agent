"""Metrics aggregation for statistical analysis."""

import statistics
from collections import deque
from typing import Dict, List, Optional

from app.logger import training_logger
from app.metrics.schemas import AggregatedMetrics, AggregationConfig
from app.metrics.exceptions import AggregationException


class MetricsAggregator:
    """
    Aggregates metrics with moving averages, min/max, percentiles.
    """

    def __init__(self, config: Optional[AggregationConfig] = None):
        """
        Initialize metrics aggregator.
        
        Args:
            config: Aggregation configuration
        """
        self.logger = training_logger
        self.config = config or AggregationConfig()
        
        # Rolling windows for metrics: metric_name -> deque of values
        self._windows: Dict[str, deque] = {}

    def add_value(self, metric_name: str, value: float) -> None:
        """
        Add a value to the rolling window.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
        """
        if metric_name not in self._windows:
            self._windows[metric_name] = deque(maxlen=self.config.window_size)
        
        self._windows[metric_name].append(value)

    def aggregate(
        self,
        metric_name: str,
        values: Optional[List[float]] = None,
    ) -> AggregatedMetrics:
        """
        Aggregate a metric.
        
        Args:
            metric_name: Name of the metric
            values: Optional list of values (if not using rolling window)
            
        Returns:
            AggregatedMetrics object
        """
        try:
            # Use provided values or rolling window
            if values is None:
                if metric_name not in self._windows:
                    raise AggregationException(f"No data for metric: {metric_name}")
                values = list(self._windows[metric_name])
            
            if not values:
                raise AggregationException(f"Empty values for metric: {metric_name}")
            
            # Basic statistics
            count = len(values)
            mean_val = statistics.mean(values)
            min_val = min(values)
            max_val = max(values)
            
            # Standard deviation
            std_val = None
            if count > 1:
                std_val = statistics.stdev(values)
            
            # Median
            median_val = None
            if self.config.compute_percentiles or count < 100:
                median_val = statistics.median(values)
            
            # Percentiles
            percentiles_dict = {}
            if self.config.compute_percentiles and count > 10:
                sorted_values = sorted(values)
                for p in self.config.percentiles:
                    idx = int((p / 100) * count)
                    idx = min(idx, count - 1)
                    percentiles_dict[p] = sorted_values[idx]
            
            # Moving average (same as mean for this window)
            moving_avg = None
            if self.config.compute_moving_average:
                moving_avg = mean_val
            
            return AggregatedMetrics(
                metric_name=metric_name,
                count=count,
                mean=mean_val,
                min=min_val,
                max=max_val,
                std=std_val,
                median=median_val,
                percentiles=percentiles_dict,
                moving_average=moving_avg,
            )
            
        except Exception as e:
            self.logger.error(f"Failed to aggregate metric {metric_name}: {e}")
            raise AggregationException(f"Aggregation failed: {e}")

    def aggregate_multiple(
        self,
        metrics_data: Dict[str, List[float]],
    ) -> Dict[str, AggregatedMetrics]:
        """
        Aggregate multiple metrics at once.
        
        Args:
            metrics_data: Dictionary of metric_name -> values
            
        Returns:
            Dictionary of metric_name -> AggregatedMetrics
        """
        results = {}
        
        for metric_name, values in metrics_data.items():
            try:
                results[metric_name] = self.aggregate(metric_name, values)
            except Exception as e:
                self.logger.warning(f"Failed to aggregate {metric_name}: {e}")
        
        return results

    def get_moving_average(self, metric_name: str) -> Optional[float]:
        """Get current moving average for a metric."""
        if metric_name in self._windows and self._windows[metric_name]:
            return statistics.mean(self._windows[metric_name])
        return None

    def get_latest(self, metric_name: str) -> Optional[float]:
        """Get latest value for a metric."""
        if metric_name in self._windows and self._windows[metric_name]:
            return self._windows[metric_name][-1]
        return None

    def get_window_size(self, metric_name: str) -> int:
        """Get current window size for a metric."""
        return len(self._windows.get(metric_name, []))

    def clear_metric(self, metric_name: str) -> None:
        """Clear rolling window for a metric."""
        if metric_name in self._windows:
            self._windows[metric_name].clear()

    def clear_all(self) -> None:
        """Clear all rolling windows."""
        self._windows.clear()

    def get_stats(self) -> Dict:
        """Get aggregator statistics."""
        return {
            "total_metrics": len(self._windows),
            "window_size": self.config.window_size,
            "metrics": list(self._windows.keys()),
        }


# Global instance
metrics_aggregator = MetricsAggregator()
