import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilterDto,
  AssignContactsDto,
  AssignScriptDto,
  AssignPromptDto,
  Script,
  CreateScriptDto,
  UpdateScriptDto,
  ScriptFilterDto,
  Prompt,
  CreatePromptDto,
  UpdatePromptDto,
  PromptFilterDto,
  Contact,
  CampaignStatistics,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export as apiClient for compatibility
export const apiClient = api;

// Helper: decode JWT payload without verifying (client-side only)
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// Helper: proactive token refresh if token expires within 60 seconds
async function ensureFreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const nowSec = Math.floor(Date.now() / 1000);

  // If token expires within 60 seconds, refresh it proactively
  if (payload?.exp && payload.exp - nowSec < 60) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
      return accessToken;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
      return null;
    }
  }

  return token;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      const token = await ensureFreshToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } else {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ── Campaign API ─────────────────────────────────────────────────────────────

export const campaignApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: CampaignFilterDto;
  }) => 
    api.get<ApiResponse<PaginatedResponse<Campaign>>>('/campaigns', { params }),

  getById: (id: string) => 
    api.get<ApiResponse<Campaign>>(`/campaigns/${id}`),

  create: (data: CreateCampaignDto) => 
    api.post<ApiResponse<Campaign>>('/campaigns', data),

  update: (id: string, data: UpdateCampaignDto) => 
    api.patch<ApiResponse<Campaign>>(`/campaigns/${id}`, data),

  updateStatus: (id: string, status: string) => 
    api.patch<ApiResponse<Campaign>>(`/campaigns/${id}/status`, { status }),

  clone: (id: string, name: string) => 
    api.post<ApiResponse<Campaign>>(`/campaigns/${id}/clone`, { name }),

  archive: (id: string) => 
    api.patch<ApiResponse<{ message: string }>>(`/campaigns/${id}/archive`),

  restore: (id: string) => 
    api.patch<ApiResponse<{ message: string }>>(`/campaigns/${id}/restore`),

  delete: (id: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/campaigns/${id}`),

  assignContacts: (id: string, data: AssignContactsDto) => 
    api.post<ApiResponse<{ assigned: number }>>(`/campaigns/${id}/contacts/assign`, data),

  removeContacts: (id: string, data: AssignContactsDto) => 
    api.post<ApiResponse<{ removed: number }>>(`/campaigns/${id}/contacts/remove`, data),

  assignScript: (id: string, data: AssignScriptDto) => 
    api.patch<ApiResponse<Campaign>>(`/campaigns/${id}/script`, data),

  assignPrompt: (id: string, data: AssignPromptDto) => 
    api.patch<ApiResponse<Campaign>>(`/campaigns/${id}/prompt`, data),

  getStatistics: (id: string) => 
    api.get<ApiResponse<CampaignStatistics>>(`/campaigns/${id}/statistics`),

  start: (id: string, options?: { concurrentCalls?: number }) => 
    api.post<ApiResponse<{ executionId: string; status: string }>>(`/campaign-api/${id}/start`, options),

  pause: (id: string) => 
    api.post<ApiResponse<{ success: boolean }>>(`/campaign-api/${id}/pause`),

  resume: (id: string) => 
    api.post<ApiResponse<{ success: boolean }>>(`/campaign-api/${id}/resume`),

  stop: (id: string, force?: boolean) => 
    api.post<ApiResponse<{ success: boolean }>>(`/campaign-api/${id}/stop`, { force }),
};

// ── Script API ───────────────────────────────────────────────────────────────

export const scriptApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: ScriptFilterDto;
  }) => 
    api.get<ApiResponse<PaginatedResponse<Script>>>('/scripts', { params }),

  getById: (id: string) => 
    api.get<ApiResponse<Script>>(`/scripts/${id}`),

  create: (data: CreateScriptDto) => 
    api.post<ApiResponse<Script>>('/scripts', data),

  update: (id: string, data: UpdateScriptDto) => 
    api.patch<ApiResponse<Script>>(`/scripts/${id}`, data),

  delete: (id: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/scripts/${id}`),

  restore: (id: string) => 
    api.patch<ApiResponse<{ message: string }>>(`/scripts/${id}/restore`),

  duplicate: (id: string, name: string) => 
    api.post<ApiResponse<Script>>(`/scripts/${id}/duplicate`, { name }),

  getVersionHistory: (id: string) => 
    api.get<ApiResponse<any[]>>(`/scripts/${id}/versions`),

  preview: (id: string, sampleData?: any) => 
    api.post<ApiResponse<any>>(`/scripts/${id}/preview`, sampleData),
};

// ── Prompt API ───────────────────────────────────────────────────────────────

