import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VoiceStreamingManager } from '../services/voice-streaming-manager.service';
import { LatencyOptimizer } from '../services/latency-optimizer.service';
import { PlaybackController } from '../services/playback-controller.service';

@ApiTags('Voice Streaming & Optimization')
@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceManager: VoiceStreamingManager,
    private readonly latencyOptimizer: LatencyOptimizer,
    private readonly playbackController: PlaybackController,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current voice engine status and active sessions' })
  @ApiResponse({ status: 200, description: 'Return status details' })
  getStatus(@Query('sessionId') sessionId?: string) {
    if (sessionId) {
      const session = this.voiceManager.getSessionInfo(sessionId);
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }
      return session;
    }
    return this.voiceManager.getAllSessions();
  }

  @Get('latency')
  @ApiOperation({ summary: 'Get voice processing and response latency metrics' })
  @ApiResponse({ status: 200, description: 'Return latency stats' })
  getLatency(@Query('sessionId') sessionId?: string) {
    if (sessionId) {
      return this.latencyOptimizer.getMetricsForSession(sessionId);
    }
    return this.latencyOptimizer.getAverageLatency();
  }

  @Post('play')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Directs the voice queue to play a segment' })
  play(@Body() body: { sessionId: string }) {
    this.playbackController.play(body.sessionId);
    return { success: true, message: 'Playback started' };
  }

  @Post('pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pauses active playback' })
  pause(@Body() body: { sessionId: string }) {
    this.playbackController.pause(body.sessionId);
    return { success: true, message: 'Playback paused' };
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resumes paused playback' })
  resume(@Body() body: { sessionId: string }) {
    this.playbackController.resume(body.sessionId);
    return { success: true, message: 'Playback resumed' };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stops active playback' })
  stop(@Body() body: { sessionId: string }) {
    this.playbackController.stop(body.sessionId);
    return { success: true, message: 'Playback stopped' };
  }
}
