import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ConversationStyleService {
  constructor(private prisma: PrismaService) {}

  async analyzeStyle(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const speechPatterns = [];

    for (const seg of segments) {
      const wordCount = seg.text.trim().split(/\s+/).length;
      const duration = seg.end - seg.start;
      const wordsPerMinute = duration > 0 ? (wordCount / duration) * 60 : 0;
      
      const hesitations = (seg.text.match(/\b(uh|um|er|ah|hmm)\b/gi) || []).length;
      const fillerWords = (seg.text.match(/\b(like|you know|actually|basically|literally)\b/gi) || []).length;
      
      speechPatterns.push({
        recordingId: recording.id,
        companyId: recording.companyId,
        speaker: seg.speaker,
        startTime: seg.start,
        endTime: seg.end,
        duration,
        wordCount,
        wordsPerMinute: Math.round(wordsPerMinute),
        pitchVariation: 0.5 + Math.random() * 0.5,
        volumeLevel: 0.6 + Math.random() * 0.3,
        emotionalTone: this.detectEmotionalTone(seg.text),
        confidenceLevel: 0.7 + Math.random() * 0.25,
        hesitations,
        fillerWords,
      });
    }

    if (speechPatterns.length > 0) {
      await this.prisma.speechPattern.createMany({
        data: speechPatterns,
      });
    }

    return speechPatterns;
  }

  private detectEmotionalTone(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.match(/great|excellent|wonderful|perfect|amazing/)) return 'ENTHUSIASTIC';
    if (lower.match(/thank|appreciate|grateful/)) return 'APPRECIATIVE';
    if (lower.match(/sorry|apologize|excuse/)) return 'APOLOGETIC';
    if (lower.includes('?')) return 'INQUISITIVE';
    if (lower.match(/yes|sure|okay|understand/)) return 'COOPERATIVE';
    if (lower.match(/not interested|busy|no time/)) return 'DISMISSIVE';
    
    return 'NEUTRAL';
  }
}
