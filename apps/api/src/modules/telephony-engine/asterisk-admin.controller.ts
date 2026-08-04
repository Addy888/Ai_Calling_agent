/**
 * Asterisk Admin Dashboard Controller
 * Real-time monitoring and management for production Asterisk server
 * 
 * Endpoints:
 * - System diagnostics
 * - Real-time monitoring
 * - GSM Gateway status
 * - SIM cards status
 * - Active calls
 * - Call queue status
 * - Recording management
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AsteriskProductionAMIService } from './services/asterisk-production-ami.service';
import { AsteriskDiagnosticsService } from './services/asterisk-diagnostics.service';
import { CampaignCallDispatcherService } from './services/campaign-call-dispatcher.service';

@ApiTags('Asterisk Admin')
@Controller('asterisk/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AsteriskAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asteriskAMI: AsteriskProductionAMIService,
    private readonly diagnostics: AsteriskDiagnosticsService,
    private readonly dispatcher: CampaignCallDispatcherService,
  ) {}

  /**
   * Get complete system diagnostics
   */
  @Get('diagnostics')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Run complete system diagnostics' })
  @ApiResponse({ status: 200, description: 'Diagnostics completed' })
  async getDiagnostics() {
    const diagnostics = await this.diagnostics.runDiagnostics();
    
    return {
      success: true,
      data: diagnostics,
      message: 'System diagnostics completed',
    };
  }

  /**
   * Get real-time monitoring data
   */
  @Get('monitoring')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get real-time monitoring data' })
  @ApiResponse({ status: 200, description: 'Monitoring data retrieved' })
  async getMonitoring() {
    const monitoring = await this.diagnostics.getMonitoringData();
    
    return {
      success: true,
      data: monitoring,
    };
  }

  /**
   * Get Asterisk server status
   */
  @Get('status')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get Asterisk server status' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  async getStatus() {
    const health = this.asteriskAMI.getHealth();
    
    return {
      success: true,
      data: {
        connected: health.connected,
        authenticated: health.authenticated,
        host: health.host,
        port: health.port,
        sipPeer: health.sipPeer,
        activeChannels: health.activeChannels,
        lastPing: health.lastPing,
        uptime: health.uptime,
      },
    };
  }

  /**
   * Get active calls/channels
   */
  @Get('channels')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get all active channels' })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  async getChannels() {
    const channels = await this.asteriskAMI.getAllChannels();
    
    return {
      success: true,
      data: channels,
      meta: {
        total: channels.length,
      },
    };
  }

  /**
   * Get SIP peer status (GSM1)
   */
  @Get('sip-peer/:peer')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get SIP peer status' })
  @ApiResponse({ status: 200, description: 'SIP peer status retrieved' })
  async getSIPPeer(@Param('peer') peer: string) {
    const status = await this.asteriskAMI.getSIPPeerStatus(peer);
    
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Get all SIP peers
   */
  @Get('sip-peers')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get all SIP peers' })
  @ApiResponse({ status: 200, description: 'SIP peers retrieved' })
  async getSIPPeers() {
    const peers = await this.asteriskAMI.getSIPPeers();
    
    return {
      success: true,
      data: peers,
    };
  }

  /**
   * Get GSM Gateway status
   */
  @Get('gateway')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get GSM Gateway status' })
  @ApiResponse({ status: 200, description: 'Gateway status retrieved' })
  async getGateway() {
    try {
      // Get gateway from database
      const gateways = await this.prisma.gSMGateway.findMany({
        where: { 
          status: 'ACTIVE'
        },
        include: {
          sims: true,
        },
      });
      
      return {
        success: true,
        data: gateways,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  /**
   * Get all SIM cards status
   */
  @Get('sims')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get all SIM cards status' })
  @ApiResponse({ status: 200, description: 'SIM cards retrieved' })
  async getSIMs() {
    const sims = await this.prisma.sIMCard.findMany({
      where: { isActive: true },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
            ipAddress: true,
            isOnline: true,
          },
        },
      },
    });
    
    return {
      success: true,
      data: sims,
      meta: {
        total: sims.length,
        active: sims.filter(sim => sim.status === 'ACTIVE').length,
        busy: sims.filter(sim => sim.status === 'BUSY').length,
      },
    };
  }

  /**
   * Get call queue statistics
   */
  @Get('queue/stats')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get call queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue stats retrieved' })
  async getQueueStats() {
    const stats = await this.dispatcher.getQueueStats();
    const activeCallsCount = this.dispatcher.getActiveCallsCount();
    
    return {
      success: true,
      data: {
        ...stats,
        activeProcessing: activeCallsCount,
      },
    };
  }

  /**
   * Originate test call
   */
  @Post('test-call')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Originate a test call' })
  @ApiResponse({ status: 200, description: 'Test call initiated' })
  async testCall(
    @Body() body: {
      destination: string;
      callerId: string;
    }
  ) {
    const response = await this.asteriskAMI.originateCall({
      destination: body.destination,
      callerId: body.callerId,
      timeout: 30,
      variables: {
        TEST_CALL: 'true',
      },
    });
    
    return {
      success: response.response === 'Success',
      data: response,
      message: response.response === 'Success' 
        ? 'Test call initiated' 
        : 'Test call failed',
    };
  }

  /**
   * Hangup a call
   */
  @Post('hangup/:channel')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Hangup a channel' })
  @ApiResponse({ status: 200, description: 'Hangup initiated' })
  async hangupCall(@Param('channel') channel: string) {
    const response = await this.asteriskAMI.hangupCall(channel);
    
    return {
      success: response.response === 'Success',
      data: response,
      message: response.response === 'Success' 
        ? 'Call hung up' 
        : 'Hangup failed',
    };
  }

  /**
   * Get recording path status
   */
  @Get('recording/status')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get recording path status' })
  @ApiResponse({ status: 200, description: 'Recording status retrieved' })
  async getRecordingStatus() {
    const diagnostics = await this.diagnostics.runDiagnostics();
    
    return {
      success: true,
      data: diagnostics.recording,
    };
  }

  /**
   * Get AI services status
   */
  @Get('ai-services')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get AI services status' })
  @ApiResponse({ status: 200, description: 'AI services status retrieved' })
  async getAIServices() {
    const diagnostics = await this.diagnostics.runDiagnostics();
    
    return {
      success: true,
      data: diagnostics.aiServices,
    };
  }

  /**
   * Ping Asterisk server
   */
  @Post('ping')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Ping Asterisk server' })
  @ApiResponse({ status: 200, description: 'Ping sent' })
  async ping() {
    const response = await this.asteriskAMI.sendAction({
      action: 'Ping',
    });
    
    return {
      success: response.response === 'Success',
      data: response,
      message: 'Pong',
    };
  }

  /**
   * Get system health summary
   */
  @Get('health')
  @Permissions('system.admin')
  @ApiOperation({ summary: 'Get system health summary' })
  @ApiResponse({ status: 200, description: 'Health summary retrieved' })
  async getHealth() {
    const diagnostics = await this.diagnostics.runDiagnostics();
    
    const health = {
      asterisk: diagnostics.asterisk.connected && diagnostics.asterisk.authenticated,
      gateway: diagnostics.gateway.reachable,
      database: diagnostics.database.connected,
      redis: diagnostics.redis.connected,
      whisper: diagnostics.aiServices.whisper.running,
      ollama: diagnostics.aiServices.ollama.running,
      kokoro: diagnostics.aiServices.kokoro.running,
    };

    const allHealthy = Object.values(health).every(v => v === true);

    return {
      success: true,
      data: {
        status: allHealthy ? 'HEALTHY' : 'DEGRADED',
        checks: health,
        timestamp: diagnostics.timestamp,
      },
    };
  }
}
