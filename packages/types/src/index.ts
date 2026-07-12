// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export interface User {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

// ============================================
// COMPANY TYPES
// ============================================

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CAMPAIGN TYPES
// ============================================

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Campaign {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  scriptId?: string;
  promptId?: string;
  voiceId?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONTACT TYPES
// ============================================

export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  company?: string;
  position?: string;
  timezone?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// ============================================
// SCRIPT TYPES
// ============================================

export interface Script {
  id: string;
  companyId: string;
  name: string;
  language: string;
  description?: string;
  content: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PROMPT TYPES
// ============================================

export enum PromptStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Prompt {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  content: string;
  version: string;
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// KNOWLEDGE BASE TYPES
// ============================================

export enum KnowledgeBaseType {
  FAQ = 'FAQ',
  POLICY = 'POLICY',
  PRICING = 'PRICING',
  DOCUMENTATION = 'DOCUMENTATION',
  WEBSITE = 'WEBSITE',
  CUSTOM = 'CUSTOM',
}

export interface KnowledgeBase {
  id: string;
  companyId: string;
  title: string;
  type: KnowledgeBaseType;
  content: string;
  source?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// VOICE PROFILE TYPES
// ============================================

export interface VoiceProfile {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  language: string;
  gender?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CALL TYPES
// ============================================

export enum CallStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  CALLING = 'CALLING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Call {
  id: string;
  campaignId: string;
  contactId: string;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContacts: number;
  totalCalls: number;
  completedCalls: number;
  callSuccessRate: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface ActivityLog {
  id: string;
  companyId: string;
  userId?: string;
  action: string;
  module: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface Setting {
  id: string;
  companyId: string;
  key: string;
  value: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
