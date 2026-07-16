import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VoiceStudioService } from './services/voice-studio.service';

interface VoiceGenerationMessage {
  companyId: string;
  text: string;
  voiceId: string;
  saveToHistory?: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'voice-studio',
})
export class VoiceStudioGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceStudioGateway.name);

  constructor(private readonly voiceStudioService: VoiceStudioService) {}

  afterInit(server: Server) {
    this.logger.log('Voice Studio Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('voice:generate')
  async handleVoiceGeneration(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: VoiceGenerationMessage,
  ) {
    try {
      this.emitProgress(client.id, 'STARTED', 0);

      this.emitProgress(client.id, 'PROCESSING', 25);

      const result = await this.voiceStudioService.generatePreview(
        data.companyId,
        {
          voiceId: data.voiceId,
          text: data.text,
          saveToHistory: data.saveToHistory,
        },
      );

      this.emitProgress(client.id, 'GENERATING', 75);

      this.emitProgress(client.id, 'COMPLETED', 100);

      this.server.to(client.id).emit('voice:ready', {
        audio: result.audio,
        duration: result.duration,
        format: result.format,
        metadata: result.metadata,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Voice generation failed: ${errorMessage}`, errorStack);
      this.server.to(client.id).emit('voice:error', {
        message: errorMessage,
        status: 'FAILED',
      });
    }
  }

  @SubscribeMessage('voice:test')
  async handleVoiceTest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ) {
    this.logger.log(`Test message from ${client.id}: ${data.message}`);
    this.server.to(client.id).emit('voice:test:response', {
      message: 'Connection successful',
      timestamp: new Date().toISOString(),
    });
  }

  private emitProgress(clientId: string, status: string, progress: number) {
    this.server.to(clientId).emit('voice:progress', {
      status,
      progress,
      timestamp: new Date().toISOString(),
    });
  }

  emitVoiceReady(companyId: string, data: any) {
    this.server.emit('voice:ready', {
      companyId,
      ...data,
    });
  }

  emitVoiceError(companyId: string, error: string) {
    this.server.emit('voice:error', {
      companyId,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
