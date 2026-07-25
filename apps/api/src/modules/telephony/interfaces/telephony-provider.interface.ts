/**
 * Telephony Provider Interface
 * Defines the contract that all telephony providers must implement
 */

export interface CallOptions {
  to: string;
  from: string;
  campaignId: string;
  contactId: string;
  callbackUrl?: string;
  statusCallbackUrl?: string;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface CallResult {
  callSid: string;
  status: CallStatus;
  to: string;
  from: string;
  timestamp: Date;
  provider: string;
}

export interface CallStatusResult {
  callSid: string;
  status: CallStatus;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  answeredBy?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface RecordingResult {
  recordingSid: string;
  callSid: string;
  url: string;
  duration: number;
  format: string;
  timestamp: Date;
}

export interface TranscriptEntry {
  speaker: 'AI' | 'CUSTOMER';
  message: string;
  timestamp: Date;
  confidence?: number;
}

export enum CallStatus {
  QUEUED = 'QUEUED',
  INITIATING = 'INITIATING',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BUSY = 'BUSY',
  NO_ANSWER = 'NO_ANSWER',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Base Telephony Provider Interface
 * All providers (Mock, Twilio, etc.) must implement this
 */
export interface ITelephonyProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Make an outbound call
   */
  makeCall(options: CallOptions): Promise<CallResult>;

  /**
   * Get call status
   */
  getCallStatus(callSid: string): Promise<CallStatusResult>;

  /**
   * Hangup/end a call
   */
  hangupCall(callSid: string): Promise<boolean>;

  /**
   * Get recording for a call
   */
  getRecording(callSid: string): Promise<RecordingResult | null>;

  /**
   * Get transcript for a call
   */
  getTranscript(callSid: string): Promise<TranscriptEntry[]>;

  /**
   * Send audio/text during call (for TTS)
   */
  sendMessage?(callSid: string, message: string): Promise<boolean>;

  /**
   * Check if provider is healthy
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Provider Events
 */
export interface ProviderEvent {
  type: ProviderEventType;
  callSid: string;
  timestamp: Date;
  data?: any;
}

export enum ProviderEventType {
  CALL_INITIATED = 'CALL_INITIATED',
  CALL_RINGING = 'CALL_RINGING',
  CALL_ANSWERED = 'CALL_ANSWERED',
  CALL_COMPLETED = 'CALL_COMPLETED',
  CALL_FAILED = 'CALL_FAILED',
  RECORDING_AVAILABLE = 'RECORDING_AVAILABLE',
  TRANSCRIPT_UPDATED = 'TRANSCRIPT_UPDATED',
}
