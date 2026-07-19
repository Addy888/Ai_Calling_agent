import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TurnTakingAnalysisService {
  constructor(private prisma: PrismaService) {}

  async analyzeTurnTaking(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const turnTakings = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      if (current.speaker !== next.speaker) {
        const pauseBeforeTransition = Math.round((next.start - current.end) * 1000);
        const wasInterrupted = pauseBeforeTransition < 0;
        const isSmooth = pauseBeforeTransition > 200 && pauseBeforeTransition < 2000;

        turnTakings.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          fromSpeaker: current.speaker,
          toSpeaker: next.speaker,
          transitionTime: next.start,
          pauseBeforeTransition: Math.max(0, pauseBeforeTransition),
          wasInterrupted,
          isSmooth,
          contextBefore: current.text,
          contextAfter: next.text,
        });
      }
    }

    if (turnTakings.length > 0) {
      await this.prisma.turnTakingPattern.createMany({
        data: turnTakings,
      });
    }

    return turnTakings;
  }
}
