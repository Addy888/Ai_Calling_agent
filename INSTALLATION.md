# Installation Guide - AI Calling Agent Platform

## Complete Step-by-Step Installation

This guide will walk you through the complete installation process for the AI Calling Agent Platform Phase 1.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Installation Steps](#installation-steps)
4. [Database Configuration](#database-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

## System Requirements

### Required Software

| Software | Minimum Version | Recommended Version |
|----------|----------------|---------------------|
| Node.js | 18.0.0 | 20.x.x (LTS) |
| npm | 9.0.0 | 10.x.x |
| MySQL | 8.0 | 8.0+ |
| Git | 2.0+ | Latest |

### System Resources

- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 2GB free space
- **OS:** Windows 10/11, macOS 10.15+, or Linux

## Pre-Installation Checklist

Before you begin, ensure you have:

- [ ] Node.js and npm installed
- [ ] MySQL server installed and running
- [ ] Git installed
- [ ] Terminal/Command Prompt access
- [ ] Text editor (VS Code recommended)
- [ ] MySQL admin credentials

### Verify Installations

Run these commands to verify your setup:

```bash
node --version     # Should show v18.0.0 or higher
npm --version      # Should show v9.0.0 or higher
mysql --version    # Should show 8.0 or higher
git --version      # Should show 2.0 or higher
```

## Installation Steps

### Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd /path/to/your/projects

# Clone the repository
git clone <repository-url>

# Navigate into the project
cd ai-calling-agent
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root, web, api, and packages)
npm install
```

This will take a few minutes. The process installs:
- Root workspace dependencies
- Next.js frontend dependencies
- NestJS backend dependencies
- Shared package dependencies

**Expected Output:**
```
added XXX packages in XXs
```

### Step 3: Database Setup

#### 3.1 Create Database

**Using MySQL CLI:**

```bash
mysql -u root -p
```

Then in MySQL prompt:

```sql
CREATE DATABASE ai_calling_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**Or using a single command:**

```bash
mysql -u root -p -e "CREATE DATABASE ai_calling_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 3.2 Verify Database Creation

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'ai_calling_agent';"
```

You should see:
```
+----------------------------+
| Database (ai_calling_agent)|
+----------------------------+
| ai_calling_agent           |
+----------------------------+
```

### Step 4: Environment Configuration

#### 4.1 Create Root Environment File

```bash
cp .env.example .env
```

**Edit `.env` file:**

```env
# Database Configuration
DATABASE_URL="mysql://YOUR_MYSQL_USER:YOUR_MYSQL_PASSWORD@localhost:3306/ai_calling_agent"

# API Configuration
API_PORT=3001
API_HOST=localhost
API_PREFIX=api/v1

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.csv,.xlsx,.pdf,.docx

# Storage
STORAGE_PATH=./storage

# Logging
LOG_LEVEL=debug
```

**Important:** Replace `YOUR_MYSQL_USER` and `YOUR_MYSQL_PASSWORD` with your actual MySQL credentials.

#### 4.2 Create Frontend Environment File

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

**Edit `apps/web/.env.local` file:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Step 5: Generate Prisma Client

```bash
npm run db:generate
```

**Expected Output:**
```
✔ Generated Prisma Client
```

### Step 6: Run Database Migrations

```bash
npm run db:migrate
```

This creates all database tables based on the Prisma schema.

**Expected Output:**
```
Your database is now in sync with your schema.
```

### Step 7: Seed Database

```bash
npm run db:seed
```

This populates the database with:
- Default company
- Admin, Manager, and Agent roles
- Permissions
- Admin user
- Sample data

**Expected Output:**
```
🌱 Starting database seed...
✅ Company created: AI Calling Agent
✅ Roles created: Admin, Manager, Agent
✅ 24 permissions created
✅ Admin role permissions assigned
✅ Admin user created: admin@aicallingagent.com
✅ Admin role assigned to admin user
✅ Sample script created
✅ Sample prompt created
✅ Sample knowledge base entries created

🎉 Database seeding completed successfully!

📝 Admin Credentials:
   Email: admin@aicallingagent.com
   Password: Admin@123
```

## Running the Application

### Option 1: Run Both (Recommended for Development)

```bash
npm run dev
```

This starts both frontend and backend concurrently.

**Expected Output:**
```
> concurrently "npm run dev:web" "npm run dev:api"

[web] ▲ Next.js 15.1.3
[web] - Local: http://localhost:3000
[api] 🚀 AI Calling Agent API is running on: http://localhost:3001
[api] 📚 API Documentation: http://localhost:3001/api/docs
```

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev:web
```

## Verification

### 1. Check Backend

Visit: http://localhost:3001/api/v1

You should see: "Cannot GET /api/v1" (this is expected)

### 2. Check API Documentation

Visit: http://localhost:3001/api/docs

You should see the Swagger API documentation interface.

### 3. Check Frontend

Visit: http://localhost:3000

You should be redirected to: http://localhost:3000/login

### 4. Test Login

On the login page, use:
```
Email: admin@aicallingagent.com
Password: Admin@123
```

After login, you should see the dashboard.

### 5. Verify Database Tables

```bash
mysql -u root -p -e "USE ai_calling_agent; SHOW TABLES;"
```

You should see 19 tables:
- companies
- users
- roles
- permissions
- user_roles
- role_permissions
- refresh_tokens
- campaigns
- contacts
- scripts
- prompts
- knowledge_base
- voice_profiles
- calls
- call_transcripts
- call_recordings
- analytics
- settings
- activity_logs

## Troubleshooting

### Issue: Database Connection Failed

**Error:** `Error: P1001: Can't reach database server`

**Solution:**
1. Verify MySQL is running:
   ```bash
   # Windows
   net start MySQL80
   
   # macOS
   brew services start mysql
   
   # Linux
   sudo systemctl start mysql
   ```

2. Verify credentials in `.env` file
3. Test connection:
   ```bash
   mysql -u YOUR_USER -p -e "SELECT 1;"
   ```

### Issue: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
1. Change port in `.env`:
   ```env
   API_PORT=3002
   ```

2. Update `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
   ```

3. Or kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3001 | xargs kill -9
   ```

### Issue: Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npm run db:generate
```

### Issue: Migration Failed

**Error:** Migration errors during `db:migrate`

**Solution:**
```bash
# Reset database (CAUTION: Deletes all data)
cd database/prisma
npx prisma migrate reset

# Then run seed again
cd ../..
npm run db:seed
```

### Issue: npm install Fails

**Error:** Various npm install errors

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json apps/web/node_modules apps/api/node_modules

# Reinstall
npm install
```

### Issue: Frontend Build Errors

**Error:** Next.js build or runtime errors

**Solution:**
```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Rebuild
npm run build:web
```

### Issue: Module Not Found Errors

**Error:** Cannot resolve '@/...' modules

**Solution:**
1. Verify `tsconfig.json` paths configuration
2. Restart the development server
3. Restart your IDE/editor

## Post-Installation Steps

1. **Change Default Credentials**
   - Login and immediately change admin password
   - Create new admin accounts
   - Disable or delete default admin if needed

2. **Configure JWT Secrets**
   - Generate strong, random secrets for production
   - Use at least 32 characters
   - Never commit secrets to git

3. **Setup Company Details**
   - Update company information
   - Add logo
   - Configure settings

4. **Create Users**
   - Add team members
   - Assign appropriate roles
   - Configure permissions

5. **Import Contacts**
   - Prepare contact CSV/Excel files
   - Import contacts
   - Verify import results

## Development Workflow

```bash
# Start development
npm run dev

# Run database studio (visual database browser)
npm run db:studio

# View API documentation
# Visit: http://localhost:3001/api/docs

# Run linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Need More Help?

- 📖 [Full Documentation](./README.md)
- 🛠️ [Development Guide](./docs/DEVELOPMENT_GUIDE.md)
- 🔌 [API Reference](./docs/API_ENDPOINTS.md)
- 🚀 [Quick Start](./QUICK_START.md)

## Success Checklist

After installation, verify:

- [ ] Backend running on http://localhost:3001
- [ ] Frontend running on http://localhost:3000
- [ ] API docs accessible at http://localhost:3001/api/docs
- [ ] Database tables created (19 tables)
- [ ] Can login with admin credentials
- [ ] Dashboard loads successfully
- [ ] Can navigate to different pages
- [ ] No console errors

---

**🎉 Congratulations! Your AI Calling Agent Platform is now installed and running!**

Start exploring the dashboard and building amazing features!
