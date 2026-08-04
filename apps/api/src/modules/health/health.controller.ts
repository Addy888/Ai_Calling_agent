import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, SystemHealth } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getHealth(
    @Query('refresh') refresh?: string,
  ): Promise<SystemHealth> {
    const forceRefresh = refresh === 'true';
    return this.healthService.getSystemHealth(forceRefresh);
  }

  @Get('redis')
  @ApiOperation({ summary: 'Get Redis health' })
  async getRedisHealth(@Query('refresh') refresh?: string) {
    const health = await this.healthService.getSystemHealth(refresh === 'true');
    return {
      component: 'Redis',
      ...health.redis,
    };
  }

  @Get('bullmq')
  @ApiOperation({ summary: 'Get BullMQ health' })
  async getBullMQHealth(@Query('refresh') refresh?: string) {
    const health = await this.healthService.getSystemHealth(refresh === 'true');
    return {
      component: 'BullMQ',
      ...health.bullmq,
    };
  }

  @Get('asterisk')
  @ApiOperation({ summary: 'Get Asterisk health' })
  async getAsteriskHealth(@Query('refresh') refresh?: string) {
    const health = await this.healthService.getSystemHealth(refresh === 'true');
    return {
      component: 'Asterisk',
      tcp: health.asterisk,
      ami: health.ami,
    };
  }

  @Get('telephony')
  @ApiOperation({ summary: 'Get telephony services health' })
  async getTelephonyHealth(@Query('refresh') refresh?: string) {
    const health = await this.healthService.getSystemHealth(refresh === 'true');
    return {
      asterisk: health.asterisk,
      ami: health.ami,
      gateway: health.gateway,
      sim: health.sim,
    };
  }

  @Get('ai')
  @ApiOperation({ summary: 'Get AI services health' })
  async getAIHealth(@Query('refresh') refresh?: string) {
    const health = await this.healthService.getSystemHealth(refresh === 'true');
    return {
      whisper: health.whisper,
      ollama: health.ollama,
      kokoro: health.kokoro,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Get live indicators for dashboard' })
  async getLiveIndicators() {
    const health = await this.healthService.getSystemHealth(false);
    
    return {
      indicators: [
        {
          name: 'Redis',
          status: health.redis.status,
          message: health.redis.message,
          icon: '🔴',
        },
        {
          name: 'BullMQ',
          status: health.bullmq.status,
          message: health.bullmq.message,
          icon: '📋',
        },
        {
          name: 'Asterisk',
          status: health.asterisk.status,
          message: health.asterisk.message,
          icon: '📞',
        },
        {
          name: 'AMI',
          status: health.ami.status,
          message: health.ami.message,
          icon: '🔌',
        },
        {
          name: 'Gateway',
          status: health.gateway.status,
          message: health.gateway.message,
          icon: '🌐',
        },
        {
          name: 'SIM',
          status: health.sim.status,
          message: health.sim.message,
          icon: '📱',
        },
        {
          name: 'Whisper',
          status: health.whisper.status,
          message: health.whisper.message,
          icon: '🎤',
        },
        {
          name: 'Ollama',
          status: health.ollama.status,
          message: health.ollama.message,
          icon: '🤖',
        },
        {
          name: 'Kokoro',
          status: health.kokoro.status,
          message: health.kokoro.message,
          icon: '🔊',
        },
      ],
      overall: health.overall,
      timestamp: health.timestamp,
    };
  }
}
