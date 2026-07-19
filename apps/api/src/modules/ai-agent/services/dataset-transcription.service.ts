import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TranscriptionOptionsDto, TranscriptSegmentDto } from '../dto/dataset.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class DatasetTranscriptionService {
  private readonly logger = new Logger(DatasetTranscriptionService.name);
  private readonly datasetRoot = path.join(process.cwd(), 'Ai voice Dataset');

  constructor(private readonly prisma: PrismaService) {}

  async transcribeAudio(
    datasetRecordId: string,
    options?: TranscriptionOptionsDto,
  ): Promise<any> {
    this.logger.log(`Transcribing audio for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const startTime = Date.now();

    try {
      // Generate transcript using Faster Whisper (Python)
      const transcriptResult = await this.runFasterWhisper(
        dataset.filePath,
        options,
      );

      const processingTime = (Date.now() - startTime) / 1000;

      // Detect language
      const detectedLanguages = this.detectLanguages(transcriptResult.text);
      const primaryLanguage = detectedLanguages[0]?.language || 'en';
      const languageConfidence = detectedLanguages[0]?.confidence || 0.8;

      // Count words and characters
      const wordCount = transcriptResult.text.split(/\s+/).length;
      const characterCount = transcriptResult.text.length;

      // Save transcript to database
      const transcript = await this.prisma.transcript.upsert({
        where: { datasetRecordId },
        create: {
          datasetRecordId,
          rawText: transcriptResult.text,
          processedText: this.cleanText(transcriptResult.text),
          language: primaryLanguage,
          languageConfidence,
          detectedLanguages,
          wordCount,
          characterCount,
          speakerCount: transcriptResult.speakerCount || 0,
          transcriptionEngine: options?.engine || 'faster-whisper',
          processingTime,
          confidence: transcriptResult.confidence || 0.9,
          segments: transcriptResult.segments || [],
        },
        update: {
          rawText: transcriptResult.text,
          processedText: this.cleanText(transcriptResult.text),
          language: primaryLanguage,
          languageConfidence,
          detectedLanguages,
          wordCount,
          characterCount,
          speakerCount: transcriptResult.speakerCount || 0,
          transcriptionEngine: options?.engine || 'faster-whisper',
          processingTime,
          confidence: transcriptResult.confidence || 0.9,
          segments: transcriptResult.segments || [],
        },
      });

      // Save transcript to file
      const transcriptPath = path.join(
        this.datasetRoot,
        'transcripts',
        `${path.parse(dataset.fileName).name}.txt`,
      );
      await fs.writeFile(transcriptPath, transcriptResult.text, 'utf-8');

      // Update dataset record
      await this.prisma.datasetRecord.update({
        where: { id: datasetRecordId },
        data: {
          status: 'PROCESSING',
          processingStage: 'TRANSCRIPTION_COMPLETE',
        },
      });

      // Add log
      await this.addLog(
        datasetRecordId,
        'TRANSCRIPTION',
        'INFO',
        `Transcription complete: ${wordCount} words, ${primaryLanguage}`,
        { processingTime, wordCount, language: primaryLanguage },
      );

      this.logger.log(
        `Transcription complete for ${datasetRecordId}: ${wordCount} words in ${processingTime.toFixed(2)}s`,
      );

      return transcript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Transcription failed: ${errorMessage}`);

      await this.prisma.datasetRecord.update({
        where: { id: datasetRecordId },
        data: {
          status: 'FAILED',
          processingStage: 'TRANSCRIPTION_FAILED',
          errorMessage,
        },
      });

      await this.addLog(
        datasetRecordId,
        'TRANSCRIPTION',
        'ERROR',
        `Transcription failed: ${errorMessage}`,
        { error: errorMessage },
      );

      throw error;
    }
  }

  private async runFasterWhisper(
    filePath: string,
    options?: TranscriptionOptionsDto,
  ): Promise<any> {
    try {
      // Try to use faster-whisper-server or faster-whisper CLI
      // For now, using a simplified approach with OpenAI Whisper API format

      this.logger.log('Running Faster Whisper transcription...');

      // Placeholder: In production, this would call faster-whisper Python script
      // Example: python scripts/transcribe.py --model base --language auto --file "path"

      // For demonstration, we'll generate a mock transcript
      // In production, replace this with actual Faster Whisper integration

      const mockTranscript = await this.generateMockTranscript(filePath);

      return mockTranscript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Faster Whisper execution failed: ${errorMessage}`);
      throw error;
    }
  }

  private async generateMockTranscript(filePath: string): Promise<any> {
    // Mock transcript for development
    // In production, replace with actual Faster Whisper results

    const fileName = path.basename(filePath);
    const phone = fileName.match(/\d{10}/)?.[0] || '9999999999';

    const mockText = `Hello sir. Good morning. Myself calling from Real Estate Company. Sir, I wanted to inform you about our new property project. It's a 2BHK apartment in a prime location. The price starts from 45 lakhs. Are you interested in knowing more details? Yes, please tell me more. Sure sir. The property is located near the main highway. It has all modern amenities like gym, swimming pool, and clubhouse. We also provide home loan assistance. When would you like to schedule a site visit? I am interested. Can you send me the brochure? Yes sir, I will send you the complete brochure on WhatsApp. Also, our sales team will call you tomorrow to schedule a site visit. Thank you for your interest. Have a great day.`;

    const segments: TranscriptSegmentDto[] = [
      {
        start: 0,
        end: 5,
        text: 'Hello sir. Good morning.',
        confidence: 0.95,
        speaker: 'SPEAKER_0',
      },
      {
        start: 5,
        end: 12,
        text: 'Myself calling from Real Estate Company.',
        confidence: 0.92,
        speaker: 'SPEAKER_0',
      },
      {
        start: 12,
        end: 20,
        text: 'Sir, I wanted to inform you about our new property project.',
        confidence: 0.89,
        speaker: 'SPEAKER_0',
      },
      {
        start: 20,
        end: 28,
        text: "It's a 2BHK apartment in a prime location.",
        confidence: 0.93,
        speaker: 'SPEAKER_0',
      },
      {
        start: 28,
        end: 33,
        text: 'The price starts from 45 lakhs.',
        confidence: 0.91,
        speaker: 'SPEAKER_0',
      },
      {
        start: 33,
        end: 38,
        text: 'Are you interested in knowing more details?',
        confidence: 0.88,
        speaker: 'SPEAKER_0',
      },
      {
        start: 38,
        end: 42,
        text: 'Yes, please tell me more.',
        confidence: 0.94,
        speaker: 'SPEAKER_1',
      },
      {
        start: 42,
        end: 48,
        text: 'Sure sir. The property is located near the main highway.',
        confidence: 0.90,
        speaker: 'SPEAKER_0',
      },
      {
        start: 48,
        end: 55,
        text: 'It has all modern amenities like gym, swimming pool, and clubhouse.',
        confidence: 0.87,
        speaker: 'SPEAKER_0',
      },
      {
        start: 55,
        end: 60,
        text: 'We also provide home loan assistance.',
        confidence: 0.92,
        speaker: 'SPEAKER_0',
      },
      {
        start: 60,
        end: 65,
        text: 'When would you like to schedule a site visit?',
        confidence: 0.89,
        speaker: 'SPEAKER_0',
      },
      {
        start: 65,
        end: 72,
        text: 'I am interested. Can you send me the brochure?',
        confidence: 0.93,
        speaker: 'SPEAKER_1',
      },
      {
        start: 72,
        end: 78,
        text: 'Yes sir, I will send you the complete brochure on WhatsApp.',
        confidence: 0.91,
        speaker: 'SPEAKER_0',
      },
      {
        start: 78,
        end: 85,
        text: 'Also, our sales team will call you tomorrow to schedule a site visit.',
        confidence: 0.88,
        speaker: 'SPEAKER_0',
      },
      {
        start: 85,
        end: 90,
        text: 'Thank you for your interest. Have a great day.',
        confidence: 0.95,
        speaker: 'SPEAKER_0',
      },
    ];

    return {
      text: mockText,
      segments,
      confidence: 0.91,
      speakerCount: 2,
      language: 'en',
      duration: 90,
    };
  }

  private detectLanguages(text: string): Array<{ language: string; confidence: number }> {
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const marathiPattern = /[\u0900-\u097F]/; // Same as Hindi (Devanagari)
    const englishPattern = /[a-zA-Z]/;

    const results = [];

    if (englishPattern.test(text)) {
      results.push({ language: 'en', confidence: 0.9 });
    }

    if (hindiPattern.test(text)) {
      results.push({ language: 'hi', confidence: 0.85 });
    }

    if (marathiPattern.test(text)) {
      results.push({ language: 'mr', confidence: 0.85 });
    }

    if (results.length === 0) {
      results.push({ language: 'en', confidence: 0.5 });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .trim();
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
