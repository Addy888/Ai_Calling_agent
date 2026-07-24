export interface Company {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  website?: string
  logo?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
  _count?: {
    users: number
    campaigns: number
    contacts: number
  }
}

export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  status: string
  isActive: boolean
  emailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  company?: Company
  roles?: UserRole[]
}

export interface Role {
  id: string
  name: string
  slug: string
  description?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
  permissions?: RolePermission[]
  _count?: {
    users: number
    permissions: number
  }
}

export interface Permission {
  id: string
  name: string
  slug: string
  module: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  _count?: {
    roles: number
  }
}

export interface UserRole {
  id: string
  userId: string
  roleId: string
  createdAt: string
  role: Role
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  createdAt: string
  permission: Permission
}

export interface PaginationMeta {
  total: number
  totalItems: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface CreateCompanyDto {
  name: string
  email: string
  phone?: string
  address?: string
  website?: string
  isActive?: boolean
}

export interface UpdateCompanyDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  isActive?: boolean
}

export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  companyId: string
  isActive?: boolean
}

export interface UpdateUserDto {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
  companyId?: string
  isActive?: boolean
}

export interface CreateRoleDto {
  name: string
  slug: string
  description?: string
  isActive?: boolean
}

export interface UpdateRoleDto {
  name?: string
  slug?: string
  description?: string
  isActive?: boolean
}

export interface CreatePermissionDto {
  name: string
  slug: string
  module: string
  description?: string
}

export interface UpdatePermissionDto {
  name?: string
  slug?: string
  module?: string
  description?: string
}

export interface AssignPermissionsDto {
  permissionIds: string[]
}

export interface AssignRoleDto {
  roleId: string
}

export interface ResetPasswordDto {
  newPassword: string
}

// ── Contact types ────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  companyId: string
  campaignId?: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  countryCode?: string
  email?: string
  language: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  company?: string
  designation?: string
  tags?: string[]
  notes?: string
  status: string
  isDuplicate: boolean
  lastCalledAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface CreateContactDto {
  firstName: string
  lastName: string
  phone: string
  countryCode?: string
  email?: string
  language?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  company?: string
  designation?: string
  tags?: string[]
  notes?: string
  campaignId?: string
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  status?: string
  isDuplicate?: boolean
  lastCalledAt?: string
}

export interface ContactFilterDto {
  search?: string
  status?: string
  language?: string
  country?: string
  campaignId?: string
  tags?: string[]
  createdAfter?: string
  createdBefore?: string
  isDuplicate?: boolean
}

export interface BulkContactDto {
  contactIds: string[]
}

export interface BulkUpdateContactDto extends BulkContactDto {
  status?: string
  addTags?: string[]
  removeTags?: string[]
  campaignId?: string
}

export interface ImportSummaryDto {
  totalRows: number
  imported: number
  duplicates: number
  invalid: number
  failed: number
  errors?: Array<{ row: number; error: string }>
}

// ── Campaign types ───────────────────────────────────────────────────────────

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Campaign {
  id: string
  companyId: string
  userId: string
  name: string
  description?: string
  status: CampaignStatus
  scriptId?: string
  promptId?: string
  voiceId?: string
  startDate?: string
  endDate?: string
  timezone?: string
  settings?: any
  tags?: string[]
  notes?: string
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  company?: Company
  user?: User
  script?: Script
  prompt?: Prompt
  contacts?: Contact[]
  _count?: {
    contacts: number
    calls: number
  }
  statistics?: CampaignStatistics
}

export interface CampaignStatistics {
  contacts: {
    total: number
    byStatus: Record<string, number>
  }
  calls: {
    total: number
    byStatus: Record<string, number>
  }
}

export interface CreateCampaignDto {
  name: string
  description?: string
  scriptId?: string
  promptId?: string
  voiceId?: string
  status?: CampaignStatus
  settings?: any
  tags?: string[]
  notes?: string
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {}

export interface CampaignFilterDto {
  search?: string
  status?: CampaignStatus[]
  userId?: string
  scriptId?: string
  promptId?: string
  startDateFrom?: string
  startDateTo?: string
  createdAfter?: string
  createdBefore?: string
  includeArchived?: boolean
}

export interface AssignContactsDto {
  contactIds: string[]
}

export interface AssignScriptDto {
  scriptId?: string
}

export interface AssignPromptDto {
  promptId?: string
}

// ── Script types ─────────────────────────────────────────────────────────────

export enum ScriptLanguage {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
}

export interface Script {
  id: string
  companyId: string
  name: string
  language: ScriptLanguage
  description?: string
  content: string
  version: string
  status: string
  isActive: boolean
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  campaigns?: Campaign[]
  _count?: {
    campaigns: number
  }
}

export interface CreateScriptDto {
  name: string
  content: string
  description?: string
  language?: ScriptLanguage
  version?: string
  isActive?: boolean
  status?: string
}

export interface UpdateScriptDto extends Partial<CreateScriptDto> {}

export interface ScriptFilterDto {
  search?: string
  language?: ScriptLanguage
  isActive?: boolean
  status?: string
}

// ── Prompt types ─────────────────────────────────────────────────────────────

export enum PromptStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Prompt {
  id: string
  companyId: string
  name: string
  description?: string
  content: string
  version: string
  status: PromptStatus
  temperature?: number
  maxTokens?: number
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  campaigns?: Campaign[]
  _count?: {
    campaigns: number
  }
}

export interface CreatePromptDto {
  name: string
  content: string
  description?: string
  version?: string
  status?: PromptStatus
  temperature?: number
  maxTokens?: number
}

export interface UpdatePromptDto extends Partial<CreatePromptDto> {}

export interface PromptFilterDto {
  search?: string
  status?: PromptStatus[]
  createdAfter?: string
  createdBefore?: string
}
