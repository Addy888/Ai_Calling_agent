import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class InterruptionDetectionService {
  constructor(private prisma: PrismaService) {}

  async detectInterruptions(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const interruptions = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      if (current.speaker !== next.speaker && next.start < current.end) {
        const overlapDuration = current.end - next.start;
        const interruptionType = this.classifyInterruption(overlapDuration, current, next);
        const wasRecovered = i < segments.length - 2 && segments[i + 2].speaker === current.speaker;

        interruptions.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          interrupter: next.speaker,
          interrupted: current.speaker,
          occurrenceTime: next.start,
          duration: overlapDuration,
          interruptionType,
          wasRecovered,
          impactLevel: overlapDuration > 1 ? 'HIGH' : overlapDuration > 0.5 ? 'MEDIUM' : 'LOW',
          contextBefore: current.text,
          contextDuring: next.text,
          contextAfter: i < segments.length - 2 ? segments[i + 2].text : null,
        });
      }
    }

    if (interruptions.length > 0) {
      await this.prisma.interruptionEvent.createMany({
        data: interruptions,
      });
    }

    return interruptions;
  }

  private classifyInterruption(duration: number, current: any, next: any): string {
    if (duration < 0.2) return 'BACKCHANNEL';
    if (duration < 0.5) return 'SOFT_INTERRUPTION';
    if (next.text.toLowerCase().includes('sorry') || next.text.toLowerCase().includes('pardon')) {
      return 'CLARIFICATION';
    }
    if (current.text.endsWith('...') || !current.text.match(/[.!?]$/)) {
      return 'COMPLETION';
    }
    if (duration > 1) return 'HARD_INTERRUPTION';
    return 'OVERLAP';
  }
}
