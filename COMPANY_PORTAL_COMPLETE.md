# Company Portal Implementation - Complete

## Overview
A complete, separate Company User Panel has been created alongside the existing Super Admin Panel. The implementation includes role-based routing, data isolation, and all required modules.

## Architecture

### 1. Dual Portal System
- **Super Admin Panel**: `/dashboard` (Blue theme) - Platform-wide management
- **Company Portal**: `/company` (Green theme) - Company-specific operations

### 2. Role-Based Routing
Login automatically routes users based on their role:
```typescript
// In login/page.tsx
if (roles.includes('super-admin')) {
  router.push('/dashboard');
} else if (roles.includes('company-admin') || roles.includes('admin') || roles.includes('manager')) {
  router.push('/company');
}
```

### 3. Data Isolation
- All API calls automatically filter by `companyId` from JWT token
- Company users only see their company's data
- No backend duplication - reuses existing services

## Test Accounts

### Super Admin Account
- **Email**: admin@aicallingagent.com
- **Password**: Admin@123
- **Access**: Full platform access at `/dashboard`

### Company Admin Account
- **Email**: company@aicallingagent.com
- **Password**: Admin@123
- **Access**: Company-specific access at `/company`

## Company Portal Structure

### Layout Components
1. **CompanyLayout** (`apps/web/src/app/company/layout.tsx`)
   - Green-themed interface
   - Authentication check
   - Responsive sidebar and header
   - Mobile-friendly navigation

2. **CompanySidebar** (`apps/web/src/components/layout/company-sidebar.tsx`)
   - Limited to 10 company-relevant modules
   - Green accent colors
   - Collapsible design
   - Active route highlighting

3. **CompanyHeader** (`apps/web/src/components/layout/company-header.tsx`)
   - User profile dropdown
   - Company name display
   - Notification bell
   - Mobile menu toggle

### Dashboard Page
**Location**: `apps/web/src/app/company/page.tsx`

**Features**:
- Statistics cards (Campaigns, Contacts, Calls, Scripts)
- Quick action cards
- Getting started checklist
- Performance overview section
- Auto-loads company-specific data

### Company Portal Modules

All modules are at `/company/[module]` and reuse existing dashboard components:

1. **Dashboard** (`/company`)
   - Stats overview
   - Quick actions
   - Getting started guide

2. **Contacts** (`/company/contacts`)
   - View, create, edit, delete contacts
   - Import/export functionality
   - Bulk operations

3. **Campaigns** (`/company/campaigns`)
   - Campaign management
   - Create and launch campaigns
   - Monitor campaign status

4. **Scripts** (`/company/scripts`)
   - Call script library
   - Script editor
   - Version control

5. **Prompts** (`/company/prompts`)
   - AI prompt management
   - Prompt templates
   - Category organization

6. **Knowledge Base** (`/company/knowledge-base`)
   - Document management
   - FAQ and resources
   - Search functionality

7. **AI Agents** (`/company/ai-agents`)
   - Agent configuration
   - Voice profiles
   - Training data

8. **Call History** (`/company/calls`)
   - Call logs
   - Recordings
   - Transcripts

9. **Analytics** (`/company/analytics`)
   - Performance metrics
   - Charts and graphs
   - Export reports

10. **Settings** (`/company/settings`)
    - Company profile
    - User preferences
    - Integration settings

### Code Reuse Pattern

Each module page uses the export pattern to avoid duplication:

```typescript
// apps/web/src/app/company/[module]/page.tsx
// This page reuses the existing [module] page
// The API automatically filters by companyId from the JWT token
export { default } from '@/app/dashboard/[module]/page';
```

## Hidden from Company Portal

These modules are **NOT** accessible to company users:

1. **Companies** - Platform-level company management
2. **Runtime Monitor** - System monitoring
3. **Runtime Config** - System configuration
4. **Platform Settings** - Global platform settings
5. **Global Analytics** - Cross-company analytics
6. **User Management** - Platform-wide user administration

## Roles and Permissions

### Company Admin Role
**Slug**: `company-admin`

**Permissions**: All permissions except:
- Company management (`companies.*`)
- User management (`users.*`)
- Role management (`roles.*`)
- Permission management (`permissions.*`)

**Database**: Created in seed file with 74 permissions assigned

### Permission Modules Included
- Contacts (view, create, update, delete, import, export, bulk-update)
- Campaigns (view, create, update, delete, execute)
- Calls (view, create, update, delete)
- Scripts (view, create, update, delete)
- Prompts (view, create, update, delete)
- Knowledge Base (view, create, update, delete)
- Voice Profiles (view, create, update, delete)
- Analytics (view, export)
- Settings (view, update)
- Activity Logs (view, create, delete)
- Memory (read, write, create, update, delete)

## API Integration

### Automatic Company Filtering

All API endpoints automatically filter by `companyId`:

1. **JWT Token**: Contains user's `companyId`
2. **API Guards**: Extract `companyId` from token
3. **Services**: Filter queries by `companyId`
4. **No Changes Needed**: Existing APIs work automatically

### Example API Flow
```typescript
// Frontend (no companyId needed in request)
const response = await api.get('/contacts');

// Backend automatically adds companyId filter
const contacts = await this.contactService.findAll({
  companyId: user.companyId, // From JWT
  ...filters
});
```

## Design Differences

### Super Admin Panel (Blue Theme)
- Primary color: Blue (`#3B82F6`)
- Full system access
- Platform-wide features
- Multi-company management

