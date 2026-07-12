# Phase 2 - Quick Start Guide

## 🚀 Getting Started with Phase 2 Backend

### Prerequisites
- Node.js 20+ installed
- MySQL 8+ running
- Dependencies installed

### 1. Install Dependencies (if not already done)
```bash
npm install --legacy-peer-deps
```

### 2. Setup Environment Variables
Create `.env` file in root:
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/ai_calling_agent"

# API
API_PORT=3001
API_PREFIX=api/v1
CORS_ORIGINS=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev
```

### 4. Seed Database (Optional)
```bash
npx prisma db seed
```

### 5. Start Backend Server
```bash
cd apps/api
npm run dev
```

Server will start on: **http://localhost:3001**

### 6. Access Swagger API Documentation
Open your browser: **http://localhost:3001/api/docs**

## 📋 Phase 2 New Features

### 1. Company Management
- **Endpoint**: `/api/v1/companies`
- **Features**: CRUD, Logo Upload, Settings
- **Try**: POST /companies to create a company

### 2. Role Management
- **Endpoint**: `/api/v1/roles`
- **Features**: CRUD, Permission Assignment
- **Try**: GET /roles/permissions to see all permissions

### 3. Contact Import
- **Endpoint**: `/api/v1/contacts/import/csv`
- **Features**: CSV/Excel Import with validation
- **Try**: Upload a CSV with headers: firstName, lastName, phone, email

### 4. Script Management
- **Endpoint**: `/api/v1/scripts`
- **Features**: CRUD, Version History
- **Try**: POST /scripts to create a call script

### 5. Prompt Management
- **Endpoint**: `/api/v1/prompts`
- **Features**: CRUD, Status Management
- **Try**: POST /prompts to create an AI prompt

### 6. Activity Logs (NEW!)
- **Endpoint**: `/api/v1/activity-logs`
- **Features**: Track all user actions
- **Try**: GET /activity-logs to see all activities

## 🔐 Authentication

### Login
```bash
POST /api/v1/auth/login
{
  "email": "admin@aicallingagent.com",
  "password": "Admin@123"
}
```

### Use Token
Add to headers:
```
Authorization: Bearer <your-access-token>
```

## 📁 Test Contact Import

### CSV Format
Create `contacts.csv`:
```csv
firstName,lastName,phone,email,company,position
John,Doe,+1234567890,john@example.com,Acme Corp,Manager
Jane,Smith,+1234567891,jane@example.com,Tech Inc,Director
```

### Import via Swagger
1. Go to http://localhost:3001/api/docs
2. Find POST /contacts/import/csv
3. Click "Try it out"
4. Upload your CSV file
5. Execute

### Import Response
```json
{
  "success": true,
  "data": {
    "total": 2,
    "imported": 2,
    "skipped": 0,
    "errors": []
  }
}
```

## 🧪 Testing Each Module

### 1. Test Company Management
```bash
# Create Company
POST /api/v1/companies
{
  "name": "Test Company",
  "email": "test@company.com",
  "phone": "+1234567890",
  "website": "https://testcompany.com"
}

# Upload Logo
POST /api/v1/companies/{id}/logo
(multipart/form-data with file)
```

### 2. Test Role Management
```bash
# Get All Permissions
GET /api/v1/roles/permissions

# Create Role
POST /api/v1/roles
{
  "name": "Campaign Manager",
  "slug": "campaign-manager",
  "description": "Manages campaigns"
}

# Assign Permissions
POST /api/v1/roles/{id}/permissions
{
  "permissionIds": ["uuid1", "uuid2"]
}
```

### 3. Test Contact Management
```bash
# Create Contact
POST /api/v1/contacts
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "companyId": "your-company-uuid"
}

# Bulk Delete
POST /api/v1/contacts/bulk-delete
{
  "contactIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 4. Test Campaign Management
```bash
# Create Campaign
POST /api/v1/campaigns
{
  "name": "Summer Campaign",
  "description": "Summer sales outreach",
  "companyId": "company-uuid",
  "userId": "user-uuid",
  "status": "DRAFT"
}

# Update Status
PATCH /api/v1/campaigns/{id}
{
  "status": "ACTIVE"
}
```

### 5. Test Activity Logs
```bash
# Get All Logs
GET /api/v1/activity-logs

# Filter by Module
GET /api/v1/activity-logs?module=campaigns

# Filter by User
GET /api/v1/activity-logs/user/{userId}
```

## 📊 Available Modules

| Module | Endpoint | Status |
|--------|----------|--------|
| Companies | `/companies` | ✅ Complete |
| Users | `/users` | ✅ Complete |
| Roles | `/roles` | ✅ Complete |
| Contacts | `/contacts` | ✅ Complete |
| Campaigns | `/campaigns` | ✅ Complete |
| Scripts | `/scripts` | ✅ Complete |
| Prompts | `/prompts` | ✅ Complete |
| Knowledge Base | `/knowledge-base` | ✅ Structure |
| Voice Profiles | `/voice-profiles` | ✅ Placeholder |
| Activity Logs | `/activity-logs` | ✅ Complete |
| Analytics | `/analytics` | ✅ Placeholder |

## 🐛 Troubleshooting

### Build Errors
```bash
# Clean and rebuild
cd apps/api
rm -rf dist
npm run build
```

### Database Connection
```bash
# Test database connection
npx prisma db push
```

### Port Already in Use
Change API_PORT in `.env` file

## 📚 Next Steps

1. ✅ Backend is complete and running
2. ⏭️ Start frontend development (Phase 2.1)
3. ⏭️ Integrate frontend with backend APIs
4. ⏭️ Test end-to-end workflows

## 🎯 Quick Validation

Run these commands to validate Phase 2:

```bash
# 1. Build backend
cd apps/api && npm run build

# 2. Start backend
npm run dev

# 3. Check Swagger docs
# Open: http://localhost:3001/api/docs

# 4. Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aicallingagent.com","password":"Admin@123"}'
```

## ✅ Success Criteria

You'll know Phase 2 is working when:
- ✅ Backend compiles without errors
- ✅ Server starts on port 3001
- ✅ Swagger UI loads successfully
- ✅ Can login and get JWT token
- ✅ Can create companies
- ✅ Can create roles
- ✅ Can import contacts via CSV
- ✅ Can view activity logs

---

**Phase 2 Backend is Ready for Development! 🚀**
