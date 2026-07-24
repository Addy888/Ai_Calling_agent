import { Injectable, Logger } from '@nestjs/common';
import { AudioChunkProcessor } from './audio-chunk-processor';
import { SpeechBufferManager } from './speech-buffer-manager';
import { WhisperManager } from './whisper.manager';
import { TranscriptAssembler } from './transcript-assembler';
import { TranscriptionSessionManager, TranscriptionSessionStatus } from './transcription-session-manager';
import { LanguageDetector } from './language-detector';
import { StreamingException } from '../exceptions/speech-recognition.exception';

export interface StreamChunkOptions {
  sessionId: string;
  chunkDurationMs?: number;
  language?: string;
  enablePartialResults?: boolean;
}

@Injectable()
export class StreamingSpeechEngine {
  private readonly logger = new Logger(StreamingSpeechEngine.name);

  // Partial transcript buffers — accumulate speech between final results
  private readonly partialBuffers = new Map<string, string>();

  constructor(
    private readonly chunkProcessor: AudioChunkProcessor,
    private readonly bufferManager: SpeechBufferManager,
    private readonly whisperManager: WhisperManager,
    private readonly transcriptAssembler: TranscriptAssembler,
    private readonly sessionManager: TranscriptionSessionManager,
    private readonly languageDetector: LanguageDetector,
  ) {}

  /**
   * Process a streaming audio chunk from a live call
   * This is the core real-time path:
   *   PCM Chunk → Noise Reduction → VAD → Buffer → Whisper → Transcript Event
   */
  async processStreamChunk(chunk: Buffer, options: StreamChunkOptions): Promise<void> {
    const {
      sessionId,
      chunkDurationMs = 20,
      language,
      enablePartialResults = true,
    } = options;

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new StreamingException(`Session not found: ${sessionId}`);
    }

    if (session.status !== TranscriptionSessionStatus.ACTIVE) {
      throw new StreamingException(`Session is not active: ${sessionId} (status: ${session.status})`);
    }

    try {
      // Stage 1–3: Noise Reduction + VAD + Buffer
      const { isSpeech } = await this.chunkProcessor.processChunk(
        { sessionId, chunkDurationMs },
        chunk,
      );

      // Update session stats
      this.sessionManager.recordChunk(sessionId, chunk.length);

      // Stage 4: Partial streaming transcription (low-latency rolling Whisper)
      if (isSpeech && enablePartialResults) {
        const peekBuffer = this.bufferManager.peek(sessionId);
        const MIN_BYTES_FOR_PARTIAL = 16000 * 2 * 0.5; // 0.5s at 16kHz mono

        if (peekBuffer.length >= MIN_BYTES_FOR_PARTIAL) {
          // Transcribe what we have so far for partial result
          const langCode = language ?? session.language;
          const partialResult = await this.whisperManager.transcribe(peekBuffer, { language: langCode });

          if (partialResult.text.trim()) {
            this.transcriptAssembler.emitPartial(
              sessionId,
              partialResult.text,
              partialResult.confidence,
              partialResult.words ?? [],
            );
          }
        }
      }

      // Stage 5: When speech ends (buffer was flushed by AudioChunkProcessor via event),
      // we trigger final transcription from the flushed segment.
      // Final transcription is triggered by the SpeechEnded event in SpeechRecognitionManager.
    } catch (error) {
      if (error instanceof StreamingException) throw error;
      if (error instanceof Error) {
        this.logger.error(`Streaming error for session ${sessionId}: ${error.message}`, error.stack);
        throw new StreamingException(error.message);
      }
      throw new StreamingException('Unknown streaming error');
    }
  }

  /**
   * Trigger final transcription for a completed speech segment
   * Called when VAD detects speech_ended
   */
  async transcribeSegment(sessionId: string, audioSegment: Buffer): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.logger.warn(`Cannot transcribe segment: session not found: ${sessionId}`);
      return;
    }

    if (audioSegment.length === 0) {
      this.logger.debug(`Empty segment for session ${sessionId}, skipping`);
      return;
    }

    try {
      const startTime = Date.now();

      const result = await this.whisperManager.transcribe(audioSegment, {
        language: session.language !== 'auto' ? session.language : undefined,
      });

      const latencyMs = Date.now() - startTime;

      if (result.text.trim()) {
        // Update detected language
        if (result.language && result.language !== session.language) {
          this.sessionManager.updateLanguage(sessionId, result.language);
        }

        // Assemble and emit final transcript
        await this.transcriptAssembler.emitFinal(
          sessionId,
          result.text,
          result.confidence,
          result.words ?? [],
          result.language,
        );

        this.sessionManager.recordTurn(sessionId);
        this.logger.log(
          `[${sessionId}] Final transcription: "${result.text.substring(0, 80)}" ` +
          `(${(audioSegment.length / (16000 * 2)).toFixed(2)}s audio, latency: ${latencyMs}ms)`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Final transcription failed for ${sessionId}: ${error.message}`, error.stack);
      }
    }
  }
}
