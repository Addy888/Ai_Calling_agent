/**
 * Telephony Provider Interface
 * Abstract interface for telephony providers (Twilio, Exotel, Plivo, etc.)
 */
export interface TelephonyProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize provider
   */
  initialize(): Promise<void>;

  /**
   * Make an outbound call
   */
  makeCall(params: MakeCallParams): Promise<MakeCallResponse>;

  /**
   * End an active call
   */
  endCall(callSid: string): Promise<void>;

  /**
   * Get call status
   */
  getCallStatus(callSid: string): Promise<CallStatusData>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Make Call Parameters
 */
export interface MakeCallParams {
  to: string; // Phone number to call
  from?: string; // Caller ID (optional)
  sessionId: string; // Internal session ID
  callbackUrl: string; // Webhook URL for call events
  recordCall?: boolean; // Enable call recording
  timeout?: number; // Call timeout in seconds
  additionalParams?: Record<string, any>;
}

/**
 * Make Call Response
 */
export interface MakeCallResponse {
  callSid: string; // Provider's call identifier
  status: string; // Call status
  from: string; // Calling number
  to: string; // Called number
}

/**
 * Call Status Data
 */
export interface CallStatusData {
  callSid: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';
  from: string;
  to: string;
  duration?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  recordingUrl?: string;
  price?: string;
  priceUnit?: string;
}

/**
 * Call Event from Provider (webhook)
 */
export interface CallEvent {
  callSid: string;
  sessionId?: string;
  event: 'ringing' | 'answered' | 'completed' | 'busy' | 'no-answer' | 'failed';
  from: string;
  to: string;
  duration?: number;
  recordingUrl?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}
