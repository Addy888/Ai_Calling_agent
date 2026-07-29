# Multi-Tenant Isolation - Quick Reference

## 🎯 Quick Summary

**Status**: ✅ IMPLEMENTED  
**Every database query automatically filters by `companyId = loggedInUser.companyId`**

## 🔒 How It Works

```
User Login → JWT with companyId → Every API Call → Service Filters by companyId
```

###1. Authentication
```typescript
// JWT Payload includes companyId
{
  sub: "user-id",
  email: "user@company.com",
  companyId: "company-123", // ← Always present
  roles: ["company-admin"]
}
```

### 2. Service Layer (Automatic Filtering)
```typescript
// All services receive companyId and filter automatically
async findAll(companyId: string, filters) {
  const where = {
    companyId, // ← Required
    deletedAt: null,
    ...filters
  };
  
  return this.prisma.model.findMany({ where });
}
```

### 3. Guard Layer (Optional Extra Security)
```typescript
// Additional protection for individual resource access
@Get(':id')
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@CheckCompanyResource('contact')
async findOne(@Param('id') id: string) {
  // Guard verifies contact belongs to user's company
  return this.service.findOne(id);
}
```

## 📋 For Developers

### Creating a New Service

**Step 1**: Always require companyId parameter
```typescript
@Injectable()
export class MyService {
  async create(companyId: string, userId: string, data: CreateDto) {
    return this.prisma.myModel.create({
      data: {
        ...data,
        companyId, // ← Always assign
        createdBy: userId,
      },
    });
  }

  async findAll(companyId: string, filters: FilterDto) {
    const where = {
      companyId, // ← Always filter
      deletedAt: null,
      ...filters,
    };

    return this.prisma.myModel.findMany({ where });
  }

  async findOne(id: string, companyId: string) {
    const record = await this.prisma.myModel.findFirst({
      where: { 
        id, 
        companyId, // ← Always filter
        deletedAt: null 
      },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    return record;
  }
}
```

### Creating a New Controller

**Option 1**: Extract companyId in controller
```typescript
@Controller('my-resource')
@UseGuards(JwtAuthGuard)
export class MyController {
  @Get()
  async findAll(@GetCompanyId() companyId: string, @Query() filters: FilterDto) {
    return this.service.findAll(companyId, filters);
  }

  @Post()
  async create(@GetUser() user: any, @Body() dto: CreateDto) {
    return this.service.create(user.companyId, user.id, dto);
  }
}
```

**Option 2**: Add isolation guard for extra security
```typescript
@Controller('my-resource')
@UseGuards(JwtAuthGuard)
export class MyController {
  @Get(':id')
  @UseGuards(CompanyIsolationGuard)
  @CheckCompanyResource('my-resource')
  async findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.service.findOne(id, companyId);
  }
}
```

### Validating Related Resources

```typescript
// When assigning resources from other tables, always validate companyId
async assignScript(campaignId: string, companyId: string, scriptId: string) {
  // Verify campaign belongs to company
  const campaign = await this.prisma.campaign.findFirst({
    where: { id: campaignId, companyId },
  });
  
  if (!campaign) {
    throw new NotFoundException('Campaign not found');
  }

  // Verify script belongs to same company
  const script = await this.prisma.script.findFirst({
    where: { 
      id: scriptId, 
      companyId, // ← Must match campaign's company
      deletedAt: null 
    },
  });

  if (!script) {
    throw new BadRequestException('Script not found or belongs to another company');
  }

  // Assign
  await this.prisma.campaign.update({
    where: { id: campaignId },
    data: { scriptId },
  });
}
```

## 🧪 Testing Your Implementation

### Test 1: Create Resource
```bash
# Login as Company A user
POST /auth/login
{ "email": "userA@companyA.com", "password": "pass" }

# Create contact
POST /contacts
Authorization: Bearer <token_A>
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

# Verify companyId assigned
Response:
{
  "data": {
    "id": "contact-123",
    "companyId": "company-A", // ← Should match user's company
    ...
  }
}
```

### Test 2: List Resources
```bash
# User A lists contacts
GET /contacts
Authorization: Bearer <token_A>

# Verify only Company A contacts returned
Response:
{
  "data": {
    "items": [
      { "id": "1", "companyId": "company-A" },
      { "id": "2", "companyId": "company-A" }
      # No company-B contacts
    ]
  }
}
```

