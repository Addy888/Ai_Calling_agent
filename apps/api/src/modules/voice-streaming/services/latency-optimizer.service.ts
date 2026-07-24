import { Injectable, Logger } from '@nestjs/common';

export interface LatencyMetric {
  sessionId: string;
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  playbackMs: number;
  networkMs: number;
  totalMs: number;
  timestamp: number;
}

@Injectable()
export class LatencyOptimizer {
  private readonly logger = new Logger(LatencyOptimizer.name);
  private metrics: LatencyMetric[] = [];
  
  // Track ongoing turn start timestamps
  private turnStartTimes = new Map<string, number>();
  private currentTurnMetrics = new Map<string, Partial<LatencyMetric>>();

  recordTurnStart(sessionId: string): void {
    const now = Date.now();
    this.turnStartTimes.set(sessionId, now);
    this.currentTurnMetrics.set(sessionId, {
      sessionId,
      timestamp: now,
    });
  }

  recordSTTEnd(sessionId: string, durationMs: number): void {
    const current = this.currentTurnMetrics.get(sessionId) || { sessionId };
    current.sttMs = durationMs;
    this.currentTurnMetrics.set(sessionId, current);
  }

  recordLLMEnd(sessionId: string, durationMs: number): void {
    const current = this.currentTurnMetrics.get(sessionId) || { sessionId };
    current.llmMs = durationMs;
    this.currentTurnMetrics.set(sessionId, current);
  }

  recordTTSEnd(sessionId: string, durationMs: number): void {
    const current = this.currentTurnMetrics.get(sessionId) || { sessionId };
    current.ttsMs = durationMs;
    this.currentTurnMetrics.set(sessionId, current);
  }

  recordPlaybackStart(sessionId: string, networkMs = 50): void {
    const current = this.currentTurnMetrics.get(sessionId);
    if (!current) return;

    const start = this.turnStartTimes.get(sessionId) || Date.now();
    const totalMs = Date.now() - start;

    current.playbackMs = 20; // local processing / play prep
    current.networkMs = networkMs;
    current.totalMs = totalMs;

    const fullMetric: LatencyMetric = {
      sessionId: current.sessionId!,
      sttMs: current.sttMs ?? 200,
      llmMs: current.llmMs ?? 400,
      ttsMs: current.ttsMs ?? 300,
      playbackMs: current.playbackMs,
      networkMs: current.networkMs,
      totalMs: current.totalMs,
      timestamp: current.timestamp || Date.now(),
    };

    this.metrics.push(fullMetric);
    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    this.logger.log(
      `Latency Stats (Session: ${sessionId}) — ` +
      `STT: ${fullMetric.sttMs}ms, ` +
      `LLM: ${fullMetric.llmMs}ms, ` +
      `TTS: ${fullMetric.ttsMs}ms, ` +
      `Total response time: ${fullMetric.totalMs}ms`
    );
  }

  recordInterruption(sessionId: string): void {
    this.logger.log(`Interruption recorded for session: ${sessionId}, reset latency trackers`);
    this.turnStartTimes.delete(sessionId);
    this.currentTurnMetrics.delete(sessionId);
  }

  getAverageLatency(): {
    stt: number;
    llm: number;
    tts: number;
    playback: number;
    network: number;
    total: number;
    count: number;
  } {
    if (this.metrics.length === 0) {
      return { stt: 0, llm: 0, tts: 0, playback: 0, network: 0, total: 0, count: 0 };
    }

    const sum = this.metrics.reduce(
      (acc, m) => {
        acc.stt += m.sttMs;
        acc.llm += m.llmMs;
        acc.tts += m.ttsMs;
        acc.playback += m.playbackMs;
        acc.network += m.networkMs;
        acc.total += m.totalMs;
        return acc;
      },
      { stt: 0, llm: 0, tts: 0, playback: 0, network: 0, total: 0 }
    );

    const count = this.metrics.length;
    return {
      stt: Math.round(sum.stt / count),
      llm: Math.round(sum.llm / count),
      tts: Math.round(sum.tts / count),
      playback: Math.round(sum.playback / count),
      network: Math.round(sum.network / count),
      total: Math.round(sum.total / count),
      count,
    };
  }

  getMetricsForSession(sessionId: string): LatencyMetric[] {
    return this.metrics.filter(m => m.sessionId === sessionId);
  }
}
