import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  MakeCallResponse,
  CallStatusData,
  RecordingMetadata,
  MonitorCallStateEvent,
  MonitorTranscriptEvent,
  MonitorRecordingEvent,
  MonitorSummaryEvent,
} from '../interfaces/telephony-provider.interface';

// ─────────────────────────────────────────────────────────────────────────────
// Realistic conversation scripts for simulation
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: Array<Array<{ role: 'agent' | 'customer'; text: string }>> = [
  [
    { role: 'agent', text: 'Hello! This is Alex from Customer Success. Am I speaking with the account holder?' },
    { role: 'customer', text: "Yes, that's me. What's this about?" },
    { role: 'agent', text: "Great! I'm reaching out about your recent subscription renewal. I noticed it's coming up in the next 30 days and wanted to make sure you're all set." },
    { role: 'customer', text: "Oh yes, I was actually thinking about that. Can you tell me about the new pricing?" },
    { role: 'agent', text: 'Of course! We have three plans starting at $29/month. Given your usage history, I think the Professional plan at $59/month would suit you best — it includes unlimited calls and priority support.' },
    { role: 'customer', text: 'That sounds reasonable. Can I think about it and call back?' },
    { role: 'agent', text: "Absolutely. I'll also send you a detailed comparison email right after this call. Is there anything else I can help you with today?" },
    { role: 'customer', text: 'No, that should be everything. Thanks for calling.' },
    { role: 'agent', text: "You're welcome! Have a great day and feel free to reach out if you have any questions!" },
  ],
  [
    { role: 'agent', text: 'Good afternoon! I am calling from TechAssist Support. May I speak with the primary account holder?' },
    { role: 'customer', text: "This is her. What can I do for you?" },
    { role: 'agent', text: "Hi! We are following up on a support ticket you submitted last week about integration issues. Has that been resolved for you?" },
    { role: 'customer', text: 'Actually, no. I was still having trouble connecting the API.' },
    { role: 'agent', text: "I'm sorry to hear that. I can walk you through a quick fix right now if you have two minutes. The most common cause is an expired OAuth token." },
    { role: 'customer', text: 'Sure, let me pull up my dashboard.' },
    { role: 'agent', text: "Perfect. Navigate to Settings, then API Keys, and regenerate your token. Once done, update it in your integration config." },
    { role: 'customer', text: "Oh, that worked! The connection is showing green now." },
    { role: 'agent', text: "Excellent! I'll update your ticket as resolved. Is there anything else I can assist you with?" },
    { role: 'customer', text: 'No, that was it. Thank you so much!' },
  ],
  [
    { role: 'agent', text: 'Hello, this is Jordan calling regarding your recent product enquiry.' },
    { role: 'customer', text: 'Oh right, I filled out a form last week.' },
    { role: 'agent', text: "Exactly! You were interested in our enterprise plan. Do you have a few minutes to discuss your requirements?" },
    { role: 'customer', text: "Actually, I'm in a meeting. Can we reschedule?" },
    { role: 'agent', text: "Of course, no problem at all. When would be a good time to call you back?" },
    { role: 'customer', text: 'How about tomorrow at 3pm?' },
    { role: 'agent', text: "I'll schedule that right away. You'll receive a calendar invite at your registered email. Talk to you tomorrow!" },
  ],
];

// ─────────────────────────────────────────────────────────────────────────────
// Active mock call tracking
// ─────────────────────────────────────────────────────────────────────────────
interface MockCallState {
  callSid: string;
  sessionId: string;
  to: string;
  from: string;
  status: CallStatusData['status'];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  transcript: Array<{ role: 'agent' | 'customer'; text: string; timestamp: Date }>;
  recording?: RecordingMetadata;
  timer?: NodeJS.Timeout;
}

/**
 * MockTelephonyProvider
 *
 * Simulates the complete call lifecycle for development & demo environments.
 * Emits identical EventEmitter2 events to what TwilioProvider emits on webhook,
 * so the RuntimeMonitorGateway and CallOrchestrator are completely unaware of
 * whether this is a real or simulated call.
 *
 * Controlled via:
 *   MOCK_CALL_SPEED_MS     — ms between each conversation turn (default: 2000)
 *   MOCK_CONVERSATION_TURNS — max turns to simulate (default: all turns in script)
 */
@Injectable()
export class MockTelephonyProvider implements TelephonyProvider {
  private readonly logger = new Logger(MockTelephonyProvider.name);

  readonly name = 'MockTelephonyProvider';
  readonly providerType: TelephonyProviderType = 'mock';

