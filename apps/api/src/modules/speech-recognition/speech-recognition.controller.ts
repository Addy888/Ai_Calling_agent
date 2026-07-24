import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechRecognitionManager } from './services/speech-recognition-manager';
import {
  StartSTTSessionDto,
  StopSTTSessionDto,
  StreamAudioChunkDto,
  STTSessionStatusDto,
  STTProviderStatusDto,
  STTEngineStatusDto,
} from './dto/stt.dto';

@Controller('stt')
export class SpeechRecognitionController {
  private readonly logger = new Logger(SpeechRecognitionController.name);

  constructor(private readonly sttManager: SpeechRecognitionManager) {}

  /**
   * POST /stt/start
   * Initialize a new transcription session for a call
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startSession(
    @Body() dto: StartSTTSessionDto,
  ): Promise<{ sessionId: string; message: string }> {
    this.logger.log(`Starting STT session for call: ${dto.callSessionId}`);

    const sessionId = await this.sttManager.startSession({
      callSessionId: dto.callSessionId,
      language: dto.language,
      provider: dto.provider as any,
      enablePartialResults: dto.enablePartialResults,
    });

    return {
      sessionId,
      message: 'STT session started successfully',
    };
  }

  /**
   * POST /stt/stop
   * Stop an active transcription session and get the full transcript
   */
  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stopSession(
    @Body() dto: StopSTTSessionDto,
  ): Promise<{ fullText: string; turnsCount: number; message: string }> {
    this.logger.log(`Stopping STT session: ${dto.sessionId}`);

    const result = await this.sttManager.stopSession(dto.sessionId);

    return {
      ...result,
      message: 'STT session stopped successfully',
    };
  }

  /**
   * POST /stt/stream
   * Accept raw PCM audio chunk multipart upload and stream it into STT pipeline
   */
  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async streamChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: StreamAudioChunkDto,
  ): Promise<{ processed: boolean }> {
    if (!file || !file.buffer) {
      return { processed: false };
    }

    await this.sttManager.streamChunk(
      dto.sessionId,
      file.buffer,
      dto.chunkDurationMs ?? 20,
    );

    return { processed: true };
  }

  /**
   * GET /stt/status/:sessionId
   * Get the current status of a transcription session
   */
  @Get('status/:sessionId')
  getSessionStatus(@Param('sessionId') sessionId: string): STTSessionStatusDto | null {
    return this.sttManager.getSessionStatus(sessionId);
  }

  /**
   * GET /stt/sessions
   * Retrieve all currently active transcription sessions
   */
  @Get('sessions')
  getActiveSessions(): STTSessionStatusDto[] {
    return this.sttManager.getActiveSessions();
  }

  /**
   * GET /stt/providers
   * List all registered STT providers and their availability
   */
  @Get('providers')
  async getProviders(): Promise<STTProviderStatusDto[]> {
    return this.sttManager.getProviders();
  }

  /**
   * GET /stt/status
   * Get overall STT engine status
   */
  @Get('status')
  getEngineStatus(): STTEngineStatusDto {
    const sessions = this.sttManager.getActiveSessions();
    return {
      isRunning: true,
      activeSessionsCount: sessions.length,
      activeProvider: 'faster-whisper',
    };
  }
}
