"""Main application entry point."""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router as api_router
from app.api import set_job_runner
from app.config import settings
from app.core import get_training_core
from app.dataset.api import router as dataset_router
from app.model.api import router as model_router
from app.training_executor.api import router as training_executor_router
from app.trainer.api import router as trainer_router
from app.peft.api import router as peft_router
from app.optimizer.api import router as optimizer_router
from app.checkpoint.api import router as checkpoint_router
from app.metrics.api import router as metrics_router
from app.distributed.api import router as distributed_router
from app.health import router as health_router
from app.logger import training_logger
from app.middleware import (
    authentication_middleware,
    error_handling_middleware,
    logging_middleware,
)

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.SERVICE_VERSION,
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.middleware("http")(logging_middleware)
app.middleware("http")(error_handling_middleware)
if not settings.DEBUG:
    app.middleware("http")(authentication_middleware)

# Include routers
app.include_router(health_router, tags=["Health"])
app.include_router(api_router, prefix=settings.API_PREFIX, tags=["Training"])
app.include_router(dataset_router, prefix=settings.API_PREFIX, tags=["Dataset"])
app.include_router(model_router, prefix=settings.API_PREFIX, tags=["Model"])
app.include_router(training_executor_router, prefix=settings.API_PREFIX, tags=["Training Executor"])
app.include_router(trainer_router, prefix=settings.API_PREFIX, tags=["Trainer"])
app.include_router(peft_router, prefix=settings.API_PREFIX, tags=["PEFT"])
app.include_router(optimizer_router, prefix=settings.API_PREFIX, tags=["Optimizer"])
app.include_router(checkpoint_router, prefix=settings.API_PREFIX, tags=["Checkpoint"])
app.include_router(metrics_router, prefix=settings.API_PREFIX, tags=["Metrics"])
app.include_router(distributed_router, prefix=settings.API_PREFIX, tags=["Distributed"])


@app.on_event("startup")
async def startup_event():
    """Application startup."""
    training_logger.info("Starting AI Training Engine")
    training_logger.info(f"Environment: {settings.ENVIRONMENT}")
    training_logger.info(f"Version: {settings.SERVICE_VERSION}")
    training_logger.info(f"Debug: {settings.DEBUG}")

    # Initialize training core
    core = get_training_core()
    await core.startup()

    # Set job runner for API
    set_job_runner(core.job_runner)

    training_logger.info("AI Training Engine started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown."""
    training_logger.info("Shutting down AI Training Engine")

    # Shutdown training core
    core = get_training_core()
    await core.shutdown()

    training_logger.info("AI Training Engine shut down successfully")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
