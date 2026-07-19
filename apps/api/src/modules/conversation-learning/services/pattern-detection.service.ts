import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PatternDetectionService {
  constructor(private prisma: PrismaService) {}

  async detectPatterns(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const patterns = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const text = seg.text.toLowerCase();
      const context = this.getContext(segments, i);

      if (i < 3 && (text.includes('hello') || text.includes('hi') || text.includes('good'))) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'GREETING',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.9,
        });
      }

      if (text.includes('name is') || text.includes('calling from')) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'INTRODUCTION',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.85,
        });
      }

      if (text.includes('?')) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'QUESTION_ASKING',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.8,
        });
      }

      if (text.includes('budget') || text.includes('price') || text.includes('cost')) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'BUDGET_DISCUSSION',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.88,
        });
      }

      if (text.includes('location') || text.includes('area') || text.includes('city')) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'LOCATION_DISCUSSION',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.85,
        });
      }

      if (i >= segments.length - 3 && (text.includes('thank') || text.includes('bye'))) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'CLOSING',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.9,
        });
      }

      if (text.includes('refer') || text.includes('recommend')) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'REFERRAL_REQUEST',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.82,
        });
      }

      const acks = ['ji', 'yes', 'okay', 'sure', 'right', 'got it', 'understood', 'i see'];
      if (acks.some(ack => text.includes(ack)) && seg.text.split(/\s+/).length < 5) {
        patterns.push({
          recordingId: recording.id,
          companyId: recording.companyId,
          patternType: 'ACKNOWLEDGEMENT',
          occurrenceTime: seg.start,
          duration: seg.end - seg.start,
          speaker: seg.speaker,
          context: seg.text,
          beforeContext: context.before,
          afterContext: context.after,
          confidence: 0.75,
        });
      }
    }

    if (patterns.length > 0) {
      await this.prisma.conversationPattern.createMany({
        data: patterns,
      });
    }

    return patterns;
  }

  private getContext(segments: any[], currentIndex: number) {
    const before = currentIndex > 0 ? segments[currentIndex - 1].text : null;
    const after = currentIndex < segments.length - 1 ? segments[currentIndex + 1].text : null;
    return { before, after };
  }
}
