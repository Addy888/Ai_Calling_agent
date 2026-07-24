/**
 * Text-to-Speech Provider Interface
 */

export interface TTSOptions {
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  sampleRate?: number;
  format?: 'mp3' | 'wav' | 'pcm' | 'mulaw';
  metadata?: Record<string, any>;
}

export interface TTSResult {
  audio: Buffer;
  duration?: number;
  format: string;
  sampleRate: number;
  metadata?: Record<string, any>;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  preview?: string;
  metadata?: Record<string, any>;
}

export interface ITTSProvider {
  /**
   * Provider name
   */
  getName(): string;

  /**
   * Synthesize text to speech
   */
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;

  /**
   * Create streaming synthesis session
   */
  createStream(options?: TTSOptions): any;

  /**
   * Get available voices
   */
  getVoices(language?: string): Promise<Voice[]>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}
