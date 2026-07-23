# Dataset Processing Quick Start

Get started with dataset preprocessing in 5 minutes.

## ⚡ Quick Example

### 1. Start the Service

```bash
cd apps/training-engine
python main.py
```

### 2. Upload Dataset

```bash
curl -X POST http://localhost:8001/api/v1/dataset/process \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_name": "test_conversations",
    "dataset_type": "conversation",
    "file_format": "json",
    "content": "{\"conversations\": [{\"messages\": [{\"speaker\": \"agent\", \"text\": \"Hello!\"}, {\"speaker\": \"customer\", \"text\": \"Hi there!\"}]}]}"
  }'
```

### 3. Check Status

```bash
# Response from step 2 gives you dataset_id
curl http://localhost:8001/api/v1/dataset/status/DATASET_ID \
  -H "X-API-Key: your-internal-api-key"
```

### 4. Get Summary

```bash
curl http://localhost:8001/api/v1/dataset/summary/DATASET_ID \
  -H "X-API-Key: your-internal-api-key"
```

## 📝 Sample Datasets

### Conversation Dataset (JSON)

```json
{
  "conversations": [
    {
      "id": "conv1",
      "messages": [
        {
          "speaker": "agent",
          "text": "Hello! How can I help you today?"
        },
        {
          "speaker": "customer",
          "text": "I need information about your products"
        },
        {
          "speaker": "agent",
          "text": "I'd be happy to help! What product are you interested in?"
        }
      ],
      "intent": "product_inquiry",
      "metadata": {
        "duration": 120,
        "call_id": "call123"
      }
    }
  ]
}
```

### QA Dataset (JSONL)

```jsonl
{"id": "qa1", "question": "What is your return policy?", "answer": "We accept returns within 30 days"}
{"id": "qa2", "question": "Do you ship internationally?", "answer": "Yes, we ship to over 50 countries"}
{"id": "qa3", "question": "What payment methods do you accept?", "answer": "We accept credit cards, PayPal, and bank transfers"}
```

### CSV Dataset

```csv
id,question,answer,category
1,What are your business hours?,We are open Monday-Friday 9am-5pm,general
2,How do I reset my password?,Click 'Forgot Password' on the login page,technical
3,What is your contact email?,support@company.com,general
```

## 🔧 Configuration Options

### Full Processing Example

```bash
curl -X POST http://localhost:8001/api/v1/dataset/process \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_name": "sales_conversations",
    "dataset_type": "conversation",
    "file_format": "json",
    "content": "...",
    "company_name": "Acme Corp",
    "project_id": "project-123",
    "user_id": "user-456",
    "preprocessing": {
      "lowercase": false,
      "remove_html": true,
      "normalize_whitespace": true,
      "normalize_unicode": true,
      "remove_special_chars": false,
      "remove_duplicates": true,
      "remove_empty": true,
      "detect_language": false
    },
    "split_config": {
      "train_ratio": 0.8,
      "validation_ratio": 0.1,
      "test_ratio": 0.1,
      "shuffle": true,
      "random_seed": 42
    }
  }'
```

## 🎯 Supported Dataset Types

### 1. Conversation

```json
{
  "messages": [
    {"speaker": "agent", "text": "Hello"},
    {"speaker": "customer", "text": "Hi"}
  ]
}
```

### 2. QA

```json
{
  "question": "What is AI?",
  "answer": "Artificial Intelligence is..."
}
```

### 3. Whisper Transcript

```json
{
  "segments": [
    {
      "text": "Hello world",
      "start": 0.0,
      "end": 1.5,
      "confidence": 0.95
    }
  ]
}
```

### 4. Call Recording

```json
{
  "call_id": "call123",
  "transcript": [
    {"speaker": "agent", "text": "Thank you for calling"},
    {"speaker": "customer", "text": "I need help"}
  ],
  "duration": 180
}
```

## 📊 API Endpoints

```
POST   /api/v1/dataset/upload           Upload only
POST   /api/v1/dataset/process          Upload + Process
POST   /api/v1/dataset/validate         Validate
POST   /api/v1/dataset/preprocess       Preprocess
POST   /api/v1/dataset/split            Split
GET    /api/v1/dataset/{id}             Get dataset
GET    /api/v1/dataset/summary/{id}     Get summary
GET    /api/v1/dataset/status/{id}      Get status
DELETE /api/v1/dataset/{id}             Delete
GET    /api/v1/dataset/stats/processing Get stats
```

## 🐛 Troubleshooting

### Invalid JSON

```bash
# Validate JSON first
echo '{"test": "data"}' | jq .
```

### Processing Failed

```bash
# Check status
curl http://localhost:8001/api/v1/dataset/status/DATASET_ID \
  -H "X-API-Key: your-key"

# Check logs
tail -f logs/training-engine.log | grep dataset
```

### Authentication Error

```bash
# Verify API key in .env
cat .env | grep INTERNAL_API_KEY
```

## 🚀 Next Steps

1. ✅ Process your first dataset
2. 📖 Read [DATASET_README.md](./DATASET_README.md)
3. 🔗 Integrate with NestJS backend
4. 🧪 Run tests: `pytest tests/dataset/`

---

**You're all set to process datasets!** 🎉
