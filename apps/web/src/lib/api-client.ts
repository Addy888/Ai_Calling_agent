import { api } from './api'
import type {
  Company,
  User,
  Role,
  Permission,
  Contact,
  PaginatedResponse,
  ApiResponse,
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignPermissionsDto,
  AssignRoleDto,
  ResetPasswordDto,
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  BulkContactDto,
  BulkUpdateContactDto,
  ImportSummaryDto,
} from '@/types'

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Companies API
export const companiesApi = {
  getAll: (params?: QueryParams) =>
    api.get<ApiResponse<PaginatedResponse<Company>>>('/companies', { params }),
  
  getById: (id: string) =>
    api.get<ApiResponse<Company>>(`/companies/${id}`),
  
  create: (data: CreateCompanyDto) =>
    api.post<ApiResponse<Company>>('/companies', data),
  
  update: (id: string, data: UpdateCompanyDto) =>
    api.patch<ApiResponse<Company>>(`/companies/${id}`, data),
  
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/companies/${id}`),
  
  uploadLogo: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<{ logo: string }>>(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  getSettings: (id: string) =>
    api.get<ApiResponse<any>>(`/companies/${id}/settings`),
  
  updateSettings: (id: string, settings: Record<string, any>) =>
    api.patch<ApiResponse<any>>(`/companies/${id}/settings`, settings),
}

// Users API
export const usersApi = {
  getAll: (params?: QueryParams) =>
    api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params }),
  
  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),
  
  create: (data: CreateUserDto) =>
    api.post<ApiResponse<User>>('/users', data),
  
  update: (id: string, data: UpdateUserDto) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, data),
  
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/users/${id}`),
  
  activate: (id: string) =>
    api.patch<ApiResponse<void>>(`/users/${id}/activate`),
  
  deactivate: (id: string) =>
    api.patch<ApiResponse<void>>(`/users/${id}/deactivate`),
  
  resetPassword: (id: string, data: ResetPasswordDto) =>
    api.post<ApiResponse<void>>(`/users/${id}/reset-password`, data),
  
  assignRole: (id: string, data: AssignRoleDto) =>
    api.post<ApiResponse<void>>(`/users/${id}/roles`, data),
  
  removeRole: (id: string, roleId: string) =>
    api.delete<ApiResponse<void>>(`/users/${id}/roles/${roleId}`),
  
  getProfile: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}/profile`),
  
  updateProfile: (id: string, data: UpdateUserDto) =>
    api.patch<ApiResponse<User>>(`/users/${id}/profile`, data),
}

// Roles API
export const rolesApi = {
  getAll: (params?: QueryParams) =>
    api.get<ApiResponse<PaginatedResponse<Role>>>('/roles', { params }),
  
  getById: (id: string) =>
    api.get<ApiResponse<Role>>(`/roles/${id}`),
  
  create: (data: CreateRoleDto) =>
    api.post<ApiResponse<Role>>('/roles', data),
  
  update: (id: string, data: UpdateRoleDto) =>
    api.patch<ApiResponse<Role>>(`/roles/${id}`, data),
  
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/roles/${id}`),
  
  assignPermissions: (id: string, data: AssignPermissionsDto) =>
    api.post<ApiResponse<Role>>(`/roles/${id}/permissions`, data),
  
  getPermissions: () =>
    api.get<ApiResponse<Record<string, Permission[]>>>('/roles/permissions'),
}

// Permissions API
export const permissionsApi = {
  getAll: (params?: QueryParams) =>
    api.get<ApiResponse<PaginatedResponse<Permission>>>('/permissions', { params }),
  
  getById: (id: string) =>
    api.get<ApiResponse<Permission>>(`/permissions/${id}`),
  
  create: (data: CreatePermissionDto) =>
    api.post<ApiResponse<Permission>>('/permissions', data),
  
  update: (id: string, data: UpdatePermissionDto) =>
    api.patch<ApiResponse<Permission>>(`/permissions/${id}`, data),
  
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/permissions/${id}`),
  
  getGrouped: () =>
    api.get<ApiResponse<Record<string, Permission[]>>>('/permissions/grouped'),
  
  seed: () =>
    api.post<ApiResponse<{ created: number; total: number }>>('/permissions/seed'),
}

// Contacts API
export const contactsApi = {
  getAll: (params?: QueryParams & ContactFilterDto) =>
    api.get<ApiResponse<PaginatedResponse<Contact>>>('/contacts', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Contact>>(`/contacts/${id}`),

  create: (data: CreateContactDto) =>
    api.post<ApiResponse<Contact>>('/contacts', data),

  update: (id: string, data: UpdateContactDto) =>
    api.patch<ApiResponse<Contact>>(`/contacts/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/contacts/${id}`),

  bulkDelete: (data: BulkContactDto) =>
    api.post<ApiResponse<{ deleted: number }>>('/contacts/bulk-delete', data),

  bulkUpdate: (data: BulkUpdateContactDto) =>
    api.post<ApiResponse<{ updated: number }>>('/contacts/bulk-update', data),

  bulkUpload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<ImportSummaryDto>>('/contacts/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getTemplate: () =>
    `${process.env.NEXT_PUBLIC_API_URL}/contacts/template`,

  getExportUrl: (params?: ContactFilterDto) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return `${process.env.NEXT_PUBLIC_API_URL}/contacts/export${qs}`
  },

  getImportHistory: () =>
    api.get<ApiResponse<any[]>>('/contacts/import-history'),
}
