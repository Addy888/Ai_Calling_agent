import { Injectable, Logger } from '@nestjs/common';

export interface AudioConfig {
  format: 'PCM' | 'WAV' | 'MP3';
  sampleRate: 16000 | 24000;
  channels: 1; // Mono
}

@Injectable()
export class AudioChunkManager {
  private readonly logger = new Logger(AudioChunkManager.name);

  /**
   * Split a large audio buffer into chunk-sized buffers
   */
  chunkAudio(buffer: Buffer, chunkSizeMs = 20, config: AudioConfig = { format: 'PCM', sampleRate: 16000, channels: 1 }): Buffer[] {
    const bytesPerSample = 2; // 16-bit PCM
    const sampleRate = config.sampleRate;
    const channels = config.channels;
    
    // Calculate bytes per millisecond
    // SampleRate * channels * bytesPerSample / 1000ms
    const bytesPerMs = (sampleRate * channels * bytesPerSample) / 1000;
    const chunkBytes = Math.floor(bytesPerMs * chunkSizeMs);

    const chunks: Buffer[] = [];
    let offset = 0;

    // For WAV format, skip the header (first 44 bytes) if chunking
    if (config.format === 'WAV' && buffer.length > 44) {
      const header = buffer.slice(0, 44);
      // We chunk the payload, but we can prepend WAV header or work with PCM
      offset = 44;
    }

    while (offset < buffer.length) {
      const end = Math.min(offset + chunkBytes, buffer.length);
      chunks.push(buffer.slice(offset, end));
      offset = end;
    }

    return chunks;
  }

  /**
   * Normalize input audio to PCM Mono
   */
  normalizeToPCM(input: Buffer, sourceFormat: 'WAV' | 'MP3' | 'PCM'): Buffer {
    if (sourceFormat === 'PCM') return input;
    
    if (sourceFormat === 'WAV') {
      // Strip standard RIFF/WAV header to get raw PCM data
      if (input.length > 44 && input.toString('ascii', 0, 4) === 'RIFF') {
        return input.slice(44);
      }
    }

    // Return input as fallback
    return input;
  }

  /**
   * Prepend a basic WAV header to 16kHz Mono 16-bit PCM data
   */
  createWAVHeader(pcmLength: number, sampleRate = 16000): Buffer {
    const header = Buffer.alloc(44);
    
    // "RIFF"
    header.write('RIFF', 0);
    // file size - 8
    header.writeInt32LE(pcmLength + 36, 4);
    // "WAVE"
    header.write('WAVE', 8);
    // "fmt "
    header.write('fmt ', 12);
    // subchunk 1 size (16 for PCM)
    header.writeInt32LE(16, 16);
    // audio format (1 for PCM)
    header.writeInt16LE(1, 20);
    // num channels (1 for Mono)
    header.writeInt16LE(1, 22);
    // sample rate
    header.writeInt32LE(sampleRate, 24);
    // byte rate (sampleRate * numChannels * bitsPerSample / 8)
    header.writeInt32LE(sampleRate * 2, 28);
    // block align (numChannels * bitsPerSample / 8)
    header.writeInt16LE(2, 32);
    // bits per sample (16)
    header.writeInt16LE(16, 34);
    // "data"
    header.write('data', 36);
    // chunk size
    header.writeInt32LE(pcmLength, 40);

    return header;
  }
}
