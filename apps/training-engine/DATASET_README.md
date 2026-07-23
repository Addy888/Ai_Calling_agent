# Dataset Preprocessing Engine

Enterprise dataset loader and preprocessing system for AI model training.

## 🎯 Phase 4.4.4.2 - Dataset Processing Complete

Complete dataset preparation infrastructure with support for multiple formats and dataset types.

## 📊 Supported Datasets

### Input Formats
- ✅ JSON
- ✅ JSONL (JSON Lines)
- ✅ CSV
- ✅ TXT (Plain text)
- ✅ Markdown
- ✅ Excel (XLSX, XLS)
- ⏳ PDF (Placeholder)

### Dataset Types
- ✅ Conversation (Human-Agent dialogs)
- ✅ QA (Question-Answer pairs)
- ✅ Transcript (Generic transcripts)
- ✅ Call Recording (Call center transcripts)
- ✅ Whisper Transcript (Whisper ASR output)
- ✅ Prompt (Prompt-Response pairs)
- ✅ Knowledge (Knowledge base entries)
- ✅ FAQ (Frequently Asked Questions)
- ✅ Sales (Sales conversations)
- ✅ Objection Handling
- ✅ Custom

## 🏗️ Architecture

```
Dataset Processing Pipeline
│
├─> 1. LOAD
│   ├─> Detect format
│   ├─> Read file
│   └─> Calculate hash
│
├─> 2. PARSE
│   ├─> Parse format (JSON/CSV/etc)
│   ├─> Extract records
│   └─> Detect structure
│
├─> 3. FORMAT
│   ├─> Convert to unified format
│   ├─> Normalize structure
│   └─> Create conversations/QA pairs
│
├─> 4. VALIDATE
│   ├─> Check completeness
│   ├─> Detect errors
│   └─> Generate warnings
│
├─> 5. CLEAN
│   ├─> Remove duplicates
│   ├─> Remove empty records
│   └─> Normalize text
│
├─> 6. PREPROCESS
│   ├─> Normalize whitespace
│   ├─> Normalize unicode
│   ├─> Remove HTML
│   └─> Optional lowercase
│
├─> 7. SPLIT
│   ├─> Train set (80%)
│   ├─> Validation set (10%)
│   └─> Test set (10%)
│
└─> 8. METADATA
    ├─> Calculate statistics
    ├─> Language distribution
    └─> Quality metrics
```

## 📡 API Endpoints

### Dataset Operations

```bash
POST /api/v1/dataset/upload        # Upload dataset
POST /api/v1/dataset/process       # Process through pipeline
POST /api/v1/dataset/validate      # Validate dataset
POST /api/v1/dataset/preprocess    # Preprocess dataset
POST /api/v1/dataset/split         # Split dataset
GET  /api/v1/dataset/{id}          # Get dataset
GET  /api/v1/dataset/summary/{id}  # Get summary
GET  /api/v1/dataset/status/{id}   # Get processing status
DELETE /api/v1/dataset/{id}        # Delete dataset
GET  /api/v1/dataset/stats/processing  # Get stats
```

## 🚀 Usage Examples

### 1. Upload and Process Dataset

```bash
curl -X POST http://localhost:8001/api/v1/dataset/process \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_name": "customer_conversations",
    "dataset_type": "conversation",
    "content": "{\"conversations\": [...]}",
    "file_format": "json",
    "company_name": "Acme Corp",
    "preprocessing": {
      "lowercase": false,
      "remove_html": true,
      "normalize_whitespace": true,
      "remove_duplicates": true
    },
    "split_config": {
      "train_ratio": 0.8,
      "validation_ratio": 0.1,
      "test_ratio": 0.1
    }
  }'
```

### 2. Get Dataset Summary

```bash
curl http://localhost:8001/api/v1/dataset/summary/DATASET_ID \
  -H "X-API-Key: your-api-key"
```

### 3. Check Processing Status

```bash
curl http://localhost:8001/api/v1/dataset/status/DATASET_ID \
  -H "X-API-Key: your-api-key"
```

## 📝 Unified Data Format

All datasets are converted to a unified conversation format:

