# 👋 START HERE - Phase 1.4 + 1.5
## AI Calling Agent Backend - Quick Start Guide

---

## 🚀 Get Started in 3 Steps

### Step 1: Run Setup Script ⏱️ 5 minutes

```powershell
.\scripts\setup.ps1
```

This will automatically:
- ✅ Install all dependencies
- ✅ Configure environment
- ✅ Setup database
- ✅ Seed sample data
- ✅ Build API

### Step 2: Start the API Server

```powershell
npm run dev:api
```

### Step 3: Test It Works

Open in your browser:
```
http://localhost:3001/api/docs
```

**That's it! You're done! 🎉**

---

## 🔐 Login Credentials

Use these to test the API:

```
Email:    admin@callingagent.local
Password: Admin@123
```

---

## 📚 What You Need

Before running setup:

- ✅ **Node.js** v18.0.0+ ([Download](https://nodejs.org/))
- ✅ **MySQL** v8.0+ ([Download](https://dev.mysql.com/downloads/))
- ✅ **Git** (for cloning)

Check your versions:
```powershell
node --version    # Should be 18.0.0+
npm --version     # Should be 9.0.0+
mysql --version   # Should be 8.0+
```

---

## 🗄️ MySQL Setup (If Needed)

If you need to create the database:

```sql
# Open MySQL
mysql -u root -p

# Run these commands
CREATE DATABASE ai_calling_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Then update `.env` with your MySQL password.

---

## ✅ Verify Everything Works

```powershell
# Run verification
.\scripts\verify.ps1
```

---

## 🧪 Test the API

### Method 1: Use Swagger UI (Easiest)

1. Open http://localhost:3001/api/docs
2. Click "Authorize" button
3. Use POST /auth/login to get token
4. Paste token in authorization
5. Test any endpoint!

### Method 2: Use PowerShell

```powershell
# Login
$body = @{
    email = "admin@callingagent.local"
    password = "Admin@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"

# Show token
$response.data.tokens.accessToken
```

---

## 📖 Documentation

### Quick References

| Document | Purpose |
|----------|---------|
| `QUICK_START_COMMANDS.md` | All commands you need |
| `PHASE_1.4_1.5_README.md` | Complete feature guide |
| `SETUP_GUIDE.md` | Detailed setup instructions |
| `DELIVERY_SUMMARY.md` | What was delivered |

### Swagger Documentation

**Best documentation**: http://localhost:3001/api/docs

- Interactive testing
- All endpoints documented
- Request/response examples
- Try-it-out functionality

---

## 🔧 Common Commands

```powershell
# Start API in development
npm run dev:api

# Build for production
npm run build:api

# View database (GUI)
cd database\prisma
npx prisma studio

# Re-seed database
cd database\prisma
npx prisma db seed

# Run migrations
cd database\prisma
npx prisma migrate dev
```

---

## 🚨 Having Issues?

### Issue: "Cannot connect to MySQL"

**Fix:**
1. Make sure MySQL is running
2. Check your `.env` file has correct password
3. Create database: `CREATE DATABASE ai_calling_agent;`

### Issue: "Port 3001 already in use"

**Fix:**
Change in `.env`:
```env
API_PORT=3002
```

### Issue: "Prisma Client not found"

**Fix:**
```powershell
cd database\prisma
npx prisma generate
```

### Issue: Something else?

Check `SETUP_GUIDE.md` → Troubleshooting section

---

## 🎯 What You Get

After setup completes, you'll have:

✅ **Working API** on http://localhost:3001/api/v1  
✅ **Swagger Docs** on http://localhost:3001/api/docs  
✅ **Database** with sample data  
✅ **Authentication** with JWT tokens  
✅ **4 User Roles** (Super Admin, Admin, Manager, Viewer)  
✅ **52 Permissions** for fine-grained access control  
✅ **Production-Ready** security and architecture  

---

## 🎓 Learn More

### Database Schema

Check `database/prisma/schema.prisma` to see:
- 17 production models
- All relationships
- Indexes and constraints

### API Endpoints

Current endpoints:
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user
- `POST /api/v1/auth/register` - Register new user

More endpoints in Swagger!

### Default Users

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@callingagent.local | Admin@123 |
| Admin | admin.user@callingagent.local | Admin@123 |
| Manager | manager@callingagent.local | Manager@123 |
| Viewer | viewer@callingagent.local | Viewer@123 |

---

## 🏗️ Project Structure

```
Ai_calling_agent/
├── apps/api/          # NestJS API
├── database/prisma/   # Database schema & migrations
├── scripts/           # Setup & verification scripts
├── .env               # Your configuration
└── docs/              # Documentation (this file!)
```

---

## 🎉 Success Criteria

You're ready when:

- [x] API starts without errors
- [x] Swagger UI loads
- [x] You can login
- [x] You can see your user data

If all above work → **YOU'RE DONE!** 🎊

---

## 🚀 Next Steps

### 1. Explore the API

- Open Swagger UI
- Test different endpoints
- Try different user roles
- Check permissions

### 2. View the Database

```powershell
cd database\prisma
npx prisma studio
```

Opens GUI at http://localhost:5555

### 3. Read the Code

- Check `apps/api/src/modules/auth` for authentication
- Check `database/prisma/schema.prisma` for database
- Check `apps/api/src/main.ts` for API setup

### 4. Customize

- Add your MySQL credentials in `.env`
- Change JWT secrets for production
- Modify CORS origins
- Update company info in seed

---

## 💡 Pro Tips

1. **Use Swagger UI** for testing - it's the easiest way
2. **Keep the API running** - it hot-reloads on code changes
3. **Check Prisma Studio** - great for viewing database
4. **Read the seed script** - see how data is structured
5. **Use verify script** - confirms everything is working

---

## 📞 Need Help?

### Resources

1. **Swagger UI**: http://localhost:3001/api/docs
2. **Documentation**: Check all `.md` files
3. **Schema**: `database/prisma/schema.prisma`
4. **Example Data**: `database/prisma/seed.ts`

### Common Questions

**Q: Where are the API endpoints?**  
A: Check Swagger UI at http://localhost:3001/api/docs

**Q: How do I add new users?**  
A: Use POST /auth/register or add to seed.ts

**Q: How do I change roles/permissions?**  
A: Check seed.ts for examples, then use Prisma

**Q: Where are logs?**  
A: Console output + ActivityLog table in database

**Q: Can I use this in production?**  
A: Yes! Just update secrets in `.env`

---

## ✨ Features Delivered

### Authentication ✅
- JWT tokens (access + refresh)
- Login, logout, register
- Password hashing
- Token refresh

### Authorization ✅
- 4 predefined roles
- 52 granular permissions
- Role-based access
- Permission-based access

### Database ✅
- 17 production models
- Complete relationships
- Soft delete
- Audit fields
- Sample data

### Security ✅
- Helmet security headers
- CORS configuration
- Input validation
- Password hashing
- JWT tokens

### Documentation ✅
- Swagger UI
- Setup guides
- Code comments
- README files

---

## 🎯 What's Next?

After you're comfortable with Phase 1.4 + 1.5:

**Phase 2** will add:
- 🤖 AI Conversation Engine
- 🎙️ Voice Processing
- 📞 Telephony Integration
- 📊 Real-time Analytics
- 🔊 Text-to-Speech
- 👂 Speech-to-Text

**Good news**: No changes needed to Phase 1.4 + 1.5!

---

## 🎊 You're All Set!

If the API is running and Swagger UI loads, you're ready to:

✅ **Develop** - Add features  
✅ **Test** - Try the API  
✅ **Deploy** - Go to production  
✅ **Integrate** - Add Phase 2  

---

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                   HAPPY CODING! 🚀                            ║
║                                                                ║
║              Your backend is ready to power                    ║
║             amazing AI calling experiences!                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

**Made with ❤️ using NestJS, Prisma, MySQL, and TypeScript**

**Questions?** Check the other documentation files!

**Ready?** Run `.\scripts\setup.ps1` now! 🎉
