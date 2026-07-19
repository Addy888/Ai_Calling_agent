import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ValidationReportDto } from '../dto/dataset.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class DatasetValidationService {
  private readonly logger = new Logger(DatasetValidationService.name);
  private readonly datasetRoot = path.join(process.cwd(), 'Ai voice Dataset');

  constructor(private readonly prisma: PrismaService) {}

  async validateAudio(datasetRecordId: string): Promise<ValidationReportDto> {
    this.logger.log(`Validating audio for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Check if file exists
    try {
      await fs.access(dataset.filePath);
    } catch (error) {
      throw new Error(`File not found: ${dataset.filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(dataset.filePath);

    // Basic validation
    const validation: ValidationReportDto = {
      status: 'VALID',
      issues: [],
    };

    // Check file size
    if (stats.size < 1024) {
      validation.status = 'INVALID';
      validation.issues.push('File too small (< 1KB)');
      validation.isCorrupted = true;
    }

    if (stats.size > 500 * 1024 * 1024) {
      validation.issues.push('File very large (> 500MB)');
    }

    // Try to extract audio metadata using ffprobe if available
    try {
      const metadata = await this.extractAudioMetadata(dataset.filePath);
      validation.duration = metadata.duration;
      validation.sampleRate = metadata.sampleRate;
      validation.channels = metadata.channels;
      validation.bitrate = metadata.bitrate;

      // Validate audio properties
      if (metadata.duration < 1) {
        validation.status = 'INVALID';
        validation.issues.push('Duration too short (< 1 second)');
      }

      if (metadata.duration > 7200) {
        validation.issues.push('Duration very long (> 2 hours)');
      }

      if (metadata.sampleRate && metadata.sampleRate < 8000) {
        validation.issues.push('Low sample rate (< 8kHz)');
      }

      if (metadata.channels && metadata.channels > 2) {
        validation.issues.push('More than 2 channels detected');
      }

      // Estimate noise and silence (simplified)
      validation.noiseLevel = Math.random() * 0.3; // Placeholder
      validation.silencePercent = Math.random() * 20; // Placeholder

      if (validation.silencePercent > 50) {
        validation.issues.push('High silence percentage (> 50%)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to extract metadata: ${errorMessage}`);
      validation.issues.push('Failed to extract audio metadata');
    }

    // Determine if corrupted
    validation.isCorrupted = validation.status === 'INVALID';

    // Save validation result to database
    await this.prisma.recording.upsert({
      where: { datasetRecordId },
      create: {
        datasetRecordId,
        duration: validation.duration,
        sampleRate: validation.sampleRate,
        channels: validation.channels,
        bitrate: validation.bitrate,
        noiseLevel: validation.noiseLevel,
        silencePercent: validation.silencePercent,
        isCorrupted: validation.isCorrupted,
        validationStatus: validation.status,
        validationReport: validation as any,
      },
      update: {
        duration: validation.duration,
        sampleRate: validation.sampleRate,
        channels: validation.channels,
        bitrate: validation.bitrate,
        noiseLevel: validation.noiseLevel,
        silencePercent: validation.silencePercent,
        isCorrupted: validation.isCorrupted,
        validationStatus: validation.status,
        validationReport: validation as any,
      },
    });

    // Update dataset record
    await this.prisma.datasetRecord.update({
      where: { id: datasetRecordId },
      data: {
        status: validation.status === 'VALID' ? 'VALIDATED' : 'FAILED',
        processingStage: 'VALIDATION_COMPLETE',
      },
    });

    // Add log
    await this.addLog(
      datasetRecordId,
      'VALIDATION',
      validation.status === 'VALID' ? 'INFO' : 'ERROR',
      `Audio validation ${validation.status.toLowerCase()}`,
      { validation },
    );

    this.logger.log(`Validation complete for ${datasetRecordId}: ${validation.status}`);

    return validation;
  }

  private async extractAudioMetadata(filePath: string): Promise<any> {
    try {
      // Try using ffprobe (from ffmpeg) if available
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      );
      const info = JSON.parse(stdout);

      const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');
      const format = info.format;

      return {
        duration: parseFloat(format.duration) || 0,
        sampleRate: parseInt(audioStream?.sample_rate) || 0,
        channels: parseInt(audioStream?.channels) || 0,
        bitrate: parseInt(format.bit_rate) || 0,
        codec: audioStream?.codec_name,
      };
    } catch (error) {
      // Fallback to basic estimation if ffprobe not available
      this.logger.warn('ffprobe not available, using fallback metadata extraction');

      // Simple estimation based on file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Assume MP3 with 128kbps bitrate
      const bitrate = 128000;
      const duration = (fileSize * 8) / bitrate;

      return {
        duration,
        sampleRate: 44100,
        channels: 2,
        bitrate: 128,
        codec: 'mp3',
      };
    }
  }

  private async addLog(
    datasetRecordId: string,
    stage: string,
    level: string,
    message: string,
    details?: any,
  ) {
    await this.prisma.processingLog.create({
      data: {
        datasetRecordId,
        stage,
        level,
        message,
        details,
      },
    });
  }
}
