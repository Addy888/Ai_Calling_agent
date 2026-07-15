import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
} from 'class-validator';

export enum AgentType {
  CONVERSATIONAL = 'CONVERSATIONAL',
  ANALYTICAL = 'ANALYTICAL',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  CUSTOM = 'CUSTOM',
}

export enum AgentStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  LOADING = 'LOADING',
  READY = 'READY',
  THINKING = 'THINKING',
  RESPONDING = 'RESPONDING',
  WAITING = 'WAITING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  RECOVERING = 'RECOVERING',
}

export class CreateAIAgentDto {
  @ApiProperty()
  @IsString()
  agentName: string;

  @ApiProperty({ enum: AgentType })
  @IsEnum(AgentType)
  agentType: AgentType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  promptId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  knowledgeBaseIds?: string[];

  @ApiProperty()
  @IsObject()
  configuration: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAIAgentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentName?: string;

  @ApiPropertyOptional({ enum: AgentStatus })
  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  promptId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  knowledgeBaseIds?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AgentActionDto {
  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  agentId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionVariables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionContext?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionMetadata?: Record<string, any>;
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionVariables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionContext?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sessionMetadata?: Record<string, any>;
}

export class RuntimeConfigurationDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  responseTimeout?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  memoryLimit?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxContextLength?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fallbackStrategy?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxRetryCount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  loggingLevel?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  debugMode?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  evaluationMode?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enableCaching?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enableParallelization?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sessionTimeout?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxConcurrentSessions?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  ERROR = 'ERROR',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL',
}

export enum EventType {
  AGENT_STARTED = 'AGENT_STARTED',
  AGENT_STOPPED = 'AGENT_STOPPED',
  AGENT_PAUSED = 'AGENT_PAUSED',
  AGENT_RESUMED = 'AGENT_RESUMED',
  AGENT_ERROR = 'AGENT_ERROR',
  AGENT_RECOVERED = 'AGENT_RECOVERED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_CLOSED = 'SESSION_CLOSED',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_RESUMED = 'SESSION_RESUMED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RUNTIME_READY = 'RUNTIME_READY',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  STATE_CHANGED = 'STATE_CHANGED',
  HEALTH_UPDATE = 'HEALTH_UPDATE',
  PERFORMANCE_ALERT = 'PERFORMANCE_ALERT',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
}

export enum EventSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export class ExecuteConversationTurnDto {
  @ApiProperty({ description: 'User input text' })
  @IsString()
  userInput: string;

  @ApiPropertyOptional({ description: 'Turn context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class CreateConversationDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsString()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Initial context' })
  @IsObject()
  @IsOptional()
  conversationContext?: Record<string, any>;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'Conversation state' })
  @IsString()
  @IsOptional()
  currentState?: string;

  @ApiPropertyOptional({ description: 'Conversation context' })
  @IsObject()
  @IsOptional()
  conversationContext?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Conversation variables' })
  @IsObject()
  @IsOptional()
  conversationVariables?: Record<string, any>;
}

export class GetAgentsFilterDto {
  @ApiPropertyOptional({ enum: AgentStatus })
  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Is enabled' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class GetSessionsFilterDto {
  @ApiPropertyOptional({ description: 'Agent ID' })
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsString()
  @IsOptional()
  contactId?: string;
}

export class RecordHealthCheckDto {
  @ApiProperty({ enum: HealthStatus })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiPropertyOptional({ description: 'Memory usage in MB' })
  @IsNumber()
  @IsOptional()
  memoryUsageMB?: number;

  @ApiPropertyOptional({ description: 'CPU usage percentage' })
  @IsNumber()
  @IsOptional()
  cpuUsagePercent?: number;

  @ApiPropertyOptional({ description: 'Runtime latency in ms' })
  @IsNumber()
  @IsOptional()
  runtimeLatencyMs?: number;

  @ApiPropertyOptional({ description: 'Response latency in ms' })
  @IsNumber()
  @IsOptional()
  responseLatencyMs?: number;

  @ApiPropertyOptional({ description: 'Active sessions count' })
  @IsNumber()
  @IsOptional()
  activeSessions?: number;
}

export class CreateAgentEventDto {
  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ description: 'Event name' })
  @IsString()
  eventName: string;

  @ApiPropertyOptional({ description: 'Event data' })
  @IsObject()
  @IsOptional()
  eventData?: Record<string, any>;

  @ApiPropertyOptional({ enum: EventSeverity })
  @IsEnum(EventSeverity)
  @IsOptional()
  severity?: EventSeverity;

  @ApiPropertyOptional({ description: 'Event message' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class GetMetricsFilterDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of days' })
  @IsNumber()
  @IsOptional()
  days?: number;
}
