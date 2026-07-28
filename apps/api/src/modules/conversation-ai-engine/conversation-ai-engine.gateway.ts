/**
 * Conversation AI Engine Gateway
 * Real-time WebSocket communication for streaming audio and conversation events
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
import { AudioStreamManagerService } from './services/audio-stream-manager.service';

@WebSocketGateway({
  namespace: '/conversation-ai-engine',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConversationAIEngineGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationAIEngineGateway.name);

  // Track active conversation sessions
  private activeConnections = new Map<string, string>(); // socketId -> sessionId

  constructor(
    private readonly orchestrator: ConversationOrchestratorService,
    private readonly audioStreamManager: AudioStreamManagerService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🚀 Conversation AI Engine Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to Conversation AI Engine',
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: Socket) {
    const sessionId = this.activeConnections.get(client.id);
    
    if (sessionId) {
      this.logger.warn(`Client ${client.id} disconnected. Ending session ${sessionId}`);
      
      try {
        await this.orchestrator.endSession(sessionId, {
          reason: 'CLIENT_DISCONNECTED',
          socketId: client.id,
        });
      } catch (error) {
        this.logger.error(`Error ending session ${sessionId}: ${error.message}`);
      }
      
      this.activeConnections.delete(client.id);
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  @SubscribeMessage('start_conversation')
  async handleStartConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      campaignId: string;
      contactId: string;
      callId: string;
      config?: any;
    },
  ) {
    try {
      this.logger.log(`Starting conversation for client ${client.id}`);

      const session = await this.orchestrator.startSession({
        ...data,
        socketId: client.id,
      });

      this.activeConnections.set(client.id, session.sessionId);

      // Subscribe client to session room
      client.join(`session:${session.sessionId}`);

      client.emit('conversation_started', {
        sessionId: session.sessionId,
        status: 'ACTIVE',
        timestamp: new Date().toISOString(),
      });

      return { success: true, sessionId: session.sessionId };
    } catch (error) {
      this.logger.error(`Error starting conversation: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'start_conversation',
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('end_conversation')
  async handleEndConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; reason?: string },
  ) {
    try {
      const summary = await this.orchestrator.endSession(data.sessionId, {
        reason: data.reason || 'USER_ENDED',
        socketId: client.id,
      });

      this.activeConnections.delete(client.id);
      client.leave(`session:${data.sessionId}`);

      client.emit('conversation_ended', {
        sessionId: data.sessionId,
        summary,
        timestamp: new Date().toISOString(),
      });

      return { success: true, summary };
    } catch (error) {
      this.logger.error(`Error ending conversation: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'end_conversation',
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // AUDIO STREAMING
  // ─────────────────────────────────────────────────────────────

  @SubscribeMessage('audio_chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      sessionId: string;
      audioData: Buffer | string; // Base64 encoded audio
      sampleRate?: number;
      channels?: number;
      encoding?: string;
    },
  ) {
    try {
      // Convert base64 to buffer if needed
      const audioBuffer = typeof data.audioData === 'string'
        ? Buffer.from(data.audioData, 'base64')
        : data.audioData;

      // Process audio chunk through the orchestrator
      await this.audioStreamManager.processIncomingAudio(data.sessionId, {
        audioData: audioBuffer,
        sampleRate: data.sampleRate || 16000,
        channels: data.channels || 1,
        format: 'pcm', // Default format
        encoding: data.encoding || 'pcm',
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing audio chunk: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'audio_chunk',
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SERVER EVENTS (Called by services to emit to clients)
  // ─────────────────────────────────────────────────────────────

  /**
   * Emit customer speaking event
   */
  emitCustomerSpeaking(sessionId: string, data: { text?: string; isFinal?: boolean }) {
    this.server.to(`session:${sessionId}`).emit('customer_speaking', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit transcript update
   */
  emitTranscriptUpdate(sessionId: string, data: {
    speaker: 'CUSTOMER' | 'AI';
    text: string;
    confidence?: number;
    language?: string;
    isFinal: boolean;
  }) {
    this.server.to(`session:${sessionId}`).emit('transcript_updated', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit AI thinking event
   */
  emitAIThinking(sessionId: string, data: { status: string; progress?: number }) {
    this.server.to(`session:${sessionId}`).emit('ai_thinking', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit knowledge retrieved event
   */
  emitKnowledgeRetrieved(sessionId: string, data: { sources: any[]; relevance: number }) {
    this.server.to(`session:${sessionId}`).emit('knowledge_retrieved', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit LLM responding event
   */
  emitLLMResponding(sessionId: string, data: { chunk?: string; isComplete?: boolean }) {
    this.server.to(`session:${sessionId}`).emit('llm_responding', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit AI speaking event
   */
  emitAISpeaking(sessionId: string, data: {
    text: string;
    audioChunk?: Buffer;
    emotion?: string;
    isComplete?: boolean;
  }) {
    const payload: any = {
      sessionId,
      text: data.text,
      emotion: data.emotion,
      isComplete: data.isComplete,
      timestamp: new Date().toISOString(),
    };

    // Send audio as base64 if available
    if (data.audioChunk) {
      payload.audioData = data.audioChunk.toString('base64');
    }

    this.server.to(`session:${sessionId}`).emit('ai_speaking', payload);
  }

  /**
   * Emit interruption detected
   */
  emitInterruptionDetected(sessionId: string) {
    this.server.to(`session:${sessionId}`).emit('interruption_detected', {
      sessionId,
      message: 'Customer interruption detected',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit intent detected
   */
  emitIntentDetected(sessionId: string, data: {
    intent: string;
    confidence: number;
    entities?: any[];
  }) {
    this.server.to(`session:${sessionId}`).emit('intent_detected', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit emotion detected
   */
  emitEmotionDetected(sessionId: string, data: {
    emotion: string;
    confidence: number;
    source: 'CUSTOMER' | 'AI';
  }) {
    this.server.to(`session:${sessionId}`).emit('emotion_detected', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit function call event
   */
  emitFunctionCall(sessionId: string, data: {
    functionName: string;
    parameters: any;
    result?: any;
  }) {
    this.server.to(`session:${sessionId}`).emit('function_call', {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit conversation summary
   */
  emitSummaryGenerated(sessionId: string, summary: any) {
    this.server.to(`session:${sessionId}`).emit('summary_generated', {
      sessionId,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit error event
   */
  emitError(sessionId: string, error: { message: string; code?: string; details?: any }) {
    this.server.to(`session:${sessionId}`).emit('error', {
      sessionId,
      ...error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit performance metrics
   */
  emitMetrics(sessionId: string, metrics: {
    sttLatency?: number;
    llmLatency?: number;
    ttsLatency?: number;
    totalLatency?: number;
  }) {
    this.server.to(`session:${sessionId}`).emit('metrics', {
      sessionId,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }
}
