/**
 * Recording Manager Service
 * Manages call recordings - download, storage, and retrieval
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderManagerService } from './provider-manager.service';
import { CallSessionManagerService } from './call-session-manager.service';
import { RecordingInfo } from '../interfaces/telephony-provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RecordingMetadata {
  callSid: string;
  recordingSid: string;
  duration: number;
  format: string;
  fileSize: number;
  filePath: string;
  downloadedAt: Date;
  campaignId?: string;
  contactId?: string;
}

@Injectable()
export class RecordingManagerService {
  private readonly logger = new Logger(RecordingManagerService.name);
  private readonly storageBasePath: string;
  private recordings: Map<string, RecordingMetadata> = new Map();

  constructor(
    private readonly providerManager: ProviderManagerService,
    private readonly sessionManager: CallSessionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.storageBasePath = process.env.STORAGE_PATH || './storage';
    this.ensureStorageDirectory();
  }

  /**
   * Handle recording ready webhook
   */
  async handleRecordingReady(
    callSid: string,
    recordingSid: string,
  ): Promise<RecordingMetadata> {
    this.logger.log(`Recording ready for call: ${callSid}`);

    try {
      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active provider');
      }

      // Get recording info
      const recordingInfo = await provider.getRecording(recordingSid);

      // Download recording
      const audioBuffer = await provider.downloadRecording(recordingInfo.url);

      // Save to storage
      const filePath = await this.saveRecording(callSid, recordingSid, audioBuffer);

      // Create metadata
      const metadata: RecordingMetadata = {
        callSid,
        recordingSid,
        duration: recordingInfo.duration,
        format: recordingInfo.format,
        fileSize: audioBuffer.length,
        filePath,
        downloadedAt: new Date(),
      };

      // Get session metadata
      const session = await this.sessionManager.getSession(callSid);
      if (session) {
        metadata.campaignId = session.metadata?.campaignId;
        metadata.contactId = session.metadata?.contactId;

        // Update session with recording info
        await this.sessionManager.addRecordingInfo(
          callSid,
          recordingSid,
          recordingInfo.url,
        );
      }

      // Store metadata
      this.recordings.set(recordingSid, metadata);

      // Emit event
      this.eventEmitter.emit('telephony.recording.ready', {
        callSid,
        recordingSid,
        filePath,
        duration: recordingInfo.duration,
        timestamp: new Date(),
      });

      this.logger.log(`Recording saved: ${filePath}`);

      return metadata;
    } catch (error) {
      this.logger.error(`Failed to handle recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recording
   */
  async getRecording(recordingSid: string): Promise<RecordingMetadata | undefined> {
    return this.recordings.get(recordingSid);
  }

  /**
   * Get recording buffer
   */
  async getRecordingBuffer(recordingSid: string): Promise<Buffer> {
    const metadata = this.recordings.get(recordingSid);

    if (!metadata) {
      throw new Error('Recording not found');
    }

    try {
      return await fs.readFile(metadata.filePath);
    } catch (error) {
      this.logger.error(`Failed to read recording file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recordings for call
   */
  async getRecordingsForCall(callSid: string): Promise<RecordingMetadata[]> {
    return Array.from(this.recordings.values()).filter(
      recording => recording.callSid === callSid,
    );
  }

  /**
   * Get recordings for campaign
   */
  async getRecordingsForCampaign(campaignId: string): Promise<RecordingMetadata[]> {
    return Array.from(this.recordings.values()).filter(
      recording => recording.campaignId === campaignId,
    );
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingSid: string): Promise<boolean> {
    const metadata = this.recordings.get(recordingSid);

    if (!metadata) {
      this.logger.warn(`Recording not found: ${recordingSid}`);
      return false;
    }

    try {
      // Delete file
      await fs.unlink(metadata.filePath);

      // Remove from cache
      this.recordings.delete(recordingSid);

      this.eventEmitter.emit('telephony.recording.deleted', {
        recordingSid,
        callSid: metadata.callSid,
        timestamp: new Date(),
      });

      this.logger.log(`Recording deleted: ${recordingSid}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete recording: ${error.message}`);
      return false;
    }
  }

  /**
   * Get recording statistics
   */
  async getStatistics(): Promise<{
    total: number;
    totalSize: number;
    totalDuration: number;
    averageDuration: number;
  }> {
    const recordings = Array.from(this.recordings.values());

    const totalSize = recordings.reduce((sum, r) => sum + r.fileSize, 0);
    const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);

    return {
      total: recordings.length,
      totalSize,
      totalDuration,
      averageDuration: recordings.length > 0 ? totalDuration / recordings.length : 0,
    };
  }

  /**
   * Clean up old recordings
   */
  async cleanupOldRecordings(olderThanDays: number = 30): Promise<number> {
    this.logger.log(`Cleaning up recordings older than ${olderThanDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deleted = 0;

    for (const [recordingSid, metadata] of this.recordings.entries()) {
      if (metadata.downloadedAt < cutoffDate) {
        const success = await this.deleteRecording(recordingSid);
        if (success) {
          deleted++;
        }
      }
    }

    this.logger.log(`Cleaned up ${deleted} old recordings`);

    return deleted;
  }

  /**
   * Export recording metadata
   */
  async exportMetadata(recordingSid: string): Promise<any> {
    const metadata = this.recordings.get(recordingSid);

    if (!metadata) {
      throw new Error('Recording not found');
    }

    return {
      ...metadata,
      fileExists: await this.checkFileExists(metadata.filePath),
    };
  }

  // Private helper methods

  /**
   * Save recording to storage
   */
  private async saveRecording(
    callSid: string,
    recordingSid: string,
    audioBuffer: Buffer,
  ): Promise<string> {
    const recordingsDir = path.join(this.storageBasePath, 'recordings');
    const fileName = `${callSid}_${recordingSid}.mp3`;
    const filePath = path.join(recordingsDir, fileName);

    await fs.writeFile(filePath, audioBuffer);

    return filePath;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    const recordingsDir = path.join(this.storageBasePath, 'recordings');

    try {
      await fs.mkdir(recordingsDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create recordings directory: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
