import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TranscriptionService {
  constructor(private prisma: PrismaService) {}

  async transcribeRecording(recording: any) {
    const segments = this.simulateTranscription(recording);
    
    const fullText = segments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
    
    const speakerDiarization = {
      speakers: ['AGENT', 'CUSTOMER'],
      totalSegments: segments.length,
      agentSegments: segments.filter(s => s.speaker === 'AGENT').length,
      customerSegments: segments.filter(s => s.speaker === 'CUSTOMER').length,
    };

    const wordTimestamps = segments.flatMap((seg, segIndex) => 
      seg.text.split(/\s+/).map((word, wordIndex) => ({
        word,
        start: seg.start + (wordIndex * (seg.end - seg.start) / seg.text.split(/\s+/).length),
        end: seg.start + ((wordIndex + 1) * (seg.end - seg.start) / seg.text.split(/\s+/).length),
        confidence: 0.85 + Math.random() * 0.1,
        speaker: seg.speaker,
      }))
    );

    const transcript = await this.prisma.recordingTranscript.create({
      data: {
        recordingId: recording.id,
        fullText,
        segments,
        speakerDiarization,
        wordTimestamps,
        confidence: 0.87,
        language: recording.language,
      },
    });

    return transcript;
  }

  private simulateTranscription(recording: any): any[] {
    const duration = recording.duration;
    const segments = [];
    
    const sampleConversation = [
      { speaker: 'AGENT', text: 'Hello, good morning! Am I speaking with Mr. Sharma?', duration: 3 },
      { speaker: 'CUSTOMER', text: 'Yes, speaking. Who is this?', duration: 2 },
      { speaker: 'AGENT', text: 'This is Priya from Dream Homes Real Estate. I am calling regarding our premium property project in Pune. Do you have 2 minutes to discuss?', duration: 6 },
      { speaker: 'CUSTOMER', text: 'Yes, please go ahead.', duration: 2 },
      { speaker: 'AGENT', text: 'Great! We have launched a new residential project near Hinjewadi. Are you currently looking for a property in Pune?', duration: 5 },
      { speaker: 'CUSTOMER', text: 'Actually, yes. I am looking for a 2BHK apartment. What is your budget range?', duration: 4 },
      { speaker: 'AGENT', text: 'Wonderful! Our 2BHK apartments start from 55 lakhs. What is your budget if I may ask?', duration: 5 },
      { speaker: 'CUSTOMER', text: 'My budget is around 60 lakhs. Can you tell me more about the location?', duration: 4 },
      { speaker: 'AGENT', text: 'Perfect! The project is located just 5 minutes from Hinjewadi IT Park. It has excellent connectivity and all modern amenities. Would you like to schedule a site visit?', duration: 8 },
      { speaker: 'CUSTOMER', text: 'That sounds interesting. Let me check my schedule and get back to you.', duration: 4 },
      { speaker: 'AGENT', text: 'Absolutely! I will send you the project details on WhatsApp. Can I have your email as well?', duration: 5 },
      { speaker: 'CUSTOMER', text: 'Sure, it is sharma.raj@email.com', duration: 3 },
      { speaker: 'AGENT', text: 'Thank you Mr. Sharma. I will send all the details shortly. Also, if you know anyone else looking for property, please do refer them to us.', duration: 7 },
      { speaker: 'CUSTOMER', text: 'Sure, I will keep that in mind. Thank you.', duration: 3 },
      { speaker: 'AGENT', text: 'Thank you for your time. Have a great day!', duration: 3 },
      { speaker: 'CUSTOMER', text: 'You too. Goodbye.', duration: 2 },
    ];

    let currentTime = 0;
    let index = 0;

    while (currentTime < duration && index < sampleConversation.length) {
      const item = sampleConversation[index];
      const pauseBefore = 0.5 + Math.random() * 1.5;
      
      currentTime += pauseBefore;
      
      segments.push({
        id: `seg_${index}`,
        speaker: item.speaker,
        text: item.text,
        start: currentTime,
        end: currentTime + item.duration,
        confidence: 0.85 + Math.random() * 0.1,
      });

      currentTime += item.duration;
      index++;
    }

    return segments;
  }

  async getTranscript(recordingId: string) {
    return await this.prisma.recordingTranscript.findUnique({
      where: { recordingId },
    });
  }
}
