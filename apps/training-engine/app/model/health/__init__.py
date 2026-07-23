"""Model health checks."""

from datetime import datetime
from typing import Any, Dict, Optional

from app.logger import training_logger
from app.model.cache import model_cache
from app.model.models import ModelStatus
from app.model.registry import model_registry
from app.model.storage import model_storage


class ModelHealthChecker:
    """Check model health and status."""

    def __init__(self):
        """Initialize health checker."""
        training_logger.info("Model health checker initialized")

    async def check_model_health(self, model_id: str) -> Dict[str, Any]:
        """Check health of a specific model."""
        training_logger.info(f"Checking model health: {model_id}")

        health_status = {
            "model_id": model_id,
            "healthy": True,
            "checks": {},
            "warnings": [],
            "errors": [],
            "checked_at": datetime.utcnow().isoformat(),
        }

        try:
            # Check registry
            registry_check = await self._check_registry(model_id)
            health_status["checks"]["registry"] = registry_check

            if not registry_check["exists"]:
                health_status["healthy"] = False
                health_status["errors"].append("Model not found in registry")
                return health_status

            # Check storage
            storage_check = await self._check_storage(model_id)
            health_status["checks"]["storage"] = storage_check

            if not storage_check["exists"]:
                health_status["warnings"].append("Model not found in storage")

            # Check cache
            cache_check = await self._check_cache(model_id)
            health_status["checks"]["cache"] = cache_check

            # Check model status
            status_check = await self._check_status(model_id)
            health_status["checks"]["status"] = status_check

            if status_check["status"] == "failed":
                health_status["healthy"] = False
                health_status["errors"].append("Model is in failed state")

            # Check model files
            files_check = await self._check_model_files(model_id)
            health_status["checks"]["files"] = files_check

            if not files_check["accessible"]:
                health_status["healthy"] = False
                health_status["errors"].append("Model files not accessible")

        except Exception as e:
            health_status["healthy"] = False
            health_status["errors"].append(f"Health check failed: {str(e)}")
            training_logger.error(f"Health check failed: {str(e)}")

        return health_status

    async def check_system_health(self) -> Dict[str, Any]:
        """Check overall model system health."""
        training_logger.info("Checking model system health")

        health_status = {
            "healthy": True,
            "components": {},
            "statistics": {},
            "warnings": [],
            "errors": [],
            "checked_at": datetime.utcnow().isoformat(),
        }

        try:
            # Check registry
            registry_health = await self._check_registry_health()
            health_status["components"]["registry"] = registry_health

            # Check storage
            storage_health = await self._check_storage_health()
            health_status["components"]["storage"] = storage_health

            # Check cache
            cache_health = await self._check_cache_health()
            health_status["components"]["cache"] = cache_health

            # Get statistics
            stats = await self._get_system_statistics()
            health_status["statistics"] = stats

            # Check for issues
            if registry_health["total_models"] == 0:
                health_status["warnings"].append("No models registered")

            if stats["failed_models"] > 0:
                health_status["warnings"].append(
                    f"{stats['failed_models']} models in failed state"
                )

        except Exception as e:
            health_status["healthy"] = False
            health_status["errors"].append(f"System health check failed: {str(e)}")
            training_logger.error(f"System health check failed: {str(e)}")

        return health_status

    async def _check_registry(self, model_id: str) -> Dict[str, Any]:
        """Check if model exists in registry."""
        try:
            entry = await model_registry.get_model(model_id)
            return {
                "exists": True,
                "status": entry.status.value,
                "is_active": entry.is_active,
            }
        except:
            return {"exists": False}

    async def _check_storage(self, model_id: str) -> Dict[str, Any]:
        """Check if model exists in storage."""
        exists = await model_storage.exists(model_id)
        return {
            "exists": exists,
        }

    async def _check_cache(self, model_id: str) -> Dict[str, Any]:
        """Check if model is in cache."""
        cached_info = await model_cache.get(model_id)
        cached_metadata = await model_cache.get_metadata(model_id)

        return {
            "info_cached": cached_info is not None,
            "metadata_cached": cached_metadata is not None,
        }

    async def _check_status(self, model_id: str) -> Dict[str, Any]:
        """Check model status."""
        try:
            entry = await model_registry.get_model(model_id)
            return {
                "status": entry.status.value,
                "is_active": entry.is_active,
                "is_default": entry.is_default,
            }
        except:
            return {"status": "unknown"}

    async def _check_model_files(self, model_id: str) -> Dict[str, Any]:
        """Check if model files are accessible."""
        try:
            from pathlib import Path

            entry = await model_registry.get_model(model_id)
            model_path = entry.config.model_path

            if not model_path:
                return {"accessible": False, "reason": "No model path specified"}

            path = Path(model_path)
            if not path.exists():
                return {"accessible": False, "reason": "Model path does not exist"}

            return {"accessible": True, "path": str(path)}

        except Exception as e:
            return {"accessible": False, "reason": str(e)}

    async def _check_registry_health(self) -> Dict[str, Any]:
        """Check registry health."""
        stats = model_registry.get_registry_stats()
        return {
            "healthy": True,
            "total_models": stats["total_models"],
            "active_models": stats["active_models"],
        }

    async def _check_storage_health(self) -> Dict[str, Any]:
        """Check storage health."""
        stats = model_storage.get_storage_stats()
        return {
            "healthy": True,
            "total_registries": stats["total_registries"],
            "total_metadata": stats["total_metadata"],
        }

    async def _check_cache_health(self) -> Dict[str, Any]:
        """Check cache health."""
        stats = model_cache.get_cache_stats()
        return {
            "healthy": True,
            "total_entries": stats["total_entries"],
            "metadata_entries": stats["metadata_entries"],
        }

    async def _get_system_statistics(self) -> Dict[str, Any]:
        """Get system statistics."""
        # Get all models
        models = await model_registry.list_models()

        # Count by status
        status_counts = {}
        for model in models:
            status = model.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_models": len(models),
            "active_models": sum(1 for m in models if m.is_active),
            "loaded_models": status_counts.get("loaded", 0),
            "failed_models": status_counts.get("failed", 0),
            "archived_models": status_counts.get("archived", 0),
        }


# Global health checker
model_health_checker = ModelHealthChecker()
