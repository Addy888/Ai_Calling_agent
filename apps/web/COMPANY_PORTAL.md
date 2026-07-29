# Company User Portal

## Overview
The Company User Portal is a separate dashboard for company users with role-based access control. It provides a focused interface for managing campaigns, contacts, and other resources specific to the logged-in company.

## Architecture

### Routing Strategy
- **Super Admin**: `/dashboard` (Blue theme)
- **Company Users**: `/company` (Green theme)

### Role-Based Login Flow
```typescript
Login → Check Role → Route
  ├─ super-admin → /dashboard (Super Admin Panel)
  └─ company-admin/admin/manager → /company (Company Portal)
```

### Data Isolation
- All API calls automatically filter by `companyId` from JWT token
- No backend changes required
- Existing services handle company-specific filtering
- Zero code duplication

## Features

### Visible Modules
1. **Dashboard** (`/company`)
   - Company statistics
   - Quick actions
   - Getting started guide

2. **Contacts** (`/company/contacts`)
   - Contact management
   - Import/Export
   - Company-specific contacts only

3. **Campaigns** (`/company/campaigns`)
   - Campaign CRUD operations
   - Status management
   - Company campaigns only

4. **Scripts** (`/company/scripts`)
   - Call script management
   - Version control
   - Company scripts only

5. **Prompts** (`/company/prompts`)
   - AI prompt management
   - Template library
   - Company prompts only

6. **Knowledge Base** (`/company/knowledge-base`)
   - Knowledge articles
   - FAQs and documentation
   - Company knowledge only

7. **AI Agents** (`/company/ai-agents`)
   - AI agent configuration
   - Agent performance
   - Company agents only

8. **Call History** (`/company/calls`)
   - Call records
   - Recordings and transcripts
   - Company calls only

9. **Analytics** (`/company/analytics`)
   - Performance metrics
   - Campaign analytics
   - Company data only

10. **Settings** (`/company/settings`)
    - Company preferences
    - User settings
    - Configuration

### Hidden Modules (Super Admin Only)
- Companies Management
- Runtime Monitor
- Runtime Config
- Platform Settings
- Global Analytics
- User Management (cross-company)
- Role Management
- Permission Management

## Implementation Details

### File Structure
```
apps/web/src/app/company/
├── layout.tsx                 # Company portal layout
├── page.tsx                   # Dashboard home
├── ai-agents/page.tsx         # AI agents (reused)
├── analytics/page.tsx         # Analytics (reused)
├── calls/page.tsx             # Call history (reused)
├── campaigns/page.tsx         # Campaigns (reused)
├── contacts/page.tsx          # Contacts (reused)
├── knowledge-base/page.tsx    # Knowledge base (reused)
├── prompts/page.tsx           # Prompts (reused)
├── scripts/page.tsx           # Scripts (reused)
└── settings/page.tsx          # Settings (reused)

apps/web/src/components/layout/
├── company-sidebar.tsx        # Company navigation
└── company-header.tsx         # Company header
```

### Page Reuse Pattern
Each company page uses a simple export pattern:
```typescript
// Example: apps/web/src/app/company/campaigns/page.tsx
export { default } from '@/app/dashboard/campaigns/page';
```

This ensures:
- Zero code duplication
- Automatic updates when dashboard pages change
- Consistent behavior across both panels
- Easy maintenance

### API Integration
The JWT token contains `companyId`, which is automatically used by all API endpoints:

```typescript
// Frontend (no changes needed)
const response = await api.get('/campaigns');

// Backend (automatic filtering)
// The JWT middleware extracts companyId and filters queries
```

## Security

### Authentication
- JWT-based authentication
- Token contains: `userId`, `email`, `companyId`, `roles[]`
- Automatic token refresh

### Authorization
- Role-based access control (RBAC)
- Company-level data isolation
- API-level permission checks

### Data Isolation
- All queries filtered by `companyId`
- No cross-company data leakage
- Enforced at API layer

## User Roles

### super-admin
- Full system access
- Access to Super Admin Panel (`/dashboard`)
- Can manage all companies
- Platform-wide settings

### company-admin
- Full access to company features
- Access to Company Portal (`/company`)
- Cannot access other companies
- Cannot manage platform settings

### admin
- Similar to company-admin
- Routed to Company Portal

### manager
- Campaign and contact management
- Routed to Company Portal
- Limited to company data

### viewer
- Read-only access
- Routed to Company Portal
- View-only permissions

## Testing

### Test Accounts

**Super Admin:**
```
Email: admin@aicallingagent.com
Password: Admin@123
Access: /dashboard
```

**Company Admin:**
```
Email: company@aicallingagent.com
Password: Admin@123
Access: /company
```

### Test Scenarios

1. **Role-Based Routing**
   - Login as super-admin → Should route to `/dashboard`
   - Login as company-admin → Should route to `/company`

2. **Data Isolation**
   - Create data as company-admin
   - Login as different company user
   - Verify data is not visible

3. **Navigation**
   - Verify Company Portal shows only allowed modules
   - Verify Super Admin Panel shows all modules

4. **API Filtering**
   - Check network tab
   - Verify all API calls return company-specific data only

## Deployment Checklist

- [ ] Run database seed to create roles and test users
- [ ] Verify JWT token contains companyId
- [ ] Test role-based routing
- [ ] Verify data isolation
- [ ] Test all CRUD operations
- [ ] Check responsive design
- [ ] Verify error handling
- [ ] Test logout and session management

## Future Enhancements

### Potential Additions
- Company branding customization
- White-label options
- Custom domain support
- Company-specific themes
- Multi-language support
- Advanced analytics
- Team collaboration features
- Webhook integrations

### Performance Optimizations
- Implement caching for company data
- Add pagination to all lists
- Lazy load dashboard widgets
- Optimize API queries
- Add request debouncing

## Maintenance

### Adding New Modules
To add a new module to the Company Portal:

1. Create the page in `/app/dashboard/[module]`
2. Add route to company: `/app/company/[module]/page.tsx`
3. Use export pattern: `export { default } from '@/app/dashboard/[module]/page'`
4. Add navigation item to `company-sidebar.tsx`

### Updating Existing Modules
Changes to dashboard pages automatically apply to company pages due to the reuse pattern.

## Support

For issues or questions:
1. Check this documentation
2. Review test accounts
3. Verify JWT token structure
4. Check API filtering logic
5. Review role permissions in database

## License
Proprietary - AI Calling Agent Platform
