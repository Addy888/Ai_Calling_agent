# Frontend Integration Guide - Campaign Redesign

## Overview

This guide helps you integrate the redesigned campaign workflow into the frontend.

## Key Changes

### ❌ **REMOVED from UI:**
1. Manual contact selection during campaign creation
2. "Assign Contacts" button/screen
3. Contact picker component in campaign form

### ✅ **NEW in UI:**
1. Telephony Profile selector
2. Contact file upload widget
3. Upload progress indicator
4. Validation error display
5. Campaign contact statistics

---

## API Endpoints Reference

### 1. Telephony Profiles

#### Get Available Telephony Profiles
```typescript
GET /api/v1/telephony-profiles

Response:
{
  statusCode: 200,
  message: "Telephony profiles retrieved successfully",
  data: {
    items: [
      {
        id: string,
        name: string,
        provider: "GSM_GATEWAY" | "TWILIO" | "EXOTEL" | ...,
        callerNumber: string,
        isDefault: boolean,
        isActive: boolean,
        gateway: {
          name: string,
          ipAddress: string,
          status: string,
          isOnline: boolean
        },
        sim: {
          simNumber: string,
          operator: string,
          status: string,
          signal: number
        }
      }
    ],
    total: number
  }
}
```

#### Get Available Gateways (for creating new profile)
```typescript
GET /api/v1/telephony-profiles/gateways

Response:
{
  statusCode: 200,
  data: [
    {
      id: string,
      name: string,
      ipAddress: string,
      model: string,
      status: string,
      isOnline: boolean,
      sims: [
        {
          id: string,
          simNumber: string,
          operator: string,
          portNumber: number,
          status: string,
          signal: number,
          callsToday: number,
          dailyLimit: number
        }
      ]
    }
  ]
}
```

### 2. Campaign Creation (Updated)

```typescript
POST /api/v1/campaigns

Body:
{
  name: string,
  description?: string,
  scriptId?: string,
  promptId?: string,
  voiceId?: string,
  telephonyProfileId?: string,  // NEW FIELD
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE",
  settings?: {
    concurrentCalls?: number,
    callDelay?: number,
    maxRetries?: number
  }
}

Response:
{
  success: true,
  message: "Campaign created successfully",
  data: {
    id: string,
    name: string,
    status: string,
    telephonyProfile: {
      id: string,
      name: string,
      provider: string,
      callerNumber: string
    },
    _count: {
      campaignContacts: 0
    }
  }
}
```

### 3. Contact Upload

#### Upload Contact File
```typescript
POST /api/v1/campaigns/:campaignId/contacts/upload
Content-Type: multipart/form-data

Body:
{
  file: File  // CSV, XLSX, or XLS file (max 10MB)
}

Response:
{
  statusCode: 201,
  message: "Contacts file uploaded successfully",
  data: {
    uploadId: string,
    fileName: string,
    fileSize: number,
    status: "PENDING",
    message: string
  }
}
```

#### Check Upload Status
```typescript
GET /api/v1/campaigns/:campaignId/contacts/uploads/:uploadId

Response:
{
  statusCode: 200,
  data: {
    id: string,
    status: "PENDING" | "VALIDATING" | "VALID" | "INVALID" | "PROCESSING" | "COMPLETED" | "FAILED",
    fileName: string,
    originalName: string,
    totalRows: number,
    validRows: number,
    invalidRows: number,
    duplicateRows: number,
    processedRows: number,
    validationErrors: [
      {
        row: number,
        phone?: string,
        errors: string[]
      }
    ],
    createdAt: string,
    processedAt?: string
  }
}
```

#### Get All Uploads for Campaign
```typescript
GET /api/v1/campaigns/:campaignId/contacts/uploads

Response:
{
  statusCode: 200,
  data: [
    {
      id: string,
      fileName: string,
      status: string,
      totalRows: number,
      validRows: number,
      invalidRows: number,
      createdAt: string
    }
  ]
}
```

#### Download CSV Template
```typescript
GET /api/v1/campaigns/:campaignId/contacts/template

Response: CSV file download
```

