export interface VoiceProviderConfig {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  [key: string]: any;
}

export interface VoiceGenerationOptions {
  text: string;
  voiceCode: string;
  language: string;
  speakingSpeed?: number;
  pitch?: number;
  volume?: number;
  pauseBetweenSentences?: number;
  pauseBetweenParagraphs?: number;
}

export interface VoiceGenerationResult {
  audioBuffer: Buffer;
  duration: number;
  format: string;
  metadata?: Record<string, any>;
}

export interface IVoiceProvider {
  initialize(config: VoiceProviderConfig): Promise<void>;
  generateSpeech(options: VoiceGenerationOptions): Promise<VoiceGenerationResult>;
  getAvailableVoices(): Promise<VoiceInfo[]>;
  isHealthy(): Promise<boolean>;
}

export interface VoiceInfo {
  code: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
}
