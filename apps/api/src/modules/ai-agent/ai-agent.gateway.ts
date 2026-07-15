import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ai-runtime',
})
export class AIAgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(AIAgentGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe:agent')
  handleSubscribeAgent(@ConnectedSocket() client: Socket, @MessageBody() data: { agentId: string }) {
    const room = `agent:${data.agentId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribed', data: { room } };
  }

  @SubscribeMessage('unsubscribe:agent')
  handleUnsubscribeAgent(@ConnectedSocket() client: Socket, @MessageBody() data: { agentId: string }) {
    const room = `agent:${data.agentId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    return { event: 'unsubscribed', data: { room } };
  }

  @SubscribeMessage('subscribe:session')
  handleSubscribeSession(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const room = `session:${data.sessionId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribed', data: { room } };
  }

  @SubscribeMessage('unsubscribe:session')
  handleUnsubscribeSession(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const room = `session:${data.sessionId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    return { event: 'unsubscribed', data: { room } };
  }

  emitAgentStarted(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('agent:started', data);
    this.logger.debug(`Emitted agent:started for ${agentId}`);
  }

  emitAgentStopped(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('agent:stopped', data);
    this.logger.debug(`Emitted agent:stopped for ${agentId}`);
  }

  emitAgentPaused(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('agent:paused', data);
    this.logger.debug(`Emitted agent:paused for ${agentId}`);
  }

  emitAgentResumed(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('agent:resumed', data);
    this.logger.debug(`Emitted agent:resumed for ${agentId}`);
  }

  emitAgentError(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('agent:error', data);
    this.logger.debug(`Emitted agent:error for ${agentId}`);
  }

  emitSessionCreated(sessionId: string, data: any) {
    this.server.to(`session:${sessionId}`).emit('session:created', data);
    this.logger.debug(`Emitted session:created for ${sessionId}`);
  }

  emitSessionClosed(sessionId: string, data: any) {
    this.server.to(`session:${sessionId}`).emit('session:closed', data);
    this.logger.debug(`Emitted session:closed for ${sessionId}`);
  }

  emitSessionPaused(sessionId: string, data: any) {
    this.server.to(`session:${sessionId}`).emit('session:paused', data);
    this.logger.debug(`Emitted session:paused for ${sessionId}`);
  }

  emitSessionResumed(sessionId: string, data: any) {
    this.server.to(`session:${sessionId}`).emit('session:resumed', data);
    this.logger.debug(`Emitted session:resumed for ${sessionId}`);
  }

  emitRuntimeReady(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('runtime:ready', data);
    this.logger.debug(`Emitted runtime:ready for ${agentId}`);
  }

  emitRuntimeError(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('runtime:error', data);
    this.logger.debug(`Emitted runtime:error for ${agentId}`);
  }

  emitStateChanged(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('state:changed', data);
    this.logger.debug(`Emitted state:changed for ${agentId}`);
  }

  emitHealthUpdate(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('health:update', data);
    this.logger.debug(`Emitted health:update for ${agentId}`);
  }

  emitConversationTurn(sessionId: string, data: any) {
    this.server.to(`session:${sessionId}`).emit('conversation:turn', data);
    this.logger.debug(`Emitted conversation:turn for ${sessionId}`);
  }

  emitMetricsUpdate(agentId: string, data: any) {
    this.server.to(`agent:${agentId}`).emit('metrics:update', data);
    this.logger.debug(`Emitted metrics:update for ${agentId}`);
  }

  broadcastSystemHealth(data: any) {
    this.server.emit('system:health', data);
    this.logger.debug('Broadcasted system:health');
  }
}
