/**
 * Telephony Provider Interface
 * Abstract interface for telephony providers.
 * TelephonyManagerService is the ONLY consumer — it never inspects provider type.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DI Injection Token
// ─────────────────────────────────────────────────────────────────────────────
export const TELEPHONY_PROVIDER_TOKEN = 'TELEPHONY_PROVIDER';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Types
// ─────────────────────────────────────────────────────────────────────────────
export type TelephonyProviderType = 'mock' | 'twilio' | 'exotel' | 'plivo';

// ─────────────────────────────────────────────────────────────────────────────
// Core Interface
// ─────────────────────────────────────────────────────────────────────────────
export interface TelephonyProvider {
  /** Human-readable provider name */
  readonly name: string;

  /** Provider type — for logging/monitoring only, never for branching logic */
  readonly providerType: TelephonyProviderType;

  /** Initialize provider (validate credentials, establish connections) */
  initialize(): Promise<void>;

  /** Make an outbound call */
  makeCall(params: MakeCallParams): Promise<MakeCallResponse>;

  /** Terminate an active call */
  endCall(callSid: string): Promise<void>;

  /** Fetch current status for a call */
  getCallStatus(callSid: string): Promise<CallStatusData>;

  /** Check provider health / availability */
  isAvailable(): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Make Call Parameters
// ─────────────────────────────────────────────────────────────────────────────
export interface MakeCallParams {
  to: string;             // E.164 phone number to call
  from?: string;          // Caller ID (falls back to provider default)
  sessionId: string;      // Internal session identifier
  callbackUrl: string;    // Webhook URL for call events
  statusCallback?: string;// Separate status-callback URL (optional)
  recordCall?: boolean;   // Enable call recording
  timeout?: number;       // Dial timeout in seconds
  additionalParams?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Make Call Response
// ─────────────────────────────────────────────────────────────────────────────
export interface MakeCallResponse {
  callSid: string;   // Provider call identifier (CA... for Twilio, MOCK... for mock)
  status: string;    // Initial call status
  from: string;      // Effective caller-ID used
  to: string;        // Called number
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Status Data
// ─────────────────────────────────────────────────────────────────────────────
export interface CallStatusData {
  callSid: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';
  from: string;
  to: string;
  duration?: number;      // seconds
  startTime?: Date;
  endTime?: Date;
  recordingUrl?: string;
  recordingMetadata?: RecordingMetadata;
  price?: string;
  priceUnit?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recording Metadata
// ─────────────────────────────────────────────────────────────────────────────
export interface RecordingMetadata {
  recordingSid: string;
  url: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  format: 'mp3' | 'wav';
  channels: 1 | 2;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Event from Provider (webhook / simulation)
// ─────────────────────────────────────────────────────────────────────────────
export interface CallEvent {
  callSid: string;
  sessionId?: string;
  event: 'dialing' | 'ringing' | 'answered' | 'completed' | 'busy' | 'no-answer' | 'failed';
  from: string;
  to: string;
  duration?: number;
  recordingUrl?: string;
  recordingMetadata?: RecordingMetadata;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Monitor Event Shapes  (emitted by providers via EventEmitter2)
// ─────────────────────────────────────────────────────────────────────────────
export interface MonitorCallStateEvent {
  sessionId: string;
  callSid: string;
  state: 'DIALING' | 'RINGING' | 'CONNECTED' | 'AI_SPEAKING' | 'CUSTOMER_SPEAKING' | 'ENDED' | 'FAILED';
  contactName?: string;
  phoneNumber?: string;
  campaignId?: string;
  timestamp: Date;
}

export interface MonitorTranscriptEvent {
  sessionId: string;
  callSid: string;
  role: 'agent' | 'customer';
  text: string;
  timestamp: Date;
  latencyMs?: number;
}

export interface MonitorRecordingEvent {
  sessionId: string;
  callSid: string;
  recording: RecordingMetadata;
}

export interface MonitorSummaryEvent {
  sessionId: string;
  callSid: string;
  duration: number;
  transcript: Array<{ role: 'agent' | 'customer'; text: string; timestamp: Date }>;
  outcome: 'completed' | 'busy' | 'no-answer' | 'failed';
  sentiment?: 'positive' | 'neutral' | 'negative';
  keyPoints?: string[];
  nextAction?: string;
}

