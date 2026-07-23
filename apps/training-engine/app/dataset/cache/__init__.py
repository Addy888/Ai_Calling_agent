"""Dataset cache module."""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.dataset.models import Dataset
from app.logger import training_logger


class DatasetCache:
    """In-memory cache for datasets (No Redis yet)."""

    def __init__(self, ttl_seconds: int = 3600):
        """Initialize dataset cache."""
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self.ttl_seconds = ttl_seconds
        training_logger.info(f"Dataset cache initialized: TTL={ttl_seconds}s")

    async def get(self, dataset_id: str) -> Optional[Dataset]:
        """Get dataset from cache."""
        async with self._lock:
            if dataset_id in self._cache:
                entry = self._cache[dataset_id]

                # Check expiration
                if datetime.utcnow() < entry["expires_at"]:
                    training_logger.debug(f"Cache hit: {dataset_id}")
                    return Dataset(**entry["data"])
                else:
                    # Expired - remove
                    del self._cache[dataset_id]
                    training_logger.debug(f"Cache expired: {dataset_id}")

            training_logger.debug(f"Cache miss: {dataset_id}")
            return None

    async def set(self, dataset: Dataset) -> None:
        """Set dataset in cache."""
        async with self._lock:
            expires_at = datetime.utcnow() + timedelta(seconds=self.ttl_seconds)

            self._cache[dataset.dataset_id] = {
                "data": dataset.model_dump(),
                "expires_at": expires_at,
                "cached_at": datetime.utcnow(),
            }

            training_logger.debug(f"Cached dataset: {dataset.dataset_id}")

    async def delete(self, dataset_id: str) -> bool:
        """Delete dataset from cache."""
        async with self._lock:
            if dataset_id in self._cache:
                del self._cache[dataset_id]
                training_logger.debug(f"Deleted from cache: {dataset_id}")
                return True
            return False

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            training_logger.info(f"Cache cleared: {count} entries removed")

    async def cleanup_expired(self) -> int:
        """Cleanup expired entries."""
        async with self._lock:
            now = datetime.utcnow()
            expired = [
                dataset_id
                for dataset_id, entry in self._cache.items()
                if now >= entry["expires_at"]
            ]

            for dataset_id in expired:
                del self._cache[dataset_id]

            if expired:
                training_logger.info(f"Cleaned up {len(expired)} expired cache entries")

            return len(expired)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "total_entries": len(self._cache),
            "ttl_seconds": self.ttl_seconds,
        }


# Global cache instance
dataset_cache = DatasetCache()