```json
{
  "conversation_id": "conv-123",
  "messages": [
    {
      "message_id": "msg-1",
      "speaker": "agent",
      "text": "Hello, how can I help you?",
      "timestamp": "2026-07-23T10:00:00",
      "language": "en",
      "metadata": {}
    },
    {
      "message_id": "msg-2",
      "speaker": "customer",
      "text": "I need information about your product",
      "timestamp": "2026-07-23T10:00:05",
      "language": "en",
      "metadata": {}
    }
  ],
  "intent": "product_inquiry",
  "sentiment": "neutral",
  "language": "en",
  "metadata": {}
}
```

### QA Format

```json
{
  "qa_id": "qa-123",
  "question": "What is your return policy?",
  "answer": "We accept returns within 30 days of purchase.",
  "context": "E-commerce FAQ",
  "metadata": {}
}
```

## 🔧 Configuration

### Preprocessing Options

```python
PreprocessingConfig(
    lowercase=False,              # Convert to lowercase
    remove_html=True,             # Remove HTML tags
    normalize_whitespace=True,    # Normalize spaces
    normalize_unicode=True,       # Normalize unicode
    remove_special_chars=False,   # Remove special chars
    remove_duplicates=True,       # Remove duplicates
    remove_empty=True,            # Remove empty records
    detect_language=False,        # Detect language (placeholder)
)
```

### Split Configuration

```python
SplitConfig(
    train_ratio=0.8,        # 80% training
    validation_ratio=0.1,   # 10% validation
    test_ratio=0.1,         # 10% test
    shuffle=True,           # Shuffle before split
    random_seed=42,         # Random seed
)
```

## 📊 Dataset Metadata

Generated automatically:

```json
{
  "dataset_id": "ds-123",
  "name": "customer_conversations",
  "dataset_type": "conversation",
  "format": "json",
  "statistics": {
    "total_records": 1000,
    "total_conversations": 1000,
    "total_messages": 3500,
    "total_characters": 125000,
    "total_words": 25000,
    "avg_conversation_length": 3.5,
    "avg_message_length": 35.7
  },
  "quality": {
    "duplicate_count": 5,
    "empty_count": 2,
    "invalid_count": 0
  },
  "languages": ["en", "hi", "mr"],
  "language_distribution": {
    "en": 850,
    "hi": 100,
    "mr": 50
  },
  "file_info": {
    "file_name": "conversations.json",
    "file_size": 524288,
    "file_hash": "abc123..."
  }
}
```

## 🧪 Testing

```bash
# Run dataset tests
pytest tests/dataset/ -v

# Run specific test file
pytest tests/dataset/test_pipeline.py -v

# Run with coverage
pytest tests/dataset/ --cov=app/dataset --cov-report=html
```

## 🔄 Integration with NestJS

### From NestJS Backend

```typescript
// Create dataset preprocessing service
@Injectable()
export class DatasetPreprocessingService {
  async uploadDataset(dto: UploadDatasetDto) {
    // Send to Python Training Engine
    const response = await this.httpService.axiosRef.post(
      `${TRAINING_ENGINE_URL}/api/v1/dataset/process`,
      {
        dataset_name: dto.name,
        dataset_type: dto.type,
        content: dto.content,
        file_format: dto.format,
        company_name: dto.companyName,
        project_id: dto.projectId,
        user_id: dto.userId,
        preprocessing: dto.preprocessing,
        split_config: dto.splitConfig,
      },
      {
        headers: {
          'X-API-Key': process.env.TRAINING_ENGINE_API_KEY,
        },
      }
    );

    // Store in Prisma
    return this.prisma.dataset.create({
      data: {
        datasetId: response.data.dataset_id,
        name: dto.name,
        type: dto.type,
        status: 'processing',
        userId: dto.userId,
      },
    });
  }

  async getDatasetStatus(datasetId: string) {
    const response = await this.httpService.axiosRef.get(
      `${TRAINING_ENGINE_URL}/api/v1/dataset/status/${datasetId}`,
      {
        headers: {
          'X-API-Key': process.env.TRAINING_ENGINE_API_KEY,
        },
      }
    );

    // Update Prisma
    await this.prisma.dataset.update({
      where: { datasetId },
      data: {
        status: response.data.status,
        progress: response.data.progress,
      },
    });

    return response.data;
  }
}
```

## 📁 Module Structure

