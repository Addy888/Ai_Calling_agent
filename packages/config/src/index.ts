// ============================================
// APPLICATION CONFIGURATION
// ============================================

export const APP_CONFIG = {
  name: 'AI Calling Agent',
  version: '1.0.0',
  description: 'Enterprise AI Calling Agent Platform',
  author: 'AI Calling Agent Team',
};

// ============================================
// API CONFIGURATION
// ============================================

export const API_CONFIG = {
  port: process.env.API_PORT || 3001,
  host: process.env.API_HOST || 'localhost',
  prefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
};

// ============================================
// JWT CONFIGURATION
// ============================================

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-token-key',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

// ============================================
// DATABASE CONFIGURATION
// ============================================

export const DB_CONFIG = {
  url: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/ai_calling_agent',
};

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

export const FILE_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '.csv,.xlsx,.pdf,.docx').split(','),
  storagePath: process.env.STORAGE_PATH || './storage',
  contactsPath: './storage/contacts',
  recordingsPath: './storage/recordings',
  transcriptsPath: './storage/transcripts',
  knowledgeBasePath: './storage/knowledge-base',
  voicesPath: './storage/voices',
};

// ============================================
// PAGINATION CONFIGURATION
// ============================================

export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100,
};

// ============================================
// LOGGING CONFIGURATION
// ============================================

export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'debug',
  format: 'json',
};

// ============================================
// SECURITY CONFIGURATION
// ============================================

export const SECURITY_CONFIG = {
  bcryptRounds: 10,
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutes in milliseconds
};

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION_RULES = {
  email: {
    minLength: 5,
    maxLength: 255,
  },
  password: {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
  },
  phone: {
    minLength: 10,
    maxLength: 20,
  },
  name: {
    minLength: 2,
    maxLength: 100,
  },
};

// ============================================
// CAMPAIGN CONFIGURATION
// ============================================

export const CAMPAIGN_CONFIG = {
  maxContactsPerCampaign: 10000,
  maxRetries: 3,
  retryDelay: 300000, // 5 minutes
};

// ============================================
// TIMEZONE CONFIGURATION
// ============================================

export const TIMEZONE_CONFIG = {
  default: 'America/New_York',
  supported: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ],
};
