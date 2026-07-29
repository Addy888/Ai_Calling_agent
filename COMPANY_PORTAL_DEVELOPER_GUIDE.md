# Company Portal - Developer Quick Reference

## Overview
The Company Portal is a multi-tenant system where company admins can manage their own data without accessing platform-wide features or other companies' data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Login Page                           │
│                  /app/login/page.tsx                    │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   Role Detection     │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼─────┐         ┌────▼─────┐
   │ super-   │         │ company- │
   │ admin    │         │ admin    │
   └────┬─────┘         └────┬─────┘
        │                    │
   ┌────▼─────┐         ┌────▼─────┐
   │/dashboard│         │/company  │
   │(Blue)    │         │(Green)   │
   └──────────┘         └──────────┘
```

---

## File Structure

### Frontend
```
apps/web/src/
├── app/
│   ├── login/page.tsx              # Login with role-based routing
│   ├── dashboard/                   # Super Admin Portal (Blue)
│   │   ├── page.tsx                # Super admin dashboard
│   │   ├── contacts/page.tsx       # All features
│   │   ├── campaigns/page.tsx
│   │   ├── companies/page.tsx      # Super admin only
│   │   └── ...
│   └── company/                     # Company Portal (Green)
│       ├── layout.tsx              # Company-specific layout
│       ├── page.tsx                # Company dashboard
│       ├── contacts/page.tsx       # Export from dashboard
│       ├── campaigns/page.tsx      # Export from dashboard
│       └── ...
└── components/
    └── layout/
        ├── sidebar.tsx              # Super admin sidebar
        ├── company-sidebar.tsx      # Company sidebar (10 modules)
        └── company-header.tsx       # Company header with company name
```

### Backend
```
apps/api/src/
├── modules/
│   ├── auth/
│   │   └── strategies/jwt.strategy.ts    # Extracts companyId from JWT
│   ├── contacts/
│   │   ├── contacts.controller.ts        # @GetCompanyId() decorator
│   │   └── contacts.service.ts           # Filters by companyId
│   ├── campaigns/
│   │   ├── campaigns.controller.ts
│   │   └── campaigns.service.ts
│   └── ...
└── common/
    ├── guards/
    │   └── company-isolation.guard.ts     # Optional defense-in-depth
    └── decorators/
        └── company-resource.decorator.ts  # @CheckCompanyResource()
```

---

## Key Concepts

### 1. JWT Token Structure
```typescript
{
  sub: "user-id",
  email: "company@example.com",
  companyId: "company-id",           // ⭐ Automatic from user record
  roles: ["company-admin"],
  permissions: ["contacts.view", ...],
  iat: 1234567890,
  exp: 1234567890
}
```

### 2. Company ID Extraction
```typescript
// Controller extracts companyId from JWT
@Get()
findAll(@GetCompanyId() companyId: string) {
  return this.service.findAll(companyId);
}

// Service filters by companyId
async findAll(companyId: string) {
  return this.prisma.contact.findMany({
    where: { companyId, deletedAt: null }
  });
}
```

### 3. Export Pattern (No Code Duplication)
```typescript
// apps/web/src/app/company/contacts/page.tsx
export { default } from '@/app/dashboard/contacts/page';

// API automatically filters by JWT companyId
// No code changes needed!
```

---

## Adding a New Module to Company Portal

### Step 1: Create Company Route
```typescript
// apps/web/src/app/company/your-module/page.tsx
export { default } from '@/app/dashboard/your-module/page';
```

### Step 2: Add to Company Sidebar
```typescript
// apps/web/src/components/layout/company-sidebar.tsx
const companyNavigation = [
  // ... existing items
  { name: 'Your Module', href: '/company/your-module', icon: YourIcon },
];
```

### Step 3: Ensure API Filtering
```typescript
// apps/api/src/modules/your-module/your-module.controller.ts
@Get()
findAll(@GetCompanyId() companyId: string) {
  return this.service.findAll(companyId);
}

// apps/api/src/modules/your-module/your-module.service.ts
async findAll(companyId: string) {
  return this.prisma.yourModel.findMany({
    where: { companyId, deletedAt: null }
  });
}
```

### Step 4: Add Permission (if needed)
```typescript
// database/prisma/seed.ts
const permissions = [
  { name: 'View Your Module', slug: 'your-module.view', module: 'your-module' },
  { name: 'Create Your Module', slug: 'your-module.create', module: 'your-module' },
  { name: 'Update Your Module', slug: 'your-module.update', module: 'your-module' },
  { name: 'Delete Your Module', slug: 'your-module.delete', module: 'your-module' },
];

// Assign to companyAdminRole
const companyAdminPermissions = createdPermissions.filter(
  (p) => !['companies', 'users', 'roles', 'permissions'].includes(p.module),
);
```

---

## Common Patterns

### Pattern 1: Create Operation
```typescript
// Controller
@Post()
create(
  @GetCompanyId() companyId: string,
  @GetUser() user: any,
  @Body() dto: CreateDto
) {
  return this.service.create(companyId, user.id, dto);
}

