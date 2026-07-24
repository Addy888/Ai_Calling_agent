/**
 * Provider Interfaces for Plug-and-Play Integration
 * These interfaces define contracts for Speech-to-Text, Text-to-Speech, and Telephony providers
 */

/**
 * Speech-to-Text Provider Interface
 */
export interface ISpeechToTextProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize the STT provider
   */
  initialize(config: STTConfig): Promise<void>;

  /**
   * Start listening for speech
   */
  startListening(sessionId: string): Promise<void>;

  /**
   * Stop listening
   */
  stopListening(sessionId: string): Promise<void>;

  /**
   * Process audio stream
   */
  processAudioStream(
    sessionId: string,
    audioData: Buffer | ReadableStream,
  ): Promise<STTResult>;

  /**
   * Get real-time transcription
   */
  onTranscription(
    sessionId: string,
    callback: (result: STTResult) => void,
  ): void;

  /**
   * Cleanup resources
   */
  cleanup(sessionId: string): Promise<void>;
}

/**
 * STT Configuration
 */
export interface STTConfig {
  apiKey?: string;
  language?: string;
  model?: string;
  enablePunctuation?: boolean;
  enableInterimResults?: boolean;
  customVocabulary?: string[];
  profanityFilter?: boolean;
  [key: string]: any;
}

/**
 * STT Result
 */
export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
  language?: string;
  timestamp?: Date;
  duration?: number;
}

/**
 * Text-to-Speech Provider Interface
 */
export interface ITextToSpeechProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize the TTS provider
   */
  initialize(config: TTSConfig): Promise<void>;

  /**
   * Synthesize speech from text
   */
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;

  /**
   * Stream audio synthesis
   */
  synthesizeStream(
    text: string,
    options?: TTSOptions,
  ): Promise<ReadableStream<Uint8Array>>;

  /**
   * Get available voices
   */
  getVoices(): Promise<Voice[]>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * TTS Configuration
 */
export interface TTSConfig {
  apiKey?: string;
  defaultVoice?: string;
  defaultLanguage?: string;
  audioFormat?: 'mp3' | 'wav' | 'pcm' | 'opus';
  sampleRate?: number;
  [key: string]: any;
}

/**
 * TTS Options
 */
export interface TTSOptions {
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  emotion?: string;
  style?: string;
}

/**
 * TTS Result
 */
export interface TTSResult {
  audio: Buffer | ReadableStream;
  audioFormat: string;
  duration: number;
  text: string;
  voice: string;
}

/**
 * Voice Profile
 */
export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  style?: string[];
  preview?: string;
}

/**
 * Telephony Provider Interface
 */
export interface ITelephonyProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize the telephony provider
   */
  initialize(config: TelephonyConfig): Promise<void>;

  /**
   * Make an outbound call
   */
  makeCall(params: MakeCallParams): Promise<CallSession>;

  /**
   * Answer an inbound call
   */
  answerCall(callSid: string): Promise<CallSession>;

  /**
   * End a call
   */
  endCall(callSid: string): Promise<void>;

  /**
   * Play audio on call
   */
  playAudio(callSid: string, audioUrl: string): Promise<void>;

  /**
   * Stream audio to call
   */
  streamAudio(callSid: string, audioStream: ReadableStream): Promise<void>;

  /**
   * Start recording
   */
  startRecording(callSid: string): Promise<string>;

  /**
   * Stop recording
   */
  stopRecording(callSid: string, recordingSid: string): Promise<string>;

  /**
   * Get call status
   */
  getCallStatus(callSid: string): Promise<CallStatus>;

  /**
   * Transfer call
   */
  transferCall(callSid: string, to: string): Promise<void>;

  /**
   * Register event handlers
   */
  onCallEvent(
    event: TelephonyEvent,
    handler: (data: CallEventData) => void,
  ): void;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * Telephony Configuration
 */
export interface TelephonyConfig {
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  webhookUrl?: string;
  [key: string]: any;
}

/**
 * Make Call Parameters
 */
export interface MakeCallParams {
  to: string;
  from: string;
  timeout?: number;
  statusCallbackUrl?: string;
  statusCallbackEvents?: string[];
  record?: boolean;
  machineDetection?: boolean;
}

/**
 * Call Session
 */
export interface CallSession {
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  startTime: Date;
  duration?: number;
  recordingUrl?: string;
}

/**
 * Call Status
 */
export interface CallStatus {
  callSid: string;
  status: string;
  direction: string;
  from: string;
  to: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
}

/**
 * Telephony Events
 */
export enum TelephonyEvent {
  CALL_INITIATED = 'CALL_INITIATED',
  CALL_RINGING = 'CALL_RINGING',
  CALL_ANSWERED = 'CALL_ANSWERED',
  CALL_COMPLETED = 'CALL_COMPLETED',
  CALL_FAILED = 'CALL_FAILED',
  CALL_NO_ANSWER = 'CALL_NO_ANSWER',
  CALL_BUSY = 'CALL_BUSY',
  RECORDING_STARTED = 'RECORDING_STARTED',
  RECORDING_COMPLETED = 'RECORDING_COMPLETED',
  DTMF_RECEIVED = 'DTMF_RECEIVED',
}

/**
 * Call Event Data
 */
export interface CallEventData {
  callSid: string;
  event: TelephonyEvent;
  timestamp: Date;
  data: any;
}
