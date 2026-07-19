import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PauseAnalysisService {
  constructor(private prisma: PrismaService) {}

  async analyzePauses(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const pauses = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      const pauseDuration = Math.round((next.start - current.end) * 1000);
      
      if (pauseDuration > 100) {
        const pauseType = this.categorizePause(pauseDuration, current, next);
        const isNatural = this.isNaturalPause(pauseDuration, current.text, next.text);

        pauses.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          pauseType,
          duration: pauseDuration,
          occurrenceTime: current.end,
          speaker: current.speaker,
          beforePhrase: current.text,
          afterPhrase: next.text,
          contextType: this.getContextType(current.text),
          isNatural,
        });
      }
    }

    if (pauses.length > 0) {
      await this.prisma.pausePattern.createMany({
        data: pauses,
      });
    }

    return pauses;
  }

  private categorizePause(duration: number, current: any, next: any): string {
    if (duration < 500) return 'SHORT_PAUSE';
    if (duration < 1500) return 'MEDIUM_PAUSE';
    if (duration < 3000) return 'LONG_PAUSE';
    
    if (current.text.includes('?') || next.text.toLowerCase().startsWith('uh') || 
        next.text.toLowerCase().startsWith('um')) {
      return 'THINKING_PAUSE';
    }
    
    if (duration > 5000) return 'AWKWARD_SILENCE';
    if (current.speaker !== next.speaker) return 'TURN_TAKING_PAUSE';
    
    return 'NATURAL_SILENCE';
  }

  private isNaturalPause(duration: number, beforeText: string, afterText: string): boolean {
    if (duration < 300) return true;
    if (beforeText.endsWith('.') || beforeText.endsWith('?') || beforeText.endsWith('!')) return true;
    if (duration < 2000 && beforeText.split(/\s+/).length > 10) return true;
    return duration < 1000;
  }

  private getContextType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('?')) return 'AFTER_QUESTION';
    if (lower.includes('budget') || lower.includes('price')) return 'BUDGET';
    if (lower.includes('location')) return 'LOCATION';
    if (lower.includes('thank')) return 'CLOSING';
    return 'GENERAL';
  }
}
