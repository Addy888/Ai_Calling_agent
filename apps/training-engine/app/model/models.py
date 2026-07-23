"""Model data models."""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ModelArchitecture(str, Enum):
    """Model architecture types."""

    LLAMA = "llama"
    QWEN = "qwen"
    GEMMA = "gemma"
    MISTRAL = "mistral"
    DEEPSEEK = "deepseek"
    PHI = "phi"
    GPT = "gpt"
    BERT = "bert"
    T5 = "t5"
    CUSTOM = "custom"
    UNKNOWN = "unknown"


class ModelStatus(str, Enum):
    """Model status."""

    REGISTERED = "registered"
    LOADING = "loading"
    LOADED = "loaded"
    ACTIVE = "active"
    INACTIVE = "inactive"
    VALIDATING = "validating"
    FAILED = "failed"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ModelType(str, Enum):
    """Model type."""

    BASE = "base"
    FINE_TUNED = "fine_tuned"
    LORA = "lora"
    QLORA = "qlora"
    PEFT = "peft"
    QUANTIZED = "quantized"
    MERGED = "merged"
    CUSTOM = "custom"


class ModelSource(str, Enum):
    """Model source."""

    LOCAL = "local"
    HUGGINGFACE = "huggingface"
    CLOUD = "cloud"
    CUSTOM = "custom"
    ENTERPRISE_REGISTRY = "enterprise_registry"


class TrainingCapability(str, Enum):
    """Training capabilities."""

    FULL_FINE_TUNE = "full_fine_tune"
    LORA = "lora"
    QLORA = "qlora"
    PEFT = "peft"
    ADAPTER = "adapter"
    PROMPT_TUNING = "prompt_tuning"
    PREFIX_TUNING = "prefix_tuning"


class CompatibilityStatus(str, Enum):
    """Compatibility status."""

    COMPATIBLE = "compatible"
    INCOMPATIBLE = "incompatible"
    WARNING = "warning"
    UNKNOWN = "unknown"


class ModelConfig(BaseModel):
    """Model configuration."""

    model_name: str
    architecture: ModelArchitecture
    model_type: ModelType = ModelType.BASE
    
    # Model files
    model_path: Optional[str] = None
    config_path: Optional[str] = None
    tokenizer_path: Optional[str] = None
    
    # Model specifications
    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None
    hidden_size: Optional[int] = None
    num_layers: Optional[int] = None
    num_attention_heads: Optional[int] = None
    
    # Capabilities
    supported_languages: List[str] = Field(default_factory=list)
    training_capabilities: List[TrainingCapability] = Field(default_factory=list)
    
    # Hardware requirements
    min_gpu_memory_gb: Optional[float] = None
    min_ram_gb: Optional[float] = None
    recommended_gpu: Optional[str] = None
    
    # Additional config
    custom_config: Dict[str, Any] = Field(default_factory=dict)


class ModelMetadata(BaseModel):
    """Model metadata."""

    model_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    version: str = "1.0.0"
    architecture: ModelArchitecture
    model_type: ModelType
    
    # Model information
    description: Optional[str] = None
    author: Optional[str] = None
    organization: Optional[str] = None
    license: Optional[str] = None
    
    # Technical specs
    parameter_count: Optional[int] = None
    context_length: Optional[int] = None
    vocabulary_size: Optional[int] = None
    
    # Languages and capabilities
    supported_languages: List[str] = Field(default_factory=list)
    training_capabilities: List[TrainingCapability] = Field(default_factory=list)
    
    # Model source
    source: ModelSource = ModelSource.LOCAL
    source_url: Optional[str] = None
    
    # File information
    model_files: List[str] = Field(default_factory=list)
    total_size_mb: Optional[float] = None
    
    # Compatibility
    compatible_tokenizers: List[str] = Field(default_factory=list)
    compatible_datasets: List[str] = Field(default_factory=list)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_validated: Optional[datetime] = None
    last_used: Optional[datetime] = None
    
    # Usage statistics
    training_count: int = 0
    inference_count: int = 0
    
    # Additional metadata
    tags: List[str] = Field(default_factory=list)
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelInfo(BaseModel):
    """Model runtime information."""

    model_id: str
    status: ModelStatus
    
    config: Optional[ModelConfig] = None
    metadata: Optional[ModelMetadata] = None
    
    # Runtime information
    is_loaded: bool = False
    load_time: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    
    # Session information
    session_id: Optional[str] = None
    worker_id: Optional[str] = None
    
    # Error information
    error_message: Optional[str] = None
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    
    # Timestamps
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    loaded_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None


class CompatibilityCheck(BaseModel):
    """Model compatibility check result."""

    model_id: str
    component: str  # "tokenizer", "dataset", "training_engine", etc.
    status: CompatibilityStatus
    
    compatible: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    details: Dict[str, Any] = Field(default_factory=dict)
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class ModelValidationResult(BaseModel):
    """Model validation result."""

    model_id: str
    is_valid: bool
    
    file_checks: Dict[str, bool] = Field(default_factory=dict)
    config_valid: bool = False
    tokenizer_compatible: bool = False
    
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    compatibility_checks: List[CompatibilityCheck] = Field(default_factory=list)
    
    validated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelRegistry(BaseModel):
    """Model registry entry."""

    model_id: str
    name: str
    version: str
    architecture: ModelArchitecture
    status: ModelStatus
    
    config: ModelConfig
    metadata: ModelMetadata
    
    is_active: bool = False
    is_default: bool = False
    
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelCache(BaseModel):
    """Model cache entry."""

    model_id: str
    cache_key: str
    
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: datetime = Field(default_factory=datetime.utcnow)
    access_count: int = 0
    
    size_mb: Optional[float] = None
    ttl_seconds: int = 3600
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelLoadRequest(BaseModel):
    """Model load request."""

    model_id: str
    
    # Load options
    load_tokenizer: bool = True
    load_config: bool = True
    validate: bool = True
    
    # Hardware options
    device: Optional[str] = None  # "cpu", "cuda", "cuda:0"
    use_gpu: bool = False
    gpu_ids: Optional[List[int]] = None
    
    # Memory options
    low_cpu_mem_usage: bool = True
    max_memory: Optional[Dict[str, str]] = None
    
    # Quantization (Future)
    load_in_8bit: bool = False
    load_in_4bit: bool = False
    
    # Additional options
    custom_options: Dict[str, Any] = Field(default_factory=dict)