  private readonly turnSpeedMs: number;
  private readonly maxTurns: number;
  private readonly activeCalls = new Map<string, MockCallState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.turnSpeedMs = parseInt(
      this.configService.get<string>('MOCK_CALL_SPEED_MS', '2000'),
      10,
    );
    this.maxTurns = parseInt(
      this.configService.get<string>('MOCK_CONVERSATION_TURNS', '99'),
      10,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    this.logger.log(
      '✅ MockTelephonyProvider initialized (no real calls will be made)',
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  async makeCall(params: MakeCallParams): Promise<MakeCallResponse> {
    const callSid = this.generateMockCallSid();
    const now = new Date();

    this.logger.log(
      `[MOCK] 📞 Initiating simulated call → ${params.to} (session: ${params.sessionId}, SID: ${callSid})`,
    );

    const state: MockCallState = {
      callSid,
      sessionId: params.sessionId,
      to: params.to,
      from: params.from || '+18005550100',
      status: 'queued',
      startTime: now,
      transcript: [],
    };

    this.activeCalls.set(callSid, state);

    // Start the async simulation — does not block
    this.runSimulation(state, params);

    return {
      callSid,
      status: 'queued',
      from: state.from,
      to: state.to,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  async endCall(callSid: string): Promise<void> {
    const state = this.activeCalls.get(callSid);
    if (!state) {
      this.logger.warn(`[MOCK] endCall called for unknown SID: ${callSid}`);
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }

    this.logger.log(`[MOCK] 📴 Call terminated by system: ${callSid}`);
    await this.finalizeCall(state, 'completed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  async getCallStatus(callSid: string): Promise<CallStatusData> {
    const state = this.activeCalls.get(callSid);

    if (!state) {
      return {
        callSid,
        status: 'failed',
        from: 'unknown',
        to: 'unknown',
      };
    }

    return {
      callSid: state.callSid,
      status: state.status,
      from: state.from,
      to: state.to,
      duration: state.duration,
      startTime: state.startTime,
      endTime: state.endTime,
      recordingUrl: state.recording?.url,
      recordingMetadata: state.recording,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Simulation Engine
  // ───────────────────────────────────────────────────────────────────────────

  private async runSimulation(
    state: MockCallState,
    params: MakeCallParams,
  ): Promise<void> {
    // Pick a random conversation script
    const script = MOCK_CONVERSATIONS[
      Math.floor(Math.random() * MOCK_CONVERSATIONS.length)
    ];
    const turns = script.slice(0, this.maxTurns);

    // Phase 1 — DIALING
    await this.delay(500);
    state.status = 'queued';
    this.emitCallState(state, 'DIALING', params);

    // Phase 2 — RINGING
    await this.delay(this.turnSpeedMs);
    state.status = 'ringing';
    this.emitCallState(state, 'RINGING', params);

    // Simulate 5% chance of no-answer / busy
    const outcome = this.pickCallOutcome();
    if (outcome !== 'answered') {
      this.logger.log(`[MOCK] Call outcome: ${outcome} for ${state.callSid}`);
      await this.delay(this.turnSpeedMs);
      await this.finalizeCall(state, outcome as CallStatusData['status']);
      return;
    }

    // Phase 3 — CONNECTED
    await this.delay(this.turnSpeedMs);
    state.status = 'in-progress';
    this.emitCallState(state, 'CONNECTED', params);

    // Emit webhook-equivalent event so CallOrchestrator picks it up
    this.eventEmitter.emit('telephony.call.answered', {
      callSid: state.callSid,
      sessionId: state.sessionId,
    });

    // Phase 4 — Conversation turns
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const turnStart = Date.now();

      if (turn.role === 'agent') {
        this.emitCallState(state, 'AI_SPEAKING', params);
      } else {
        this.emitCallState(state, 'CUSTOMER_SPEAKING', params);
      }

      await this.delay(this.turnSpeedMs + Math.random() * 800);

      const latencyMs = turn.role === 'agent' ? Math.floor(Math.random() * 400 + 120) : undefined;
      const now = new Date();

      const transcriptEntry = { role: turn.role, text: turn.text, timestamp: now };
      state.transcript.push(transcriptEntry);

      const transcriptEvent: MonitorTranscriptEvent = {
        sessionId: state.sessionId,
        callSid: state.callSid,
        role: turn.role,
        text: turn.text,
        timestamp: now,
        latencyMs,
      };

      this.eventEmitter.emit('monitor.transcript', transcriptEvent);
      this.logger.log(`[MOCK] ${turn.role.toUpperCase()}: "${turn.text.substring(0, 60)}..."`);
    }

    // Phase 5 — Call End
    await this.delay(this.turnSpeedMs);
    await this.finalizeCall(state, 'completed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  private async finalizeCall(
    state: MockCallState,
    outcome: CallStatusData['status'],
  ): Promise<void> {
    state.endTime = new Date();
    state.status = outcome;
    state.duration = Math.floor(
      (state.endTime.getTime() - state.startTime.getTime()) / 1000,
    );

    // Generate mock recording metadata (only for completed calls)
    if (outcome === 'completed') {
      state.recording = this.generateRecordingMetadata(state);
    }

    // Emit ENDED state
    const monitorState = outcome === 'completed' ? 'ENDED' : 'FAILED';
    this.emitCallState(state, monitorState, null);

    // Emit recording event if available
    if (state.recording) {
      const recordingEvent: MonitorRecordingEvent = {
        sessionId: state.sessionId,
        callSid: state.callSid,
        recording: state.recording,
      };
      this.eventEmitter.emit('monitor.recording', recordingEvent);
    }

    // Generate and emit call summary
    const summary: MonitorSummaryEvent = {
      sessionId: state.sessionId,
      callSid: state.callSid,
      duration: state.duration,
      transcript: state.transcript,
      outcome: outcome as MonitorSummaryEvent['outcome'],
      sentiment: this.analyzeMockSentiment(state.transcript),
      keyPoints: this.extractMockKeyPoints(state.transcript),
      nextAction: outcome === 'completed' ? 'Send follow-up email' : 'Schedule retry',
    };
    this.eventEmitter.emit('monitor.summary', summary);

    // Emit webhook-equivalent for call completion
    this.eventEmitter.emit('telephony.call.completed', {
      callSid: state.callSid,
      sessionId: state.sessionId,
      outcome,
      duration: state.duration,
      recordingUrl: state.recording?.url,
    });

    this.logger.log(
      `[MOCK] ✅ Call complete — SID: ${state.callSid}, Duration: ${state.duration}s, Outcome: ${outcome}`,
    );

    // Keep in map briefly so status queries can still resolve, then clean up
    setTimeout(() => this.activeCalls.delete(state.callSid), 60_000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: emit call state events
  // ───────────────────────────────────────────────────────────────────────────
  private emitCallState(
    state: MockCallState,
    monitorState: MonitorCallStateEvent['state'],
    params: MakeCallParams | null,
  ): void {
    const event: MonitorCallStateEvent = {
      sessionId: state.sessionId,
      callSid: state.callSid,
      state: monitorState,
      phoneNumber: state.to,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('monitor.call_state', event);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: generate mock recording metadata
  // ───────────────────────────────────────────────────────────────────────────
  private generateRecordingMetadata(state: MockCallState): RecordingMetadata {
    const recordingSid = `RE${Math.random().toString(36).substring(2, 32).toUpperCase()}`;
    return {
      recordingSid,
      url: `https://mock-recordings.local/recordings/${recordingSid}.mp3`,
      durationSeconds: state.duration || 0,
      fileSizeBytes: (state.duration || 0) * 16000, // ~16KB/s for mock mp3
      format: 'mp3',
      channels: 1,
      createdAt: state.endTime || new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: call outcome selection (95% answer rate)
  // ───────────────────────────────────────────────────────────────────────────
  private pickCallOutcome(): 'answered' | 'busy' | 'no-answer' {
    const r = Math.random();
    if (r < 0.93) return 'answered';
    if (r < 0.97) return 'busy';
    return 'no-answer';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: simple mock sentiment analysis
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeMockSentiment(
    transcript: Array<{ role: string; text: string }>,
  ): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['thank', 'great', 'perfect', 'excellent', 'good', 'helpful', 'worked'];
    const negativeWords = ['problem', 'issue', 'trouble', 'not working', 'broken', 'unhappy'];

    const allText = transcript.map(t => t.text.toLowerCase()).join(' ');
    const positiveScore = positiveWords.filter(w => allText.includes(w)).length;
    const negativeScore = negativeWords.filter(w => allText.includes(w)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: extract key points from transcript
  // ───────────────────────────────────────────────────────────────────────────
  private extractMockKeyPoints(
    transcript: Array<{ role: string; text: string }>,
  ): string[] {
    const points: string[] = [];
    for (const entry of transcript) {
      if (entry.text.includes('?') && entry.role === 'customer') {
        // Customer questions become key points
        const shortened = entry.text.length > 80 ? entry.text.substring(0, 77) + '...' : entry.text;
        points.push(`Customer asked: "${shortened}"`);
      }
    }
    if (points.length === 0) {
      points.push('Call completed successfully', 'Follow-up required');
    }
    return points.slice(0, 3);
  }

  // ───────────────────────────────────────────────────────────────────────────
  private generateMockCallSid(): string {
    return `MOCK${Date.now()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
