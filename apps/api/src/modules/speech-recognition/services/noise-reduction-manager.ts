import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NoiseReductionManager {
  private readonly logger = new Logger(NoiseReductionManager.name);
  private enabled = true;
  private noiseThreshold = 0.015; // default noise threshold gate (normalized 0 to 1)

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('STT_NOISE_REDUCTION_ENABLED', true);
    this.noiseThreshold = this.configService.get<number>('STT_NOISE_THRESHOLD', 0.015);
  }

  /**
   * Process raw PCM buffer (expects 16-bit Mono, 16kHz)
   */
  process(audioBuffer: Buffer): Buffer {
    if (!this.enabled || audioBuffer.length === 0) {
      return audioBuffer;
    }

    try {
      // 16-bit PCM buffer processing (2 bytes per sample)
      const sampleCount = audioBuffer.length / 2;
      const outputBuffer = Buffer.alloc(audioBuffer.length);

      for (let i = 0; i < sampleCount; i++) {
        const sampleValue = audioBuffer.readInt16LE(i * 2);
        // Normalize sample value from -32768 to 32767 to -1.0 to 1.0 range
        const normalized = sampleValue / 32768.0;

        // Simple spectral gate: suppress values below threshold
        let processedValue = normalized;
        if (Math.abs(normalized) < this.noiseThreshold) {
          // Apply standard noise gating attenuation
          processedValue = normalized * 0.1;
        }

        // Apply a gentle low-pass high-frequency filter (rolling average / de-essing)
        if (i > 0) {
          const prevSample = outputBuffer.readInt16LE((i - 1) * 2) / 32768.0;
          processedValue = prevSample * 0.25 + processedValue * 0.75;
        }

        // Denormalize and write back
        const denormalized = Math.max(-32768, Math.min(32767, Math.round(processedValue * 32768.0)));
        outputBuffer.writeInt16LE(denormalized, i * 2);
      }

      return outputBuffer;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in noise reduction processing: ${error.message}`, error.stack);
      }
      return audioBuffer;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setThreshold(threshold: number): void {
    this.noiseThreshold = threshold;
  }
}
