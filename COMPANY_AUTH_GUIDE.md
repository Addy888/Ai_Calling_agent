# Company Authentication Flow - Complete Guide

## ✅ Current Status: WORKING CORRECTLY

The company creation and authentication flow is **working as designed**. This document explains how it works and how to use it.

---

## 🔍 How Company Creation Works

### When Super Admin Creates a Company

The system automatically performs these steps in a **single database transaction**:

1. ✅ **Create Company Record**
   - Company name, email, phone, etc.
   - Status: `ACTIVE`
   - `isActive: true`

2. ✅ **Create Company Admin User**
   - Email: From `administrator.adminEmail` field
   - Name: From `administrator.fullName` field
   - Password: **Hashed using bcrypt** (10 rounds)
   - Status: `ACTIVE`
   - `isActive: true`
   - `companyId`: Linked to created company

3. ✅ **Assign Company Admin Role**
   - Role: `company-admin`
   - Linked to user via `user_roles` table

4. ✅ **Create Default Resources**
   - Default settings (timezone, language, etc.)
   - Default knowledge base
   - Default AI agent
   - Default prompt
   - Default script

5. ✅ **Create Audit Logs**
   - Company creation logged
   - User creation logged

### Verification

Run this command to verify:
```bash
node verify-company-creation.js
```

**Current State:**
- ✅ 2 Active Companies
- ✅ 3 Active Users
- ✅ All companies have admin users
- ✅ All passwords properly hashed
- ✅ All roles assigned correctly

---

## 🔐 Authentication Flow

### How Login Works

**Location:** `apps/api/src/modules/auth/auth.service.ts`

```typescript
async login(loginDto: LoginDto) {
  // 1. Find user by EMAIL in User table
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company, roles }
  });

  // 2. Check user exists
  if (!user) → 401 "Invalid credentials"

  // 3. Check user not soft-deleted
  if (user.deletedAt) → 401 "Account deleted"

  // 4. Check user active
  if (!user.isActive) → 401 "Account disabled"

  // 5. Check company exists
  if (!user.company) → 401 "Company not found"

  // 6. Check company not soft-deleted
  if (user.company.deletedAt) → 401 "Company deleted"

  // 7. Check company active
  if (!user.company.isActive) → 401 "Company inactive"

  // 8. Verify password with bcrypt
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) → 401 "Invalid credentials"

  // 9. ✅ Login successful
  return { user, tokens }
}
```

### Key Points

- ✅ **User Table**: Authentication is ALWAYS from `users` table
- ✅ **Company Table**: Contains organization data only (NOT for auth)
- ✅ **Super Admin**: Authenticates via `users` table with `super-admin` role
- ✅ **Company Admin**: Authenticates via `users` table with `company-admin` role
- ✅ **Same Flow**: Both use the exact same authentication logic

---

## 👥 Current Active Users

### Company: Sky Rocket Infosys

**Login Credentials:**
```
Email: testing@gmail.com
Name: Aditya shastri
Role: Company Admin
Status: Active ✅
Password: [Set during creation]
```

### Company: AI Calling Agent

**Login Credentials:**

**User 1 (Super Admin):**
```
Email: admin@aicallingagent.com
Name: Super Admin
Role: Super Admin
Status: Active ✅
Password: Admin@123
```

**User 2 (Company Admin):**
```
Email: company@aicallingagent.com
Name: Company Admin
Role: Company Admin
Status: Active ✅
Password: Admin@123
```

---

## 🐛 Troubleshooting

### Issue: "Invalid credentials" on Login

**Diagnostic Steps:**

1. **Check User Exists**
   ```bash
   node show-login-credentials.js
   ```
   This shows ALL active users who can log in.

2. **Verify Email Correct**
   ```
   ❌ Wrong: skyrocketinfosys@gmail.com (Company email)
   ✅ Correct: testing@gmail.com (User email)
   ```

3. **Check API Logs**
   Look for:
   ```
   🔐 LOGIN ATTEMPT
     Email: [email]
   👤 USER LOOKUP RESULT:
     ❌ User NOT FOUND  ← Email doesn't exist
     OR
     ✅ User found
       deletedAt: [date]  ← User soft-deleted
       isActive: false    ← User disabled
   ```

4. **Verify Password**
   If user exists but login fails:
   ```
   🔑 PASSWORD VERIFICATION:
     Result: ❌ INVALID  ← Wrong password
   ```

### Issue: User Not Found

**Possible Causes:**

1. **Wrong Email**
   - Using company email instead of user email
   - Typo in email address
   - User never created

2. **User Soft-Deleted**
   - Check: `node debug-auth.js`
   - Fix: `node fix-soft-deleted-users.js`

3. **Company Creation Failed**
   - Check: `node verify-company-creation.js`
   - Look for companies without users

### Issue: Company Has No Users

**To Fix:**

Create a script to manually add admin user:

```bash
node create-company-admin.js <companyId> <email> <password>
```

Or recreate the company with Super Admin.

---

## 📊 Database Structure

### Users Table (Authentication)

