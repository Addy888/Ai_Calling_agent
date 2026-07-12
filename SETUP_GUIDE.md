# AI Calling Agent - Setup Guide
## Phase 1.4 + 1.5: Database & Authentication

This guide will walk you through setting up the complete backend with Prisma, MySQL, JWT Authentication, and RBAC.

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL**: v8.0 or higher
- **Git**: Latest version

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install Prisma dependencies
cd database/prisma
npm install
cd ../..

# Install API dependencies
cd apps/api
npm install
cd ../..
```

### 2. Setup MySQL Database

Create a new MySQL database:

```sql
CREATE DATABASE ai_calling_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ai_calling_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON ai_calling_agent.* TO 'ai_calling_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the `.env` file with your MySQL credentials:

```env
# Database
DATABASE_URL="mysql://ai_calling_user:YourSecurePassword123!@localhost:3306/ai_calling_agent"

# API
API_PORT=3001
API_HOST=localhost
API_PREFIX=api/v1

# JWT (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-use-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production-use-64-chars
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
NODE_ENV=development
```

### 4. Generate Prisma Client

```bash
cd database/prisma
npx prisma generate
cd ../..
```

### 5. Run Database Migrations

```bash
cd database/prisma
npx prisma migrate dev --name init
cd ../..
```

### 6. Seed the Database

```bash
cd database/prisma
npx prisma db seed
cd ../..
```

You should see output like:

```
🌱 Starting database seeding...
✅ Created 52 permissions
✅ Created Super Admin role with all permissions
✅ Created Admin role with management permissions
✅ Created Manager role with campaign permissions
✅ Created Viewer role with read-only permissions
✅ Created company: AI Calling Agent Inc.
✅ Created Super Admin: admin@callingagent.local / Admin@123
✅ Created Admin: admin.user@callingagent.local / Admin@123
✅ Created Manager: manager@callingagent.local / Manager@123
✅ Created Viewer: viewer@callingagent.local / Viewer@123
```

### 7. Start the API Server

```bash
npm run dev:api
```

The API will be available at:
- **API Endpoint**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs

---

## 🔐 Default Login Credentials

### Super Administrator
- **Email**: `admin@callingagent.local`
- **Password**: `Admin@123`
- **Access**: Full system access with all permissions

### Administrator
- **Email**: `admin.user@callingagent.local`
- **Password**: `Admin@123`
- **Access**: Administrative access without user management

### Manager
- **Email**: `manager@callingagent.local`
- **Password**: `Manager@123`
- **Access**: Campaign and contact management

### Viewer
- **Email**: `viewer@callingagent.local`
- **Password**: `Viewer@123`
- **Access**: Read-only access

---

## 🧪 Testing the API

### 1. Test Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@callingagent.local",
    "password": "Admin@123"
  }'
```

### 2. Get Current User

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Swagger UI

Open http://localhost:3001/api/docs in your browser and use the "Authorize" button to test authenticated endpoints.

---

## 📊 Database Schema

### Core Models

1. **Company** - Multi-tenant organization
2. **User** - System users
3. **Role** - User roles (Super Admin, Admin, Manager, Viewer)
4. **Permission** - Granular permissions
5. **Campaign** - Calling campaigns
6. **Contact** - Contact database
7. **Script** - Call scripts
8. **Prompt** - AI prompts
9. **KnowledgeBase** - Knowledge articles
10. **VoiceProfile** - Voice profiles
11. **Call** - Call records
12. **CallTranscript** - Call transcripts
13. **CallRecording** - Call recordings
14. **Analytics** - Analytics data
15. **Setting** - System settings
16. **ActivityLog** - Audit logs

### Common Fields

All models include:
- `id` (UUID)
- `status` (string)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime?) - For soft delete
- `createdBy` (string?)
- `updatedBy` (string?)

---

## 🔒 Security Features

### Authentication
- **JWT Tokens**: Access token (15m) + Refresh token (7d)
- **Password Hashing**: bcrypt with 10 rounds
- **Token Storage**: Refresh tokens stored in database
- **Token Refresh**: Automatic token rotation

### Authorization
- **RBAC**: Role-Based Access Control
- **Permissions**: Granular permission system
- **Guards**: JWT Guard, Roles Guard, Permissions Guard
- **Decorators**: @Public(), @Roles(), @Permissions()

### API Security
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Validation**: class-validator DTOs
- **Rate Limiting**: Coming in next phase

---

## 🛠️ Useful Commands

### Prisma Commands

```bash
# Generate Prisma Client
cd database/prisma && npx prisma generate

