/**
 * Conversation Runtime Controller
 * REST API endpoints for conversation management
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationRuntimeManagerService } from './services/conversation-runtime-manager.service';
import { SessionPersistenceService } from './services/session-persistence.service';
import {
  StartConversationDto,
  SendMessageDto,
  EndConversationDto,
  HandleSilenceDto,
  ConversationResponseDto,
  SessionResponseDto,
  TranscriptResponseDto,
  StatisticsResponseDto,
} from './dto/conversation.dto';

@ApiTags('Conversation Runtime')
@Controller('conversation')
@ApiBearerAuth()
export class ConversationRuntimeController {
  private readonly logger = new Logger(ConversationRuntimeController.name);

  constructor(
    private readonly runtimeManager: ConversationRuntimeManagerService,
    private readonly persistence: SessionPersistenceService,
  ) {}

  /**
   * Start a new conversation
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a new conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Conversation started successfully',
    type: Object,
  })
  async startConversation(@Body() dto: StartConversationDto) {
    this.logger.log(`Starting conversation for call: ${dto.callId}`);

    const result = await this.runtimeManager.startConversation({
      callId: dto.callId,
      campaignId: dto.campaignId,
      contactId: dto.contactId,
      companyId: dto.companyId,
      customerPhone: dto.customerPhone,
      customerName: dto.customerName,
      customerLanguage: dto.customerLanguage,
      metadata: dto.metadata,
    });

    return {
      success: true,
      sessionId: result.session.sessionId,
      session: this.mapSessionToDto(result.session),
      greeting: {
        response: result.greeting.response,
        confidence: result.greeting.confidence,
        duration: result.greeting.duration,
      },
    };
  }

  /**
   * Process customer message
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process customer message and generate AI response' })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: ConversationResponseDto,
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
  ): Promise<ConversationResponseDto> {
    this.logger.debug(
      `Processing message for session: ${dto.sessionId}`,
    );

    const result = await this.runtimeManager.processMessage({
      sessionId: dto.sessionId,
      message: dto.message,
      metadata: dto.metadata,
    });

    return {
      success: result.success,
      response: result.response,
      confidence: result.confidence,
      intent: result.intent,
      shouldEndConversation: result.shouldEndConversation,
      duration: result.duration,
      metadata: result.metadata,
    };
  }

  /**
   * Handle silence timeout
   */
  @Post('silence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle customer silence timeout' })
  @ApiResponse({
    status: 200,
    description: 'Silence handled successfully',
    type: ConversationResponseDto,
  })
  async handleSilence(
    @Body() dto: HandleSilenceDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`Handling silence for session: ${dto.sessionId}`);

    const result = await this.runtimeManager.handleSilenceTimeout(
      dto.sessionId,
    );

    return {
      success: result.success,
      response: result.response,
      confidence: result.confidence,
      shouldEndConversation: result.shouldEndConversation,
      duration: result.duration,
      metadata: result.metadata,
    };
  }

  /**
   * End conversation
   */
  @Post('end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Conversation ended successfully',
  })
  async endConversation(@Body() dto: EndConversationDto) {
    this.logger.log(
      `Ending conversation: ${dto.sessionId}, reason: ${dto.reason}`,
    );

    const result = await this.runtimeManager.endConversation({
      sessionId: dto.sessionId,
      reason: dto.reason,
      metadata: dto.metadata,
    });

    return {
      success: true,
      sessionId: dto.sessionId,
      session: this.mapSessionToDto(result.session),
      goodbye: result.goodbye
        ? {
            response: result.goodbye.response,
            confidence: result.goodbye.confidence,
            duration: result.goodbye.duration,
          }
        : undefined,
    };
  }

  /**
   * Get session details
   */
  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get conversation session details' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved',
    type: SessionResponseDto,
  })
  async getSession(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionResponseDto> {
    const session = await this.runtimeManager.getSession(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return this.mapSessionToDto(session);
  }

  /**
   * Get session by call ID
   */
  @Get('session/call/:callId')
  @ApiOperation({ summary: 'Get conversation session by call ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved',
    type: SessionResponseDto,
  })
  async getSessionByCallId(
    @Param('callId') callId: string,
  ): Promise<SessionResponseDto> {
    const session = await this.runtimeManager.getSessionByCallId(callId);

    if (!session) {
      throw new NotFoundException(`Session not found for call: ${callId}`);
    }

    return this.mapSessionToDto(session);
  }

  /**
   * Get transcript
   */
  @Get('transcript/:callId')
  @ApiOperation({ summary: 'Get conversation transcript' })
  @ApiResponse({
    status: 200,
    description: 'Transcript retrieved',
    type: TranscriptResponseDto,
  })
  async getTranscript(
    @Param('callId') callId: string,
  ): Promise<TranscriptResponseDto> {
    const result = await this.persistence.getTranscriptByCallId(callId);

    if (!result.transcript) {
      throw new NotFoundException(`Transcript not found for call: ${callId}`);
    }

    return {
      callId,
      content: result.transcript.content,
      entries: result.entries.map((entry: any) => ({
        speaker: entry.speaker,
        content: entry.content,
        timestamp: entry.timestamp,
        intent: entry.intent,
        confidence: entry.confidence,
      })),
      metadata: result.transcript.metadata,
    };
  }

  /**
   * Get session statistics
   */
  @Get('statistics/:sessionId')
  @ApiOperation({ summary: 'Get conversation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    type: StatisticsResponseDto,
  })
  async getStatistics(
    @Param('sessionId') sessionId: string,
  ): Promise<StatisticsResponseDto> {
    return this.runtimeManager.getSessionStatistics(sessionId);
  }

  /**
   * Get all active sessions
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active conversation sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved',
    type: [SessionResponseDto],
  })
  async getActiveSessions(): Promise<SessionResponseDto[]> {
    const sessions = await this.runtimeManager.getActiveSessions();
    return sessions.map(session => this.mapSessionToDto(session));
  }

  /**
   * Get runtime health
   */
  @Get('health')
  @ApiOperation({ summary: 'Get conversation runtime health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved',
  })
  async getHealth() {
    return this.runtimeManager.healthCheck();
  }

  /**
   * Pause conversation
   */
  @Post('pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Conversation paused',
  })
  async pauseConversation(@Body() dto: { sessionId: string }) {
    await this.runtimeManager.pauseConversation(dto.sessionId);
    return {
      success: true,
      sessionId: dto.sessionId,
      message: 'Conversation paused',
    };
  }

  /**
   * Resume conversation
   */
  @Post('resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Conversation resumed',
  })
  async resumeConversation(@Body() dto: { sessionId: string }) {
    await this.runtimeManager.resumeConversation(dto.sessionId);
    return {
      success: true,
      sessionId: dto.sessionId,
      message: 'Conversation resumed',
    };
  }

  // Private helper methods

  private mapSessionToDto(session: any): SessionResponseDto {
    return {
      sessionId: session.sessionId,
      callId: session.callId,
      campaignId: session.campaignId,
      state: session.state,
      isActive: session.isActive,
      turnCount: session.turnCount,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: session.duration,
    };
  }
}
