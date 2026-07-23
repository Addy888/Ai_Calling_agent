"""Model API schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.model.models import (
    ModelArchitecture,
    ModelStatus,
    ModelType,
    ModelSource,
    TrainingCapability,
    CompatibilityStatus,
)


# Request Schemas


class RegisterModelRequest(BaseModel):
    """Request to register a new model."""

    model_path: str = Field(..., description="Path to model files")
    model_name: str = Field(..., description="Model name")
    architecture: ModelArchitecture = Field(..., description="Model architecture")
    model_type: ModelType = Field(
        default=ModelType.BASE, description="Model type"
    )
    version: str = Field(default="1.0.0", description="Model version")

    # Optional metadata
    description: Optional[str] = None
    author: Optional[str] = None
    organization: Optional[str] = None
    license: Optional[str] = None

    # Specifications
    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None

    # Capabilities
    supported_languages: List[str] = Field(default_factory=lambda: ["en"])
    training_capabilities: List[TrainingCapability] = Field(default_factory=list)

    # Source
    source: ModelSource = Field(default=ModelSource.LOCAL)
    source_url: Optional[str] = None

    # Additional
    tags: List[str] = Field(default_factory=list)
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)

    # Options
    validate: bool = Field(default=True, description="Validate after registration")
    load: bool = Field(default=False, description="Load after registration")


class LoadModelRequest(BaseModel):
    """Request to load a model."""

    model_id: str = Field(..., description="Model ID to load")

    # Load options
    load_tokenizer: bool = Field(default=True)
    load_config: bool = Field(default=True)
    validate: bool = Field(default=True)

    # Hardware options
    device: Optional[str] = Field(default=None, description="Device: cpu, cuda, cuda:0")
    use_gpu: bool = Field(default=False)
    gpu_ids: Optional[List[int]] = None

    # Memory options
    low_cpu_mem_usage: bool = Field(default=True)
    max_memory: Optional[Dict[str, str]] = None

    # Quantization (Future)
    load_in_8bit: bool = Field(default=False)
    load_in_4bit: bool = Field(default=False)

    # Additional options
    custom_options: Dict[str, Any] = Field(default_factory=dict)


class UpdateModelRequest(BaseModel):
    """Request to update model metadata."""

    description: Optional[str] = None
    tags: Optional[List[str]] = None
    supported_languages: Optional[List[str]] = None
    training_capabilities: Optional[List[TrainingCapability]] = None
    extra_metadata: Optional[Dict[str, Any]] = None


class PrepareTrainingRequest(BaseModel):
    """Request to prepare model for training."""

    model_id: str = Field(..., description="Model ID")
    tokenizer_id: Optional[str] = Field(default=None, description="Tokenizer ID")
    dataset_id: Optional[str] = Field(default=None, description="Dataset ID")


# Response Schemas


class ApiResponse(BaseModel):
    """Generic API response."""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class ModelResponse(BaseModel):
    """Model information response."""

    model_id: str
    name: str
    version: str
    architecture: str
    model_type: str
    status: str

    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None
    total_size_mb: Optional[float] = None

    supported_languages: List[str] = Field(default_factory=list)
    training_capabilities: List[str] = Field(default_factory=list)

    is_active: bool = False
    is_default: bool = False
    is_loaded: bool = False

    source: str
    created_at: datetime
    updated_at: datetime


class ModelDetailResponse(BaseModel):
    """Detailed model information."""

    model_id: str
    name: str
    version: str
    architecture: str
    model_type: str
    status: str

    # Specifications
    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None
    hidden_size: Optional[int] = None
    num_layers: Optional[int] = None
    num_attention_heads: Optional[int] = None

    # Metadata
    description: Optional[str] = None
    author: Optional[str] = None
    organization: Optional[str] = None
    license: Optional[str] = None

    # Files
    model_path: Optional[str] = None
    model_files: List[str] = Field(default_factory=list)
    total_size_mb: Optional[float] = None

    # Capabilities
    supported_languages: List[str] = Field(default_factory=list)
    training_capabilities: List[str] = Field(default_factory=list)
    compatible_tokenizers: List[str] = Field(default_factory=list)

    # Status
    is_active: bool = False
    is_default: bool = False
    is_loaded: bool = False

    # Runtime
    load_time: Optional[float] = None
    memory_usage_mb: Optional[float] = None

    # Source
    source: str
    source_url: Optional[str] = None

    # Usage
    training_count: int = 0
    inference_count: int = 0

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_validated: Optional[datetime] = None
    last_used: Optional[datetime] = None

    # Additional
    tags: List[str] = Field(default_factory=list)


class ModelListResponse(BaseModel):
    """List of models response."""

    total: int
    models: List[ModelResponse]


class ModelStatusResponse(BaseModel):
    """Model status response."""

    model_id: str
    status: str
    is_loaded: bool
    is_active: bool
    is_default: bool

    load_time: Optional[float] = None
    memory_usage_mb: Optional[float] = None

    error_message: Optional[str] = None
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)


class ValidationResponse(BaseModel):
    """Model validation response."""

    model_id: str
    is_valid: bool

    file_checks: Dict[str, bool] = Field(default_factory=dict)
    config_valid: bool = False
    tokenizer_compatible: bool = False

    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    validated_at: datetime


class CompatibilityResponse(BaseModel):
    """Compatibility check response."""

    model_id: str
    component: str
    status: str
    compatible: bool

    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)

    checked_at: datetime


class TrainingReadinessResponse(BaseModel):
    """Training readiness response."""

    model_id: str
    is_ready: bool

    readiness: Dict[str, Any]
    compatibility: List[CompatibilityResponse]

    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class ModelHealthResponse(BaseModel):
    """Model health check response."""

    model_id: str
    healthy: bool

    checks: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    checked_at: str


class SystemHealthResponse(BaseModel):
    """System health response."""

    healthy: bool
    components: Dict[str, Any] = Field(default_factory=dict)
    statistics: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    checked_at: str


class ModelMetadataResponse(BaseModel):
    """Model metadata response."""

    model_id: str
    name: str
    version: str
    architecture: str
    model_type: str

    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None
    total_size_mb: Optional[float] = None

    supported_languages: List[str] = Field(default_factory=list)
    training_capabilities: List[str] = Field(default_factory=list)

    model_files_count: int = 0
    source: str

    created_at: str
    training_count: int = 0
    inference_count: int = 0


class ModelStatsResponse(BaseModel):
    """Model statistics response."""

    total_models: int
    active_models: int
    loaded_models: int
    failed_models: int
    archived_models: int

    by_architecture: Dict[str, int] = Field(default_factory=dict)
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_status: Dict[str, int] = Field(default_factory=dict)

    cache_stats: Dict[str, Any] = Field(default_factory=dict)
    storage_stats: Dict[str, Any] = Field(default_factory=dict)
