# Login Issue - Root Cause Found & Resolved

## 🎯 **ROOT CAUSE IDENTIFIED**

### The Problem

**Error:** `401 Unauthorized - Invalid credentials`  
**Logs:** `USER LOOKUP RESULT: User NOT FOUND`

### The Root Cause

**You're using the WRONG EMAIL for login!**

❌ **WRONG EMAIL:** `skyrocketinfosys@gmail.com` (This is the COMPANY email)  
✅ **CORRECT EMAIL:** `testing@gmail.com` (This is the USER email)

---

## 📊 Email Types Explained

### Company Email vs User Email

The system has TWO different types of emails:

### 1. Company Email (Organization)

**Purpose:** Company contact information  
**Table:** `companies`  
**Field:** `companies.email`  
**Usage:** Display only, NOT for login  
**Example:** `skyrocketinfosys@gmail.com`

### 2. User Email (Authentication)

**Purpose:** User login credentials  
**Table:** `users`  
**Field:** `users.email`  
**Usage:** Login, authentication, JWT tokens  
**Example:** `testing@gmail.com`

---

## 🔍 Verification Results

### Company: Sky Rocket Infosys

**Company Record:**
```
Company Email: skyrocketinfosys@gmail.com
Company Name: Sky Rocket Infosys
Status: ACTIVE ✅
Deleted: NO ✅
```

**Company Admin User:**
```
User Email: testing@gmail.com  ← USE THIS FOR LOGIN
User Name: Aditya shastri
Role: Company Admin
Status: ACTIVE ✅
Deleted: NO ✅
Password: Hashed with bcrypt ✅
```

### Email Check Results

**Test 1: Company Email**
```bash
node check-email-exists.js skyrocketinfosys@gmail.com
```
**Result:** ❌ EMAIL NOT FOUND in users table  
**Reason:** This is a COMPANY email, not a USER email

**Test 2: User Email**
```bash
node check-email-exists.js testing@gmail.com
```
**Result:** ✅ USER FOUND - Can log in

---

## ✅ Company Creation is Working Correctly

### What Happens When Super Admin Creates a Company

The system DOES create the Company Admin user automatically. Here's proof:

**Database Query:**
```sql
SELECT * FROM users WHERE companyId = '3bb5c780-62b8-408a-bf85-36abdeaef79b';
```

**Result:**
```
✅ User ID: 90921a80-22bf-454b-b36e-1514f8d90d1a
✅ Email: testing@gmail.com
✅ Name: Aditya shastri
✅ Company ID: 3bb5c780-62b8-408a-bf85-36abdeaef79b
✅ Role: company-admin
✅ Password: $2b$10$O/HXBYibTlliz... (bcrypt hash)
✅ Status: ACTIVE
✅ Deleted: NULL
```

**Conclusion:** Company Admin user WAS created successfully!

---

## 🔐 Correct Login Process

### Step 1: Find Your User Email

Run this command:
```bash
node show-login-credentials.js
```

This shows ALL users who can log in with their emails.

### Step 2: Use User Email (NOT Company Email)

**Example for Sky Rocket Infosys:**

❌ **DON'T USE:**
```json
{
  "email": "skyrocketinfosys@gmail.com",  ← Company email
  "password": "..."
}
```

✅ **USE THIS:**
```json
{
  "email": "testing@gmail.com",  ← User email
  "password": "..."
}
```

### Step 3: Login Endpoint

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "testing@gmail.com",
  "password": "[Password set during company creation]"
}
```

---

## 📝 How Company Creation Works

### Data Flow

```
POST /api/v1/companies
{
  "name": "Sky Rocket Infosys",
  "email": "skyrocketinfosys@gmail.com",  ← Company contact email
  "administrator": {
    "fullName": "Aditya shastri",
    "adminEmail": "testing@gmail.com",     ← USER LOGIN EMAIL
    "password": "..."
  }
}
```

### Database Records Created

**1. Company Record:**
```sql
INSERT INTO companies (name, email, ...)
VALUES ('Sky Rocket Infosys', 'skyrocketinfosys@gmail.com', ...);
```

**2. User Record:**
```sql
INSERT INTO users (email, companyId, password, ...)
VALUES ('testing@gmail.com', '<companyId>', '$2b$...', ...);
```

**3. Role Assignment:**
```sql
INSERT INTO user_roles (userId, roleId)
VALUES ('<userId>', '<company-admin-roleId>');
```

### Result

- ✅ Company created
- ✅ Company Admin user created
- ✅ Password hashed
- ✅ Role assigned
- ✅ User can log in with `testing@gmail.com`

---

## 🐛 Why "User NOT FOUND" Error Occurs

### Authentication Flow

```typescript
// AuthService.login()
const user = await prisma.user.findUnique({
  where: { email: loginDto.email }  ← Searches users table
});

if (!user) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### What Happens with Wrong Email