### Company Portal (Green Theme)
- Primary color: Green (`#16A34A`)
- Company-scoped access
- Operational features
- Single company context

## File Structure

```
apps/web/src/
├── app/
│   ├── company/                    # Company Portal
│   │   ├── layout.tsx             # Green-themed layout
│   │   ├── page.tsx               # Dashboard with stats
│   │   ├── ai-agents/
│   │   ├── analytics/
│   │   ├── calls/
│   │   ├── campaigns/
│   │   ├── contacts/
│   │   ├── knowledge-base/
│   │   ├── profile/
│   │   ├── prompts/
│   │   ├── scripts/
│   │   └── settings/
│   │
│   ├── dashboard/                  # Super Admin Panel
│   │   ├── layout.tsx             # Blue-themed layout
│   │   ├── page.tsx               # Admin dashboard
│   │   └── [all modules]
│   │
│   └── login/
│       └── page.tsx               # Role-based routing
│
└── components/
    └── layout/
        ├── company-sidebar.tsx    # Company navigation
        ├── company-header.tsx     # Company header
        ├── sidebar.tsx            # Admin navigation
        └── header.tsx             # Admin header
```

## Testing Checklist

### 1. Authentication and Routing
- [ ] Login with super admin → redirects to `/dashboard`
- [ ] Login with company admin → redirects to `/company`
- [ ] Logout works correctly from both portals
- [ ] Protected routes require authentication

### 2. Super Admin Panel
- [ ] All modules accessible
- [ ] Can view all companies
- [ ] Blue theme applied
- [ ] No company filtering (sees all data)

### 3. Company Portal
- [ ] All 10 modules accessible
- [ ] Company modules hidden (Companies, Runtime Monitor, etc.)
- [ ] Green theme applied
- [ ] Only sees own company's data

### 4. Data Isolation
- [ ] Company user A cannot see Company user B's data
- [ ] Contacts filtered by companyId
- [ ] Campaigns filtered by companyId
- [ ] Calls filtered by companyId
- [ ] Scripts filtered by companyId
- [ ] All resources properly scoped

### 5. CRUD Operations
- [ ] Create contact (company portal)
- [ ] Update campaign (company portal)
- [ ] Delete script (company portal)
- [ ] View analytics (company portal)
- [ ] All operations respect company boundaries

### 6. UI/UX
- [ ] Sidebar collapse works
- [ ] Mobile menu works
- [ ] Active route highlighting
- [ ] Notifications display
- [ ] User dropdown functional
- [ ] Responsive design on mobile/tablet

### 7. Permissions
- [ ] Company admin has correct permissions
- [ ] Cannot access forbidden modules
- [ ] Can perform allowed operations
- [ ] Permission checks enforced

## Next Steps

### Immediate (Already Complete)
- ✅ Create company portal structure
- ✅ Add role-based routing
- ✅ Create test accounts
- ✅ Implement all module pages
- ✅ Add company-admin role with permissions

### Testing Phase (Current)
1. Run the application:
   ```bash
   # Terminal 1: Start API
   cd apps/api
   npm run start:dev
   
   # Terminal 2: Start Web
   cd apps/web
   npm run dev
   ```

2. Test with both accounts:
   - Super Admin: admin@aicallingagent.com / Admin@123
   - Company Admin: company@aicallingagent.com / Admin@123

3. Verify:
   - Role-based routing works
   - Data isolation is enforced
   - All CRUD operations function
   - UI is responsive and themed correctly

### Future Enhancements
- [ ] Add company-specific settings
- [ ] Implement role hierarchy (admin > manager > user)
- [ ] Add team management within company
- [ ] Create company-specific dashboards
- [ ] Add usage limits and quotas
- [ ] Implement billing integration
- [ ] Add audit logs per company
- [ ] Create company onboarding flow

## Technical Notes

### No Backend Changes Required
The existing backend automatically handles company filtering through:
- JWT token containing `companyId`
- Auth guards extracting user context
- Service layer filtering by `companyId`
- Prisma queries with company scope

### Component Reuse Strategy
Using export pattern for maximum code reuse:
- No duplicate component code
- Shared business logic
- Consistent UI/UX
- Easy maintenance

### Performance Considerations
- Lazy loading for module pages
- API response caching
- Optimistic UI updates
- Efficient query filtering

## Support

### Common Issues

**Issue**: Login redirects to wrong portal
**Solution**: Check user roles in database, verify JWT token

**Issue**: Cannot see data in company portal
**Solution**: Verify companyId in user record, check API filters

**Issue**: Permission denied errors
**Solution**: Check role permissions, ensure company-admin has correct permissions

### Database Management

**Reset seed**:
```bash
cd database
npx prisma migrate reset
npx ts-node prisma/seed.ts
```

**Check user roles**:
```sql
SELECT u.email, r.name, r.slug 
FROM users u
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id;
```

**Check permissions**:
```sql
SELECT r.name, p.name, p.slug 
FROM roles r
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE r.slug = 'company-admin';
```

## Conclusion

The Company Portal is fully implemented and ready for testing. The architecture ensures:

1. **Separation of Concerns**: Super Admin and Company portals are independent
2. **Data Security**: Automatic company-level data isolation
3. **Code Efficiency**: Maximum reuse through export pattern
4. **Scalability**: Easy to add more companies and users
5. **Maintainability**: Single source of truth for business logic

Test with the provided accounts and verify all functionality works as expected.
