# Quick Start - Campaign Workflow Redesign

## 🚀 Getting Started

### 1. Fix TypeScript Compilation Errors

```powershell
# Stop your dev server first (Ctrl+C)

# Clean build cache
.\restart-api-dev.ps1

# Rebuild
cd apps/api
npm run build

# Restart dev server
npm run dev
```

### 2. Apply Database Migration

```powershell
# Generate Prisma client
npm run db:generate

# Apply migration
npm run db:migrate
```

The migration will create:
- `telephony_profiles` table
- `campaign_contacts` table  
- `campaign_uploads` table
- Update `campaigns` table

### 3. Test New API Endpoints

#### A. Get Telephony Profiles
```bash
curl http://localhost:3000/api/v1/telephony-profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### B. Upload Contact Template
```bash
curl http://localhost:3000/api/v1/campaigns/CAMPAIGN_ID/contacts/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o template.csv
```

---

## 📖 Key Documents

| Document | Purpose |
|----------|---------|
| **CAMPAIGN_WORKFLOW_REDESIGN.md** | Complete implementation details, database schema, API reference |
| **FRONTEND_INTEGRATION_GUIDE.md** | React components, TypeScript types, API client functions |
| **FIX_TYPESCRIPT_ERRORS.md** | Troubleshooting TypeScript compilation issues |

---

## 🎯 New Workflow Summary

### Before (OLD - REMOVED)
```
1. Create Contacts manually
2. Go to Campaign
3. Click "Assign Contacts"
4. Select contacts
5. Save
```

### After (NEW - IMPLEMENTED)
```
1. Select Telephony Profile (GSM Gateway + SIM)
2. Upload Contact File (CSV/XLSX)
3. Start Campaign
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Campaign Creation UI                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 1. Campaign Details                      │  │
│  │ 2. AI Configuration (Script/Prompt)     │  │
│  │ 3. Telephony Profile Selector ⭐ NEW    │  │
│  │ 4. Contact File Upload ⭐ NEW           │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              Backend Processing                 │
│  ┌──────────────────────────────────────────┐  │
│  │ TelephonyProfileService                  │  │
│  │  - Validate GSM Gateway                  │  │
│  │  - Verify SIM card active                │  │
│  │  - Match caller number                   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ ContactUploadService                     │  │
│  │  - Parse CSV/XLSX                        │  │
│  │  - Validate contacts                     │  │
│  │  - Check duplicates                      │  │
│  │  - Batch insert (500 at a time)         │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│             Call Execution                      │
│  ┌──────────────────────────────────────────┐  │
│  │ CampaignExecutionService                 │  │
│  │  - Load campaign + telephony profile     │  │
│  │  - Load campaign contacts                │  │
│  │  - Create call queue                     │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ QueueExecutionService                    │  │
│  │  - Process contacts in batches          │  │
│  │  - Respect concurrent call limits       │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ CallOrchestratorService                  │  │
│  │  - Initiate call via GSM Gateway        │  │
│  │  - Use selected SIM card                │  │
│  │  - Real caller ID (not spoofed)         │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│          Asterisk / FreeSWITCH                  │
│            GSM Gateway                          │
│         Physical SIM Card (7220XXXXXX)          │
└─────────────────────────────────────────────────┘
```

---

## 📋 API Endpoints Added

### Telephony Profiles
```
POST   /api/v1/telephony-profiles              Create profile
GET    /api/v1/telephony-profiles              List profiles
GET    /api/v1/telephony-profiles/default      Get default
GET    /api/v1/telephony-profiles/gateways     Get gateways
GET    /api/v1/telephony-profiles/:id          Get by ID
PUT    /api/v1/telephony-profiles/:id          Update
DELETE /api/v1/telephony-profiles/:id          Delete
```

### Campaign Contacts
```
POST   /api/v1/campaigns/:id/contacts/upload       Upload file
GET    /api/v1/campaigns/:id/contacts/uploads      List uploads
GET    /api/v1/campaigns/:id/contacts/uploads/:id  Upload status
GET    /api/v1/campaigns/:id/contacts/template     Download template
GET    /api/v1/campaigns/:id/contacts/statistics   Get stats
GET    /api/v1/campaigns/:id/contacts              List contacts
GET    /api/v1/campaigns/:id/contacts/:contactId   Get contact
DELETE /api/v1/campaigns/:id/contacts/:contactId   Delete contact
POST   /api/v1/campaigns/:id/contacts/bulk-delete  Bulk delete
```

---

## 🧪 Testing Steps

### 1. Create Telephony Profile

```json
POST /api/v1/telephony-profiles
{
  "name": "Primary GSM Profile",
  "provider": "GSM_GATEWAY",
  "gatewayId": "gateway-uuid",
  "simId": "sim-uuid",
  "callerNumber": "7220XXXXXX",
  "isDefault": true
}
```

### 2. Create Campaign

```json
POST /api/v1/campaigns
{
  "name": "Test Campaign",
  "telephonyProfileId": "profile-uuid",
  "scriptId": "script-uuid",
  "promptId": "prompt-uuid"
}
```

### 3. Upload Contacts

```bash
curl -X POST http://localhost:3000/api/v1/campaigns/CAMPAIGN_ID/contacts/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@contacts.csv"
```

### 4. Check Upload Status

```bash
curl http://localhost:3000/api/v1/campaigns/CAMPAIGN_ID/contacts/uploads/UPLOAD_ID \
  -H "Authorization: Bearer TOKEN"
