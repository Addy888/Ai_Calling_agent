# 🚀 Quick Start Commands - AI Calling Agent
## Phase 1.4 + 1.5: Database & Authentication

---

## 📋 Prerequisites Check

```powershell
# Check Node.js version (should be 18.0.0+)
node --version

# Check npm version (should be 9.0.0+)
npm --version

# Check MySQL (should be installed and running)
mysql --version
```

---

## ⚡ One-Command Setup

```powershell
# Run automated setup script
.\scripts\setup.ps1
```

This will:
- ✅ Install all dependencies
- ✅ Create .env file
- ✅ Generate Prisma client
- ✅ Run migrations
- ✅ Seed database
- ✅ Build API

---

## 🔧 Manual Setup (Step-by-Step)

### 1. Install Dependencies

```powershell
# Install root dependencies
npm install

# Install Prisma dependencies
cd database\prisma
npm install
cd ..\..
```

### 2. Configure Environment

```powershell
# Copy environment file
copy .env.example .env

# Edit .env with your MySQL credentials
notepad .env
```

Update `DATABASE_URL`:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ai_calling_agent"
```

### 3. Setup MySQL Database

```sql
# Open MySQL
mysql -u root -p

# Create database
CREATE DATABASE ai_calling_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional but recommended)
CREATE USER 'ai_calling_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON ai_calling_agent.* TO 'ai_calling_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Generate Prisma Client

```powershell
cd database\prisma
npx prisma generate
cd ..\..
```

### 5. Run Migrations

```powershell
cd database\prisma
npx prisma migrate dev --name init
cd ..\..
```

### 6. Seed Database

```powershell
cd database\prisma
npx prisma db seed
cd ..\..
```

### 7. Build API

```powershell
npm run build:api
```

---

## 🎯 Start Development

```powershell
# Start API server in development mode
npm run dev:api
```

**API will be available at:**
- **API Endpoint**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs

---

## 🧪 Test the API

### Test 1: Health Check (via Browser)

Open in browser:
```
http://localhost:3001/api/docs
```

You should see the Swagger UI.

### Test 2: Login Request

```powershell
# Using PowerShell
$body = @{
    email = "admin@callingagent.local"
    password = "Admin@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"

$response | ConvertTo-Json
```

### Test 3: Get Current User

```powershell
# Replace YOUR_ACCESS_TOKEN with token from login response
$token = "YOUR_ACCESS_TOKEN"

$headers = @{
    Authorization = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers $headers

$response | ConvertTo-Json
```

---

## 📚 Database Commands

### View Database with Prisma Studio

```powershell
cd database\prisma
npx prisma studio
```

Opens GUI at http://localhost:5555

### Generate Prisma Client

```powershell
cd database\prisma
npx prisma generate
```

### Create New Migration

```powershell
cd database\prisma
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations (Production)

```powershell
cd database\prisma
npx prisma migrate deploy
```

### Reset Database (⚠️ DANGER: Deletes all data)

```powershell
cd database\prisma
npx prisma migrate reset
```

### Re-seed Database

```powershell
cd database\prisma
npx prisma db seed
```

---

## 🔄 Common Development Tasks

### Restart API Server

```powershell
# Stop with Ctrl+C, then:
npm run dev:api
```

### Check for Errors

```powershell
# Lint code
npm run lint

# Format code
npm run format
```

### Build for Production

```powershell
# Build API
npm run build:api

# Start in production mode
cd apps\api
npm run start:prod
```

---

## 🧪 API Testing with cURL (Alternative)

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@callingagent.local\",\"password\":\"Admin@123\"}"
```

### Get Current User

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

### Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

---

## 📊 Verify Installation

```powershell
# Run verification script
.\scripts\verify.ps1
```

This checks:
- ✅ Node.js installed
- ✅ npm installed
- ✅ .env file exists
- ✅ Dependencies installed
- ✅ Prisma client generated
- ✅ Database schema exists
- ✅ Seed script exists
- ✅ Auth modules exist
- ✅ Guards exist
- ✅ Decorators exist

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@callingagent.local | Admin@123 |
| **Admin** | admin.user@callingagent.local | Admin@123 |
| **Manager** | manager@callingagent.local | Manager@123 |
| **Viewer** | viewer@callingagent.local | Viewer@123 |

---

## 🛠️ Troubleshooting

### Problem: "Cannot connect to MySQL"

**Solution:**
1. Check MySQL is running: `mysql -u root -p`
2. Verify DATABASE_URL in `.env`
3. Create database if missing:
   ```sql
   CREATE DATABASE ai_calling_agent;
   ```

### Problem: "Prisma Client not generated"

**Solution:**
```powershell
cd database\prisma
npx prisma generate
```

### Problem: "Port 3001 already in use"

**Solution:**
Change port in `.env`:
```env
API_PORT=3002
```

### Problem: "JWT token invalid"

**Solution:**
1. Login again to get new token
2. Or use refresh token endpoint
3. Check JWT_SECRET in `.env` matches

### Problem: "Migration failed"

**Solution:**
```powershell
cd database\prisma
npx prisma migrate reset  # ⚠️ Deletes all data
npx prisma migrate dev
npx prisma db seed
```

---

## 📁 Useful File Locations

```
Project Root/
├── .env                          # Environment configuration
├── database/
│   └── prisma/
│       ├── schema.prisma         # Database schema
│       ├── seed.ts               # Seed script
│       └── migrations/           # Migration files
├── apps/api/src/
│   ├── main.ts                   # API entry point
│   ├── app.module.ts             # Root module
│   └── modules/auth/             # Authentication module
├── scripts/
│   ├── setup.ps1                 # Setup script
│   └── verify.ps1                # Verification script
└── PHASE_1.4_1.5_README.md       # Main documentation
```

---

## 🎯 Next Steps After Setup

1. **Explore Swagger UI**: http://localhost:3001/api/docs
2. **Test Authentication**: Login with default credentials
3. **View Database**: Use Prisma Studio (`npx prisma studio`)
4. **Read Documentation**: Check `PHASE_1.4_1.5_README.md`
5. **Review Schema**: Open `database/prisma/schema.prisma`

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| **Setup Everything** | `.\scripts\setup.ps1` |
| **Verify Setup** | `.\scripts\verify.ps1` |
| **Start API** | `npm run dev:api` |
| **View API Docs** | http://localhost:3001/api/docs |
| **Database GUI** | `cd database\prisma ; npx prisma studio` |
| **Re-seed DB** | `cd database\prisma ; npx prisma db seed` |
| **Generate Prisma** | `cd database\prisma ; npx prisma generate` |
| **Create Migration** | `cd database\prisma ; npx prisma migrate dev` |

---

## 🎉 Success!

If your API is running and you can:
- ✅ Access http://localhost:3001/api/docs
- ✅ Login with default credentials
- ✅ See Swagger documentation

**Then Phase 1.4 + 1.5 is COMPLETE!**

You're ready to proceed with Phase 2: AI Calling Implementation.

---

**Need Help?** Check `SETUP_GUIDE.md` for detailed instructions.