**Login Attempt:**
```json
{
  "email": "skyrocketinfosys@gmail.com"  ← Company email
}
```

**Database Query:**
```sql
SELECT * FROM users WHERE email = 'skyrocketinfosys@gmail.com';
```

**Result:** No rows found (because this email is in `companies` table, not `users` table)

**Error:** `USER LOOKUP RESULT: User NOT FOUND`

---

## 📊 Current System State

### All Active Companies

| Company Name | Company Email | User Email | User Name | Role |
|--------------|---------------|------------|-----------|------|
| Sky Rocket Infosys | skyrocketinfosys@gmail.com | testing@gmail.com | Aditya shastri | Company Admin |
| AI Calling Agent | admin@aicallingagent.com | admin@aicallingagent.com | Super Admin | Super Admin |
| AI Calling Agent | admin@aicallingagent.com | company@aicallingagent.com | Company Admin | Company Admin |

### Login Credentials

**Sky Rocket Infosys:**
```
Email: testing@gmail.com
Password: [Set during creation]
Role: Company Admin
```

**AI Calling Agent (Super Admin):**
```
Email: admin@aicallingagent.com
Password: Admin@123
Role: Super Admin
```

**AI Calling Agent (Company Admin):**
```
Email: company@aicallingagent.com
Password: Admin@123
Role: Company Admin
```

---

## 🔧 Diagnostic Tools

### Check if Email Exists

```bash
node check-email-exists.js <email>
```

**Examples:**
```bash
# Check company email (will fail)
node check-email-exists.js skyrocketinfosys@gmail.com
❌ EMAIL NOT FOUND - This is a company email

# Check user email (will succeed)
node check-email-exists.js testing@gmail.com
✅ USER FOUND - Can log in
```

### Show All Login Credentials

```bash
node show-login-credentials.js
```

Shows ALL users who can log in.

### Verify Company Creation

```bash
node verify-company-creation.js
```

Verifies that all companies have admin users.

---

## ✅ Resolution

### What Was Wrong

**Misconception:** Using company email for login  
**Reality:** Must use user email for login

### What's Actually Working

✅ Company creation creates admin user  
✅ User record saved in database  
✅ Password properly hashed  
✅ Role properly assigned  
✅ Authentication flow working  
✅ JWT generation working  

### What Needs to Change

❌ Stop using company email for login  
✅ Start using user email for login  

---

## 📖 Important Concepts

### 1. Companies Table (Organization Data)

**Purpose:** Store organization information  
**Fields:**
- `name` - Company name
- `email` - Company contact email (NOT for login)
- `phone` - Company phone
- `address` - Company address
- etc.

**NOT USED FOR:** Authentication

### 2. Users Table (Authentication Data)

**Purpose:** Store user login credentials  
**Fields:**
- `email` - User login email (USED for login)
- `password` - Hashed password
- `companyId` - Link to company
- `firstName`, `lastName` - User name
- etc.

**USED FOR:** Authentication, login, JWT tokens

### 3. Relationship

```
Company (1) ──── (Many) Users
     ↑                    ↓
     └─── companyId ──────┘
```

- One company can have many users
- Each user belongs to one company
- Login uses `users.email`, NOT `companies.email`

---

## 🎯 Action Items

### For Users

1. ✅ Use `testing@gmail.com` to log in (NOT `skyrocketinfosys@gmail.com`)
2. ✅ Use the password set during company creation
3. ✅ Run `node show-login-credentials.js` to see all valid login emails

### For Developers

1. ✅ Company creation is working correctly
2. ✅ User creation is working correctly
3. ✅ Authentication is working correctly
4. ✅ No code changes needed
5. ✅ Just use correct email for login

---

## 📝 Frontend Recommendations

### Clear Labeling

When creating a company, clearly distinguish:

**Company Information:**
```
Company Name: [          ]
Company Email: [          ] ← Contact email, NOT for login
Company Phone: [          ]
```

**Administrator Account:**
```
Admin Name: [          ]
Admin Email: [          ] ← USE THIS FOR LOGIN
Admin Password: [          ]
```

### After Company Creation

Show success message with clear instructions:

```
✅ Company created successfully!

Login Credentials:
  Email: testing@gmail.com  ← Use this to log in
  Password: [As provided]
  Role: Company Admin

⚠️  Important: Use the Admin Email (testing@gmail.com), 
    NOT the Company Email (skyrocketinfosys@gmail.com)
```

---

## 🎉 Conclusion

### Status: ✅ **RESOLVED**

**The Issue:** Using company email instead of user email for login

**The Solution:** Use user email (`testing@gmail.com`) for login

**System Status:** Working correctly ✅

**Company Creation:** Working correctly ✅

**User Creation:** Working correctly ✅

**Authentication:** Working correctly ✅

**Action Required:** Use correct email for login

---

**Document Version:** 1.0  
**Date:** August 1, 2026  
**Status:** Issue Resolved ✅
