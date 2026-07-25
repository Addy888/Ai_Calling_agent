import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import {
  MonitorCallStateEvent,
  MonitorTranscriptEvent,
  MonitorRecordingEvent,
  MonitorSummaryEvent,
} from './interfaces/telephony-provider.interface';

/**
 * Runtime Monitor Gateway
 *
 * Single WebSocket gateway that bridges EventEmitter2 events (emitted by both
 * MockTelephonyProvider and TwilioWebhookController) into Socket.IO events
 * consumed by the frontend Runtime Monitor.
 *
 * Both providers emit the SAME EventEmitter2 events — this gateway
 * is completely provider-agnostic.
 *
 * Socket.IO Namespace: /runtime-monitor
 *
 * Emitted socket events:
 *   monitor:call_state   — call phase changes (DIALING, CONNECTED, etc.)
 *   monitor:transcript   — new transcript entry (agent or customer)
 *   monitor:recording    — recording metadata when available
 *   monitor:summary      — final call summary on completion
 *   monitor:ping         — heartbeat response
 */
@WebSocketGateway({
  namespace: '/runtime-monitor',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RuntimeMonitorGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RuntimeMonitorGateway.name);
  private connectedClients = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle hooks
  // ───────────────────────────────────────────────────────────────────────────

  afterInit(server: Server): void {
    this.logger.log('✅ RuntimeMonitorGateway initialized on /runtime-monitor');
  }

  handleConnection(client: Socket): void {
    this.connectedClients++;
    this.logger.log(
      `Client connected: ${client.id} (total: ${this.connectedClients})`,
    );

    // Send current status on connect
    client.emit('monitor:connected', {
      message: 'Connected to Runtime Monitor',
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients = Math.max(0, this.connectedClients - 1);
    this.logger.log(
      `Client disconnected: ${client.id} (total: ${this.connectedClients})`,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Client → Server messages
  // ───────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): void {
    client.emit('monitor:ping', { pong: true, timestamp: new Date() });
  }

  @SubscribeMessage('subscribe_session')
  handleSubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    // Join a room scoped to this session so targeted events can be sent
    if (data?.sessionId) {
      client.join(`session:${data.sessionId}`);
      this.logger.log(`Client ${client.id} subscribed to session: ${data.sessionId}`);
      client.emit('monitor:subscribed', { sessionId: data.sessionId });
    }
  }

  @SubscribeMessage('unsubscribe_session')
  handleUnsubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (data?.sessionId) {
      client.leave(`session:${data.sessionId}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EventEmitter2 → Socket.IO bridge
  // These handlers are triggered by BOTH MockProvider and TwilioProvider
  // via identical EventEmitter2 event names.
  // ───────────────────────────────────────────────────────────────────────────

  @OnEvent('monitor.call_state')
  onCallState(event: MonitorCallStateEvent): void {
    this.logger.log(
      `[Monitor] call_state → ${event.state} (session: ${event.sessionId})`,
    );

    // Broadcast to all clients AND to session-specific room
    this.server.emit('monitor:call_state', event);
    this.server
      .to(`session:${event.sessionId}`)
      .emit('monitor:call_state', event);
  }

  @OnEvent('monitor.transcript')
  onTranscript(event: MonitorTranscriptEvent): void {
    this.logger.log(
      `[Monitor] transcript → [${event.role}] "${event.text.substring(0, 50)}..."`,
    );

    this.server.emit('monitor:transcript', event);
    this.server
      .to(`session:${event.sessionId}`)
      .emit('monitor:transcript', event);
  }

  @OnEvent('monitor.recording')
  onRecording(event: MonitorRecordingEvent): void {
    this.logger.log(
      `[Monitor] recording → ${event.recording.url} (session: ${event.sessionId})`,
    );

    this.server.emit('monitor:recording', event);
    this.server
      .to(`session:${event.sessionId}`)
      .emit('monitor:recording', event);
  }

  @OnEvent('monitor.summary')
  onSummary(event: MonitorSummaryEvent): void {
    this.logger.log(
      `[Monitor] summary → ${event.outcome} (session: ${event.sessionId}, duration: ${event.duration}s)`,
    );

    this.server.emit('monitor:summary', event);
    this.server
      .to(`session:${event.sessionId}`)
      .emit('monitor:summary', event);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Campaign-level events (can be emitted by CampaignExecutionService)
  // ───────────────────────────────────────────────────────────────────────────

  @OnEvent('monitor.campaign_status')
  onCampaignStatus(event: {
    campaignId: string;
    state: string;
    totalContacts: number;
    processedContacts: number;
    activeCalls: number;
    successfulCalls: number;
    failedCalls: number;
    timestamp: Date;
  }): void {
    this.server.emit('monitor:campaign_status', event);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: broadcast to all connected clients
  // (used by other services to push ad-hoc events)
  // ───────────────────────────────────────────────────────────────────────────

  broadcastToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }
}
