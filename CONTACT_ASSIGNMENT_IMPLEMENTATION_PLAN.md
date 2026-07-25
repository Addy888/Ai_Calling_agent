# Contact Assignment Workflow - Implementation Plan

## 🎯 Objective
Implement a complete Contact Assignment workflow so campaigns can associate contacts before starting outbound calls.

## 📋 Current State Analysis

### ✅ Already Implemented:
1. **Database Schema**: Contact model has `campaignId` field
2. **Backend APIs**: 
   - `POST /campaigns/:id/contacts/assign` - Assign contacts
   - `POST /campaigns/:id/contacts/remove` - Remove contacts
3. **Contact Import**: Working Excel/CSV import
4. **Calling Pipeline**: Ready to process contacts

### ❌ Missing:
1. **Frontend UI** for contact selection in campaign create/edit
2. **Validation** to prevent campaign start with 0 contacts
3. **Campaign details page** showing assigned contacts
4. **Contact counts** in campaign list

## 🔧 Implementation Steps

### Step 1: Backend Enhancements

#### A. Add validation to campaign start
**File:** `apps/api/src/modules/campaign-api/campaign-api.service.ts`

```typescript
async startCampaign(campaignId: string, options) {
  // ... existing code ...
  
  // NEW: Validate contacts
  const contactCount = await this.prisma.contact.count({
    where: { campaignId, status: 'ACTIVE', deletedAt: null }
  });
  
  if (contactCount === 0) {
    throw new BadRequestException('Campaign has no assigned contacts. Please assign contacts before starting.');
  }
  
  // Continue with existing logic...
}
```

#### B. Add contact list endpoint
**File:** `apps/api/src/modules/campaigns/campaigns.controller.ts`

```typescript
@Get(':id/contacts')
@ApiOperation({ summary: 'Get contacts assigned to campaign' })
getContacts(
  @Param('id') id: string,
  @CurrentUser('companyId') companyId: string,
  @Query() query: PaginationDto,
) {
  return this.campaignService.getContacts(id, companyId, query);
}
```

**File:** `apps/api/src/modules/campaigns/campaigns.service.ts`

```typescript
async getContacts(id: string, companyId: string, pagination: PaginationDto) {
  const campaign = await this.prisma.campaign.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!campaign) {
    throw new NotFoundException('Campaign not found');
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [contacts, total] = await Promise.all([
    this.prisma.contact.findMany({
      where: { campaignId: id, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.contact.count({
      where: { campaignId: id, deletedAt: null },
    }),
  ]);

  return {
    success: true,
    data: createPaginatedResponse(contacts, total, page, limit),
  };
}
```

### Step 2: Frontend - Campaign Create/Edit Form

#### A. Add Contact Selection Component
**File:** `apps/web/src/app/dashboard/campaigns/components/contact-selector.tsx`

Features:
- Multi-select contacts with checkboxes
- Search by name/phone
- Select All / Deselect All
- Show selected count
- Pagination
- Filter by status

```typescript
interface ContactSelectorProps {
  campaignId?: string;
  selectedContactIds: string[];
  onSelectionChange: (contactIds: string[]) => void;
}
```

#### B. Update Create Campaign Form
**File:** `apps/web/src/app/dashboard/campaigns/create-campaign-form.tsx`

Add new section after prompts:

```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Contacts</Label>
    <Badge>{selectedContacts.length} selected</Badge>
  </div>
  <ContactSelector
    selectedContactIds={selectedContacts}
    onSelectionChange={setSelectedContacts}
  />
</div>
```

After campaign creation, assign contacts:

```typescript
const campaign = await campaignApi.create(data);
if (selectedContacts.length > 0) {
  await campaignApi.assignContacts(campaign.id, selectedContacts);
}
```

#### C. Update Edit Campaign Page
**File:** `apps/web/src/app/dashboard/campaigns/[id]/edit/page.tsx`

Same contact selector, but pre-load assigned contacts:

```typescript
useEffect(() => {
  loadCampaign();
  loadAssignedContacts();
}, [campaignId]);
```

### Step 3: Frontend - Campaign Details Page

#### A. Add Assigned Contacts Tab
**File:** `apps/web/src/app/dashboard/campaigns/[id]/page.tsx`

Add new tab "Contacts" showing:
- Total count
- Table with: Name, Phone, Email, Status, Last Called
- Actions: Remove from campaign
- Button: Add More Contacts

### Step 4: Frontend - Campaign List

#### A. Fix Contact Count Display
**File:** `apps/web/src/app/dashboard/campaigns/page.tsx`

Update columns to show actual count:

```tsx
{
  key: '_count.contacts',
  label: 'Contacts',
  render: (value: any, campaign: Campaign) => {
    const count = campaign._count?.contacts || 0;
    return (
      <Badge variant={count === 0 ? 'destructive' : 'secondary'}>
        {count}
      </Badge>
    );
  },
}
```

### Step 5: Frontend - Start Campaign Validation

#### A. Add validation before API call
**File:** `apps/web/src/app/dashboard/campaigns/page.tsx`

