/**
 * TTS Provider Interface
 * Abstract interface for Text-to-Speech providers
 */
export interface TTSProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Synthesize text to speech
   */
  synthesize(params: SynthesizeParams): Promise<SynthesizeResponse>;

  /**
   * Stream speech synthesis (for real-time)
   */
  streamSynthesis(params: SynthesizeParams): Promise<ReadableStream | NodeJS.ReadableStream>;

  /**
   * Get available voices
   */
  getVoices(): Promise<Voice[]>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Synthesize Parameters
 */
export interface SynthesizeParams {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // -20 to 20
  volume?: number; // 0 to 100
  format?: 'mp3' | 'wav' | 'pcm' | 'ogg';
  sampleRate?: number; // e.g., 16000, 24000, 48000
  stability?: number; // 0 to 1 (ElevenLabs specific)
  similarityBoost?: number; // 0 to 1 (ElevenLabs specific)
}

/**
 * Synthesize Response
 */
export interface SynthesizeResponse {
  audio: Buffer;
  format: string;
  sampleRate: number;
  duration: number; // in seconds
  characterCount: number;
  metadata?: Record<string, any>;
}

/**
 * Voice Model
 */
export interface Voice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  language: string;
  languageCode: string;
  description?: string;
  previewUrl?: string;
  labels?: Record<string, string>;
  category?: string;
}
