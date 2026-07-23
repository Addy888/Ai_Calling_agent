"""PEFT API Schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class AdapterType(str, Enum):
    """Supported adapter types."""

    LORA = "lora"
    ADALORA = "adalora"  # Future
    QLORA = "qlora"  # Future
    IA3 = "ia3"  # Future
    PREFIX_TUNING = "prefix_tuning"  # Future
    PROMPT_TUNING = "prompt_tuning"  # Future


class TaskType(str, Enum):
    """Task types for PEFT."""

    CAUSAL_LM = "CAUSAL_LM"
    SEQ_2_SEQ_LM = "SEQ_2_SEQ_LM"
    SEQ_CLS = "SEQ_CLS"
    TOKEN_CLS = "TOKEN_CLS"
    QUESTION_ANS = "QUESTION_ANS"


class LoRABias(str, Enum):
    """LoRA bias types."""

    NONE = "none"
    ALL = "all"
    LORA_ONLY = "lora_only"


# Request Schemas


class LoRAConfigRequest(BaseModel):
    """LoRA configuration request."""

    r: int = Field(default=8, ge=1, le=256, description="LoRA rank")
    lora_alpha: int = Field(default=16, ge=1, description="LoRA alpha")
    lora_dropout: float = Field(default=0.1, ge=0.0, le=1.0, description="LoRA dropout")
    bias: LoRABias = Field(default=LoRABias.NONE, description="Bias type")
    target_modules: Optional[List[str]] = Field(
        default=None, description="Target modules (auto-detect if None)"
    )
    modules_to_save: Optional[List[str]] = Field(
        default=None, description="Additional modules to save"
    )
    task_type: TaskType = Field(default=TaskType.CAUSAL_LM, description="Task type")
    inference_mode: bool = Field(default=False, description="Inference mode")
    fan_in_fan_out: bool = Field(default=False, description="Fan in fan out")

    @validator("lora_alpha")
    def validate_alpha(cls, v, values):
        """Validate alpha is reasonable relative to rank."""
        if "r" in values and v < values["r"]:
            raise ValueError("lora_alpha should typically be >= r")
        return v


class CreatePEFTRequest(BaseModel):
    """Create PEFT adapter request."""

    model_id: str = Field(..., description="Base model ID")
    adapter_type: AdapterType = Field(default=AdapterType.LORA, description="Adapter type")
    adapter_name: Optional[str] = Field(default=None, description="Custom adapter name")
    lora_config: Optional[LoRAConfigRequest] = Field(
        default=None, description="LoRA configuration"
    )


class ApplyPEFTRequest(BaseModel):
    """Apply PEFT adapter request."""

    model_id: str = Field(..., description="Base model ID")
    adapter_id: str = Field(..., description="Adapter ID to apply")


class RemovePEFTRequest(BaseModel):
    """Remove PEFT adapter request."""

    model_id: str = Field(..., description="Model ID")
    adapter_name: str = Field(..., description="Adapter name to remove")


class ValidatePEFTRequest(BaseModel):
    """Validate PEFT configuration request."""

    model_id: str = Field(..., description="Base model ID")
    adapter_type: AdapterType = Field(..., description="Adapter type")
    config: Dict[str, Any] = Field(..., description="Adapter configuration")


# Response Schemas


class AdapterMetadata(BaseModel):
    """Adapter metadata."""

    adapter_id: str
    adapter_name: str
    adapter_type: AdapterType
    base_model: str
    rank: Optional[int] = None
    alpha: Optional[int] = None
    dropout: Optional[float] = None
    target_modules: List[str]
    trainable_params: int
    frozen_params: int
    trainable_percent: float
    task_type: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PEFTResponse(BaseModel):
    """PEFT operation response."""

    success: bool
    message: str
    adapter_id: Optional[str] = None
    metadata: Optional[AdapterMetadata] = None


class AdapterListResponse(BaseModel):
    """List of adapters response."""

    adapters: List[AdapterMetadata]
    total: int


class PEFTHealthResponse(BaseModel):
    """PEFT service health response."""

    status: str
    healthy: bool
    active_adapters: int
    supported_types: List[str]
    peft_version: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ValidationResult(BaseModel):
    """PEFT validation result."""

    valid: bool
    model_compatible: bool
    config_valid: bool
    target_modules_valid: bool
    issues: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class TargetModulesResponse(BaseModel):
    """Target modules detection response."""

    model_id: str
    detected_modules: List[str]
    recommended_modules: List[str]
    total_modules: int