# Create migration
cd database/prisma && npx prisma migrate dev --name migration_name

# Run migrations
cd database/prisma && npx prisma migrate deploy

# Seed database
cd database/prisma && npx prisma db seed

# Reset database (WARNING: Deletes all data)
cd database/prisma && npx prisma migrate reset

# Open Prisma Studio
cd database/prisma && npx prisma studio
```

### Development Commands

```bash
# Start API in dev mode
npm run dev:api

# Build API
npm run build:api

# Start API in production mode
npm run start:prod --workspace=apps/api

# Format code
npm run format

# Lint code
npm run lint
```

---

## 📁 Project Structure

```
ai-calling-agent/
├── apps/
│   └── api/
│       └── src/
│           ├── common/
│           │   ├── decorators/
│           │   │   ├── current-user.decorator.ts
│           │   │   ├── permissions.decorator.ts
│           │   │   ├── public.decorator.ts
│           │   │   └── roles.decorator.ts
│           │   ├── guards/
│           │   │   ├── jwt-auth.guard.ts
│           │   │   ├── permissions.guard.ts
│           │   │   └── roles.guard.ts
│           │   ├── filters/
│           │   ├── interceptors/
│           │   └── prisma/
│           ├── modules/
│           │   ├── auth/
│           │   ├── users/
│           │   ├── roles/
│           │   ├── companies/
│           │   └── ... (other modules)
│           ├── app.module.ts
│           └── main.ts
├── database/
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── package.json
└── .env
```

---

## 🔧 Troubleshooting

### MySQL Connection Issues

1. **Check MySQL is running**:
   ```bash
   mysql -u root -p
   ```

2. **Verify database exists**:
   ```sql
   SHOW DATABASES;
   ```

3. **Check user permissions**:
   ```sql
   SHOW GRANTS FOR 'ai_calling_user'@'localhost';
   ```

### Prisma Issues

1. **Clear Prisma cache**:
   ```bash
   cd database/prisma
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

2. **Reset database**:
   ```bash
   cd database/prisma
   npx prisma migrate reset
   ```

### JWT Issues

1. **Token expired**: Get a new token using refresh endpoint
2. **Invalid token**: Check JWT_SECRET matches in .env
3. **Missing token**: Include Authorization header with Bearer token

---

## 🎯 Next Steps

After completing this setup:

1. ✅ API server running on port 3001
2. ✅ MySQL database configured and seeded
3. ✅ Authentication working with JWT
4. ✅ RBAC system configured
5. ✅ Swagger documentation available

### Ready for Phase 2:
- AI Integration
- Voice Processing
- Telephony Integration
- Real-time Call Handling

---

## 📞 Support

For issues or questions:
- Check the Swagger documentation at http://localhost:3001/api/docs
- Review the DELIVERY_SUMMARY.md file
- Check the PROJECT_STRUCTURE.md file

---

## ⚠️ Important Notes

### Production Deployment

Before deploying to production:

1. **Change all secrets** in `.env`:
   - Generate strong JWT_SECRET (min 32 characters)
   - Generate strong JWT_REFRESH_SECRET (min 64 characters)
   - Use strong database password

2. **Update CORS origins** to your production domains

3. **Set NODE_ENV** to `production`

4. **Enable SSL/TLS** for MySQL connections

5. **Set up proper backup** strategy for database

6. **Configure proper logging** and monitoring

7. **Review security headers** in Helmet configuration

---

## ✅ Verification Checklist

- [ ] MySQL installed and running
- [ ] Database created
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] Prisma client generated
- [ ] Migrations executed
- [ ] Database seeded
- [ ] API server started
- [ ] Login successful
- [ ] Swagger docs accessible
- [ ] JWT authentication working
- [ ] RBAC permissions working

---

**Setup Complete! 🎉**

Your AI Calling Agent backend is now ready for development.
