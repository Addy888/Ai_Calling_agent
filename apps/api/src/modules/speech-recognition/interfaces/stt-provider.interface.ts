export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number; // in seconds
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  words?: WordTimestamp[];
}

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, options?: { language?: string }): Promise<TranscriptionResult>;
  isAvailable(): Promise<boolean>;
}