// Service
async create(companyId: string, userId: string, dto: CreateDto) {
  return this.prisma.resource.create({
    data: {
      ...dto,
      companyId,      // ⭐ Set company
      createdBy: userId
    }
  });
}
```

### Pattern 2: Read All
```typescript
// Controller
@Get()
findAll(
  @GetCompanyId() companyId: string,
  @Query() pagination: PaginationDto
) {
  return this.service.findAll(companyId, pagination);
}

// Service
async findAll(companyId: string, pagination: PaginationDto) {
  const where = { 
    companyId,           // ⭐ Filter by company
    deletedAt: null 
  };
  
  return this.prisma.resource.findMany({ where });
}
```

### Pattern 3: Read One
```typescript
// Controller
@Get(':id')
findOne(
  @Param('id') id: string,
  @GetCompanyId() companyId: string
) {
  return this.service.findOne(id, companyId);
}

// Service
async findOne(id: string, companyId: string) {
  const resource = await this.prisma.resource.findFirst({
    where: { 
      id, 
      companyId,         // ⭐ Verify ownership
      deletedAt: null 
    }
  });
  
  if (!resource) {
    throw new NotFoundException('Resource not found');
  }
  
  return resource;
}
```

### Pattern 4: Update
```typescript
// Controller
@Patch(':id')
update(
  @Param('id') id: string,
  @GetCompanyId() companyId: string,
  @GetUser() user: any,
  @Body() dto: UpdateDto
) {
  return this.service.update(id, companyId, user.id, dto);
}

// Service
async update(id: string, companyId: string, userId: string, dto: UpdateDto) {
  // Verify ownership
  const resource = await this.prisma.resource.findFirst({
    where: { id, companyId }
  });
  
  if (!resource) {
    throw new NotFoundException('Resource not found');
  }
  
  // Update
  return this.prisma.resource.update({
    where: { id },
    data: { 
      ...dto, 
      updatedBy: userId 
    }
  });
}
```

### Pattern 5: Delete (Soft)
```typescript
// Controller
@Delete(':id')
remove(
  @Param('id') id: string,
  @GetCompanyId() companyId: string
) {
  return this.service.remove(id, companyId);
}

// Service
async remove(id: string, companyId: string) {
  const resource = await this.prisma.resource.findFirst({
    where: { id, companyId, deletedAt: null }
  });
  
  if (!resource) {
    throw new NotFoundException('Resource not found');
  }
  
  return this.prisma.resource.update({
    where: { id },
    data: { deletedAt: new Date() }  // ⭐ Soft delete
  });
}
```

---

## Decorators Reference

### @GetCompanyId()
Extracts `companyId` from JWT token.

```typescript
@Get()
findAll(@GetCompanyId() companyId: string) {
  return this.service.findAll(companyId);
}
```

### @GetUser()
Extracts full user object from JWT token.

```typescript
@Post()
create(@GetUser() user: any, @Body() dto: CreateDto) {
  return this.service.create(user.companyId, user.id, dto);
}
```

### @CheckCompanyResource()
Enables company isolation guard for specific resource.

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@CheckCompanyResource('contact')
findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

---

## Guards Reference

### JwtAuthGuard
**Required on all protected routes**
```typescript
@UseGuards(JwtAuthGuard)
@Get()
findAll() { ... }
```

### CompanyIsolationGuard
**Optional - Adds defense-in-depth**
```typescript
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@CheckCompanyResource('contact')
@Get(':id')
findOne(@Param('id') id: string) { ... }
```

**How it works:**
1. Extracts `companyId` from JWT
2. Fetches resource from database
3. Verifies `resource.companyId === user.companyId`
4. Throws 403 if mismatch
5. Allows super-admin to bypass

---

## Database Schema Requirements

### Must Have Fields
```prisma
model YourModel {
  id         String    @id @default(uuid())
  companyId  String                             // ⭐ Required
  
  // Your fields...
  
  deletedAt  DateTime?                          // ⭐ Soft delete
  createdBy  String?
  updatedBy  String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  
  company    Company   @relation(fields: [companyId], references: [id])
  
  @@index([companyId])                          // ⭐ Performance
  @@index([deletedAt])
}
```

---

## Testing Company Isolation

### Test 1: Login as Company A
```bash
# Login as Company A
POST /auth/login
{
  "email": "company-a@example.com",
  "password": "Password123"
}

# Create contact
POST /contacts
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
# Response: contact.companyId = "company-a-id"
```

### Test 2: Login as Company B
```bash
# Login as Company B
POST /auth/login
{
  "email": "company-b@example.com",
  "password": "Password123"
}

# Try to get Company A's contacts
GET /contacts
# Response: Empty array (Company A's data not visible)

# Try to access Company A's contact by ID
GET /contacts/{company-a-contact-id}
# Response: 404 Not Found
```

### Test 3: Verify Super Admin
```bash
# Login as Super Admin
POST /auth/login
{
  "email": "admin@aicallingagent.com",
  "password": "Admin@123"
}

