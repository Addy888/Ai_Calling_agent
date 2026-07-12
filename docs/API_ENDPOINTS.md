# API Endpoints Documentation

Base URL: `http://localhost:3001/api/v1`

## Authentication

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@aicallingagent.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@aicallingagent.com",
      "firstName": "System",
      "lastName": "Administrator"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
}
```

### POST /auth/register
Register a new user.

### POST /auth/refresh
Refresh access token using refresh token.

## Users

### GET /users
Get all users (paginated).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional)
- `sortBy` (string, optional)
- `sortOrder` (asc|desc, default: desc)

**Headers:**
```
Authorization: Bearer <access-token>
```

### GET /users/:id
Get user by ID.

### POST /users
Create a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "companyId": "company-uuid",
  "isActive": true
}
```

### PATCH /users/:id
Update user details.

### DELETE /users/:id
Soft delete a user.

### POST /users/:id/roles
Assign role to user.

### DELETE /users/:id/roles/:roleId
Remove role from user.

## Roles

### GET /roles
Get all roles.

### GET /roles/:id
Get role by ID.

### POST /roles
Create a new role.

### PATCH /roles/:id
Update role.

### DELETE /roles/:id
Delete role.

## Companies

### GET /companies
Get all companies.

### GET /companies/:id
Get company by ID.

### POST /companies
Create a new company.

### PATCH /companies/:id
Update company.

### DELETE /companies/:id
Delete company.

## Campaigns

### GET /campaigns
Get all campaigns.

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder`
- `status` (optional): DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED

### GET /campaigns/:id
Get campaign by ID.

### POST /campaigns
Create a new campaign.

**Request Body:**
```json
{
  "name": "Summer Promotion",
  "description": "Promotional campaign for summer sales",
  "scriptId": "script-uuid",
  "promptId": "prompt-uuid",
  "voiceId": "voice-uuid",
  "startDate": "2026-07-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "timezone": "America/New_York"
}
```

### PATCH /campaigns/:id
Update campaign.

### DELETE /campaigns/:id
Delete campaign.

## Contacts

### GET /contacts
Get all contacts.

### GET /contacts/:id
Get contact by ID.

### POST /contacts
Create a new contact.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "company": "Acme Corp",
  "position": "CEO",
  "timezone": "America/New_York"
}
```

### PATCH /contacts/:id
Update contact.

### DELETE /contacts/:id
Delete contact.

### POST /contacts/import/csv
Import contacts from CSV file.

**Request:**
- Content-Type: multipart/form-data
- Field: file (CSV file)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "imported": 95,
    "skipped": 5,
    "errors": [
      { "row": 10, "error": "Duplicate phone number" }
    ]
  }
}
```

### POST /contacts/import/excel
Import contacts from Excel file.

## Scripts

### GET /scripts
Get all scripts.

### GET /scripts/:id
Get script by ID.

### POST /scripts
Create a new script.

**Request Body:**
```json
{
  "name": "Customer Service Script",
  "language": "en",
  "description": "Standard customer service script",
  "content": "Hello, this is {{agent_name}} from {{company_name}}...",
  "version": "1.0.0"
}
```

### PATCH /scripts/:id
Update script.

### DELETE /scripts/:id
Delete script.

## Prompts

### GET /prompts
Get all prompts.

### GET /prompts/:id
Get prompt by ID.

### POST /prompts
Create a new prompt.

**Request Body:**
```json
{
  "name": "Customer Service Prompt",
  "description": "AI prompt for customer service",
  "content": "You are a helpful customer service agent...",
  "version": "1.0.0",
  "status": "ACTIVE"
}
```

### PATCH /prompts/:id
Update prompt.

### DELETE /prompts/:id
Delete prompt.

## Knowledge Base

### GET /knowledge-base
Get all knowledge base entries.

**Query Parameters:**
- `type` (optional): FAQ, POLICY, PRICING, DOCUMENTATION, WEBSITE, CUSTOM
- `category` (optional)

### GET /knowledge-base/:id
Get knowledge base entry by ID.

### POST /knowledge-base
Create knowledge base entry.

**Request Body:**
```json
{
  "title": "Product Pricing",
  "type": "PRICING",
  "content": "Our pricing starts at $99/month...",
  "category": "Sales",
  "tags": ["pricing", "sales"]
}
```

### PATCH /knowledge-base/:id
Update knowledge base entry.

### DELETE /knowledge-base/:id
Delete knowledge base entry.

## Voice Profiles

### GET /voice-profiles
Get all voice profiles.

### GET /voice-profiles/:id
Get voice profile by ID.

### POST /voice-profiles
Create voice profile.

### PATCH /voice-profiles/:id
Update voice profile.

### DELETE /voice-profiles/:id
Delete voice profile.

## Calls (Placeholder for Phase 2)

### GET /calls
Get all calls.

### GET /calls/:id
Get call by ID.

## Analytics

### GET /analytics
Get analytics data.

### GET /analytics/dashboard
Get dashboard statistics.

## Settings

### GET /settings
Get all settings.

### GET /settings/:key
Get setting by key.

### POST /settings
Create setting.

### PATCH /settings/:id
Update setting.

## Response Format

All API endpoints follow this response format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-07-11T10:00:00.000Z",
  "path": "/api/v1/users",
  "method": "POST",
  "message": "Validation failed",
  "error": { /* error details */ }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": {
    "data": [ /* items */ ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access-token>
```

## Rate Limiting

Currently no rate limiting is implemented (Phase 1).

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## Interactive Documentation

For interactive API documentation with try-it-out functionality, visit:
**http://localhost:3001/api/docs**

---

Last Updated: July 11, 2026