```
app/dataset/
├── __init__.py           # Module initialization
├── models.py             # Data models
├── exceptions.py         # Custom exceptions
├── schemas.py            # API schemas
├── api.py                # API routes
│
├── loader/               # Dataset loader
│   └── __init__.py
│
├── parser/               # Format parser
│   └── __init__.py
│
├── validator/            # Data validator
│   └── __init__.py
│
├── cleaner/              # Data cleaner
│   └── __init__.py
│
├── preprocessor/         # Text preprocessor
│   └── __init__.py
│
├── formatter/            # Format converter
│   └── __init__.py
│
├── splitter/             # Dataset splitter
│   └── __init__.py
│
├── metadata/             # Metadata generator
│   └── __init__.py
│
├── cache/                # Memory cache
│   └── __init__.py
│
├── storage/              # File storage
│   └── __init__.py
│
└── pipeline/             # Complete pipeline
    └── __init__.py
```

## 🎯 Key Features

### 1. Automatic Format Detection
- Detects format from file extension
- Supports multiple formats
- Handles various structures

### 2. Unified Conversation Format
- All datasets converted to standard format
- Reusable for all AI models
- Maintains metadata

### 3. Comprehensive Validation
- Missing fields detection
- Empty data detection
- Duplicate detection
- Quality metrics

### 4. Smart Cleaning
- Remove duplicates
- Remove empty records
- Normalize text
- Fix encoding issues

### 5. Flexible Preprocessing
- Configurable options
- Text normalization
- HTML removal
- Unicode handling

### 6. Dataset Splitting
- Train/Validation/Test split
- Configurable ratios
- Reproducible with seed

### 7. Rich Metadata
- Automatic statistics
- Language detection (placeholder)
- Quality metrics
- Processing history

### 8. Caching System
- In-memory cache
- TTL support
- Ready for Redis

### 9. Storage System
- File-based storage
- JSON format
- Split persistence

## 🔐 Security

- API key authentication
- Input validation
- Error sanitization
- Safe file handling

## 📈 Performance

- Async/await throughout
- Efficient parsing
- Memory-efficient streaming
- Caching for repeated access

## 🎓 Future Extensions

### Ready for Implementation

```python
# Language Detection (Future)
from app.dataset.language import LanguageDetector
detector = LanguageDetector()
language = detector.detect(text)

# Speaker Diarization (Future)
from app.dataset.diarization import SpeakerDiarizer
diarizer = SpeakerDiarizer()
speakers = diarizer.identify_speakers(audio)

# Audio Processing (Future)
from app.dataset.audio import AudioProcessor
processor = AudioProcessor()
features = processor.extract_features(audio)

# Embeddings (Future)
from app.dataset.embeddings import EmbeddingGenerator
generator = EmbeddingGenerator()
embeddings = generator.generate(text)
```

## 🐛 Troubleshooting

### Dataset Upload Fails

```bash
# Check format
curl http://localhost:8001/api/v1/dataset/upload \
  -H "X-API-Key: your-key" \
  -d @dataset.json

# Verify content is valid JSON
cat dataset.json | jq .
```

### Validation Errors

```bash
# Get detailed validation
curl http://localhost:8001/api/v1/dataset/validate?dataset_id=DATASET_ID \
  -H "X-API-Key: your-key"
```

### Processing Stuck

```bash
# Check status
curl http://localhost:8001/api/v1/dataset/status/DATASET_ID \
  -H "X-API-Key: your-key"

# Check logs
tail -f logs/training-engine.log | grep dataset
```

## 📚 Documentation

- API Docs: http://localhost:8001/api/v1/docs
- Swagger UI: http://localhost:8001/api/v1/docs
- ReDoc: http://localhost:8001/api/v1/redoc

## ✅ Phase 4.4.4.2 Complete

**Status:** ✅ PRODUCTION READY

All dataset preprocessing infrastructure is complete:
- ✅ Loader (multiple formats)
- ✅ Parser (flexible parsing)
- ✅ Validator (comprehensive checks)
- ✅ Cleaner (duplicate removal, normalization)
- ✅ Preprocessor (text normalization)
- ✅ Formatter (unified format)
- ✅ Splitter (train/val/test)
- ✅ Metadata (statistics generation)
- ✅ Cache (memory cache)
- ✅ Storage (file storage)
- ✅ Pipeline (complete workflow)
- ✅ REST APIs (10 endpoints)
- ✅ Tests (comprehensive coverage)

**Next Phase:** 4.4.4.3 - Model Training Implementation

---

**Built with ❤️ for Enterprise AI Training**
