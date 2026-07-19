import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/conversation-intelligence',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConversationIntelligenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationIntelligenceGateway.name);
  private clients: Map<string, { socket: Socket; companyId: string }> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  @SubscribeMessage('conversation:subscribe')
  handleSubscribe(client: Socket, payload: { companyId: string }) {
    this.logger.log(`Client ${client.id} subscribed to company ${payload.companyId}`);
    this.clients.set(client.id, { socket: client, companyId: payload.companyId });
    client.join(`company:${payload.companyId}`);
  }

  @SubscribeMessage('conversation:unsubscribe')
  handleUnsubscribe(client: Socket, payload: { companyId: string }) {
    this.logger.log(`Client ${client.id} unsubscribed from company ${payload.companyId}`);
    client.leave(`company:${payload.companyId}`);
    this.clients.delete(client.id);
  }

  // ============================================
  // EMIT EVENTS
  // ============================================

  emitAnalysisStarted(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:analysis:started', data);
  }

  emitAnalysisProgress(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:analysis:progress', data);
  }

  emitAnalysisCompleted(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:analysis:completed', data);
  }

  emitAnalysisFailed(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:analysis:failed', data);
  }

  emitInsightGenerated(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:insight:generated', data);
  }

  emitKnowledgeAdded(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:knowledge:added', data);
  }

  emitStatsUpdated(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:stats:updated', data);
  }

  emitObjectionDetected(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:objection:detected', data);
  }

  emitLeadScored(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation:lead:scored', data);
  }
}
