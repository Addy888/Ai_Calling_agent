/**
 * Enterprise Telephony Provider Interface
 * Defines the contract that all telephony providers must implement
 */

import { CallDirection, CallState, DTMFTone } from '../enums/call-state.enum';

/**
 * Call Initiation Parameters
 */
export interface CallInitiationParams {
  to: string;
  from: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
  recordingCallbackUrl?: string;
  timeout?: number;
  record?: boolean;
  machineDetection?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Call Result
 */
export interface CallResult {
  callSid: string;
  providerCallId: string;
  status: CallState;
  direction: CallDirection;
  to: string;
  from: string;
  price?: string;
  priceUnit?: string;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  answeredBy?: 'human' | 'machine' | 'unknown';
  metadata?: Record<string, any>;
}

/**
 * Call Status Update
 */
export interface CallStatusUpdate {
  callSid: string;
  status: CallState;
  timestamp: Date;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Recording Information
 */
export interface RecordingInfo {
  recordingSid: string;
  callSid: string;
  url: string;
  duration: number;
  format: string;
  channels: number;
  fileSize?: number;
  price?: string;
  priceUnit?: string;
}

/**
 * DTMF Input
 */
export interface DTMFInput {
  callSid: string;
  digits: string;
  timestamp: Date;
}

/**
 * TwiML/XML Response for call control
 */
export interface CallControlResponse {
  content: string;
  contentType: 'application/xml' | 'text/xml';
}

/**
 * Provider Capabilities
 */
export interface ProviderCapabilities {
  supportsRecording: boolean;
  supportsDTMF: boolean;
  supportsConferencing: boolean;
  supportsTransfer: boolean;
  supportsMachineDetection: boolean;
  supportsWebhooks: boolean;
  supportsStreaming: boolean;
  maxConcurrentCalls: number;
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  apiEndpoint?: string;
  webhookSecret?: string;
  additionalConfig?: Record<string, any>;
}

/**
 * Main Telephony Provider Interface
 */
export interface ITelephonyProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get provider type
   */
  getType(): string;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Initialize provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if provider is initialized and ready
   */
  isReady(): boolean;

  /**
   * Initiate an outbound call
   */
  makeCall(params: CallInitiationParams): Promise<CallResult>;

  /**
   * End an active call
   */
  hangupCall(callSid: string): Promise<boolean>;

  /**
   * Get current call status
   */
  getCallStatus(callSid: string): Promise<CallResult>;

  /**
   * Update call in progress (e.g., mute, hold)
   */
  updateCall(callSid: string, updates: Partial<CallInitiationParams>): Promise<CallResult>;

  /**
   * Send DTMF tones during a call
   */
  sendDTMF(callSid: string, digits: string): Promise<boolean>;

  /**
   * Transfer call to another number
   */
  transferCall(callSid: string, to: string): Promise<boolean>;

  /**
   * Get recording information
   */
  getRecording(recordingSid: string): Promise<RecordingInfo>;

  /**
   * Download recording as buffer
   */
  downloadRecording(recordingUrl: string): Promise<Buffer>;

  /**
   * Generate call control response (TwiML/equivalent)
   */
  generateCallControl(instructions: CallControlInstructions): CallControlResponse;

  /**
   * Parse webhook payload from provider
   */
  parseWebhook(payload: any): WebhookPayload;

  /**
   * Validate webhook signature for security
   */
  validateWebhookSignature(signature: string, url: string, params: any): boolean;

  /**
   * Get estimated call cost
   */
  estimateCallCost(from: string, to: string, duration: number): Promise<number>;

  /**
   * Health check for provider
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Call Control Instructions
 */
export interface CallControlInstructions {
  say?: {
    text: string;
    voice?: string;
    language?: string;
  };
  play?: {
    url: string;
    loop?: number;
  };
  gather?: {
    input: 'dtmf' | 'speech' | 'both';
    timeout?: number;
    finishOnKey?: string;
    numDigits?: number;
    action?: string;
  };
  record?: {
    action?: string;
    timeout?: number;
    maxLength?: number;
    playBeep?: boolean;
  };
  dial?: {
    number: string;
    timeout?: number;
    action?: string;
  };
  hangup?: boolean;
  redirect?: {
    url: string;
  };
  pause?: {
    length: number;
  };
}

/**
 * Webhook Payload (normalized across providers)
 */
export interface WebhookPayload {
  type: 'call_status' | 'recording_ready' | 'dtmf_received' | 'error';
  callSid: string;
  status?: CallState;
  direction?: CallDirection;
  from?: string;
  to?: string;
  duration?: number;
  recordingUrl?: string;
  recordingSid?: string;
  dtmfDigits?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
  rawPayload: any;
}