```

### 5. View Statistics

```bash
curl http://localhost:3000/api/v1/campaigns/CAMPAIGN_ID/contacts/statistics \
  -H "Authorization: Bearer TOKEN"
```

---

## 📊 Sample CSV Format

```csv
firstName,lastName,phone,email,city,state,language
Rajesh,Kumar,9876543210,rajesh@example.com,Mumbai,Maharashtra,hi
Priya,Sharma,9876543211,priya@example.com,Delhi,Delhi,en
Amit,Patel,9876543212,amit@example.com,Ahmedabad,Gujarat,gu
```

**Flexible Naming Supported:**
- `firstName`, `first_name`, `fname`, `First Name`
- `lastName`, `last_name`, `lname`, `Last Name`
- `phone`, `phoneNumber`, `mobile`, `Phone`, `Mobile`

---

## ✅ Checklist

### Backend
- [x] Database schema updated
- [x] Migration created
- [x] Telephony Profile module
- [x] Campaign Contacts module
- [x] Campaign service updated
- [x] App module configured
- [x] Storage directories created
- [ ] TypeScript compilation fixed (see FIX_TYPESCRIPT_ERRORS.md)
- [ ] Dev server restarted

### Frontend (TODO)
- [ ] Telephony Profile selector component
- [ ] Contact file upload widget
- [ ] Upload progress indicator
- [ ] Validation error display
- [ ] Campaign creation form updated
- [ ] Contact list view
- [ ] Statistics dashboard

### Testing
- [ ] Create telephony profile
- [ ] Upload contact file
- [ ] Validate contacts
- [ ] Create campaign with profile
- [ ] Start campaign
- [ ] Verify calls use GSM SIM

---

## 🆘 Troubleshooting

### TypeScript Errors (TS6307)
→ See **FIX_TYPESCRIPT_ERRORS.md**

### "Table does not exist" Error
```powershell
npm run db:migrate
```

### "Upload directory not found"
```powershell
New-Item -Path "storage\uploads\contacts" -ItemType Directory -Force
```

### "Telephony profile not found"
You need to create a telephony profile first before creating campaigns.

### "No active SIM card"
Ensure the SIM card is:
1. Registered in the system
2. `isActive = true`
3. `status = 'ACTIVE'`
4. Belongs to an active gateway

---

## 📞 Next Steps

1. **Fix TypeScript compilation** (see FIX_TYPESCRIPT_ERRORS.md)
2. **Apply database migration** (`npm run db:migrate`)
3. **Test API endpoints** (use Postman/curl)
4. **Implement frontend** (see FRONTEND_INTEGRATION_GUIDE.md)
5. **Configure GSM Gateway** (physical hardware setup)
6. **Test end-to-end workflow**

---

## 📚 Additional Resources

- **Complete API Reference:** CAMPAIGN_WORKFLOW_REDESIGN.md
- **React Components:** FRONTEND_INTEGRATION_GUIDE.md
- **TypeScript Issues:** FIX_TYPESCRIPT_ERRORS.md
- **Database Schema:** database/prisma/schema.prisma
- **Migration:** database/prisma/migrations/20260726073912_*

---

**Status:** ✅ Backend Complete | ⚠️ TypeScript Fix Required | 📋 Frontend Pending

**Implementation Date:** July 26, 2026