```typescript
const handleStartCampaign = async (campaign: Campaign) => {
  const contactCount = campaign._count?.contacts || 0;
  
  if (contactCount === 0) {
    toast({
      title: 'Cannot Start Campaign',
      description: 'This campaign has no assigned contacts. Please assign contacts first.',
      variant: 'destructive',
    });
    return;
  }
  
  // Show confirmation dialog
  // Call API to start
};
```

### Step 6: API Client Updates

#### A. Add new methods
**File:** `apps/web/src/lib/api/campaign.ts`

```typescript
// Get campaign contacts
getContacts(campaignId: string, params: PaginationParams) {
  return api.get(`/campaigns/${campaignId}/contacts`, { params });
}

// Assign contacts
assignContacts(campaignId: string, contactIds: string[]) {
  return api.post(`/campaigns/${campaignId}/contacts/assign`, { contactIds });
}

// Remove contacts
removeContacts(campaignId: string, contactIds: string[]) {
  return api.post(`/campaigns/${campaignId}/contacts/remove`, { contactIds });
}
```

### Step 7: Types Updates

#### A. Add types
**File:** `apps/web/src/types/campaign.ts`

```typescript
export interface CampaignWithCounts extends Campaign {
  _count: {
    contacts: number;
    calls: number;
  };
}

export interface AssignContactsDto {
  contactIds: string[];
}
```

## 📊 UI Components Needed

### 1. ContactSelector Component
```
┌─────────────────────────────────────┐
│ 🔍 Search contacts...               │
├─────────────────────────────────────┤
│ □ Select All (250 contacts)         │
├─────────────────────────────────────┤
│ ☑ John Doe          +1234567890     │
│ ☑ Jane Smith        +0987654321     │
│ □ Bob Johnson       +1122334455     │
│ ...                                  │
├─────────────────────────────────────┤
│ ← Previous    50 selected    Next → │
└─────────────────────────────────────┘
```

### 2. Campaign Create Form
```
┌─────────────────────────────────────┐
│ Create Campaign                      │
├─────────────────────────────────────┤
│ Name: [____________]                 │
│ Description: [__________]            │
│ Script: [Select ▼]                  │
│ Prompt: [Select ▼]                  │
├─────────────────────────────────────┤
│ Select Contacts           25 selected│
│ [Contact Selector Component]         │
├─────────────────────────────────────┤
│          [Cancel] [Create Campaign]  │
└─────────────────────────────────────┘
```

### 3. Campaign Details - Contacts Tab
```
┌─────────────────────────────────────┐
│ Campaign Details                     │
│ [Overview] [Contacts] [Calls]        │
├─────────────────────────────────────┤
│ Assigned Contacts (25)               │
│ [+ Add Contacts]                     │
├─────────────────────────────────────┤
│ Name          Phone        Status    │
│ John Doe      +123456789   Active    │
│ Jane Smith    +098765432   Active    │
│ ...                                   │
└─────────────────────────────────────┘
```

## 🧪 Testing Checklist

### Backend:
- [ ] Assign contacts to campaign
- [ ] Remove contacts from campaign
- [ ] Get campaign contacts with pagination
- [ ] Start campaign validation (0 contacts = error)
- [ ] Start campaign with contacts (success)

### Frontend:
- [ ] Create campaign with contact selection
- [ ] Edit campaign and modify contacts
- [ ] View campaign details with contacts tab
- [ ] Search contacts in selector
- [ ] Select all / deselect all
- [ ] Campaign list shows correct contact count
- [ ] Cannot start campaign with 0 contacts
- [ ] Can start campaign with contacts

### Integration:
- [ ] Assign contacts → Start campaign → Contacts loaded in queue
- [ ] Runtime monitor shows calls from assigned contacts
- [ ] Call history linked to correct campaign

## 📝 Implementation Order

1. ✅ **Backend validation** (30 min)
   - Add contact count validation to startCampaign
   - Add getContacts endpoint

2. ✅ **ContactSelector component** (2 hours)
   - Build reusable component
   - Add search, select all, pagination

3. ✅ **Update Campaign Forms** (1 hour)
   - Add contact selector to create form
   - Add contact selector to edit form

4. ✅ **Campaign Details Page** (1 hour)
   - Add Contacts tab
   - Show assigned contacts table

5. ✅ **Campaign List** (30 min)
   - Fix contact count display
   - Add visual indicator for 0 contacts

6. ✅ **Start Campaign Flow** (30 min)
   - Add validation UI
   - Show error message

7. ✅ **Testing** (1 hour)
   - End-to-end testing
   - Edge cases

**Total Estimated Time: 6-7 hours**

## 🚀 Success Criteria

✅ Campaign create/edit includes contact selection
✅ Campaign list shows accurate contact counts
✅ Campaign details displays assigned contacts
✅ Cannot start campaign with 0 contacts (validation + UI)
✅ Starting campaign loads assigned contacts into queue
✅ Runtime Monitor shows calls from campaign contacts
✅ Enterprise-grade UI matching existing design

---

**Status:** Ready for implementation
**Priority:** High
**Complexity:** Medium

