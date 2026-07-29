# Portal Comparison: Super Admin vs Company Portal

## Side-by-Side Comparison

| Feature | Super Admin Portal | Company Portal |
|---------|-------------------|----------------|
| **Route** | `/dashboard` | `/company` |
| **Theme Color** | 🔵 Blue (#3B82F6) | 🟢 Green (#16A34A) |
| **Logo** | Blue gradient phone icon | Green gradient phone icon |
| **Title** | "AI Calling Agent" | "Company Portal" |
| **Subtitle** | "Enterprise Platform" | "AI Calling Platform" |
| **Access Level** | Platform-wide | Company-scoped |
| **Test Account** | admin@aicallingagent.com | company@aicallingagent.com |

## Module Access Matrix

| Module | Super Admin | Company Portal | Notes |
|--------|-------------|----------------|-------|
| **Dashboard** | ✅ Yes | ✅ Yes | Different content |
| **Contacts** | ✅ Yes | ✅ Yes | Company-filtered |
| **Campaigns** | ✅ Yes | ✅ Yes | Company-filtered |
| **Scripts** | ✅ Yes | ✅ Yes | Company-filtered |
| **Prompts** | ✅ Yes | ✅ Yes | Company-filtered |
| **Knowledge Base** | ✅ Yes | ✅ Yes | Company-filtered |
| **AI Agents** | ✅ Yes | ✅ Yes | Company-filtered |
| **Call History** | ✅ Yes | ✅ Yes | Company-filtered |
| **Analytics** | ✅ Yes | ✅ Yes | Company-filtered |
| **Settings** | ✅ Yes | ✅ Yes | Company-filtered |
| **Companies** | ✅ Yes | ❌ No | Platform management |
| **Users** | ✅ Yes | ❌ No | Platform management |
| **Roles** | ✅ Yes | ❌ No | Platform management |
| **Permissions** | ✅ Yes | ❌ No | Platform management |
| **Runtime Monitor** | ✅ Yes | ❌ No | System monitoring |
| **Runtime Config** | ✅ Yes | ❌ No | System configuration |
| **Platform Settings** | ✅ Yes | ❌ No | Global settings |
| **Global Analytics** | ✅ Yes | ❌ No | Cross-company metrics |

## Navigation Comparison

### Super Admin Sidebar (15+ Modules)
```
📊 Dashboard
👥 Users
🏢 Companies
👤 Roles & Permissions
📞 Contacts
📣 Campaigns
📜 Scripts
💬 Prompts
📚 Knowledge Base
🤖 AI Agents
📱 Call History
📊 Analytics
📈 Global Analytics
🖥️ Runtime Monitor
⚙️ Runtime Config
🔧 Platform Settings
⚙️ Settings
```

### Company Portal Sidebar (10 Modules)
```
📊 Dashboard
📞 Contacts
📣 Campaigns
📜 Scripts
💬 Prompts
📚 Knowledge Base
🤖 AI Agents
📱 Call History
📊 Analytics
⚙️ Settings
```

## Dashboard Comparison

### Super Admin Dashboard
- **Purpose**: Platform monitoring and management
- **Metrics**: All companies combined
- **Actions**: Create companies, manage platform
- **Widgets**:
  - Total companies count
  - All users across platform
  - Platform-wide call volume
  - System health metrics
  - Revenue/billing dashboard
  - License management

### Company Portal Dashboard
- **Purpose**: Operational overview for company
- **Metrics**: Single company only
- **Actions**: Create campaigns, manage contacts
- **Widgets**:
  - Total campaigns (company)
  - Total contacts (company)
  - Total calls (company)
  - Scripts count (company)
  - Quick action cards
  - Getting started checklist
  - Performance overview

## Data Visibility

### Super Admin Can See:
```
All Companies
  └── Company A
      ├── Users (Company A)
      ├── Contacts (Company A)
      ├── Campaigns (Company A)
      └── ... (all data)
  └── Company B
      ├── Users (Company B)
      ├── Contacts (Company B)
      ├── Campaigns (Company B)
      └── ... (all data)
```

### Company Admin Can See:
```
My Company Only
  └── Company A
      ├── Contacts (Company A only)
      ├── Campaigns (Company A only)
      ├── Scripts (Company A only)
      └── ... (company data)
      
❌ Cannot see Company B data
❌ Cannot see platform-wide data
```

## Permission Comparison

### Super Admin Permissions (78 total)
- ✅ All user management
- ✅ All company management
- ✅ All role/permission management
- ✅ All operational features
- ✅ Platform configuration
- ✅ System monitoring
- ✅ Global analytics

### Company Admin Permissions (74 total)
- ❌ User management (platform)
- ❌ Company management
- ❌ Role/permission management (platform)
- ✅ Contacts (view, create, update, delete, import, export)
- ✅ Campaigns (view, create, update, delete, execute)
- ✅ Calls (view, create, update, delete)
- ✅ Scripts (view, create, update, delete)
- ✅ Prompts (view, create, update, delete)
- ✅ Knowledge Base (view, create, update, delete)
- ✅ AI Agents (view, create, update, delete)
- ✅ Analytics (view, export)
- ✅ Settings (view, update - company level)

## Use Case Scenarios

### Scenario 1: Platform Owner
**Role**: Super Admin  
**Portal**: `/dashboard`  
**Tasks**:
- Create new companies
- Monitor system health
- View global analytics
- Manage platform users
- Configure system settings
- Track revenue/billing

### Scenario 2: Real Estate Company
**Role**: Company Admin  
**Portal**: `/company`  
**Tasks**:
- Import property contact lists
- Create calling campaigns
- Design call scripts
- Train AI voice agents
- Monitor call performance
- Review analytics

### Scenario 3: SaaS Vendor
**Role**: Company Admin  
**Portal**: `/company`  
**Tasks**:
- Manage lead database
- Run outreach campaigns
- Create sales scripts
- Configure AI agents
- Track conversion rates
- Optimize campaigns

## Visual Theme Comparison

### Super Admin Portal (Blue Theme)
```css
Primary Color: #3B82F6 (Blue)
Accent Color: #2563EB (Dark Blue)
Background: Blue gradient
Active State: bg-blue-50 text-blue-700
Icon Color: text-blue-600
```

### Company Portal (Green Theme)
```css
Primary Color: #16A34A (Green)
Accent Color: #15803D (Dark Green)
Background: Green gradient
Active State: bg-green-50 text-green-700
Icon Color: text-green-600
```

## URL Structure

### Super Admin Portal
```
http://localhost:3000/dashboard
http://localhost:3000/dashboard/users
http://localhost:3000/dashboard/companies
http://localhost:3000/dashboard/contacts
http://localhost:3000/dashboard/campaigns
...
```

### Company Portal
```
http://localhost:3000/company
http://localhost:3000/company/contacts
http://localhost:3000/company/campaigns
http://localhost:3000/company/scripts
http://localhost:3000/company/prompts
...
```

## API Request Flow

### Super Admin Request
```
Frontend: GET /api/contacts
Header: Authorization: Bearer <super-admin-jwt>

Backend: 
- Extract user from JWT
- Check role: super-admin
- No company filter applied
- Return ALL contacts

Response: [Contact A1, Contact A2, Contact B1, Contact B2, ...]
```

### Company Admin Request
```
Frontend: GET /api/contacts
Header: Authorization: Bearer <company-admin-jwt>

Backend:
- Extract user from JWT
- Extract companyId from user
- Apply filter: WHERE companyId = user.companyId
- Return company contacts only

Response: [Contact A1, Contact A2]
```

## Security Model

### Super Admin
```
Authentication ✅
  └── Role Check: super-admin ✅
      └── Permission Check: ALL ✅
          └── Data Access: Platform-wide ✅
```

### Company Admin
```
Authentication ✅
  └── Role Check: company-admin ✅
      └── Permission Check: 74 permissions ✅
          └── Data Access: Company-scoped ✅
              └── Data Filter: companyId ✅
```

## Key Architectural Decisions

### 1. Separate Portals (Not Tabs)
✅ **Chosen**: Two separate portals with different URLs  
❌ **Not**: Single dashboard with tabs/toggles  
**Reason**: Clear separation, better UX, easier maintenance

### 2. Code Reuse via Export
✅ **Chosen**: Export existing components from dashboard  
❌ **Not**: Duplicate component code  
**Reason**: DRY principle, single source of truth, easier updates

### 3. Automatic Data Filtering
✅ **Chosen**: Backend auto-filters by companyId from JWT  
❌ **Not**: Frontend sends companyId in every request  
**Reason**: More secure, less error-prone, simpler frontend

### 4. Role-Based Routing
✅ **Chosen**: Login redirects based on role  
❌ **Not**: Manual portal selection  
**Reason**: Better UX, prevents confusion, enforces access control

## Migration Path

### Adding a New Company
1. Super Admin logs into `/dashboard`
2. Navigate to Companies module
3. Create new company
4. Create company admin user
5. Assign company-admin role
6. New user can access `/company` portal

### Converting Existing User
```sql
-- Assign company-admin role to existing user
INSERT INTO user_roles (userId, roleId)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'user@company.com'
AND r.slug = 'company-admin';
```

## Summary

| Aspect | Super Admin | Company Portal |
|--------|-------------|----------------|
| **Who** | Platform owners | Company users |
| **What** | Manage platform | Run operations |
| **Where** | `/dashboard` | `/company` |
| **Why** | System oversight | Business tasks |
| **How** | Full access | Scoped access |
| **Data** | All companies | Own company |
| **Theme** | 🔵 Blue | 🟢 Green |
| **Modules** | 15+ | 10 |

---

**The portals are completely independent but share the same backend services with automatic data filtering.**