```sql
users
├── id (PK)
├── companyId (FK → companies.id)
├── email (UNIQUE) ← Used for login
├── password (bcrypt hash) ← Verified on login
├── firstName
├── lastName
├── isActive ← Must be true
├── deletedAt ← Must be NULL
└── status
```

### Companies Table (Organization Data)

```sql
companies
├── id (PK)
├── name
├── email ← NOT used for login
├── isActive ← Must be true
├── deletedAt ← Must be NULL
└── status
```

### Relationship

```
Company (1) ──── (Many) Users
     ↑                    ↓
     └─── companyId ──────┘
```

**Important:**
- Users belong to ONE company
- Companies can have MANY users
- Login uses `users.email`, NOT `companies.email`

---

## 🔧 API Endpoints

### Create Company (Super Admin Only)

```http
POST /api/v1/companies
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "website": "https://acme.com",
  "address": "123 Main St",
  "administrator": {
    "fullName": "John Doe",
    "adminEmail": "john@acme.com",  ← User email for login
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "sendWelcomeEmail": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "company": { "id": "...", "name": "Acme Corp" },
    "adminUser": {
      "id": "...",
      "email": "john@acme.com",  ← Use THIS for login
      "firstName": "John",
      "lastName": "Doe"
    },
    "companyCode": "COMP123456"
  },
  "message": "Company and administrator created successfully. Admin can now log in."
}
```

### Login (Any User)

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@acme.com",  ← User email (NOT company email)
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john@acme.com",
      "company": {
        "id": "...",
        "name": "Acme Corp"
      },
      "roles": ["Company Admin"],
      "permissions": [...]
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": "8h"
    }
  },
  "message": "Login successful"
}
```

---

## 🎨 Frontend Considerations

### Role-Based UI

**Super Admin Dashboard:**
```
- Companies Management ✓
- Users Management ✓
- Roles & Permissions ✓
- System Settings ✓
- All Companies Data ✓
```

**Company Admin Dashboard:**
```
- Dashboard ✓
- Campaigns ✓
- Contacts ✓
- Scripts ✓
- Prompts ✓
- Knowledge Base ✓
- Analytics ✓
- Call History ✓
- Settings ✓
- Profile ✓

Filtered by: companyId === user.companyId
```

### Implementation

```typescript
// Check user role
const isSuperAdmin = user.roles.includes('super-admin');
const isCompanyAdmin = user.roles.includes('company-admin');

// Filter data by company
if (!isSuperAdmin) {
  // Company Admin: Only see their company data
  where: { companyId: user.companyId }
} else {
  // Super Admin: See all data
  where: {}
}
```

---

## ✅ Verification Checklist

### After Creating a Company

- [ ] Company record created in database
- [ ] Company `isActive: true`
- [ ] Company `deletedAt: null`
- [ ] User record created in database
- [ ] User `isActive: true`
- [ ] User `deletedAt: null`
- [ ] User `companyId` matches company ID
- [ ] User password is bcrypt hash
- [ ] User has `company-admin` role assigned
- [ ] Default settings created
- [ ] Default knowledge base created
- [ ] Default AI agent created
- [ ] Default prompt created
- [ ] Default script created
- [ ] Audit logs created

### Testing Login

- [ ] Can log in with user email (NOT company email)
- [ ] Password verification works
- [ ] JWT token generated
- [ ] User object includes company info
- [ ] User object includes roles
- [ ] User object includes permissions
- [ ] Dashboard loads correctly
- [ ] Company data filtered by companyId

---

## 📝 Scripts Available

### Show Login Credentials
```bash
node show-login-credentials.js
```
Displays all active users who can log in.

### Verify Company Creation
```bash
node verify-company-creation.js
```
Checks that all companies have admin users.

### Debug Authentication
```bash
node debug-auth.js
```
Complete authentication diagnostics.

### Fix Soft-Deleted Users
```bash
node fix-soft-deleted-users.js
```
Restores users soft-deleted by mistake.

---

## 🎯 Summary

### What's Working ✅

1. ✅ Company creation creates admin user automatically
2. ✅ Passwords are hashed with bcrypt
3. ✅ Users linked to companies correctly
4. ✅ Roles assigned properly
5. ✅ Authentication works for both Super Admin and Company Admin
6. ✅ Same login flow for all user types
7. ✅ Soft-delete checks in place
8. ✅ Clear error messages

### Common Mistakes ❌

1. ❌ Using company email instead of user email for login
2. ❌ Expecting to authenticate directly from companies table
3. ❌ Not checking if user email exists before logging in
4. ❌ Using wrong password
5. ❌ User soft-deleted but trying to log in

### Best Practices ✅

1. ✅ Always use user email for login
2. ✅ Never authenticate from companies table
3. ✅ Check user exists before testing login
4. ✅ Use show-login-credentials.js to see valid emails
5. ✅ Keep passwords secure and hashed
6. ✅ Filter company data by companyId for Company Admins
7. ✅ Use role-based access control for UI

---

**Document Version:** 1.0  
**Last Updated:** August 1, 2026  
**Status:** ✅ System Working Correctly