# Can access all companies' data
GET /contacts
# Response: All contacts from all companies

# Can access specific company's contact
GET /contacts/{company-a-contact-id}
# Response: Success (super admin bypass)
```

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting companyId in queries
```typescript
// WRONG - No company filter
async findAll() {
  return this.prisma.contact.findMany();  // ❌ Returns all companies!
}

// CORRECT
async findAll(companyId: string) {
  return this.prisma.contact.findMany({
    where: { companyId }                  // ✅ Filtered
  });
}
```

### ❌ Pitfall 2: Using ID from params for company
```typescript
// WRONG - User can manipulate params
@Get()
findAll(@Query('companyId') companyId: string) {  // ❌ Insecure!
  return this.service.findAll(companyId);
}

// CORRECT - Extract from JWT
@Get()
findAll(@GetCompanyId() companyId: string) {      // ✅ Secure
  return this.service.findAll(companyId);
}
```

### ❌ Pitfall 3: Not checking deletedAt
```typescript
// WRONG - Returns deleted records
async findAll(companyId: string) {
  return this.prisma.contact.findMany({
    where: { companyId }                  // ❌ Includes deleted
  });
}

// CORRECT
async findAll(companyId: string) {
  return this.prisma.contact.findMany({
    where: { companyId, deletedAt: null } // ✅ Excludes deleted
  });
}
```

### ❌ Pitfall 4: Hard deletes with history
```typescript
// WRONG - Loses history
async remove(id: string) {
  return this.prisma.contact.delete({ where: { id } });  // ❌
}

// CORRECT - Soft delete
async remove(id: string) {
  return this.prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() }      // ✅ Preserves history
  });
}
```

---

## Debugging Tips

### Check JWT Token
```typescript
// In any controller
@Get('debug')
debug(@GetUser() user: any) {
  return {
    userId: user.id,
    companyId: user.companyId,        // ⭐ Should always be present
    roles: user.roles,
    permissions: user.permissions
  };
}
```

### Log SQL Queries
```typescript
// In prisma.service.ts
this.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  // Check if companyId is in the WHERE clause
});
```

### Verify Company Isolation
```typescript
// Test endpoint (remove in production)
@Get('test-isolation')
async testIsolation(@GetCompanyId() companyId: string) {
  const contacts = await this.prisma.contact.findMany({
    where: { companyId }
  });
  
  return {
    companyId,
    contactCount: contacts.length,
    companyIds: [...new Set(contacts.map(c => c.companyId))]
    // Should only show one companyId
  };
}
```

---

## Performance Optimization

### Index companyId
```prisma
model Contact {
  // ...
  @@index([companyId])           // ⭐ Essential
  @@index([companyId, status])   // ⭐ Composite indexes
  @@index([companyId, deletedAt])
}
```

### Pagination
```typescript
async findAll(companyId: string, pagination: PaginationDto) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    this.prisma.contact.findMany({
      where: { companyId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    this.prisma.contact.count({
      where: { companyId, deletedAt: null }
    })
  ]);
  
  return createPaginatedResponse(data, total, page, limit);
}
```

### Selective Includes
```typescript
// Only include what you need
this.prisma.campaign.findMany({
  where: { companyId },
  select: {
    id: true,
    name: true,
    status: true,
    _count: { select: { contacts: true } }  // Count only
  }
});
```

---

## Security Checklist

- ✅ All queries include `companyId` filter
- ✅ `companyId` extracted from JWT (not params)
- ✅ JwtAuthGuard on all protected routes
- ✅ Soft deletes for audit trail
- ✅ Indexes on `companyId` for performance
- ✅ Input validation with DTOs
- ✅ Permission checks where needed
- ✅ No raw SQL queries
- ✅ Error messages don't leak data
- ✅ Super admin bypass documented

---

## Quick Commands

### Run Development
```bash
# Frontend
cd apps/web
npm run dev

# Backend
cd apps/api
npm run start:dev

# Database
cd database
npx prisma studio
```

### Build
```bash
# Frontend
cd apps/web
npm run build

# Backend
cd apps/api
npm run build
```

### Database
```bash
# Generate Prisma Client
cd database
npx prisma generate

# Run Migrations
npx prisma migrate deploy

# Seed Database
npx prisma db seed
```

### Test Accounts
```bash
# Super Admin
Email: admin@aicallingagent.com
Password: Admin@123
Portal: /dashboard (Blue)

# Company Admin
Email: company@aicallingagent.com
Password: Admin@123
Portal: /company (Green)
```

---

## Resources

- **Architecture:** `MULTI_TENANT_ISOLATION_COMPLETE.md`
- **Testing:** `TESTING_GUIDE.md`
- **Audit Report:** `COMPANY_PORTAL_AUDIT_FINAL.md`
- **API Docs:** `http://localhost:4000/api/docs` (when running)

---

## Support

For questions or issues:
1. Check this guide first
2. Review the implementation files
3. Check the audit report for verification
4. Consult the architecture documentation

---

**Last Updated:** July 28, 2026  
**Version:** 1.0.0
