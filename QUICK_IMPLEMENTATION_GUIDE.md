# Contact Assignment - Quick Implementation Guide

## ⚡ 30-Minute Completion Checklist

### Step 1: Update API Client (5 minutes)

**File:** Find your API client file (likely `apps/web/src/lib/api.ts` or `apps/web/src/lib/api/campaign.ts`)

Add these methods if missing:

```typescript
// In campaign API section
export const campaignApi = {
  // ... existing methods ...
  
  // Get campaign contacts
  getContacts: (campaignId: string, params?: { page?: number; limit?: number }) => 
    api.get(`/campaigns/${campaignId}/contacts`, { params }),
  
  // Assign contacts to campaign
  assignContacts: (campaignId: string, data: { contactIds: string[] }) => 
    api.post(`/campaigns/${campaignId}/contacts/assign`, data),
  
  // Remove contacts from campaign
  removeContacts: (campaignId: string, data: { contactIds: string[] }) => 
    api.post(`/campaigns/${campaignId}/contacts/remove`, data),
};
```

### Step 2: Update Campaign List Page (10 minutes)

**File:** `apps/web/src/app/dashboard/campaigns/page.tsx`

Find the columns definition and update the contacts column:

```typescript
// Find this section (around line 140-150)
{
  key: '_count.contacts',
  label: 'Contacts',
  render: (value: any, campaign: Campaign) => {
    const count = campaign._count?.contacts || 0;
    return (
      <Badge 
        variant={count === 0 ? 'destructive' : 'secondary'}
        className={count === 0 ? 'bg-red-100 text-red-800' : ''}
      >
        {count}
      </Badge>
    );
  },
},
```

Add validation before starting campaign (find the start campaign handler):

```typescript
const handleStartCampaign = async (campaignId: string, campaign: Campaign) => {
  const contactCount = campaign._count?.contacts || 0;
  
  // Validate contacts
  if (contactCount === 0) {
    toast({
      title: 'Cannot Start Campaign',
      description: 'This campaign has no assigned contacts. Please assign contacts before starting.',
      variant: 'destructive',
    });
    return;
  }
  
  // Your existing start campaign logic here
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calling/start-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        campaignId,
        companyId: campaign.companyId,
        concurrentCalls: 5,
        autoStart: true
      }),
    });
    
    toast({ 
      title: 'Success', 
      description: 'Campaign started successfully' 
    });
    
    loadCampaigns(); // Refresh list
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.response?.data?.message || 'Failed to start campaign',
      variant: 'destructive',
    });
  }
};
```

### Step 3: Test the Complete Flow (15 minutes)

#### Backend Test:
```bash
cd apps/api
npm run start:dev
```

#### Frontend Test:
```bash
cd apps/web
npm run dev
```

#### Test Sequence:

1. **Create Campaign with Contacts:**
   - Navigate to Campaigns → Create New
   - Fill in campaign details
   - Scroll to "Select Contacts" section
   - Search and select contacts
   - Click "Create Campaign"
   - ✅ Should show: "Campaign created with X contacts assigned"

2. **Verify Contact Count:**
   - Go to Campaigns list
   - ✅ Should show actual contact count (not 0)
   - ✅ Zero contacts should show red badge

3. **Try Starting Campaign:**
   - Find campaign with 0 contacts
   - Click "Start"
   - ✅ Should show error: "This campaign has no assigned contacts"
   
4. **Start Campaign with Contacts:**
   - Find campaign with contacts > 0
   - Click "Start"
   - ✅ Should start successfully
   - Navigate to Runtime Monitor
   - ✅ Should see calls being queued and dialed

### Step 4: Optional Enhancements (If Time Permits)

#### A. Campaign Details Page with Contacts Tab

**File:** `apps/web/src/app/dashboard/campaigns/[id]/page.tsx`

Add a Contacts tab:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Inside component
const [contactsPage, setContactsPage] = useState(1);
const [contacts, setContacts] = useState([]);

const loadContacts = async () => {
  const response = await campaignApi.getContacts(campaignId, { 
    page: contactsPage, 
    limit: 20 
  });
  setContacts(response.data.data.items);
};

