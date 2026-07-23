"""API schemas for dataset operations."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.dataset.models import (
    DatasetFormat,
    DatasetStatus,
    DatasetType,
    Language,
    SplitType,
)


# Request Schemas
class UploadDatasetRequest(BaseModel):
    """Request to upload dataset."""

    dataset_name: str
    dataset_type: DatasetType
    content: str  # File content as string or base64
    file_format: DatasetFormat
    company_name: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ValidateDatasetRequest(BaseModel):
    """Request to validate dataset."""

    dataset_id: str


class PreprocessDatasetRequest(BaseModel):
    """Request to preprocess dataset."""

    dataset_id: str
    lowercase: bool = False
    remove_html: bool = True
    normalize_whitespace: bool = True
    normalize_unicode: bool = True
    remove_special_chars: bool = False
    remove_duplicates: bool = True
    remove_empty: bool = True
    detect_language: bool = False


class SplitDatasetRequest(BaseModel):
    """Request to split dataset."""

    dataset_id: str
    train_ratio: float = 0.8
    validation_ratio: float = 0.1
    test_ratio: float = 0.1
    shuffle: bool = True
    random_seed: int = 42


class ProcessDatasetRequest(BaseModel):
    """Request to process dataset through pipeline."""

    dataset_name: str
    dataset_type: DatasetType
    content: str
    file_format: DatasetFormat
    
    # Preprocessing config
    preprocessing: Optional[Dict[str, Any]] = None
    
    # Split config
    split_config: Optional[Dict[str, Any]] = None
    
    # Metadata
    company_name: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None


# Response Schemas
class DatasetResponse(BaseModel):
    """Response for dataset."""

    dataset_id: str
    name: str
    dataset_type: DatasetType
    format: DatasetFormat
    status: DatasetStatus
    
    total_records: int
    total_conversations: int
    total_messages: int
    total_qa_pairs: int
    
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class DatasetSummaryResponse(BaseModel):
    """Response for dataset summary."""

    dataset_id: str
    name: str
    dataset_type: DatasetType
    format: DatasetFormat
    status: DatasetStatus
    
    statistics: Dict[str, Any]
    quality: Dict[str, Any]
    languages: List[str]
    language_distribution: Dict[str, int]
    
    file_info: Dict[str, Any]
    timestamps: Dict[str, str]
    
    processing_steps: int
    errors: int
    warnings: int


class DatasetStatusResponse(BaseModel):
    """Response for dataset status."""

    dataset_id: str
    status: DatasetStatus
    progress: float  # 0-100
    current_step: Optional[str] = None
    processing_steps: List[str]
    errors: List[str]
    warnings: List[str]


class ValidationResponse(BaseModel):
    """Response for validation."""

    dataset_id: str
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    statistics: Dict[str, Any]


class SplitResponse(BaseModel):
    """Response for dataset split."""

    dataset_id: str
    train_size: int
    validation_size: int
    test_size: int
    train_percentage: float
    validation_percentage: float
    test_percentage: float


class DatasetListResponse(BaseModel):
    """Response for dataset list."""

    datasets: List[DatasetResponse]
    total: int
    page: int
    page_size: int


class ProcessingStatsResponse(BaseModel):
    """Response for processing statistics."""

    total_datasets: int
    processing: int
    ready: int
    failed: int
    cache_entries: int


# Generic Response
class ApiResponse(BaseModel):
    """Generic API response."""

    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response."""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
