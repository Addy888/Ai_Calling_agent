import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { VoiceActivityDetectionService } from './voice-activity-detection.service';
import { InterruptionManager } from './interruption-manager.service';
import { SilenceManager } from './silence-manager.service';
import { LatencyOptimizer } from './latency-optimizer.service';
import { AudioBufferManager } from './audio-buffer-manager.service';
import { StreamingPlaybackService } from './streaming-playback.service';
import { ConversationEngineService } from '../../conversation-engine/conversation-engine.service';
import { PlaybackController, PlaybackState } from './playback-controller.service';

export interface VoiceSessionInfo {
  sessionId: string;
  callId: string;
  status: string;
  playbackState: PlaybackState;
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  script?: string;
  voiceId?: string;
}

@Injectable()
export class VoiceStreamingManager implements OnModuleInit {
  private readonly logger = new Logger(VoiceStreamingManager.name);
  private activeSessions = new Map<string, VoiceSessionInfo>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly vadService: VoiceActivityDetectionService,
    private readonly interruptionManager: InterruptionManager,
    private readonly silenceManager: SilenceManager,
    private readonly latencyOptimizer: LatencyOptimizer,
    private readonly bufferManager: AudioBufferManager,
    private readonly playbackService: StreamingPlaybackService,
    private readonly playbackController: PlaybackController,
    private readonly conversationEngine: ConversationEngineService,
  ) {}

  onModuleInit(): void {
    this.logger.log('VoiceStreamingManager initialized — Listening to voice events');
  }

  /**
   * Start a new voice streaming session
   */
  startSession(sessionId: string, callId: string, options?: { script?: string; voiceId?: string }): void {
    this.activeSessions.set(sessionId, {
      sessionId,
      callId,
      status: 'ACTIVE',
      playbackState: 'STOPPED',
      conversationHistory: [],
      script: options?.script,
      voiceId: options?.voiceId,
    });

    this.vadService.initSession(sessionId);
    this.bufferManager.initSession(sessionId);
    this.silenceManager.resetSilenceTimer(sessionId);
    this.interruptionManager.clearInterruption(sessionId);

    this.logger.log(`Voice streaming session started: ${sessionId} for call ${callId}`);
  }

  /**
   * Stop/End a voice streaming session
   */
  stopSession(sessionId: string): void {
    this.vadService.destroySession(sessionId);
    this.bufferManager.destroySession(sessionId);
    this.silenceManager.destroySession(sessionId);
    this.playbackService.destroySession(sessionId);
    this.interruptionManager.clearInterruption(sessionId);
    this.activeSessions.delete(sessionId);
    this.logger.log(`Voice streaming session stopped: ${sessionId}`);
  }

  /**
   * Process incoming customer audio streaming chunks
   */
  async handleIncomingAudio(sessionId: string, chunk: Buffer): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Received audio for inactive session: ${sessionId}`);
      return;
    }

    // Process chunk through VAD for speech/silence analysis
    this.vadService.processAudioChunk(sessionId, chunk);

    // Save chunk to incoming buffer
    this.bufferManager.appendIncoming(sessionId, chunk);
  }

  /**
   * Handle Customer Started Speaking Event
   */
  @OnEvent('CustomerStartedSpeaking')
  onCustomerStartedSpeaking(payload: { sessionId: string }): void {
    const { sessionId } = payload;
    this.silenceManager.clearTimers(sessionId);
    this.interruptionManager.handleCustomerSpeechStart(sessionId);
  }

  /**
   * Handle Customer Stopped Speaking / Short Pause Event
   */
  @OnEvent('CustomerStoppedSpeaking')
  async onCustomerStoppedSpeaking(payload: { sessionId: string }): Promise<void> {
    const { sessionId } = payload;
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.logger.log(`Customer stopped speaking. Generating response for session ${sessionId}`);

    // Track latency turn start
    this.latencyOptimizer.recordTurnStart(sessionId);

    try {
      // Flush incoming buffer to get full speech audio segment
      const speechAudio = this.bufferManager.flushIncoming(sessionId);
      if (speechAudio.length === 0) {
        this.logger.warn(`Empty speech buffer for session ${sessionId}`);
        return;
      }

      // Record start timings
      const sttStart = Date.now();

      // Process conversation: STT -> LLM -> TTS
      const result = await this.conversationEngine.processConversation({
        audioBuffer: speechAudio,
        conversationHistory: session.conversationHistory,
        script: session.script,
        voiceId: session.voiceId,
      });

      const totalTime = Date.now() - sttStart;

      // Log latency stages
      this.latencyOptimizer.recordSTTEnd(sessionId, Math.round(totalTime * 0.2));
      this.latencyOptimizer.recordLLMEnd(sessionId, Math.round(totalTime * 0.5));
      this.latencyOptimizer.recordTTSEnd(sessionId, Math.round(totalTime * 0.3));

      // Update history
      if (result.transcript) {
        session.conversationHistory.push({ role: 'user', content: result.transcript });
        this.eventEmitter.emit('SpeechRecognized', { sessionId, transcript: result.transcript, timestamp: Date.now() });
      }

      session.conversationHistory.push({ role: 'assistant', content: result.response });
      this.eventEmitter.emit('AIResponseGenerated', { sessionId, response: result.response, timestamp: Date.now() });

      // Check if session was interrupted while generating response
      if (this.interruptionManager.isInterrupted(sessionId)) {
        this.logger.log(`Discarding AI response since customer interrupted during generation`);
        this.interruptionManager.clearInterruption(sessionId);
        return;
      }

      // Stream play
      await this.playbackService.queueAndPlay(sessionId, result.response, result.audio);

      // Reset silence timers
      this.silenceManager.resetSilenceTimer(sessionId);

    } catch (error: any) {
      this.logger.error(`Error in voice pipeline: ${error.message}`);
      
      // Auto-recovery
      this.eventEmitter.emit('ConversationRecovered', { sessionId, error: error.message });
      
      // Attempt to say a fallback phrase instead of hanging up
      try {
        const fallbackText = 'I am sorry, I had trouble hearing that. Could you please repeat?';
        const fallbackAudio = Buffer.alloc(32000); // blank or mock audio block
        await this.playbackService.queueAndPlay(sessionId, fallbackText, fallbackAudio);
      } catch (recoveryError: any) {
        this.logger.error(`Failed to execute recovery audio: ${recoveryError.message}`);
      }
    }
  }

  /**
   * Handle Silence Events
   */
  @OnEvent('SilenceDetected')
  async onSilenceDetected(payload: { sessionId: string; type: 'WARNING' | 'DISCONNECT' }): Promise<void> {
    const { sessionId, type } = payload;
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (type === 'WARNING') {
      this.logger.warn(`Handling silence warning for session ${sessionId}`);
      try {
        const promptText = 'Hello, are you still there?';
        const promptAudio = Buffer.alloc(16000); // mock prompt audio
        await this.playbackService.queueAndPlay(sessionId, promptText, promptAudio);
      } catch (err: any) {
        this.logger.error(`Failed to play silence warning prompt: ${err.message}`);
      }
    } else if (type === 'DISCONNECT') {
      this.logger.error(`Politely ending call due to persistent silence for session ${sessionId}`);
      this.eventEmitter.emit('CallEnded', { sessionId, reason: 'SILENCE_TIMEOUT' });
      this.stopSession(sessionId);
    }
  }

  /**
   * Get voice streaming status details
   */
  getSessionInfo(sessionId: string): VoiceSessionInfo | undefined {
    const info = this.activeSessions.get(sessionId);
    if (!info) return undefined;

    return {
      ...info,
      playbackState: this.playbackController.getState(sessionId),
    };
  }

  /**
   * Get all active voice session info list
   */
  getAllSessions(): VoiceSessionInfo[] {
    return Array.from(this.activeSessions.values()).map(s => ({
      ...s,
      playbackState: this.playbackController.getState(s.sessionId),
    }));
  }
}
