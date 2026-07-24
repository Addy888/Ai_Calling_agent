/**
 * Telephony Provider Interface
 * Abstract interface for telephony providers (Twilio, Exotel, Plivo, etc.)
 */

export interface CallOptions {
  to: string;
  from: string;
  callbackUrl: string;
  statusCallback?: string;
  timeout?: number;
  record?: boolean;
  recordingStatusCallback?: string;
  metadata?: Record<string, any>;
}

export interface CallResult {
  callSid: string;
  status: string;
  direction: string;
  to: string;
  from: string;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface TelephonyWebhookData {
  callSid: string;
  status: string;
  duration?: number;
  recordingUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ITeflehonyProvider {
  /**
   * Provider name (twilio, exotel, plivo, etc.)
   */
  getName(): string;

  /**
   * Initialize outbound call
   */
  makeCall(options: CallOptions): Promise<CallResult>;

  /**
   * End an active call
   */
  endCall(callSid: string): Promise<boolean>;

  /**
   * Get call status
   */
  getCallStatus(callSid: string): Promise<CallResult>;

  /**
   * Generate TwiML/equivalent for call flow
   */
  generateCallFlow(websocketUrl: string, metadata?: Record<string, any>): string;

  /**
   * Parse webhook data from provider
   */
  parseWebhook(body: any): TelephonyWebhookData;

  /**
   * Get recording URL
   */
  getRecordingUrl(callSid: string, recordingSid: string): Promise<string>;

  /**
   * Download recording
   */
  downloadRecording(recordingUrl: string): Promise<Buffer>;

  /**
   * Validate webhook signature (security)
   */
  validateWebhookSignature(signature: string, url: string, params: any): boolean;
}
