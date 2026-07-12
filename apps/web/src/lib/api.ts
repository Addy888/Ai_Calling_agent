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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
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

            const { accessToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);

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