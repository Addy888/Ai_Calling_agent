/**
 * Conversation Session Interfaces
 * Defines the structure of conversation sessions and related data
 */

import {
  ConversationState,
  IntentType,
  SpeakerType,
  MessageRole,
  ConversationEndReason,
} from '../enums/conversation-state.enum';

/**
 * Conversation Message
 */
export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  speaker?: SpeakerType;
  timestamp: Date;
  intent?: IntentType;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Conversation Session
 */
export interface ConversationSession {
  // Identifiers
  sessionId: string;
  callId: string;
  campaignId: string;
  contactId: string;
  companyId: string;

  // Campaign & Agent Data
  agentId?: string;
  scriptId?: string;
  scriptContent?: string;
  voiceId?: string;
  promptId?: string;
  promptContent?: string;

  // State
  state: ConversationState;
  currentStep: number;
  isActive: boolean;

  // Customer Context
  customerName?: string;
  customerPhone?: string;
  customerLanguage?: string;
  customerContext?: Record<string, any>;

  // Conversation Data
  conversationHistory: ConversationMessage[];
  detectedIntents: IntentType[];
  currentIntent?: IntentType;

  // Memory
  sessionMemory: SessionMemory;

  // Timing
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  duration?: number;

  // Statistics
  turnCount: number;
  customerMessageCount: number;
  aiMessageCount: number;
  silenceCount: number;

  // Metadata
  metadata: Record<string, any>;
  endReason?: ConversationEndReason;
}

/**
 * Session Memory
 * Stores context and state during conversation
 */
export interface SessionMemory {
  // Customer Information
  customerName?: string;
  customerPreferences?: Record<string, any>;

  // Conversation Context
  previousAnswers: Array<{
    question: string;
    answer: string;
    timestamp: Date;
  }>;

  // Current Context
  currentTopic?: string;
  currentStep: number;
  scriptProgress: number; // Percentage

  // Extracted Information
  extractedData: Record<string, any>;

  // Intents History
  intentHistory: Array<{
    intent: IntentType;
    confidence: number;
    timestamp: Date;
  }>;

  // AI State
  lastAIResponse?: string;
  lastAIIntent?: string;

  // Custom Fields
  custom: Record<string, any>;
}

/**
 * Conversation Context
 * Complete context for LLM prompt generation
 */
export interface ConversationContext {
  // Session
  session: ConversationSession;

  // Campaign Data
  campaign: {
    name: string;
    description?: string;
    goal?: string;
    instructions?: string;
  };

  // Script
  script: {
    content: string;
    steps?: Array<{
      step: number;
      content: string;
      required?: boolean;
    }>;
  };

  // AI Agent
  agent: {
    name: string;
    personality?: string;
    instructions?: string;
    tone?: string;
    language?: string;
  };

  // Customer
  customer: {
    name?: string;
    phone: string;
    language?: string;
    context?: Record<string, any>;
    history?: any[];
  };

  // Knowledge Base Context
  knowledgeContext?: Array<{
    content: string;
    source: string;
    relevance: number;
  }>;

  // Memory
  memory: SessionMemory;

  // Current State
  currentMessage?: string;
  currentIntent?: IntentType;
}

/**
 * Response Generation Result
 */
export interface ResponseGenerationResult {
  success: boolean;
  response: string;
  intent?: IntentType;
  confidence: number;
  tokens?: number;
  duration: number;
  shouldEndConversation: boolean;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Intent Detection Result
 */
export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, any>;
}

/**
 * Knowledge Retrieval Result
 */
export interface KnowledgeRetrievalResult {
  found: boolean;
  results: Array<{
    content: string;
    source: string;
    relevance: number;
    metadata?: Record<string, any>;
  }>;
  query: string;
  count: number;
}

/**
 * Conversation Start Request
 */
export interface ConversationStartRequest {
  callId: string;
  campaignId: string;
  contactId: string;
  companyId: string;
  customerPhone: string;
  customerName?: string;
  customerLanguage?: string;
  metadata?: Record<string, any>;
}

/**
 * Conversation Message Request
 */
export interface ConversationMessageRequest {
  sessionId: string;
  message: string;
  audioBuffer?: Buffer;
  metadata?: Record<string, any>;
}

/**
 * Conversation End Request
 */
export interface ConversationEndRequest {
  sessionId: string;
  reason: ConversationEndReason;
  metadata?: Record<string, any>;
}

/**
 * Transcript Entry
 */
export interface TranscriptEntry {
  id: string;
  sessionId: string;
  callId: string;
  speaker: SpeakerType;
  message: string;
  intent?: IntentType;
  confidence?: number;
  timestamp: Date;
  state: ConversationState;
  metadata?: Record<string, any>;
}

/**
 * Conversation Statistics
 */
export interface ConversationStatistics {
  sessionId: string;
  duration: number;
  turnCount: number;
  customerMessageCount: number;
  aiMessageCount: number;
  averageResponseTime: number;
  detectedIntents: Array<{
    intent: IntentType;
    count: number;
  }>;
  silenceCount: number;
  successfulResponses: number;
  failedResponses: number;
  knowledgeRetrievals: number;
}