### Test 3: Cross-Company Access (Should Fail)
```bash
# Login as Company B user
POST /auth/login
{ "email": "userB@companyB.com", "password": "pass" }

# Try to access Company A contact
GET /contacts/contact-123
Authorization: Bearer <token_B>

# Expected: 403 Forbidden
Response:
{
  "statusCode": 403,
  "message": "Access denied: Resource belongs to another company"
}
```

### Test 4: Super Admin Access (Should Succeed)
```bash
# Login as Super Admin
POST /auth/login
{ "email": "admin@aicallingagent.com", "password": "Admin@123" }

# Access any company's contact
GET /contacts/contact-123
Authorization: Bearer <super_token>

# Expected: 200 OK (super admin bypasses isolation)
Response:
{
  "data": {
    "id": "contact-123",
    "companyId": "company-A", // Can see any company
    ...
  }
}
```

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Query without companyId filter
```typescript
// BAD - Shows all companies' data
async findAll() {
  return this.prisma.contact.findMany();
}
```

### ✅ DO: Always filter by companyId
```typescript
// GOOD - Only shows user's company data
async findAll(companyId: string) {
  return this.prisma.contact.findMany({
    where: { companyId, deletedAt: null }
  });
}
```

### ❌ DON'T: Forget to validate related resources
```typescript
// BAD - Doesn't check if script belongs to same company
async updateCampaign(id: string, scriptId: string) {
  return this.prisma.campaign.update({
    where: { id },
    data: { scriptId }, // Could be from another company!
  });
}
```

### ✅ DO: Validate companyId of related resources
```typescript
// GOOD - Verifies script belongs to same company
async updateCampaign(id: string, companyId: string, scriptId: string) {
  const script = await this.prisma.script.findFirst({
    where: { id: scriptId, companyId }, // Must match
  });
  
  if (!script) {
    throw new BadRequestException('Invalid script');
  }
  
  return this.prisma.campaign.update({
    where: { id },
    data: { scriptId },
  });
}
```

### ❌ DON'T: Rely only on client-side filtering
```typescript
// BAD - Client could manipulate request
async findAll() {
  const allContacts = await this.prisma.contact.findMany();
  // Client sends companyId, but we should get it from JWT
  return allContacts.filter(c => c.companyId === clientSentCompanyId);
}
```

### ✅ DO: Use companyId from authenticated user (JWT)
```typescript
// GOOD - companyId comes from verified JWT token
async findAll(companyId: string) {
  // companyId is extracted from JWT by JwtAuthGuard
  return this.prisma.contact.findMany({
    where: { companyId },
  });
}
```

## 📚 Helper Decorators

### @GetCompanyId()
Extract companyId from authenticated user:
```typescript
@Get()
async findAll(@GetCompanyId() companyId: string) {
  return this.service.findAll(companyId);
}
```

### @GetUser()
Extract full user object:
```typescript
@Post()
async create(@GetUser() user: any, @Body() dto: CreateDto) {
  return this.service.create(user.companyId, user.id, dto);
}
```

### @CheckCompanyResource(type)
Mark route for automatic company isolation:
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@CheckCompanyResource('contact')
async findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | Adds companyId to request.user |
| `apps/api/src/common/guards/company-isolation.guard.ts` | Validates resource ownership |
| `apps/api/src/common/decorators/company-resource.decorator.ts` | Helper decorators |
| `apps/api/src/modules/*/services/*.service.ts` | Automatic companyId filtering |

## ✅ Checklist for New Features

When adding a new feature with company-specific data:

- [ ] Service requires `companyId` parameter in all methods
- [ ] `create()` assigns `companyId` from parameter
- [ ] `findAll()` filters by `companyId`
- [ ] `findOne()` validates `companyId` or uses guard
- [ ] Related resource assignments validate `companyId` match
- [ ] Bulk operations filter by `companyId`
- [ ] Controller extracts `companyId` from authenticated user
- [ ] Add CompanyIsolationGuard for sensitive operations
- [ ] Write tests for cross-company access denial

## 🎯 Summary

**Core Principle**: Every database query must filter by `companyId = loggedInUser.companyId`

**How It's Enforced**:
1. JWT contains verified companyId
2. Services require companyId parameter
3. Services filter all queries by companyId
4. Guards add additional layer for resource access
5. Related resources validated for company match

**Result**: Company A users can NEVER see Company B data

---

**Questions?** Review `MULTI_TENANT_ISOLATION_COMPLETE.md` for detailed documentation.
