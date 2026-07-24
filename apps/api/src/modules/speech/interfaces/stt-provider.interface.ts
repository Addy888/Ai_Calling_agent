/**
 * Speech-to-Text Provider Interface
 */

export interface STTOptions {
  language?: string;
  sampleRate?: number;
  enablePartialResults?: boolean;
  encoding?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  metadata?: Record<string, any>;
}

export interface ISTTProvider {
  /**
   * Provider name
   */
  getName(): string;

  /**
   * Transcribe audio buffer
   */
  transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult>;

  /**
   * Create streaming transcription session
   */
  createStream(options?: STTOptions): any;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}
