import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { TrainingMonitorService } from '../services/training-monitor.service';

/**
 * Training Monitor WebSocket Gateway
 * 
 * Provides real-time updates for training sessions
 * Currently simulates updates with mock data
 * Will be replaced with actual training process monitoring in production
 */
@WebSocketGateway({
  namespace: 'training-monitor',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class TrainingMonitorGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrainingMonitorGateway.name);
  private activeConnections = new Map<string, Set<string>>(); // sessionId -> Set of socketIds
  private updateIntervals = new Map<string, NodeJS.Timeout>(); // sessionId -> interval

  constructor(private readonly trainingMonitorService: TrainingMonitorService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up connections
    this.activeConnections.forEach((sockets, sessionId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.stopMonitoring(sessionId);
      }
    });
  }

  /**
   * Subscribe to training session updates
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { sessionId: string; companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, companyId } = data;

    this.logger.log(`Client ${client.id} subscribing to session: ${sessionId}`);

    // Add client to session room
    client.join(`session:${sessionId}`);

    // Track connection
    if (!this.activeConnections.has(sessionId)) {
      this.activeConnections.set(sessionId, new Set());
    }
    this.activeConnections.get(sessionId).add(client.id);

    // Start monitoring if not already started
    if (!this.updateIntervals.has(sessionId)) {
      this.startMonitoring(sessionId, companyId);
    }

    // Send initial status
    try {
      const status = await this.trainingMonitorService.getTrainingStatus(
        companyId,
        sessionId,
      );
      client.emit('training:status', status);
    } catch (error: any) {
      this.logger.error(`Error fetching initial status: ${error.message || error}`);
      client.emit('training:error', {
        message: 'Failed to fetch training status',
        error: error.message || String(error),
      });
    }

    return { success: true, message: 'Subscribed to training updates' };
  }

  /**
   * Unsubscribe from training session updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;

    this.logger.log(`Client ${client.id} unsubscribing from session: ${sessionId}`);

    // Remove client from session room
    client.leave(`session:${sessionId}`);

    // Remove from active connections
    const sockets = this.activeConnections.get(sessionId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.stopMonitoring(sessionId);
      }
    }

    return { success: true, message: 'Unsubscribed from training updates' };
  }

  /**
   * Request immediate update
   */
  @SubscribeMessage('request-update')
  async handleRequestUpdate(
    @MessageBody() data: { sessionId: string; companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, companyId } = data;

    try {
      const status = await this.trainingMonitorService.getTrainingStatus(
        companyId,
        sessionId,
      );
      client.emit('training:status', status);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error fetching update: ${error.message || error}`);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Start monitoring a training session
   * Broadcasts updates every 2 seconds (configurable)
   */
  private startMonitoring(sessionId: string, companyId: string) {
    this.logger.log(`Starting monitoring for session: ${sessionId}`);

    const interval = setInterval(async () => {
      try {
        // Fetch updated status
        const status = await this.trainingMonitorService.getTrainingStatus(
          companyId,
          sessionId,
        );

        // Broadcast to all clients in the session room
        this.server.to(`session:${sessionId}`).emit('training:status', status);

        // Fetch and broadcast metrics
        const metrics = await this.trainingMonitorService.getTrainingMetrics(
          companyId,
          sessionId,
        );
        this.server.to(`session:${sessionId}`).emit('training:metrics', metrics);

        // Fetch and broadcast progress
        const progress = await this.trainingMonitorService.getTrainingProgress(
          companyId,
          sessionId,
        );
        this.server.to(`session:${sessionId}`).emit('training:progress', progress);

        // Fetch and broadcast resources
        const resources = await this.trainingMonitorService.getResourceSummary(
          companyId,
          sessionId,
        );
        this.server.to(`session:${sessionId}`).emit('training:resources', resources);

        // Check for alerts
        const alerts = await this.trainingMonitorService.getAlerts(
          companyId,
          sessionId,
        );
        if (alerts.length > 0) {
          this.server.to(`session:${sessionId}`).emit('training:alerts', alerts);
        }
      } catch (error: any) {
        this.logger.error(`Error broadcasting updates: ${error.message || error}`);
        this.server.to(`session:${sessionId}`).emit('training:error', {
          message: 'Failed to fetch training updates',
          error: error.message || String(error),
        });
      }
    }, 2000); // Update every 2 seconds

    this.updateIntervals.set(sessionId, interval);
  }

  /**
   * Stop monitoring a training session
   */
  private stopMonitoring(sessionId: string) {
    this.logger.log(`Stopping monitoring for session: ${sessionId}`);

    const interval = this.updateIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(sessionId);
    }

    this.activeConnections.delete(sessionId);
  }

  /**
   * Manually broadcast an event (for future integration)
   */
  broadcastEvent(sessionId: string, event: string, data: any) {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Broadcast new log entry
   */
  broadcastLog(sessionId: string, log: any) {
    this.server.to(`session:${sessionId}`).emit('training:log', log);
  }

  /**
   * Broadcast timeline event
   */
  broadcastTimelineEvent(sessionId: string, event: any) {
    this.server.to(`session:${sessionId}`).emit('training:timeline-event', event);
  }

  /**
   * Broadcast checkpoint update
   */
  broadcastCheckpoint(sessionId: string, checkpoint: any) {
    this.server.to(`session:${sessionId}`).emit('training:checkpoint', checkpoint);
  }
}