#### Get Contact Statistics
```typescript
GET /api/v1/campaigns/:campaignId/contacts/statistics

Response:
{
  statusCode: 200,
  data: {
    total: number,
    pending: number,
    queued: number,
    calling: number,
    connected: number,
    completed: number,
    failed: number,
    busy: number,
    noAnswer: number,
    invalidNumber: number,
    successRate: string  // e.g., "85.50"
  }
}
```

#### Get Campaign Contacts
```typescript
GET /api/v1/campaigns/:campaignId/contacts?limit=100&offset=0&status=PENDING

Response:
{
  statusCode: 200,
  data: {
    items: [
      {
        id: string,
        firstName: string,
        lastName: string,
        fullName: string,
        phone: string,
        email?: string,
        city?: string,
        state?: string,
        language: string,
        status: "PENDING" | "QUEUED" | "CALLING" | "COMPLETED" | ...,
        callAttempts: number,
        lastCallAt?: string,
        customFields?: object,
        createdAt: string
      }
    ],
    total: number,
    limit: number,
    offset: number
  }
}
```

---

## React Components to Create/Update

### 1. **TelephonyProfileSelector Component**

```typescript
// components/campaign/TelephonyProfileSelector.tsx
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';

interface TelephonyProfile {
  id: string;
  name: string;
  provider: string;
  callerNumber: string;
  isDefault: boolean;
  gateway: {
    name: string;
    status: string;
    isOnline: boolean;
  };
  sim: {
    simNumber: string;
    operator: string;
    signal: number;
  };
}

export function TelephonyProfileSelector({ value, onChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['telephony-profiles'],
    queryFn: async () => {
      const res = await fetch('/api/v1/telephony-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  return (
    <div className="space-y-2">
      <Label>Telephony Profile *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select telephony profile" />
        </SelectTrigger>
        <SelectContent>
          {data?.data?.items?.map(profile => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${profile.gateway.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs text-gray-500">
                    {profile.callerNumber} • {profile.sim.operator} • Signal: {profile.sim.signal}%
                  </div>
                </div>
                {profile.isDefault && (
                  <Badge variant="secondary" className="ml-auto">Default</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {!isLoading && data?.data?.items?.length === 0 && (
        <Alert variant="warning">
          <AlertDescription>
            No telephony profiles available. Please configure a GSM Gateway first.
            <Link href="/settings/telephony" className="underline ml-1">
              Configure Now
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### 2. **ContactFileUpload Component**

```typescript
// components/campaign/ContactFileUpload.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

export function ContactFileUpload({ campaignId, onUploadComplete }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/v1/campaigns/${campaignId}/contacts/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      setUploadId(data.data.uploadId);
      // Start polling for status
      pollUploadStatus(data.data.uploadId);
    }
  });
  
  // Poll upload status every 2 seconds
  const pollUploadStatus = async (uploadId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/v1/campaigns/${campaignId}/contacts/uploads/${uploadId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const data = await res.json();
      
      if (data.data.status === 'COMPLETED') {
        clearInterval(interval);
        onUploadComplete?.(data.data);
      } else if (data.data.status === 'FAILED') {
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          id="contact-file"
        />
        
        <label htmlFor="contact-file" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <div className="text-sm font-medium">
              {file ? file.name : 'Upload contact file'}
            </div>
            <div className="text-xs text-gray-500">
              CSV, XLSX, or XLS (max 10MB)
            </div>
          </div>
        </label>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={() => uploadMutation.mutate(file!)}
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Contacts'}
        </Button>
        
        <Button variant="outline" asChild>
          <a href={`/api/v1/campaigns/${campaignId}/contacts/template`}>
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </a>
        </Button>
      </div>
      
      {uploadMutation.isSuccess && (
        <UploadProgress uploadId={uploadId} campaignId={campaignId} />
      )}
    </div>
  );
}
```

### 3. **Updated CreateCampaignForm Component**

```typescript
// app/dashboard/campaigns/create-campaign-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TelephonyProfileSelector } from '@/components/campaign/TelephonyProfileSelector';
import { ContactFileUpload } from '@/components/campaign/ContactFileUpload';

const campaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE']).optional(),
  scriptId: z.string().optional(),
  promptId: z.string().optional(),
  voiceId: z.string().optional(),
  telephonyProfileId: z.string().optional(),
});

