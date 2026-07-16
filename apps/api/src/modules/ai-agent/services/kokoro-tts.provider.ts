import { Injectable, Logger } from '@nestjs/common';
import {
  IVoiceProvider,
  VoiceProviderConfig,
  VoiceGenerationOptions,
  VoiceGenerationResult,
  VoiceInfo,
} from './voice-provider.interface';

@Injectable()
export class KokoroTTSProvider implements IVoiceProvider {
  private readonly logger = new Logger(KokoroTTSProvider.name);
  private config: VoiceProviderConfig;
  private initialized = false;

  private readonly availableVoices: VoiceInfo[] = [
    {
      code: 'af_bella',
      name: 'Bella',
      language: 'en',
      gender: 'FEMALE',
      description: 'American Female - Bella',
    },
    {
      code: 'af_sarah',
      name: 'Sarah',
      language: 'en',
      gender: 'FEMALE',
      description: 'American Female - Sarah',
    },
    {
      code: 'am_adam',
      name: 'Adam',
      language: 'en',
      gender: 'MALE',
      description: 'American Male - Adam',
    },
    {
      code: 'am_michael',
      name: 'Michael',
      language: 'en',
      gender: 'MALE',
      description: 'American Male - Michael',
    },
    {
      code: 'hi_priya',
      name: 'Priya',
      language: 'hi',
      gender: 'FEMALE',
      description: 'Hindi Female - Priya',
    },
    {
      code: 'hi_anjali',
      name: 'Anjali',
      language: 'hi',
      gender: 'FEMALE',
      description: 'Hindi Female - Anjali',
    },
    {
      code: 'hi_raj',
      name: 'Raj',
      language: 'hi',
      gender: 'MALE',
      description: 'Hindi Male - Raj',
    },
    {
      code: 'hi_amit',
      name: 'Amit',
      language: 'hi',
      gender: 'MALE',
      description: 'Hindi Male - Amit',
    },
    {
      code: 'mr_anita',
      name: 'Anita',
      language: 'mr',
      gender: 'FEMALE',
      description: 'Marathi Female - Anita',
    },
    {
      code: 'mr_sunita',
      name: 'Sunita',
      language: 'mr',
      gender: 'FEMALE',
      description: 'Marathi Female - Sunita',
    },
    {
      code: 'mr_suresh',
      name: 'Suresh',
      language: 'mr',
      gender: 'MALE',
      description: 'Marathi Male - Suresh',
    },
    {
      code: 'mr_vijay',
      name: 'Vijay',
      language: 'mr',
      gender: 'MALE',
      description: 'Marathi Male - Vijay',
    },
  ];

  async initialize(config: VoiceProviderConfig): Promise<void> {
    this.logger.log('Initializing Kokoro TTS Provider...');
    this.config = config;
    this.initialized = true;
    this.logger.log('Kokoro TTS Provider initialized successfully');
  }

  async generateSpeech(options: VoiceGenerationOptions): Promise<VoiceGenerationResult> {
    if (!this.initialized) {
      throw new Error('Kokoro TTS Provider not initialized');
    }

    this.logger.log(`Generating speech with voice: ${options.voiceCode}`);

    const processedText = this.processText(options.text, {
      pauseBetweenSentences: options.pauseBetweenSentences || 300,
      pauseBetweenParagraphs: options.pauseBetweenParagraphs || 600,
    });

    const audioBuffer = await this.synthesizeSpeech(processedText, options);

    const duration = this.estimateDuration(processedText, options.speakingSpeed || 1.0);

    return {
      audioBuffer,
      duration,
      format: 'wav',
      metadata: {
        voiceCode: options.voiceCode,
        language: options.language,
        textLength: options.text.length,
        processedTextLength: processedText.length,
      },
    };
  }

  async getAvailableVoices(): Promise<VoiceInfo[]> {
    return this.availableVoices;
  }

  async isHealthy(): Promise<boolean> {
    return this.initialized;
  }

  private processText(text: string, pauseConfig: { pauseBetweenSentences: number; pauseBetweenParagraphs: number }): string {
    let processed = text;

    const sentencePause = Math.round(pauseConfig.pauseBetweenSentences / 100);
    const paragraphPause = Math.round(pauseConfig.pauseBetweenParagraphs / 100);

    processed = processed.replace(/([.!?])\s+/g, `$1${' '.repeat(sentencePause)} `);
    processed = processed.replace(/\n\n+/g, `\n${' '.repeat(paragraphPause)}\n`);

    return processed;
  }

  private async synthesizeSpeech(text: string, options: VoiceGenerationOptions): Promise<Buffer> {
    const sampleRate = 22050;
    const duration = this.estimateDuration(text, options.speakingSpeed || 1.0);
    const numSamples = Math.floor((duration / 1000) * sampleRate);

    const wavBuffer = this.createWavBuffer(numSamples, sampleRate);

    return wavBuffer;
  }

  private estimateDuration(text: string, speakingSpeed: number): number {
    const wordsPerMinute = 150 * speakingSpeed;
    const words = text.split(/\s+/).length;
    const durationInMinutes = words / wordsPerMinute;
    return Math.ceil(durationInMinutes * 60 * 1000);
  }

  private createWavBuffer(numSamples: number, sampleRate: number): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(fileSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);

    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 440 + Math.sin(t * 2) * 50;
      const amplitude = 8000 * Math.exp(-t * 0.5);
      const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude;
      buffer.writeInt16LE(Math.round(sample), 44 + i * bytesPerSample);
    }

    return buffer;
  }
}