// In JSX
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="contacts">
      Contacts ({campaign._count?.contacts || 0})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="contacts">
    <Card>
      <CardHeader>
        <CardTitle>Assigned Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map(contact => (
              <TableRow key={contact.id}>
                <TableCell>{contact.fullName}</TableCell>
                <TableCell>{contact.phone}</TableCell>
                <TableCell>
                  <Badge>{contact.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

## 🎯 What You Get

After completing these steps:

✅ **Campaign Creation**
- Create campaign with contact selection
- Visual feedback for selections
- Search and filter contacts
- Select all / clear all functionality

✅ **Campaign List**
- Shows actual contact counts
- Red badge for campaigns with 0 contacts
- Cannot start campaigns without contacts

✅ **Campaign Execution**
- Validation prevents starting with 0 contacts
- Assigned contacts automatically loaded into queue
- Calls initiated through Twilio
- Runtime Monitor shows real-time progress

✅ **Enterprise Features**
- Professional UI matching existing design
- Proper error handling
- Clear user feedback
- Complete audit trail

## 🔍 Verification

### Database Check:
```sql
-- Check campaign contact counts
SELECT 
  c.id, 
  c.name, 
  COUNT(co.id) as contact_count
FROM Campaign c
LEFT JOIN Contact co ON co.campaignId = c.id AND co.deletedAt IS NULL
GROUP BY c.id, c.name;
```

### API Test:
```bash
# Test get contacts endpoint
curl http://localhost:3001/api/v1/campaigns/{campaignId}/contacts

# Test start campaign validation
curl -X POST http://localhost:3001/api/v1/calling/start-campaign \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-with-no-contacts", "companyId": "xxx"}'
# Should return: 400 Bad Request with message about no contacts
```

### Frontend Test:
1. Create campaign → Select 5 contacts → Submit
2. Go to campaign list → Should show "5" in contacts column
3. Click Start on campaign → Should initiate calls
4. Go to Runtime Monitor → Should see calls being processed

## 🚨 Common Issues & Fixes

### Issue: "Cannot find module 'ContactSelector'"
**Fix:** Check import path in create-campaign-form.tsx:
```typescript
import { ContactSelector } from './components/contact-selector';
```

### Issue: Contact count still shows 0
**Fix:** Verify the campaign API includes `_count`:
```typescript
// In campaigns.service.ts, ensure includes:
include: {
  _count: { select: { contacts: true, calls: true } }
}
```

### Issue: Contacts not appearing in selector
**Fix:** Check contact API filters:
```typescript
// Should filter for active, non-deleted contacts
where: {
  companyId,
  status: 'ACTIVE',
  deletedAt: null,
  // Don't filter by campaignId in selector (allow reassignment)
}
```

### Issue: Campaign starts despite 0 contacts
**Fix:** Check both validations:
1. Backend (campaign-api.service.ts): ✅ Already implemented
2. Frontend (campaigns page.tsx): Add validation handler

## 📚 Reference

### Key Files Created/Modified:

**Backend:**
- ✅ `apps/api/src/modules/campaign-api/campaign-api.service.ts`
- ✅ `apps/api/src/modules/campaigns/campaigns.controller.ts`
- ✅ `apps/api/src/modules/campaigns/campaigns.service.ts`

**Frontend:**
- ✅ `apps/web/src/app/dashboard/campaigns/components/contact-selector.tsx` (NEW)
- ✅ `apps/web/src/app/dashboard/campaigns/create-campaign-form.tsx` (UPDATED)
- ⚠️ `apps/web/src/lib/api.ts` or `apps/web/src/lib/api/campaign.ts` (UPDATE NEEDED)
- ⚠️ `apps/web/src/app/dashboard/campaigns/page.tsx` (UPDATE NEEDED)

### Documentation:
- `CONTACT_ASSIGNMENT_IMPLEMENTATION_PLAN.md` - Detailed plan
- `CONTACT_ASSIGNMENT_IMPLEMENTATION_STATUS.md` - Current status
- `QUICK_IMPLEMENTATION_GUIDE.md` - This guide

## 🎉 Success!

Once completed, you'll have a fully functional enterprise-grade contact assignment workflow that:
- Prevents campaigns from starting without contacts
- Shows real contact counts everywhere
- Provides excellent UX for contact selection
- Integrates seamlessly with the existing calling pipeline

**Estimated completion time: 30-60 minutes**

---

Need help? Check:
1. `CONTACT_ASSIGNMENT_IMPLEMENTATION_STATUS.md` for detailed status
2. Backend logs for API errors
3. Browser console for frontend errors
4. Database to verify contact-campaign relationships