export const promptApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: PromptFilterDto;
  }) => 
    api.get<ApiResponse<PaginatedResponse<Prompt>>>('/prompts', { params }),

  getById: (id: string) => 
    api.get<ApiResponse<Prompt>>(`/prompts/${id}`),

  create: (data: CreatePromptDto) => 
    api.post<ApiResponse<Prompt>>('/prompts', data),

  update: (id: string, data: UpdatePromptDto) => 
    api.patch<ApiResponse<Prompt>>(`/prompts/${id}`, data),

  delete: (id: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/prompts/${id}`),

  restore: (id: string) => 
    api.patch<ApiResponse<{ message: string }>>(`/prompts/${id}/restore`),

  duplicate: (id: string, name: string) => 
    api.post<ApiResponse<Prompt>>(`/prompts/${id}/duplicate`, { name }),

  updateStatus: (id: string, status: string) => 
    api.patch<ApiResponse<Prompt>>(`/prompts/${id}/status`, { status }),
};

// ── Script Engine API ────────────────────────────────────────────────────────

export const scriptEngineApi = {
  createVersion: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/versions', data),

  getVersion: (id: string) =>
    api.get<ApiResponse<any>>(`/script-engine/versions/${id}`),

  updateVersion: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/script-engine/versions/${id}`, data),

  publishVersion: (id: string) =>
    api.post<ApiResponse<any>>(`/script-engine/versions/${id}/publish`, {}),

  archiveVersion: (id: string) =>
    api.post<ApiResponse<any>>(`/script-engine/versions/${id}/archive`, {}),

  cloneVersion: (id: string, newVersion: string) =>
    api.post<ApiResponse<any>>(`/script-engine/versions/${id}/clone`, { newVersion }),

  validateScript: (versionId: string) =>
    api.post<ApiResponse<any>>('/script-engine/versions/validate', { versionId }),

  executeScript: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/versions/execute', data),

  previewScript: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/versions/preview', data),

  createNode: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/nodes', data),

  getNode: (id: string) =>
    api.get<ApiResponse<any>>(`/script-engine/nodes/${id}`),

  updateNode: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/script-engine/nodes/${id}`, data),

  deleteNode: (id: string) =>
    api.delete<ApiResponse<any>>(`/script-engine/nodes/${id}`),

  createBranch: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/branches', data),

  getBranch: (id: string) =>
    api.get<ApiResponse<any>>(`/script-engine/branches/${id}`),

  updateBranch: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/script-engine/branches/${id}`, data),

  deleteBranch: (id: string) =>
    api.delete<ApiResponse<any>>(`/script-engine/branches/${id}`),

  createVariable: (data: any) =>
    api.post<ApiResponse<any>>('/script-engine/variables', data),

  getVariable: (id: string) =>
    api.get<ApiResponse<any>>(`/script-engine/variables/${id}`),

  updateVariable: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/script-engine/variables/${id}`, data),

  deleteVariable: (id: string) =>
    api.delete<ApiResponse<any>>(`/script-engine/variables/${id}`),
};

// ── Contact API ─────────────────────────────────────────────────────────────
export const contactApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) =>
    api.get<ApiResponse<PaginatedResponse<Contact>>>('/contacts', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Contact>>(`/contacts/${id}`),

  create: (data: any) =>
    api.post<ApiResponse<Contact>>('/contacts', data),

  update: (id: string, data: any) =>
    api.patch<ApiResponse<Contact>>(`/contacts/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/contacts/${id}`),

  import: (formData: FormData) =>
    api.post<ApiResponse<{ imported: number }>>('/contacts/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  export: (params?: { search?: string; status?: string }) =>
    api.get('/contacts/export', { params, responseType: 'blob' }),
};

// ── Telephony Profile API ─────────────────────────────────────────────────────

export const telephonyProfileApi = {
  getAll: (params?: { isActive?: boolean; isDefault?: boolean }) =>
    api.get<ApiResponse<{ items: any[]; total: number }>>('/api/v1/telephony-profiles', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/v1/telephony-profiles/${id}`),

  getDefault: () =>
    api.get<ApiResponse<any>>('/api/v1/telephony-profiles/default'),

  getAvailableGateways: () =>
    api.get<ApiResponse<any[]>>('/api/v1/telephony-profiles/gateways'),

  create: (data: any) =>
    api.post<ApiResponse<any>>('/api/v1/telephony-profiles', data),

  update: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/api/v1/telephony-profiles/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/api/v1/telephony-profiles/${id}`),
};

// ── AI Agent API ──────────────────────────────────────────────────────────────

export const aiAgentApi = {
  getAll: (params?: { status?: string; isEnabled?: boolean; limit?: number }) =>
    api.get<ApiResponse<any>>('/ai-agents', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/ai-agents/${id}`),
};

// ── Voice Library API ─────────────────────────────────────────────────────────

export const voiceLibraryApi = {
  getAll: (params?: { language?: string; gender?: string }) =>
    api.get<ApiResponse<any[]>>('/api/v1/voice-studio/voices', { params }),
};

// ── Knowledge Base API ────────────────────────────────────────────────────────

export const knowledgeBaseApi = {
  getAll: (params?: { search?: string; isActive?: boolean; limit?: number }) =>
    api.get<ApiResponse<any>>('/knowledge-base', { params }),
};

// ── Campaign Contacts Upload API ──────────────────────────────────────────────

export const campaignContactsApi = {
  uploadFile: (campaignId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ uploadId: string; status: string; message: string }>>(
      `/api/v1/campaigns/${campaignId}/contacts/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  getUploadStatus: (campaignId: string, uploadId: string) =>
    api.get<ApiResponse<any>>(`/api/v1/campaigns/${campaignId}/contacts/uploads/${uploadId}`),

  getUploads: (campaignId: string) =>
    api.get<ApiResponse<any[]>>(`/api/v1/campaigns/${campaignId}/contacts/uploads`),

  getStatistics: (campaignId: string) =>
    api.get<ApiResponse<any>>(`/api/v1/campaigns/${campaignId}/contacts/statistics`),

  downloadTemplate: () =>
    api.get('/api/v1/campaigns/template/contacts/template', { responseType: 'blob' }),
};

