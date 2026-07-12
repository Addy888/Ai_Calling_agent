# 🚀 AI Calling Agent - Phase 1.4 + 1.5
## Database & Authentication - Complete Backend Foundation

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)]()
[![NestJS](https://img.shields.io/badge/NestJS-v10.3-red)]()
[![Prisma](https://img.shields.io/badge/Prisma-v5.8-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-blue)]()
[![MySQL](https://img.shields.io/badge/MySQL-v8.0-orange)]()

---

## 📖 Overview

This phase delivers a **complete, production-ready backend foundation** with enterprise-grade authentication, authorization, and database architecture.

### ✨ Key Features

- ✅ **Prisma ORM** with MySQL integration
- ✅ **Enterprise Database Schema** (15+ models, 60+ indexes)
- ✅ **JWT Authentication** with refresh token rotation
- ✅ **RBAC System** (4 roles, 52 granular permissions)
- ✅ **Permission-Based Authorization**
- ✅ **Production Security** (Helmet, CORS, bcrypt)
- ✅ **API Documentation** (Swagger/OpenAPI)
- ✅ **Database Seeding** with sample data
- ✅ **Soft Delete** on all major entities
- ✅ **Activity Logging** for audit trails

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Node.js v18.0.0+
- MySQL v8.0+
- npm v9.0.0+

### Installation

```powershell
# 1. Clone and navigate to project
cd Ai_calling_agent

# 2. Run automated setup
.\scripts\setup.ps1

# 3. Start the API server
npm run dev:api
```

That's it! The API will be running at http://localhost:3001/api/v1

### Verify Installation

```powershell
.\scripts\verify.ps1
```

---

## 🔐 Authentication

### Default Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Super Admin** | admin@callingagent.local | Admin@123 | All (52) |
| **Admin** | admin.user@callingagent.local | Admin@123 | Management |
| **Manager** | manager@callingagent.local | Manager@123 | Campaigns |
| **Viewer** | viewer@callingagent.local | Viewer@123 | Read-only |

### API Endpoints

```http
# Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@callingagent.local",
  "password": "Admin@123"
}

# Response
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "15m"
    }
  }
}

# Get Current User
GET /api/v1/auth/me
Authorization: Bearer <access_token>

# Refresh Token
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

# Logout
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

---

## 🗄️ Database Architecture

### Models (17 Tables)

1. **Company** - Multi-tenant organizations
2. **User** - System users with roles
3. **Role** - User roles (4 predefined)
4. **Permission** - Granular permissions (52 total)
5. **UserRole** - User-role mapping (N:M)
6. **RolePermission** - Role-permission mapping (N:M)
7. **RefreshToken** - JWT refresh tokens
8. **Campaign** - Calling campaigns
9. **Contact** - Contact database
10. **Script** - Call scripts
11. **Prompt** - AI prompts
12. **KnowledgeBase** - Knowledge articles
13. **VoiceProfile** - Voice configurations
14. **Call** - Call records
15. **CallTranscript** - Call transcriptions
16. **CallRecording** - Call recordings
17. **Analytics** - Analytics data
18. **Setting** - System settings
19. **ActivityLog** - Audit trail

### Entity Relationships

```
Company (1:N)
├── Users
├── Campaigns
│   └── Calls (1:N)
│       ├── Transcript (1:1)
│       └── Recording (1:1)
├── Contacts
├── Scripts
├── Prompts
├── KnowledgeBase
├── VoiceProfiles
├── Settings
└── ActivityLogs

User (N:M)
└── Roles
    └── Permissions (N:M)
```

### Common Fields (All Models)

```typescript
{
  id: string;          // UUID primary key
  status: string;      // ACTIVE, INACTIVE, etc.
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt: DateTime; // Soft delete
  createdBy: string;
  updatedBy: string;
}
```

---

## 🔒 Security Features

### Authentication & Authorization

- **JWT Tokens**: Short-lived access (15m) + long-lived refresh (7d)
- **Token Rotation**: Automatic refresh token rotation
- **Password Hashing**: bcrypt with 10 rounds
- **Role-Based Access**: 4 hierarchical roles
- **Permission-Based**: 52 granular permissions

### API Security

- **Helmet.js**: Security headers (CSP, XSS protection)
- **CORS**: Configurable allowed origins
- **Input Validation**: class-validator on all DTOs
- **Rate Limiting**: Ready for configuration
- **Soft Delete**: Data preservation with deletedAt

### Guards & Decorators

```typescript
// Guards
@UseGuards(JwtAuthGuard)           // Require authentication
@UseGuards(RolesGuard)             // Require specific roles
@UseGuards(PermissionsGuard)       // Require specific permissions

// Decorators
@Public()                          // Skip authentication
@Roles('super-admin', 'admin')     // Require roles
@Permissions('users.create')       // Require permissions
@CurrentUser()                     // Inject current user
```

---

## 📚 API Documentation

### Swagger UI

**URL**: http://localhost:3001/api/docs

Interactive API documentation with:
- All endpoints documented
- Request/response schemas
- Authentication integration
- Try-it-out functionality
- Example values

### Using Swagger

1. Open http://localhost:3001/api/docs
2. Click "Authorize" button
3. Login via `/auth/login` endpoint
4. Copy the `accessToken` from response
5. Paste token in authorization modal
6. Click "Authorize"
7. Test any protected endpoint

---

## 🛠️ Development

### Available Commands

```powershell
# Development
npm run dev:api           # Start API in watch mode
npm run dev               # Start both API and Web

# Build
npm run build:api         # Build API for production
npm run build             # Build all workspaces

# Database
cd database/prisma
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Create and apply migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma db seed        # Seed database
npx prisma studio         # Open Prisma Studio (GUI)
npx prisma migrate reset  # Reset database (WARNING: deletes data)

# Code Quality
npm run format            # Format with Prettier
npm run lint              # Lint with ESLint
```

### Project Structure

```
Ai_calling_agent/
├── apps/
│   └── api/
│       └── src/
│           ├── common/
│           │   ├── decorators/     # Custom decorators
│           │   ├── filters/        # Exception filters
│           │   ├── guards/         # Auth guards
│           │   ├── interceptors/   # Interceptors
│           │   └── prisma/         # Prisma module
│           ├── modules/
│           │   ├── auth/           # Authentication
│           │   ├── users/          # User management
│           │   ├── roles/          # Role management
│           │   ├── companies/      # Company management
│           │   └── ... (other modules)
│           ├── app.module.ts
│           └── main.ts
├── database/
│   └── prisma/
│       ├── schema.prisma           # Database schema
│       ├── seed.ts                 # Seed script
│       └── migrations/             # Migration files
├── scripts/
│   ├── setup.ps1                   # Automated setup
│   └── verify.ps1                  # Verification
└── .env                            # Environment variables
```

---

## 🧪 Testing

### Manual Testing

1. **Test Login**
```powershell
curl -X POST http://localhost:3001/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@callingagent.local\",\"password\":\"Admin@123\"}'
```

2. **Test Protected Endpoint**
```powershell
curl -X GET http://localhost:3001/api/v1/auth/me `
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Test Token Refresh**
```powershell
curl -X POST http://localhost:3001/api/v1/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}'
```

### Using Swagger UI

Best for interactive testing:
1. Navigate to http://localhost:3001/api/docs
2. Authenticate using the Authorize button
3. Test all endpoints with the "Try it out" feature

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file (or copy from `.env.example`):

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/ai_calling_agent"

# API Server
API_PORT=3001
API_HOST=localhost
API_PREFIX=api/v1

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-token-min-64-characters
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
NODE_ENV=development
```

### Production Configuration

⚠️ **Before deploying to production:**

1. **Generate Strong Secrets**
   ```powershell
   # Generate JWT_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate JWT_REFRESH_SECRET (64+ characters)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update Environment**
   - Set `NODE_ENV=production`
   - Use strong database password
   - Configure production CORS_ORIGINS
   - Enable SSL/TLS for MySQL

3. **Database**
   - Use connection pooling
   - Enable SSL/TLS
   - Set up automated backups
   - Configure replication (if needed)

---

## 🎯 Features Delivered

### ✅ Database & ORM

- [x] Prisma ORM configured
- [x] MySQL connection
- [x] 17 enterprise models
- [x] 60+ strategic indexes
- [x] 4 enums for type safety
- [x] Comprehensive relationships
- [x] Migration system
- [x] Seed scripts
- [x] Soft delete on all models

### ✅ Authentication

- [x] JWT with access + refresh tokens
- [x] Token rotation mechanism
- [x] Password hashing (bcrypt)
- [x] Login endpoint
- [x] Logout endpoint
- [x] Token refresh endpoint
- [x] Current user endpoint
- [x] Register endpoint

### ✅ Authorization

- [x] 4 predefined roles
- [x] 52 granular permissions
- [x] Role-based access control
- [x] Permission-based access control
- [x] JWT Auth Guard
- [x] Roles Guard
- [x] Permissions Guard
- [x] Custom decorators

### ✅ Security

- [x] Helmet security headers
- [x] CORS configuration
- [x] Password hashing
- [x] JWT token security
- [x] Input validation (class-validator)
- [x] Environment variables
- [x] Soft delete
- [x] Activity logging

### ✅ API Documentation

- [x] Swagger/OpenAPI configured
- [x] All endpoints documented
- [x] Authentication integration
- [x] Request/response schemas
- [x] Example values
- [x] Interactive testing

### ✅ Code Quality

- [x] TypeScript strict mode
- [x] ESLint configuration
- [x] Prettier formatting
- [x] SOLID principles
- [x] Clean architecture
- [x] Service pattern
- [x] Repository pattern (via Prisma)
- [x] No placeholder code
- [x] No TODO comments
- [x] Production ready

---

## 📊 Database Seeding

The seed script creates:

- **1 Company**: AI Calling Agent Inc.
- **4 Roles**: Super Admin, Admin, Manager, Viewer
- **52 Permissions**: Across 12 modules
- **4 Users**: One for each role
- **3 Contacts**: Sample contacts
- **1 Campaign**: Sample campaign
- **1 Script**: Sample call script
- **1 Prompt**: Sample AI prompt
- **1 Voice Profile**: Sample voice
- **1 Knowledge Base**: Sample article
- **2 Settings**: Sample configuration

Run seeding:
```powershell
cd database/prisma
npx prisma db seed
```

---

## 🔧 Troubleshooting

### MySQL Connection Failed

1. Check MySQL is running:
   ```powershell
   mysql -u root -p
   ```

2. Verify DATABASE_URL in `.env`

3. Create database if needed:
   ```sql
   CREATE DATABASE ai_calling_agent;
   ```

### Prisma Client Not Generated

```powershell
cd database/prisma
npx prisma generate
```

### Migration Failed

```powershell
cd database/prisma
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate dev
npx prisma db seed
```

### Port Already in Use

Change `API_PORT` in `.env` file:
```env
API_PORT=3002
```

### JWT Token Invalid

- Check JWT_SECRET matches in `.env`
- Ensure token not expired
- Use `/auth/refresh` to get new token

---

## 📈 Next Steps (Phase 2)

This foundation is ready for Phase 2 AI Calling features:

### Integration Points

1. **AI Integration**
   - Prompt model ready
   - Version tracking
   - Content management

2. **Voice Processing**
   - VoiceProfile model ready
   - Language support (en, hi, mr)
   - Gender configuration

3. **Telephony**
   - Call model ready
   - Status tracking
   - Recording storage
   - Transcript storage

4. **Real-time Features**
   - WebSocket ready to add
   - Event streaming ready
   - Live call monitoring

### No Breaking Changes

Phase 2 can be added WITHOUT modifying:
- Authentication system
- Authorization system
- Database schema (only additions)
- User management
- Company management
- Security layer

---

## 📞 Support & Documentation

### Documentation Files

- `SETUP_GUIDE.md` - Detailed setup instructions
- `PHASE_1.4_1.5_DELIVERY.md` - Complete delivery summary
- `PROJECT_STRUCTURE.md` - Project architecture
- `SWAGGER` - http://localhost:3001/api/docs

### Scripts

- `scripts/setup.ps1` - Automated setup
- `scripts/verify.ps1` - Verification script

---

## ✅ Production Readiness Checklist

- [x] Database schema designed and migrated
- [x] Authentication implemented and tested
- [x] Authorization (RBAC) implemented
- [x] Security headers configured
- [x] CORS configured
- [x] Input validation on all endpoints
- [x] Error handling implemented
- [x] Logging implemented
- [x] API documentation complete
- [x] Environment variables configured
- [x] No hardcoded secrets
- [x] No placeholder code
- [x] No TODO comments
- [x] Code follows SOLID principles
- [x] Clean architecture implemented
- [x] Compiles without errors
- [x] Ready for Phase 2 integration

---

## 🎉 Summary

**Phase 1.4 + 1.5 is COMPLETE and PRODUCTION READY!**

You now have:
- ✅ Robust database architecture (MySQL + Prisma)
- ✅ Secure authentication (JWT with refresh tokens)
- ✅ Granular authorization (RBAC + Permissions)
- ✅ Production security (Helmet, CORS, bcrypt)
- ✅ Complete API documentation (Swagger)
- ✅ Clean, maintainable codebase (SOLID, Clean Architecture)

**Ready for Phase 2: AI Calling Implementation**

---

**Built with** ❤️ **using NestJS, Prisma, and TypeScript**
