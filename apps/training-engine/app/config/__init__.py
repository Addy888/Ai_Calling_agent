"""Configuration settings for Training Engine."""

import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application settings."""

    # Service
    SERVICE_NAME: str = "AI Training Engine"
    SERVICE_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # API
    API_TITLE: str = "AI Training Engine API"
    API_DESCRIPTION: str = "Enterprise Training Engine for AI Calling Agent"
    API_PREFIX: str = "/api/v1"

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Storage Paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    LOGS_DIR: Path = BASE_DIR / "logs"

    # Training Data
    TRAINING_DATA_DIR: str = os.getenv(
        "TRAINING_DATA_DIR",
        str(DATA_DIR / "datasets")
    )

    # Model Storage
    MODEL_STORAGE_DIR: str = os.getenv(
        "MODEL_STORAGE_DIR",
        str(DATA_DIR / "models")
    )

    # Tokenizer Storage
    TOKENIZER_STORAGE_DIR: str = os.getenv(
        "TOKENIZER_STORAGE_DIR",
        str(DATA_DIR / "tokenizers")
    )

    # Sessions
    SESSION_STORAGE_DIR: str = os.getenv(
        "SESSION_STORAGE_DIR",
        str(DATA_DIR / "sessions")
    )

    # Jobs
    JOB_STORAGE_DIR: str = os.getenv(
        "JOB_STORAGE_DIR",
        str(DATA_DIR / "jobs")
    )

    # Cache
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    MODEL_CACHE_TTL_SECONDS: int = int(os.getenv("MODEL_CACHE_TTL_SECONDS", "7200"))

    # Workers
    MAX_WORKERS: int = int(os.getenv("MAX_WORKERS", "4"))
    WORKER_TIMEOUT: int = int(os.getenv("WORKER_TIMEOUT", "3600"))

    # Authentication
    JWT_SECRET: Optional[str] = os.getenv("JWT_SECRET")
    API_KEY: Optional[str] = os.getenv("API_KEY")
    INTERNAL_API_KEY: Optional[str] = os.getenv("INTERNAL_API_KEY")

    # Database (NestJS integration)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    NESTJS_API_URL: str = os.getenv("NESTJS_API_URL", "http://localhost:3000")

    # Training
    MAX_TRAINING_HOURS: int = int(os.getenv("MAX_TRAINING_HOURS", "24"))
    CHECKPOINT_INTERVAL: int = int(os.getenv("CHECKPOINT_INTERVAL", "1000"))

    # Hardware
    USE_GPU: bool = os.getenv("USE_GPU", "false").lower() == "true"
    GPU_IDS: str = os.getenv("GPU_IDS", "0")
    MAX_GPU_MEMORY_GB: Optional[int] = (
        int(os.getenv("MAX_GPU_MEMORY_GB")) if os.getenv("MAX_GPU_MEMORY_GB") else None
    )

    # Monitoring
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    METRICS_PORT: int = int(os.getenv("METRICS_PORT", "9090"))

    def __init__(self):
        """Initialize settings and create directories."""
        self._create_directories()

    def _create_directories(self):
        """Create required directories if they don't exist."""
        directories = [
            self.DATA_DIR,
            self.LOGS_DIR,
            Path(self.TRAINING_DATA_DIR),
            Path(self.MODEL_STORAGE_DIR),
            Path(self.TOKENIZER_STORAGE_DIR),
            Path(self.SESSION_STORAGE_DIR),
            Path(self.JOB_STORAGE_DIR),
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
