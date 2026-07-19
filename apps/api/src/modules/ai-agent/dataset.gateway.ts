import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'dataset',
})
@UseGuards(JwtAuthGuard)
export class DatasetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DatasetGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ============================================
  // UPLOAD EVENTS
  // ============================================

  emitUploadProgress(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    progress: number;
    status: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:upload:progress', data);
  }

  emitUploadComplete(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    fileSize: number;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:upload:complete', data);
  }

  emitUploadFailed(companyId: string, data: {
    fileName: string;
    error: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:upload:failed', data);
  }

  // ============================================
  // PROCESSING EVENTS
  // ============================================

  emitProcessingStarted(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    stage: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:processing:started', data);
  }

  emitProcessingProgress(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    stage: string;
    progress: number;
    currentFile?: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:processing:progress', data);
  }

  emitProcessingComplete(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    stage: string;
    duration: number;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:processing:complete', data);
  }

  emitProcessingFailed(companyId: string, data: {
    datasetRecordId: string;
    fileName: string;
    stage: string;
    error: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:processing:failed', data);
  }

  // ============================================
  // JOB EVENTS
  // ============================================

  emitJobCreated(companyId: string, data: {
    jobId: string;
    jobType: string;
    datasetRecordId: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:job:created', data);
  }

  emitJobStarted(companyId: string, data: {
    jobId: string;
    jobType: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:job:started', data);
  }

  emitJobCompleted(companyId: string, data: {
    jobId: string;
    jobType: string;
    result: any;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:job:completed', data);
  }

  emitJobFailed(companyId: string, data: {
    jobId: string;
    jobType: string;
    error: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:job:failed', data);
  }

  // ============================================
  // EXPORT EVENTS
  // ============================================

  emitExportStarted(companyId: string, data: {
    exportId: string;
    name: string;
    format: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:export:started', data);
  }

  emitExportProgress(companyId: string, data: {
    exportId: string;
    progress: number;
    currentRecord: number;
    totalRecords: number;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:export:progress', data);
  }

  emitExportComplete(companyId: string, data: {
    exportId: string;
    filePath: string;
    fileSize: number;
    recordCount: number;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:export:complete', data);
  }

  emitExportFailed(companyId: string, data: {
    exportId: string;
    error: string;
  }) {
    this.server.to(`company:${companyId}`).emit('dataset:export:failed', data);
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  @SubscribeMessage('dataset:subscribe')
  handleSubscribe(client: Socket, data: { companyId: string }) {
    client.join(`company:${data.companyId}`);
    this.logger.log(`Client ${client.id} subscribed to company:${data.companyId}`);
    return { success: true };
  }

  @SubscribeMessage('dataset:unsubscribe')
  handleUnsubscribe(client: Socket, data: { companyId: string }) {
    client.leave(`company:${data.companyId}`);
    this.logger.log(`Client ${client.id} unsubscribed from company:${data.companyId}`);
    return { success: true };
  }
}
