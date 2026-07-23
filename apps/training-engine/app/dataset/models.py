"""Dataset data models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class DatasetType(str, Enum):
    """Dataset type enumeration."""

    CONVERSATION = "conversation"
    QA = "qa"
    TRANSCRIPT = "transcript"
    CALL_RECORDING = "call_recording"
    WHISPER_TRANSCRIPT = "whisper_transcript"
    PROMPT = "prompt"
    KNOWLEDGE = "knowledge"
    FAQ = "faq"
    SALES = "sales"
    OBJECTION_HANDLING = "objection_handling"
    CUSTOM = "custom"
    UNKNOWN = "unknown"


class DatasetFormat(str, Enum):
    """Dataset format enumeration."""

    JSON = "json"
    JSONL = "jsonl"
    CSV = "csv"
    TXT = "txt"
    MARKDOWN = "markdown"
    EXCEL = "excel"
    PDF = "pdf"
    UNKNOWN = "unknown"


class DatasetStatus(str, Enum):
    """Dataset processing status."""

    PENDING = "pending"
    LOADING = "loading"
    VALIDATING = "validating"
    CLEANING = "cleaning"
    PREPROCESSING = "preprocessing"
    FORMATTING = "formatting"
    SPLITTING = "splitting"
    READY = "ready"
    FAILED = "failed"


class Language(str, Enum):
    """Supported languages."""

    ENGLISH = "en"
    HINDI = "hi"
    MARATHI = "mr"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class SplitType(str, Enum):
    """Dataset split type."""

    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"


class Message(BaseModel):
    """Message in a conversation."""

    message_id: str = Field(default_factory=lambda: str(uuid4()))
    speaker: str  # "agent", "customer", "user", "assistant", etc.
    text: str
    timestamp: Optional[str] = None
    language: Optional[Language] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Conversation(BaseModel):
    """Unified conversation format."""

    conversation_id: str = Field(default_factory=lambda: str(uuid4()))
    messages: List[Message]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Optional structured fields
    intent: Optional[str] = None
    sentiment: Optional[str] = None
    language: Optional[Language] = None
    duration: Optional[float] = None
    
    def get_message_count(self) -> int:
        """Get total message count."""
        return len(self.messages)
    
    def get_text_length(self) -> int:
        """Get total text length."""
        return sum(len(msg.text) for msg in self.messages)


class QuestionAnswer(BaseModel):
    """Question-Answer pair."""

    qa_id: str = Field(default_factory=lambda: str(uuid4()))
    question: str
    answer: str
    context: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DatasetRecord(BaseModel):
    """Generic dataset record."""

    record_id: str = Field(default_factory=lambda: str(uuid4()))
    data: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DatasetMetadata(BaseModel):
    """Dataset metadata."""

    dataset_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    dataset_type: DatasetType
    format: DatasetFormat
    
    # Statistics
    total_records: int = 0
    total_conversations: int = 0
    total_messages: int = 0
    total_qa_pairs: int = 0
    
    # Language distribution
    languages: List[Language] = Field(default_factory=list)
    language_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # Content statistics
    avg_conversation_length: float = 0.0
    avg_message_length: float = 0.0
    total_characters: int = 0
    total_words: int = 0
    
    # Quality metrics
    duplicate_count: int = 0
    empty_count: int = 0
    invalid_count: int = 0
    
    # File information
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_hash: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    
    # Company/Project
    company_name: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    
    # Additional metadata
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)


class DatasetSplit(BaseModel):
    """Dataset split information."""

    split_type: SplitType
    size: int
    percentage: float
    records: List[Any] = Field(default_factory=list)


class Dataset(BaseModel):
    """Complete dataset model."""

    dataset_id: str = Field(default_factory=lambda: str(uuid4()))
    metadata: DatasetMetadata
    
    # Data
    conversations: List[Conversation] = Field(default_factory=list)
    qa_pairs: List[QuestionAnswer] = Field(default_factory=list)
    records: List[DatasetRecord] = Field(default_factory=list)
    
    # Splits
    train_split: Optional[DatasetSplit] = None
    validation_split: Optional[DatasetSplit] = None
    test_split: Optional[DatasetSplit] = None
    
    # Processing status
    status: DatasetStatus = DatasetStatus.PENDING
    
    # Processing history
    processing_steps: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    def add_processing_step(self, step: str):
        """Add processing step."""
        self.processing_steps.append(step)
    
    def add_error(self, error: str):
        """Add error."""
        self.errors.append(error)
    
    def add_warning(self, warning: str):
        """Add warning."""
        self.warnings.append(warning)


class ValidationResult(BaseModel):
    """Dataset validation result."""

    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    statistics: Dict[str, Any] = Field(default_factory=dict)


class PreprocessingConfig(BaseModel):
    """Preprocessing configuration."""

    # Text normalization
    lowercase: bool = False
    remove_html: bool = True
    normalize_whitespace: bool = True
    normalize_unicode: bool = True
    remove_special_chars: bool = False
    
    # Cleaning
    remove_duplicates: bool = True
    remove_empty: bool = True
    remove_short_messages: bool = False
    min_message_length: int = 1
    
    # Language
    detect_language: bool = False
    filter_languages: Optional[List[Language]] = None
    
    # Additional options
    custom_filters: Dict[str, Any] = Field(default_factory=dict)


class SplitConfig(BaseModel):
    """Dataset split configuration."""

    train_ratio: float = 0.8
    validation_ratio: float = 0.1
    test_ratio: float = 0.1
    shuffle: bool = True
    random_seed: int = 42
    
    def validate_ratios(self) -> bool:
        """Validate split ratios sum to 1.0."""
        total = self.train_ratio + self.validation_ratio + self.test_ratio
        return abs(total - 1.0) < 0.001
