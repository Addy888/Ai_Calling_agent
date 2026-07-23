"""Model cache module."""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.logger import training_logger
from app.model.models import ModelInfo, ModelMetadata, ModelCache as ModelCacheEntry


class ModelCache:
    """In-memory cache for models (No Redis yet)."""

    def __init__(self, ttl_seconds: int = 7200):
        """Initialize model cache."""
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._metadata_cache: Dict[str, ModelMetadata] = {}
        self._lock = asyncio.Lock()
        self.ttl_seconds = ttl_seconds
        training_logger.info(f"Model cache initialized: TTL={ttl_seconds}s")

    async def get(self, model_id: str) -> Optional[ModelInfo]:
        """Get model info from cache."""
        async with self._lock:
            if model_id in self._cache:
                entry = self._cache[model_id]

                # Check expiration
                if datetime.utcnow() < entry["expires_at"]:
                    training_logger.debug(f"Cache hit: {model_id}")
                    entry["access_count"] += 1
                    entry["last_accessed"] = datetime.utcnow()
                    return ModelInfo(**entry["data"])
                else:
                    # Expired - remove
                    del self._cache[model_id]
                    training_logger.debug(f"Cache expired: {model_id}")

            training_logger.debug(f"Cache miss: {model_id}")
            return None

    async def set(self, model_info: ModelInfo) -> None:
        """Set model info in cache."""
        async with self._lock:
            expires_at = datetime.utcnow() + timedelta(seconds=self.ttl_seconds)

            self._cache[model_info.model_id] = {
                "data": model_info.model_dump(),
                "expires_at": expires_at,
                "cached_at": datetime.utcnow(),
                "access_count": 0,
                "last_accessed": datetime.utcnow(),
            }

            training_logger.debug(f"Cached model info: {model_info.model_id}")

    async def get_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        """Get model metadata from cache."""
        async with self._lock:
            return self._metadata_cache.get(model_id)

    async def set_metadata(self, metadata: ModelMetadata) -> None:
        """Set model metadata in cache."""
        async with self._lock:
            self._metadata_cache[metadata.model_id] = metadata
            training_logger.debug(f"Cached model metadata: {metadata.model_id}")

    async def delete(self, model_id: str) -> bool:
        """Delete model from cache."""
        async with self._lock:
            deleted = False

            if model_id in self._cache:
                del self._cache[model_id]
                deleted = True

            if model_id in self._metadata_cache:
                del self._metadata_cache[model_id]
                deleted = True

            if deleted:
                training_logger.debug(f"Deleted from cache: {model_id}")

            return deleted

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self._metadata_cache.clear()
            training_logger.info(f"Cache cleared: {count} entries removed")

    async def cleanup_expired(self) -> int:
        """Cleanup expired entries."""
        async with self._lock:
            now = datetime.utcnow()
            expired = [
                model_id
                for model_id, entry in self._cache.items()
                if now >= entry["expires_at"]
            ]

            for model_id in expired:
                del self._cache[model_id]

            if expired:
                training_logger.info(f"Cleaned up {len(expired)} expired cache entries")

            return len(expired)

    async def get_cache_entry(self, model_id: str) -> Optional[ModelCacheEntry]:
        """Get cache entry with metadata."""
        async with self._lock:
            if model_id in self._cache:
                entry = self._cache[model_id]
                return ModelCacheEntry(
                    model_id=model_id,
                    cache_key=model_id,
                    cached_at=entry["cached_at"],
                    last_accessed=entry["last_accessed"],
                    access_count=entry["access_count"],
                    ttl_seconds=self.ttl_seconds,
                )
            return None

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_accesses = sum(
            entry["access_count"] for entry in self._cache.values()
        )

        return {
            "total_entries": len(self._cache),
            "metadata_entries": len(self._metadata_cache),
            "ttl_seconds": self.ttl_seconds,
            "total_accesses": total_accesses,
        }

    async def warm_cache(self, model_ids: list[str], load_func) -> int:
        """Pre-load models into cache."""
        training_logger.info(f"Warming cache for {len(model_ids)} models")

        count = 0
        for model_id in model_ids:
            try:
                model_info = await load_func(model_id)
                await self.set(model_info)
                count += 1
            except Exception as e:
                training_logger.error(f"Failed to warm cache for {model_id}: {str(e)}")

        training_logger.info(f"Cache warmed: {count}/{len(model_ids)} models loaded")
        return count


# Global cache instance
model_cache = ModelCache()
