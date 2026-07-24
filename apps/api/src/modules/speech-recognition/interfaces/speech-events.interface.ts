export enum SpeechEventType {
  SPEECH_STARTED = 'SpeechStarted',
  SPEECH_ENDED = 'SpeechEnded',
  PARTIAL_TRANSCRIPT = 'PartialTranscript',
  FINAL_TRANSCRIPT = 'FinalTranscript',
  SILENCE_DETECTED = 'SilenceDetected',
  NOISE_DETECTED = 'NoiseDetected',
  LANGUAGE_DETECTED = 'LanguageDetected',
  TRANSCRIPT_COMPLETED = 'TranscriptCompleted',
}

export interface SpeechEventPayload {
  sessionId: string;
  timestamp: Date;
}

export interface SpeechStartedPayload extends SpeechEventPayload {}

export interface SpeechEndedPayload extends SpeechEventPayload {
  durationMs: number;
}

export interface PartialTranscriptPayload extends SpeechEventPayload {
  text: string;
  confidence: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface FinalTranscriptPayload extends SpeechEventPayload {
  text: string;
  confidence: number;
  language: string;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface SilenceDetectedPayload extends SpeechEventPayload {
  silenceDurationMs: number;
}

export interface NoiseDetectedPayload extends SpeechEventPayload {
  noiseLevelDb: number;
}

export interface LanguageDetectedPayload extends SpeechEventPayload {
  language: string;
  confidence: number;
}

export interface TranscriptCompletedPayload extends SpeechEventPayload {
  fullText: string;
}