export function CreateCampaignForm({ onSuccess }) {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Upload Contacts
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  
  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      status: 'DRAFT'
    }
  });

  const onSubmit = async (data) => {
    try {
      const res = await campaignApi.create(data);
      setCreatedCampaignId(res.data.data.id);
      setStep(2); // Move to contact upload step
      toast.success('Campaign created! Now upload contacts.');
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };
  
  const handleUploadComplete = (uploadData) => {
    toast.success(`${uploadData.validRows} contacts added to campaign!`);
    onSuccess?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {step === 1 && (
        <div className="space-y-6">
          {/* Basic Fields */}
          <Input {...form.register('name')} placeholder="Campaign Name" />
          <Textarea {...form.register('description')} placeholder="Description" />
          
          {/* Script, Prompt, Voice selectors */}
          <ScriptSelector value={form.watch('scriptId')} onChange={...} />
          <PromptSelector value={form.watch('promptId')} onChange={...} />
          <VoiceSelector value={form.watch('voiceId')} onChange={...} />
          
          {/* NEW: Telephony Profile Selector */}
          <TelephonyProfileSelector 
            value={form.watch('telephonyProfileId')}
            onChange={(value) => form.setValue('telephonyProfileId', value)}
          />
          
          <Button type="submit">Create Campaign & Upload Contacts</Button>
        </div>
      )}
      
      {step === 2 && createdCampaignId && (
        <div className="space-y-6">
          <Alert>
            <AlertDescription>
              Campaign created successfully! Now upload your contact list.
            </AlertDescription>
          </Alert>
          
          {/* NEW: Contact File Upload */}
          <ContactFileUpload 
            campaignId={createdCampaignId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      )}
    </form>
  );
}
```

### 4. **CampaignContactStats Component**

```typescript
// components/campaign/CampaignContactStats.tsx
import { useQuery } from '@tanstack/react-query';

export function CampaignContactStats({ campaignId }) {
  const { data } = useQuery({
    queryKey: ['campaign-contacts-stats', campaignId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/campaigns/${campaignId}/contacts/statistics`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return res.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const stats = data?.data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total" value={stats?.total || 0} />
      <StatCard label="Pending" value={stats?.pending || 0} color="blue" />
      <StatCard label="Completed" value={stats?.completed || 0} color="green" />
      <StatCard label="Failed" value={stats?.failed || 0} color="red" />
      <StatCard label="Calling" value={stats?.calling || 0} color="yellow" />
      <StatCard label="Success Rate" value={stats?.successRate + '%' || '0%'} />
    </div>
  );
}
```

---

## State Management (Zustand Store)

```typescript
// stores/campaignStore.ts
import { create } from 'zustand';

interface CampaignStore {
  currentCampaign: Campaign | null;
  uploadStatus: UploadStatus | null;
  setCurrentCampaign: (campaign: Campaign) => void;
  setUploadStatus: (status: UploadStatus) => void;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  currentCampaign: null,
  uploadStatus: null,
  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),
  setUploadStatus: (status) => set({ uploadStatus: status }),
}));
```

---

## API Client Functions

```typescript
// lib/api/campaign-contacts.ts
export const campaignContactsApi = {
  uploadFile: async (campaignId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axios.post(
      `/api/v1/campaigns/${campaignId}/contacts/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  
  getUploadStatus: (campaignId: string, uploadId: string) => {
    return axios.get(`/api/v1/campaigns/${campaignId}/contacts/uploads/${uploadId}`);
  },
  
  getStatistics: (campaignId: string) => {
    return axios.get(`/api/v1/campaigns/${campaignId}/contacts/statistics`);
  },
  
  getContacts: (campaignId: string, params?: { limit?: number; offset?: number; status?: string }) => {
    return axios.get(`/api/v1/campaigns/${campaignId}/contacts`, { params });
  },
  
  downloadTemplate: (campaignId: string) => {
    window.open(`/api/v1/campaigns/${campaignId}/contacts/template`, '_blank');
  }
};

// lib/api/telephony-profile.ts
export const telephonyProfileApi = {
  getAll: () => axios.get('/api/v1/telephony-profiles'),
  getDefault: () => axios.get('/api/v1/telephony-profiles/default'),
  getGateways: () => axios.get('/api/v1/telephony-profiles/gateways'),
  create: (data) => axios.post('/api/v1/telephony-profiles', data),
  update: (id, data) => axios.put(`/api/v1/telephony-profiles/${id}`, data),
  delete: (id) => axios.delete(`/api/v1/telephony-profiles/${id}`),
};
```

---

## TypeScript Types

```typescript
// types/campaign.ts
export interface TelephonyProfile {
  id: string;
  name: string;
  provider: 'GSM_GATEWAY' | 'GENERIC_SIP' | 'TWILIO' | 'EXOTEL';
  callerNumber: string;
  isDefault: boolean;
  isActive: boolean;
  gateway?: {
    id: string;
    name: string;
    ipAddress: string;
    status: string;
    isOnline: boolean;
  };
  sim?: {
    id: string;
    simNumber: string;
    operator: string;
    status: string;
    signal: number;
  };
}

export interface CampaignContact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  language: string;
  status: ContactCallStatus;
  callAttempts: number;
  lastCallAt?: string;
  customFields?: Record<string, any>;
  createdAt: string;
}

export enum ContactCallStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  CALLING = 'CALLING',
  CONNECTED = 'CONNECTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BUSY = 'BUSY',
  NO_ANSWER = 'NO_ANSWER',
  INVALID_NUMBER = 'INVALID_NUMBER',
  DO_NOT_CALL = 'DO_NOT_CALL',
  SKIPPED = 'SKIPPED'
}

export interface UploadStatus {
  id: string;
  fileName: string;
  originalName: string;
  status: 'PENDING' | 'VALIDATING' | 'VALID' | 'INVALID' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  processedRows: number;
  validationErrors?: Array<{
    row: number;
    phone?: string;
    errors: string[];
  }>;
  createdAt: string;
  processedAt?: string;
}
```

---

## File Upload Guidelines

### Accepted Formats
- CSV (.csv)
- Excel (.xlsx, .xls)
- Maximum size: 10MB

### CSV Structure
```csv
firstName,lastName,phone,email,city,state,language
John,Doe,9876543210,john@example.com,Mumbai,Maharashtra,en
Jane,Smith,9876543211,jane@example.com,Delhi,Delhi,hi
```

### Validation Rules
- **Phone:** 10 digits, starts with 6-9, optional +91 prefix
- **Email:** Standard email format (optional)
- **Names:** Minimum 2 characters each
- **Language:** Valid code (en, hi, mr, te, ta, kn, gu, bn, ml, pa)

### Error Handling
Display validation errors in a user-friendly format:
```typescript
{validationErrors?.map(error => (
  <Alert key={error.row} variant="destructive">
    Row {error.row}: {error.phone} - {error.errors.join(', ')}
  </Alert>
))}
```

---

## Testing Checklist

- [ ] Telephony profile selector loads profiles
- [ ] Telephony profile selector shows gateway status
- [ ] File upload accepts CSV/XLSX files
- [ ] File upload rejects invalid formats
- [ ] Upload progress shows status updates
- [ ] Validation errors display correctly
- [ ] Contact statistics update in real-time
- [ ] Campaign creation includes telephony profile
- [ ] Contact list displays uploaded contacts
- [ ] Template download works

---

## Migration Notes

### Removing Old Code
Search and remove:
- `ContactSelector` component
- `assignContacts` API calls
- Manual contact assignment UI
- Contact picker dialogs

### Backward Compatibility
- Old campaigns with `Contact.campaignId` still work
- New campaigns use `CampaignContact` table
- Both are displayed in campaign detail view

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify API endpoints return correct data
3. Check file upload size limits
4. Verify authentication tokens
5. Test with sample CSV template

---

**Next:** Implement these components and test the complete workflow!
