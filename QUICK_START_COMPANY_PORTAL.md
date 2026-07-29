# Quick Start Guide - Company Portal

## ✅ Implementation Status: COMPLETE

All Company User Panel modules are built and functional!

## 🚀 How to Test

### Step 1: Start the Application

Open **TWO** terminal windows:

#### Terminal 1 - API Server
```bash
cd apps/api
npm run start:dev
```
Wait until you see: `Application is running on: http://localhost:3001`

#### Terminal 2 - Web Application
```bash
cd apps/web
npm run dev
```
Wait until you see: `- Local: http://localhost:3000`

### Step 2: Test Super Admin Portal

1. Open browser: http://localhost:3000/login
2. Login with Super Admin:
   - **Email**: admin@aicallingagent.com
   - **Password**: Admin@123
3. ✅ Should redirect to: http://localhost:3000/dashboard
4. ✅ Should see **Blue theme** sidebar
5. ✅ Should see ALL modules including:
   - Companies
   - Runtime Monitor
   - Runtime Config
   - Platform Settings

### Step 3: Test Company Portal

1. Logout from Super Admin
2. Login with Company Admin:
   - **Email**: company@aicallingagent.com
   - **Password**: Admin@123
3. ✅ Should redirect to: http://localhost:3000/company
4. ✅ Should see **Green theme** sidebar
5. ✅ Should see ONLY these modules:
   - Dashboard
   - Contacts
   - Campaigns
   - Scripts
   - Prompts
   - Knowledge Base
   - AI Agents
   - Call History
   - Analytics
   - Settings

### Step 4: Verify Data Isolation

**In Company Portal**, try these actions:

1. **Dashboard** → Should show company-specific stats
2. **Contacts** → Create a new contact
3. **Campaigns** → View campaigns (should be empty initially)
4. **Scripts** → Create a new script
5. **Analytics** → View analytics dashboard

**Logout and login as Super Admin**, verify:
- Super Admin can see data from all companies
- Company Admin data is visible to Super Admin

## 🎨 Visual Differences

