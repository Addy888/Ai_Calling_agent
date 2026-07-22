# AI Model Library - API Documentation
## Phase 4.4.2.1 - REST API Reference

**Base URL:** `/api/ai-agent/ai-models`  
**Authentication:** JWT Bearer Token Required  
**Content-Type:** `application/json`

---

## 📑 TABLE OF CONTENTS
1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
3. [Request/Response Examples](#examples)
4. [Error Handling](#error-handling)
5. [Query Parameters](#query-parameters)
6. [Response Schemas](#response-schemas)

---

## 🔐 AUTHENTICATION

All endpoints require JWT authentication:

```http
Authorization: Bearer <your_jwt_token>
```

**Required Permissions:** Read access to AI Agent module

---

## 📍 ENDPOINTS

### 1. List All Models
Get a paginated list of AI models with optional filters.

```http
GET /api/ai-agent/ai-models
```

**Query Parameters:**
| Parameter   | Type   | Required | Default     | Description                          |
|-------------|--------|----------|-------------|--------------------------------------|
| search      | string | No       | -           | Search by name, provider, family     |
| provider    | string | No       | -           | Filter by provider                   |
| family      | string | No       | -           | Filter by model family               |
| status      | string | No       | -           | Filter by status                     |
| language    | string | No       | -           | Filter by language support           |
| page        | number | No       | 1           | Page number for pagination           |
| limit       | number | No       | 20          | Items per page                       |
| sortBy      | string | No       | createdAt   | Field to sort by                     |
| sortOrder   | string | No       | desc        | Sort direction (asc/desc)            |

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "name": "GPT-4",
      "provider": "OpenAI",
      "family": "GPT",
      "version": "4.0",
      "parameters": "175B",
      "contextLength": 8192,
      "languages": ["en", "es", "fr", "de", "hi", "zh", "ja", "ar"],
      "quantizationSupport": ["FP32", "FP16"],
      "minimumVram": 16,
      "recommendedVram": 32,
      "license": "Proprietary",
      "description": "Most capable GPT model with advanced reasoning",
      "capabilities": ["text-generation", "conversation", "code-generation"],
      "status": "AVAILABLE",
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 18,
    "totalPages": 1
  }
}
```

**Example Requests:**
```bash
# Get all models
GET /api/ai-agent/ai-models

# Search for GPT models
GET /api/ai-agent/ai-models?search=GPT

# Get OpenAI models only
GET /api/ai-agent/ai-models?provider=OpenAI

# Get available models with Hindi support
GET /api/ai-agent/ai-models?status=AVAILABLE&language=hi

# Paginated results
GET /api/ai-agent/ai-models?page=1&limit=10
```

---

### 2. Get Model Details
Get detailed information about a specific model.

```http
GET /api/ai-agent/ai-models/:id
```

**Path Parameters:**
| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| id        | string | Yes      | Model UUID         |

**Success Response (200 OK):**
```json
{
  "id": "uuid-string",
  "name": "GPT-4",
  "provider": "OpenAI",
  "family": "GPT",
  "version": "4.0",
  "parameters": "175B",
  "contextLength": 8192,
  "languages": ["en", "es", "fr", "de", "hi", "zh", "ja", "ar"],
  "quantizationSupport": ["FP32", "FP16"],
  "minimumVram": 16,
  "recommendedVram": 32,
  "license": "Proprietary",
  "description": "Most capable GPT model with advanced reasoning and multilingual support",
  "capabilities": ["text-generation", "conversation", "code-generation", "reasoning"],
  "modelSize": null,
  "status": "AVAILABLE",
  "isActive": true,
  "metadata": {},
  "createdBy": null,
  "updatedBy": null,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Model not found",
  "error": "Not Found"
}
```

**Example Request:**
```bash
GET /api/ai-agent/ai-models/550e8400-e29b-41d4-a716-446655440000
```

---

### 3. Get All Providers
Get a list of all AI model providers with model counts.

```http
GET /api/ai-agent/ai-models/providers/list
```

**Success Response (200 OK):**
```json
[
  {
    "name": "OpenAI",
    "modelCount": 3
  },
  {
    "name": "Meta",
    "modelCount": 3
  },
  {
    "name": "Anthropic",
    "modelCount": 2
  },
  {
    "name": "Google",
    "modelCount": 2
  },
  {
    "name": "Mistral AI",
    "modelCount": 2
  },
  {
    "name": "Qwen",
    "modelCount": 2
  },
  {
    "name": "DeepSeek",
    "modelCount": 1
  },
  {
    "name": "Microsoft",
    "modelCount": 1
  }
]
```

**Example Request:**
```bash
GET /api/ai-agent/ai-models/providers/list
```

---

### 4. Get All Families
Get a list of all model families, optionally filtered by provider.

```http
GET /api/ai-agent/ai-models/families/list
```

**Query Parameters:**
| Parameter | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| provider  | string | No       | Filter families by provider |

**Success Response (200 OK):**
```json
[
  {
    "family": "GPT",
    "provider": "OpenAI",
    "modelCount": 3
  },
  {
    "family": "Llama",
    "provider": "Meta",
    "modelCount": 3
  },
  {
    "family": "Claude",
    "provider": "Anthropic",
    "modelCount": 2
  },
  {
    "family": "Qwen",
    "provider": "Qwen",
    "modelCount": 2
  },
  {
    "family": "Mistral",
    "provider": "Mistral AI",
    "modelCount": 2
  },
  {
    "family": "Gemini",
    "provider": "Google",
    "modelCount": 1
  },
  {
    "family": "Gemma",
    "provider": "Google",
    "modelCount": 1
  },
  {
    "family": "DeepSeek",
    "provider": "DeepSeek",
    "modelCount": 1
  },
  {
    "family": "Phi",
    "provider": "Microsoft",
    "modelCount": 1
  }
]
```

**Example Requests:**
```bash
# Get all families
GET /api/ai-agent/ai-models/families/list

# Get OpenAI families only
GET /api/ai-agent/ai-models/families/list?provider=OpenAI
```

---

### 5. Get Statistics
Get overall statistics about the AI model library.

```http
GET /api/ai-agent/ai-models/statistics/summary
```

**Success Response (200 OK):**
```json
{
  "total": 18,
  "available": 16,
  "comingSoon": 2,
  "experimental": 0,
  "providers": 8,
  "languages": 9,
  "providerList": [
    {
      "name": "OpenAI",
      "modelCount": 3
    },
    {
      "name": "Meta",
      "modelCount": 3
    },
    {
      "name": "Anthropic",
      "modelCount": 2
    },
    {
      "name": "Google",
      "modelCount": 2
    },
    {
      "name": "Mistral AI",
      "modelCount": 2
    },
    {
      "name": "Qwen",
      "modelCount": 2
    },
    {
      "name": "DeepSeek",
      "modelCount": 1
    },
    {
      "name": "Microsoft",
      "modelCount": 1
    }
  ],
  "languageList": [
    "ar",
    "de",
    "en",
    "es",
    "fr",
    "hi",
    "it",
    "ja",
    "zh"
  ]
}
```

**Example Request:**
```bash
GET /api/ai-agent/ai-models/statistics/summary
```

---

## 📝 REQUEST/RESPONSE EXAMPLES

### Example 1: Search for Models
**Request:**
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models?search=Llama&status=AVAILABLE' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Response:**
```json
{
  "data": [
    {
      "id": "llama-3-uuid",
      "name": "Llama 3",
      "provider": "Meta",
      "family": "Llama",
      "version": "3.0",
      "parameters": "70B",
      "contextLength": 8192,
      "status": "AVAILABLE"
    },
    {
      "id": "llama-3.1-uuid",
      "name": "Llama 3.1",
      "provider": "Meta",
      "family": "Llama",
      "version": "3.1",
      "parameters": "405B",
      "contextLength": 128000,
      "status": "AVAILABLE"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### Example 2: Filter by Provider and Language
**Request:**
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models?provider=OpenAI&language=hi' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Response:**
```json
{
  "data": [
    {
      "id": "gpt4-uuid",
      "name": "GPT-4",
      "provider": "OpenAI",
      "languages": ["en", "es", "fr", "de", "hi", "zh", "ja", "ar"],
      "status": "AVAILABLE"
    },
    {
      "id": "gpt4-turbo-uuid",
      "name": "GPT-4 Turbo",
      "provider": "OpenAI",
      "languages": ["en", "es", "fr", "de", "hi", "zh", "ja", "ar"],
      "status": "AVAILABLE"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### Example 3: Get Model Details
**Request:**
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "GPT-4 Turbo",
  "provider": "OpenAI",
  "family": "GPT",
  "version": "4.0-turbo",
  "parameters": "175B",
  "contextLength": 128000,
  "languages": ["en", "es", "fr", "de", "hi", "zh", "ja", "ar"],
  "quantizationSupport": ["FP32", "FP16"],
  "minimumVram": 16,
  "recommendedVram": 32,
  "license": "Proprietary",
  "description": "Optimized GPT-4 with 128K context window and improved performance",
  "capabilities": [
    "text-generation",
    "conversation",
    "code-generation",
    "reasoning",
    "long-context"
  ],
  "status": "AVAILABLE",
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

## ❌ ERROR HANDLING

### Error Response Format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error Type"
}
```

### Common Error Codes:

#### 400 Bad Request
Invalid query parameters or malformed request.
```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
Missing or invalid JWT token.
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
Insufficient permissions.
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

#### 404 Not Found
Model not found.
```json
{
  "statusCode": 404,
  "message": "Model not found",
  "error": "Not Found"
}
```

#### 500 Internal Server Error
Server error.
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 🔍 QUERY PARAMETERS REFERENCE

### Status Values:
- `AVAILABLE` - Model is ready to use
- `COMING_SOON` - Model will be available soon
- `DISABLED` - Model is disabled
- `EXPERIMENTAL` - Model is experimental
- `DEPRECATED` - Model is deprecated

### Sort Fields:
- `name` - Model name
- `provider` - Provider name
- `family` - Model family
- `contextLength` - Context window size
- `parameters` - Parameter count
- `createdAt` - Creation timestamp (default)
- `updatedAt` - Last update timestamp

### Sort Order:
- `asc` - Ascending order
- `desc` - Descending order (default)

### Language Codes:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `hi` - Hindi
- `zh` - Chinese
- `ja` - Japanese
- `ar` - Arabic
- `it` - Italian

---

## 📊 RESPONSE SCHEMAS

### AIModel Schema:
```typescript
{
  id: string                    // UUID
  name: string                  // Model name
  provider: string              // Provider name
  family: string                // Model family
  version: string               // Version string
  parameters: string | null     // Parameter count (e.g., "175B")
  contextLength: number | null  // Context window size
  languages: string[] | null    // Supported languages
  quantizationSupport: string[] | null // Quantization formats
  minimumVram: number | null    // Minimum VRAM in GB
  recommendedVram: number | null // Recommended VRAM in GB
  license: string | null        // License type
  description: string | null    // Full description
  capabilities: string[] | null // Model capabilities
  modelSize: bigint | null      // Model size in bytes
  status: AIModelStatus         // Current status
  isActive: boolean             // Active flag
  metadata: object | null       // Additional metadata
  createdBy: string | null      // Creator
  updatedBy: string | null      // Last updater
  createdAt: DateTime           // Creation timestamp
  updatedAt: DateTime           // Last update timestamp
}
```

### Pagination Schema:
```typescript
{
  page: number        // Current page number
  limit: number       // Items per page
  total: number       // Total items
  totalPages: number  // Total pages
}
```

### Provider Schema:
```typescript
{
  name: string        // Provider name
  modelCount: number  // Number of models
}
```

### Family Schema:
```typescript
{
  family: string      // Family name
  provider: string    // Provider name
  modelCount: number  // Number of models
}
```

### Statistics Schema:
```typescript
{
  total: number                // Total models
  available: number            // Available models
  comingSoon: number           // Coming soon models
  experimental: number         // Experimental models
  providers: number            // Total providers
  languages: number            // Total languages
  providerList: Provider[]     // Provider list with counts
  languageList: string[]       // Language codes (sorted)
}
```

---

## 🧪 TESTING WITH CURL

### 1. List All Models:
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 2. Search Models:
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models?search=GPT' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 3. Filter by Provider:
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models?provider=OpenAI' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 4. Get Model Details:
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models/MODEL_UUID' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 5. Get Statistics:
```bash
curl -X GET \
  'http://localhost:3000/api/ai-agent/ai-models/statistics/summary' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 📚 SWAGGER DOCUMENTATION

Interactive API documentation is available at:
```
http://localhost:3000/api/docs
```

Swagger UI provides:
- ✅ Interactive API testing
- ✅ Complete request/response examples
- ✅ Schema documentation
- ✅ Authentication testing
- ✅ Try it out functionality

---

## 🔗 RELATED ENDPOINTS

### Authentication:
- `POST /api/auth/login` - Get JWT token
- `POST /api/auth/refresh` - Refresh token

### User Management:
- `GET /api/users/me` - Get current user
- `GET /api/users/:id/permissions` - Get user permissions

---

## 📞 SUPPORT

For API issues or questions:
- Check Swagger docs: `/api/docs`
- Review error messages in response
- Verify JWT token is valid
- Check RBAC permissions
- Ensure correct Content-Type header

---

**Generated:** January 2025  
**API Version:** 1.0.0  
**Status:** Production Ready ✅
