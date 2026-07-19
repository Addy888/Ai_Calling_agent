import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AcknowledgementLearningService {
  constructor(private prisma: PrismaService) {}

  async learnAcknowledgements(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    const acknowledgements = [];
    
    const ackPatterns = {
      hindi: ['ji', 'ji sir', 'ji madam', 'bilkul', 'theek hai', 'samajh gaya', 'samajh gayi', 'haan ji'],
      marathi: ['ho', 'bara', 'thik', 'zala', 'samajle'],
      english: ['yes', 'okay', 'sure', 'right', 'got it', 'understood', 'i see', 'alright', 'perfect', 'great'],
      mixed: ['okay ji', 'yes sir', 'sure ma\'am', 'right ji', 'perfect sir'],
    };

    const allAcks = [...ackPatterns.hindi, ...ackPatterns.marathi, ...ackPatterns.english, ...ackPatterns.mixed];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const text = seg.text.toLowerCase().trim();
      const wordCount = text.split(/\s+/).length;
      
      if (wordCount <= 3) {
        for (const ack of allAcks) {
          if (text.includes(ack)) {
            const language = this.detectAckLanguage(ack, ackPatterns);
            const contextType = i > 0 ? this.getAckContextType(segments[i - 1].text) : null;
            
            acknowledgements.push({
              recordingId: recording.id,
              companyId: recording.companyId,
              speaker: seg.speaker,
              acknowledgementText: seg.text.trim(),
              occurrenceTime: seg.start,
              duration: seg.end - seg.start,
              language,
              contextType,
              isEffective: this.assessEffectiveness(seg, segments, i),
              frequency: 1,
            });
            break;
          }
        }
      }
    }

    if (acknowledgements.length > 0) {
      await this.prisma.acknowledgementPattern.createMany({
        data: acknowledgements,
      });
    }

    return acknowledgements;
  }

  private detectAckLanguage(ack: string, patterns: any): string {
    if (patterns.hindi.includes(ack)) return 'hindi';
    if (patterns.marathi.includes(ack)) return 'marathi';
    if (patterns.mixed.includes(ack)) return 'mixed';
    return 'english';
  }

  private getAckContextType(previousText: string): string {
    const lower = previousText.toLowerCase();
    if (lower.includes('?')) return 'AFTER_QUESTION';
    if (lower.includes('understand') || lower.includes('clear')) return 'CONFIRMATION_REQUEST';
    return 'ACTIVE_LISTENING';
  }

  private assessEffectiveness(seg: any, segments: any[], index: number): boolean {
    if (index === 0) return true;
    const previous = segments[index - 1];
    if (previous.speaker === seg.speaker) return false;
    const timingGap = seg.start - previous.end;
    return timingGap < 2;
  }
}
