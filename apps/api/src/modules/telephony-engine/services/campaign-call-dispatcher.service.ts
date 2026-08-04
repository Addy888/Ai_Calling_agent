/**
 * Campaign Call Dispatcher Service
 * Dispatches campaign calls through Asterisk + GSM Gateway
 * 
 * Flow:
 * Campaign → BullMQ → Worker → SIM Selection → Asterisk AMI → GSM1 → Dinstar → Physical SIM → Customer
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AsteriskProductionAMIService } from './asterisk-production-ami.service';
import { GatewayManagerService } from './gateway-manager.service';
import { SIMManagerService } from './sim-manager.service';

export interface CampaignCallJob {
  campaignId: string;
  contactId: string;
  companyId: string;
  phoneNumber: string;
  callerId: string;
  metadata?: Record<string, any>;
}

export interface CallResult {
  callId: string;
  status: 'SUCCESS' | 'FAILED' | 'BUSY' | 'NO_ANSWER';
  channel?: string;
  gatewayId?: string;
  simId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  errorMessage?: string;
}

@Injectable()
export class CampaignCallDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignCallDispatcherService.name);
  
  private callQueue: Queue | null = null;
  private callWorker: Worker | null = null;
  private queueEvents: QueueEvents | null = null;
  private maxConcurrentCalls: number;
  private callTimeout: number;
  
  // Redis connection state
  private redisConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Active calls tracking
  private activeCalls: Map<string, ActiveCall> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly asteriskAMI: AsteriskProductionAMIService,
    private readonly gatewayManager: GatewayManagerService,
    private readonly simManager: SIMManagerService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Campaign Call Dispatcher Service starting...');
    
    this.maxConcurrentCalls = parseInt(
      this.configService.get('MAX_CONCURRENT_CALLS', '3')
    );
    this.callTimeout = parseInt(
      this.configService.get('CALL_TIMEOUT', '120')
    );

    await this.initializeQueue();
    await this.initializeWorker();
    await this.initializeQueueEvents();

    this.logger.log('✅ Campaign Call Dispatcher ready');
    this.logger.log(`   Max Concurrent: ${this.maxConcurrentCalls}`);
    this.logger.log(`   Call Timeout: ${this.callTimeout}s`);
    
    if (!this.redisConnected) {
      this.logger.warn('⚠️  Operating in degraded mode without Redis queue');
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Campaign Call Dispatcher Service shutting down...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close all BullMQ instances
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }

    if (this.callWorker) {
      await this.callWorker.close();
      this.callWorker = null;
    }

    if (this.callQueue) {
      await this.callQueue.close();
      this.callQueue = null;
    }

    this.logger.log('✅ Campaign Call Dispatcher Service stopped');
  }

  /**
   * Initialize BullMQ queue
   */
  private async initializeQueue(): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
    const redisPassword = this.configService.get('REDIS_PASSWORD');

    try {
      this.logger.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}...`);

      this.callQueue = new Queue('campaign-calls', {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > this.maxReconnectAttempts) {
              return null; // Stop retrying
            }
            const delay = Math.min(times * 1000, 10000);
            return delay;
          },
          enableOfflineQueue: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 86400, // Keep for 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 604800, // Keep for 7 days
          },
        },
      });

      // Test connection by adding a dummy job and removing it
      try {
        const testJob = await this.callQueue.add('test', {}, { 
          jobId: 'connection-test',
          removeOnComplete: true,
          removeOnFail: true,
        });
        await testJob.remove();
        
        this.redisConnected = true;
        this.reconnectAttempts = 0;
        this.logger.log(`✅ Redis connected: ${redisHost}:${redisPort}`);
        this.logger.log('✅ BullMQ queue initialized');
      } catch (testError) {
        throw new Error(`Redis connection test failed: ${testError.message}`);
      }
    } catch (error) {
      this.redisConnected = false;
      this.logger.error(`❌ Failed to initialize BullMQ queue: ${error.message}`);
      this.logger.warn('⚠️ Campaign dispatcher will operate in degraded mode without queue');
      this.logger.warn('⚠️ Please ensure Redis is running and accessible at ' + redisHost + ':' + redisPort);
      
      // Schedule reconnection attempt
      this.scheduleReconnect();
      
      // Don't throw - allow app to continue without Redis
      this.callQueue = null;
    }
  }

  /**
   * Initialize BullMQ worker
   */
  private async initializeWorker(): Promise<void> {
    if (!this.callQueue) {
      this.logger.warn('⚠️ Skipping worker initialization - queue not available');
      return;
    }

    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
    const redisPassword = this.configService.get('REDIS_PASSWORD');

    try {
      this.callWorker = new Worker(
        'campaign-calls',
        async (job: Job<CampaignCallJob>) => {
          return await this.processCall(job);
        },
        {
          connection: {
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
              if (times > this.maxReconnectAttempts) return null;
              return Math.min(times * 1000, 10000);
            },
            enableOfflineQueue: false,
          },
          concurrency: this.maxConcurrentCalls,
          limiter: {
            max: this.maxConcurrentCalls,
            duration: 1000,
          },
        }
      );

      // Worker events
      this.callWorker.on('completed', (job: Job) => {
        this.logger.log(`✅ Call job completed: ${job.id}`);
      });

      this.callWorker.on('failed', (job: Job | undefined, error: Error) => {
        this.logger.error(`❌ Call job failed: ${job?.id} - ${error.message}`);
      });

      this.callWorker.on('error', (error: Error) => {
        if (!this.redisConnected) {
          // Log once, not repeatedly
          this.logger.error(`❌ Worker error: ${error.message}`);
          this.redisConnected = false;
          this.scheduleReconnect();
        }
      });

      this.logger.log('✅ BullMQ worker initialized');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize BullMQ worker: ${error.message}`);
      this.logger.warn('⚠️ Worker will not process jobs');
      this.callWorker = null;
    }
  }

  /**
   * Initialize QueueEvents for monitoring
   */
  private async initializeQueueEvents(): Promise<void> {
    if (!this.callQueue) {
      return;
    }

    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
    const redisPassword = this.configService.get('REDIS_PASSWORD');

    try {
      this.queueEvents = new QueueEvents('campaign-calls', {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
        },
      });

      // Listen to queue events
      this.queueEvents.on('completed', ({ jobId }) => {
        this.logger.debug(`Job ${jobId} completed`);
      });

      this.queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.warn(`Job ${jobId} failed: ${failedReason}`);
      });

      this.queueEvents.on('error', (error) => {
        if (this.redisConnected) {
          this.logger.error(`QueueEvents error: ${error.message}`);
          this.redisConnected = false;
          this.scheduleReconnect();
        }
      });

      this.logger.log('✅ BullMQ QueueEvents initialized');
    } catch (error) {
      this.logger.warn(`⚠️ QueueEvents initialization failed: ${error.message}`);
      this.queueEvents = null;
    }
  }

  /**
   * Schedule reconnection to Redis with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached for Redis`);
      this.logger.warn('⚠️  Campaign dispatcher will remain in degraded mode');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 5000, 60000); // Max 60 seconds

    this.logger.log(`⏳ Scheduling Redis reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('🔄 Attempting to reconnect to Redis...');
      
      // Close existing instances
      if (this.queueEvents) {
        try {
          await this.queueEvents.close();
        } catch (e) {
          // Ignore
        }
        this.queueEvents = null;
      }
      
      if (this.callWorker) {
        try {
          await this.callWorker.close();
        } catch (e) {
          // Ignore
        }
        this.callWorker = null;
      }
      
      if (this.callQueue) {
        try {
          await this.callQueue.close();
        } catch (e) {
          // Ignore
        }
        this.callQueue = null;
      }

      // Try to reinitialize
      await this.initializeQueue();
      if (this.redisConnected) {
        await this.initializeWorker();
        await this.initializeQueueEvents();
        this.logger.log('✅ Successfully reconnected to Redis');
      }
    }, delay);
  }

  /**
   * Add call to queue
   */
  async queueCall(job: CampaignCallJob): Promise<string> {
    if (!this.callQueue) {
      throw new Error('Queue not available - Redis connection required');
    }

    try {
      const queuedJob = await this.callQueue.add('call', job, {
        jobId: `call_${job.campaignId}_${job.contactId}_${Date.now()}`,
      });

      this.logger.log(`📋 Call queued: ${queuedJob.id}`);
      this.logger.log(`   Campaign: ${job.campaignId}`);
      this.logger.log(`   Contact: ${job.contactId}`);
      this.logger.log(`   Phone: ${job.phoneNumber}`);

      return queuedJob.id!;
    } catch (error) {
      this.logger.error(`❌ Failed to queue call: ${error.message}`);
      throw new Error(`Failed to queue call: ${error.message}. Please ensure Redis is running.`);
    }
  }

  /**
   * Process a call job
   */
  private async processCall(job: Job<CampaignCallJob>): Promise<CallResult> {
    const { campaignId, contactId, companyId, phoneNumber, callerId, metadata } = job.data;

    this.logger.log(`📞 Processing call job: ${job.id}`);
    this.logger.log(`   Phone: ${phoneNumber}`);

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    try {
      // Step 1: Select best gateway
      this.logger.log('🔌 Step 1: Selecting GSM Gateway...');
      const gateway = await this.gatewayManager.selectBestGateway(companyId);
      this.logger.log(`✅ Selected Gateway: ${gateway.name} (${gateway.ipAddress})`);

      // Step 2: Select best SIM
      this.logger.log('📱 Step 2: Selecting SIM card...');
      const sim = await this.simManager.selectBestSIM(companyId, gateway.id);
      this.logger.log(`✅ Selected SIM: ${sim.simNumber} (${sim.operator})`);

      // Step 3: Mark resources as busy
      await this.simManager.markSIMBusy(sim.id, callId);
      await this.gatewayManager.updateActivePorts(gateway.id, true);

      // Step 4: Prepare call variables
      const variables = {
        CALL_ID: callId,
        CAMPAIGN_ID: campaignId,
        CONTACT_ID: contactId,
        COMPANY_ID: companyId,
        SIM_ID: sim.id,
        GATEWAY_ID: gateway.id,
        SIM_NUMBER: sim.simNumber,
        OPERATOR: sim.operator,
        ...metadata,
      };

      // Step 5: Originate call via Asterisk AMI
      this.logger.log('☎️ Step 3: Originating call via Asterisk...');
      const response = await this.asteriskAMI.originateCall({
        destination: phoneNumber,
        callerId: callerId || sim.simNumber,
        timeout: this.callTimeout,
        variables,
      });

      if (response.response !== 'Success') {
        throw new Error(`Asterisk originate failed: ${response.message}`);
      }

      // Track active call
      this.activeCalls.set(callId, {
        callId,
        jobId: job.id!,
        campaignId,
        contactId,
        companyId,
        phoneNumber,
        gatewayId: gateway.id,
        simId: sim.id,
        startTime,
        status: 'DIALING',
      });

      // Create call record
      await this.createCallRecord({
        callId,
        campaignId,
        contactId,
        companyId,
        phoneNumber,
        callerId: callerId || sim.simNumber,
        gatewayId: gateway.id,
        simId: sim.id,
        startTime,
      });

      this.logger.log(`✅ Call ${callId} originated successfully`);

      return {
        callId,
        status: 'SUCCESS',
        gatewayId: gateway.id,
        simId: sim.id,
        startTime,
      };
    } catch (error) {
      this.logger.error(`❌ Call failed: ${error.message}`);

      // Update call record as failed
      await this.updateCallRecord(callId, {
        status: 'FAILED',
        endTime: new Date(),
        errorMessage: error.message,
      });

      return {
        callId,
        status: 'FAILED',
        startTime,
        endTime: new Date(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Handle call answered event
   */
  @OnEvent('asterisk.event')
  async handleAsteriskEvent(payload: { event: any }): Promise<void> {
    const { event } = payload;

    if (!event || !event.event) return;

    const eventName = event.event;
    const uniqueId = event.uniqueid;
    const callId = event.variable?.CALL_ID || event.callid;

    // Find active call
    const activeCall = Array.from(this.activeCalls.values()).find(
      (call) => call.callId === callId || call.uniqueId === uniqueId
    );

    if (!activeCall) return;

    // Handle different events
    switch (eventName) {
      case 'Newchannel':
        activeCall.uniqueId = uniqueId;
        activeCall.channel = event.channel;
        break;

      case 'DialBegin':
        activeCall.status = 'RINGING';
        await this.updateCallRecord(activeCall.callId, {
          status: 'RINGING',
        });
        break;

      case 'DialEnd':
        if (event.dialstatus === 'ANSWER') {
          activeCall.status = 'ANSWERED';
          activeCall.answerTime = new Date();
          
          await this.updateCallRecord(activeCall.callId, {
            status: 'ANSWERED',
            answerTime: activeCall.answerTime,
          });

          this.logger.log(`✅ Call answered: ${activeCall.callId}`);
          
          // Emit event for AI conversation engine
          this.eventEmitter.emit('call.answered', {
            callId: activeCall.callId,
            channel: activeCall.channel,
            campaignId: activeCall.campaignId,
            contactId: activeCall.contactId,
            companyId: activeCall.companyId,
            timestamp: new Date(),
          });
        } else if (event.dialstatus === 'BUSY') {
          activeCall.status = 'BUSY';
          await this.endCall(activeCall, 'BUSY');
        } else if (event.dialstatus === 'NOANSWER') {
          activeCall.status = 'NO_ANSWER';
          await this.endCall(activeCall, 'NO_ANSWER');
        } else {
          activeCall.status = 'FAILED';
          await this.endCall(activeCall, 'FAILED');
        }
        break;

      case 'Hangup':
        await this.endCall(activeCall, 'COMPLETED');
        break;
    }
  }

  /**
   * End call and release resources
   */
  private async endCall(
    activeCall: ActiveCall,
    finalStatus: string,
  ): Promise<void> {
    activeCall.endTime = new Date();
    
    if (activeCall.answerTime) {
      activeCall.duration = Math.floor(
        (activeCall.endTime.getTime() - activeCall.answerTime.getTime()) / 1000
      );
    }

    // Update call record
    await this.updateCallRecord(activeCall.callId, {
      status: finalStatus,
      endTime: activeCall.endTime,
      duration: activeCall.duration,
    });

    // Release resources
    if (activeCall.simId && activeCall.gatewayId) {
      try {
        const success = finalStatus === 'COMPLETED';
        
        await this.simManager.markSIMAvailable(
          activeCall.simId,
          activeCall.callId,
          success
        );

        await this.gatewayManager.updateActivePorts(activeCall.gatewayId, false);
      } catch (error) {
        this.logger.error(`Failed to release resources: ${error.message}`);
      }
    }

    // Remove from active calls
    this.activeCalls.delete(activeCall.callId);

    this.logger.log(`📴 Call ended: ${activeCall.callId} (${finalStatus})`);
  }

  /**
   * Create call record in database
   */
  private async createCallRecord(data: {
    callId: string;
    campaignId: string;
    contactId: string;
    companyId: string;
    phoneNumber: string;
    callerId: string;
    gatewayId: string;
    simId: string;
    startTime: Date;
  }): Promise<void> {
    try {
      // Create call record
      await this.prisma.call.create({
        data: {
          campaignId: data.campaignId,
          contactId: data.contactId,
          status: 'CALLING',
          startTime: data.startTime,
          metadata: {
            callId: data.callId,
            phoneNumber: data.phoneNumber,
            callerId: data.callerId,
            gatewayId: data.gatewayId,
            simId: data.simId,
          },
        },
      });

      // Log SIM call
      await this.simManager.logSIMCall({
        simId: data.simId,
        companyId: data.companyId,
        callSid: data.callId,
        campaignId: data.campaignId,
        contactId: data.contactId,
        destinationNumber: data.phoneNumber,
        callDirection: 'outbound',
        callStatus: 'CALLING',
        startTime: data.startTime,
      });
    } catch (error) {
      this.logger.error(`Failed to create call record: ${error.message}`);
    }
  }

  /**
   * Update call record in database
   */
  private async updateCallRecord(
    callId: string,
    updates: Partial<{
      status: string;
      answerTime: Date;
      endTime: Date;
      duration: number;
      errorMessage: string;
    }>
  ): Promise<void> {
    try {
      // Find all calls and filter by metadata
      const allCalls = await this.prisma.call.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      const call = allCalls.find(c => {
        const meta = c.metadata as any;
        return meta && meta.callId === callId;
      });
      
      if (call) {
        const currentMetadata = call.metadata as any;
        
        await this.prisma.call.update({
          where: { id: call.id },
          data: {
            status: updates.status as any,
            endTime: updates.endTime,
            duration: updates.duration,
            metadata: {
              ...currentMetadata,
              errorMessage: updates.errorMessage,
              answerTime: updates.answerTime?.toISOString(),
            },
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update call record: ${error.message}`);
    }
  }

  /**
   * Get active calls count
   */
  getActiveCallsCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (!this.callQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }

    try {
      const counts = await this.callQueue.getJobCounts();
      
      return {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get queue stats: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }
  }
}

interface ActiveCall {
  callId: string;
  jobId: string;
  campaignId: string;
  contactId: string;
  companyId: string;
  phoneNumber: string;
  gatewayId: string;
  simId: string;
  uniqueId?: string;
  channel?: string;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
  status: string;
}