### Super Admin Panel (`/dashboard`)
- **Color**: Blue (#3B82F6)
- **Logo**: Blue gradient phone icon
- **Title**: "AI Calling Agent" with "Enterprise Platform" subtitle
- **Navigation**: 15+ modules including platform management

### Company Portal (`/company`)
- **Color**: Green (#16A34A)
- **Logo**: Green gradient phone icon
- **Title**: "Company Portal" with "AI Calling Platform" subtitle
- **Navigation**: 10 operational modules only

## 📋 Available Modules

### ✅ Company Portal Modules (Visible)

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/company` | Stats overview with quick actions |
| Contacts | `/company/contacts` | Manage contact database |
| Campaigns | `/company/campaigns` | Create and run campaigns |
| Scripts | `/company/scripts` | Call script management |
| Prompts | `/company/prompts` | AI prompt templates |
| Knowledge Base | `/company/knowledge-base` | Document library |
| AI Agents | `/company/ai-agents` | Voice agent configuration |
| Call History | `/company/calls` | Call logs and recordings |
| Analytics | `/company/analytics` | Performance metrics |
| Settings | `/company/settings` | Company preferences |

### ❌ Hidden from Company Portal

These are **ONLY** in Super Admin Panel:
- Companies
- Runtime Monitor
- Runtime Config
- Platform Settings
- Global Analytics
- User Management (platform-wide)

## 🔐 Test Accounts

### Super Admin
```
Email: admin@aicallingagent.com
Password: Admin@123
Portal: /dashboard (Blue theme)
```

### Company Admin
```
Email: company@aicallingagent.com
Password: Admin@123
Portal: /company (Green theme)
```

## 🧪 Testing Checklist

### Authentication & Routing
- [ ] Super admin redirects to `/dashboard`
- [ ] Company admin redirects to `/company`
- [ ] Unauthenticated users redirect to `/login`
- [ ] Logout works from both portals

### UI/UX
- [ ] Super Admin panel shows blue theme
- [ ] Company portal shows green theme
- [ ] Sidebar toggles correctly
- [ ] Mobile menu works on small screens
- [ ] Active route is highlighted
- [ ] User dropdown shows correct info

### Navigation
- [ ] All 10 company modules accessible
- [ ] Company modules hidden from company portal
- [ ] All admin modules accessible in super admin
- [ ] Direct URL access respects permissions

### Data Operations
- [ ] Create contact in company portal
- [ ] View campaigns list
- [ ] Create new script
- [ ] Edit prompt template
- [ ] View analytics dashboard
- [ ] Update settings

### Data Isolation
- [ ] Company users only see their data
- [ ] Super admin sees all companies' data
- [ ] API automatically filters by companyId
- [ ] Cannot access other companies' resources

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│             Login Page                      │
│         /login (Role Detection)             │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐    ┌─────▼────┐
    │ Super    │    │ Company  │
    │ Admin    │    │ Admin    │
    └────┬─────┘    └─────┬────┘
         │                │
    ┌────▼─────────┐ ┌────▼──────────┐
    │  /dashboard  │ │   /company    │
    │  (Blue)      │ │   (Green)     │
    │              │ │               │
    │ All Modules  │ │ 10 Modules    │
    │ + Platform   │ │ (Operations)  │
    │   Features   │ │               │
    └──────────────┘ └───────────────┘
```

## 🔄 API Integration

All API calls automatically filter by company:

```typescript
// Frontend - No companyId needed
await api.get('/contacts');

// Backend - Auto-filtered
GET /api/contacts
Authorization: Bearer <JWT with companyId>
↓
Service filters: WHERE companyId = user.companyId
```

## 📁 File Structure

```
apps/web/src/app/
├── login/
│   └── page.tsx              ← Role-based routing
│
├── dashboard/                ← Super Admin Panel
│   ├── layout.tsx           (Blue theme)
│   ├── page.tsx
│   └── [all modules]/
│
└── company/                  ← Company Portal
    ├── layout.tsx           (Green theme)
    ├── page.tsx             (Enhanced dashboard)
    ├── contacts/
    ├── campaigns/
    ├── scripts/
    ├── prompts/
    ├── knowledge-base/
    ├── ai-agents/
    ├── calls/
    ├── analytics/
    └── settings/
```

## 🎯 Key Features

### 1. Zero Code Duplication
Each company module uses export pattern:
```typescript
export { default } from '@/app/dashboard/[module]/page';
```

### 2. Automatic Data Filtering
- JWT token contains `companyId`
- API guards extract user context
- Services auto-filter all queries
- No manual filtering needed

### 3. Role-Based Access
- Database: 5 roles (super-admin, company-admin, admin, manager, viewer)
- Seed: Creates both test accounts
- Permissions: 78 total, company-admin has 74

### 4. Responsive Design
- Mobile-friendly sidebar
- Collapsible navigation
- Touch-optimized controls
- Responsive grid layouts

## 🐛 Troubleshooting

### Issue: Can't login
**Solution**: Ensure API server is running on port 3001

### Issue: Redirects to wrong portal
**Solution**: Check user roles in database:
```bash
cd database
npx prisma studio
# Navigate to Users → Check roles
```

### Issue: Cannot see data
**Solution**: Verify companyId in JWT token and user record

### Issue: Module pages show errors
**Solution**: Ensure all dependencies installed:
```bash
cd apps/web
npm install
```

### Issue: Permission denied
**Solution**: Run seed again to ensure permissions:
```bash
cd database
npx ts-node prisma/seed.ts
```

## 📊 Database Schema

### Relevant Tables
- `companies` - Company records
- `users` - User accounts with companyId
- `roles` - User roles (super-admin, company-admin, etc.)
- `permissions` - Granular permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission mappings

### Key Relationships
```
Company (1) ──→ (Many) Users
User (Many) ──→ (Many) Roles
Role (Many) ──→ (Many) Permissions
```

## 🚦 Next Steps

### Immediate Testing
1. ✅ Start both servers
2. ✅ Login with both accounts
3. ✅ Verify routing works
4. ✅ Test each module
5. ✅ Verify data isolation

### Future Enhancements
- [ ] Add more companies via Super Admin
- [ ] Create additional company users
- [ ] Implement role hierarchy
- [ ] Add company-specific settings
- [ ] Create billing integration
- [ ] Add usage limits/quotas
- [ ] Implement audit logs
- [ ] Add team management

## 💡 Pro Tips

1. **Multi-Company Testing**: Create more companies via Super Admin panel
2. **Role Testing**: Use Super Admin to assign different roles
3. **Data Isolation**: Create test data in one company, verify invisible to others
4. **Mobile Testing**: Test on mobile devices or browser dev tools
5. **Performance**: Monitor API response times with company filtering

## 📞 Support

If you encounter any issues:
1. Check this guide's troubleshooting section
2. Review `COMPANY_PORTAL_COMPLETE.md` for detailed architecture
3. Check browser console for errors
4. Verify API logs for backend errors
5. Ensure database seed ran successfully

## ✨ Success Criteria

Your implementation is working correctly if:

✅ Super Admin logs into blue-themed dashboard
✅ Company Admin logs into green-themed company portal  
✅ Company portal shows only 10 operational modules
✅ Company users cannot access platform management features
✅ Data is automatically filtered by companyId
✅ All CRUD operations work in company portal
✅ UI is responsive on mobile devices
✅ Role-based routing happens automatically

---

**🎉 The Company User Panel is ready to use!**

Start testing with the credentials above and verify all functionality.
