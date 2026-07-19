import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TranscriptionService } from './transcription.service';
import { PatternDetectionService } from './pattern-detection.service';
import { PauseAnalysisService } from './pause-analysis.service';
import { TurnTakingAnalysisService } from './turn-taking-analysis.service';
import { AcknowledgementLearningService } from './acknowledgement-learning.service';
import { InterruptionDetectionService } from './interruption-detection.service';
import { ConversationStyleService } from './conversation-style.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class RecordingAnalysisService {
  constructor(
    private prisma: PrismaService,
    private transcriptionService: TranscriptionService,
    private patternDetectionService: PatternDetectionService,
    private pauseAnalysisService: PauseAnalysisService,
    private turnTakingAnalysisService: TurnTakingAnalysisService,
    private acknowledgementLearningService: AcknowledgementLearningService,
    private interruptionDetectionService: InterruptionDetectionService,
    private conversationStyleService: ConversationStyleService,
  ) {}

  async processRecording(file: Express.Multer.File, dto: any, companyId: string, uploadedBy: string) {
    const { name, language = 'en', agentSpeakerId, customerSpeakerId, metadata } = dto;

    const duration = await this.getAudioDuration(file.path);
    const fileStats = fs.statSync(file.path);

    const recording = await this.prisma.conversationRecording.create({
      data: {
        companyId,
        name: name || file.originalname,
        filePath: file.path,
        fileSize: BigInt(fileStats.size),
        duration,
        format: path.extname(file.originalname).substring(1),
        sampleRate: 16000,
        channels: 2,
        language,
        agentSpeakerId,
        customerSpeakerId,
        metadata,
        uploadedBy,
        processingStatus: 'PENDING',
        transcriptionStatus: 'PENDING',
        analysisStatus: 'PENDING',
      },
    });

    this.startAsyncProcessing(recording.id, companyId);

    return {
      id: recording.id,
      status: 'uploaded',
      message: 'Recording uploaded successfully. Processing started in background.',
    };
  }

  private async startAsyncProcessing(recordingId: string, companyId: string) {
    setTimeout(async () => {
      try {
        await this.analyzeRecording(recordingId, companyId, false);
      } catch (error) {
        console.error(`Error processing recording ${recordingId}:`, error);
        await this.prisma.conversationRecording.update({
          where: { id: recordingId },
          data: {
            processingStatus: 'FAILED',
            transcriptionStatus: 'FAILED',
            analysisStatus: 'FAILED',
          },
        });
      }
    }, 1000);
  }

  async analyzeRecording(recordingId: string, companyId: string, forceReanalysis: boolean = false) {
    const recording = await this.prisma.conversationRecording.findFirst({
      where: { id: recordingId, companyId },
    });

    if (!recording) {
      throw new HttpException('Recording not found', HttpStatus.NOT_FOUND);
    }

    if (recording.analysisStatus === 'COMPLETED' && !forceReanalysis) {
      return {
        status: 'already_analyzed',
        message: 'Recording already analyzed. Use forceReanalysis to reprocess.',
      };
    }

    await this.prisma.conversationRecording.update({
      where: { id: recordingId },
      data: { processingStatus: 'PROCESSING' },
    });

    const transcript = await this.transcriptionService.transcribeRecording(recording);

    await this.prisma.conversationRecording.update({
      where: { id: recordingId },
      data: { transcriptionStatus: 'COMPLETED', analysisStatus: 'ANALYZING' },
    });

    const analysis = await this.analyzeTranscript(recording, transcript);

    await this.patternDetectionService.detectPatterns(recording, transcript);
    await this.pauseAnalysisService.analyzePauses(recording, transcript);
    await this.turnTakingAnalysisService.analyzeTurnTaking(recording, transcript);
    await this.acknowledgementLearningService.learnAcknowledgements(recording, transcript);
    await this.interruptionDetectionService.detectInterruptions(recording, transcript);
    await this.conversationStyleService.analyzeStyle(recording, transcript);

    await this.prisma.conversationRecording.update({
      where: { id: recordingId },
      data: {
        processingStatus: 'COMPLETED',
        analysisStatus: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    return {
      status: 'completed',
      message: 'Recording analyzed successfully',
      analysis,
    };
  }

  private async analyzeTranscript(recording: any, transcript: any) {
    const segments = transcript.segments || [];
    
    let agentSpeakTime = 0;
    let customerSpeakTime = 0;
    let silenceTime = 0;
    let overlapTime = 0;
    let agentWordCount = 0;
    let customerWordCount = 0;
    let turnCount = 0;

    let lastEndTime = 0;
    segments.forEach((seg: any, index: number) => {
      const duration = seg.end - seg.start;
      const wordCount = seg.text.trim().split(/\s+/).length;

      if (seg.speaker === 'AGENT') {
        agentSpeakTime += duration;
        agentWordCount += wordCount;
      } else {
        customerSpeakTime += duration;
        customerWordCount += wordCount;
      }

      if (index > 0) {
        const gap = seg.start - lastEndTime;
        if (gap > 0) {
          silenceTime += gap;
        } else if (gap < 0) {
          overlapTime += Math.abs(gap);
        }
        turnCount++;
      }

      lastEndTime = seg.end;
    });

    const totalSpeakTime = agentSpeakTime + customerSpeakTime;
    const averageTurnDuration = turnCount > 0 ? totalSpeakTime / turnCount : 0;
    const agentSpeakingSpeed = agentSpeakTime > 0 ? (agentWordCount / agentSpeakTime) * 60 : 0;
    const customerSpeakingSpeed = customerSpeakTime > 0 ? (customerWordCount / customerSpeakTime) * 60 : 0;
    const averageSpeakingSpeed = totalSpeakTime > 0 ? ((agentWordCount + customerWordCount) / totalSpeakTime) * 60 : 0;

    const conversationFlow = this.analyzeConversationFlow(segments);
    const greetingAnalysis = this.analyzeGreeting(segments);
    const closingAnalysis = this.analyzeClosing(segments);

    const analysis = await this.prisma.conversationAnalysis.create({
      data: {
        recordingId: recording.id,
        companyId: recording.companyId,
        totalDuration: Math.round(recording.duration),
        agentSpeakTime: Math.round(agentSpeakTime),
        customerSpeakTime: Math.round(customerSpeakTime),
        silenceTime: Math.round(silenceTime),
        overlapTime: Math.round(overlapTime),
        turnCount,
        averageTurnDuration: Math.round(averageTurnDuration * 100) / 100,
        agentWordCount,
        customerWordCount,
        averageSpeakingSpeed: Math.round(averageSpeakingSpeed),
        agentSpeakingSpeed: Math.round(agentSpeakingSpeed),
        customerSpeakingSpeed: Math.round(customerSpeakingSpeed),
        conversationFlow,
        greetingAnalysis,
        closingAnalysis,
      },
    });

    return analysis;
  }

  private analyzeConversationFlow(segments: any[]) {
    const flow = {
      phases: [],
      totalPhases: 0,
      averagePhaseLength: 0,
      transitions: [],
    };

    let currentPhase = null;
    let phaseStart = 0;

    segments.forEach((seg, index) => {
      const phase = this.identifyPhase(seg.text, index, segments.length);
      
      if (phase !== currentPhase) {
        if (currentPhase) {
          flow.phases.push({
            phase: currentPhase,
            startTime: phaseStart,
            endTime: seg.start,
            duration: seg.start - phaseStart,
          });
        }
        currentPhase = phase;
        phaseStart = seg.start;
      }
    });

    flow.totalPhases = flow.phases.length;
    flow.averagePhaseLength = flow.totalPhases > 0 
      ? flow.phases.reduce((sum, p) => sum + p.duration, 0) / flow.totalPhases 
      : 0;

    return flow;
  }

  private identifyPhase(text: string, index: number, total: number): string {
    const lowerText = text.toLowerCase();
    
    if (index < 3) {
      if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('good')) {
        return 'GREETING';
      }
    }
    
    if (lowerText.includes('looking for') || lowerText.includes('interested in')) {
      return 'QUALIFICATION';
    }
    
    if (lowerText.includes('budget') || lowerText.includes('price') || lowerText.includes('cost')) {
      return 'BUDGET_DISCUSSION';
    }
    
    if (lowerText.includes('location') || lowerText.includes('area') || lowerText.includes('city')) {
      return 'LOCATION_DISCUSSION';
    }
    
    if (lowerText.includes('thank you') || lowerText.includes('goodbye') || index >= total - 3) {
      return 'CLOSING';
    }
    
    return 'INFORMATION_EXCHANGE';
  }

  private analyzeGreeting(segments: any[]) {
    const greetingSegments = segments.slice(0, Math.min(5, segments.length));
    
    return {
      duration: greetingSegments.length > 0 
        ? greetingSegments[greetingSegments.length - 1].end - greetingSegments[0].start 
        : 0,
      style: this.identifyGreetingStyle(greetingSegments),
      formality: this.assessFormality(greetingSegments),
      language: this.detectLanguage(greetingSegments),
    };
  }

  private analyzeClosing(segments: any[]) {
    const closingSegments = segments.slice(Math.max(0, segments.length - 5));
    
    return {
      duration: closingSegments.length > 0 
        ? closingSegments[closingSegments.length - 1].end - closingSegments[0].start 
        : 0,
      style: this.identifyClosingStyle(closingSegments),
      hasReferralRequest: this.checkReferralRequest(closingSegments),
      hasFollowUp: this.checkFollowUp(closingSegments),
    };
  }

  private identifyGreetingStyle(segments: any[]): string {
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    
    if (text.includes('good morning') || text.includes('good afternoon')) {
      return 'FORMAL';
    }
    if (text.includes('hey') || text.includes('hi there')) {
      return 'CASUAL';
    }
    if (text.includes('hello') || text.includes('hi')) {
      return 'NEUTRAL';
    }
    return 'CUSTOM';
  }

  private assessFormality(segments: any[]): string {
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    
    if (text.includes('sir') || text.includes('madam') || text.includes('mr') || text.includes('mrs')) {
      return 'HIGH';
    }
    if (text.includes('you') && !text.includes('hey')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private detectLanguage(segments: any[]): string {
    const text = segments.map(s => s.text).join(' ');
    
    const hindiPatterns = ['ji', 'aap', 'namaste', 'dhanyavad', 'kaise', 'kya'];
    const marathiPatterns = ['tumhi', 'kay', 'ahe', 'aahe'];
    
    const hasHindi = hindiPatterns.some(p => text.toLowerCase().includes(p));
    const hasMarathi = marathiPatterns.some(p => text.toLowerCase().includes(p));
    
    if (hasHindi && hasMarathi) return 'MIXED';
    if (hasHindi) return 'HINDI';
    if (hasMarathi) return 'MARATHI';
    return 'ENGLISH';
  }

  private identifyClosingStyle(segments: any[]): string {
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    
    if (text.includes('thank you so much') || text.includes('greatly appreciate')) {
      return 'WARM';
    }
    if (text.includes('thank you') || text.includes('thanks')) {
      return 'STANDARD';
    }
    if (text.includes('bye') || text.includes('goodbye')) {
      return 'BRIEF';
    }
    return 'CUSTOM';
  }

  private checkReferralRequest(segments: any[]): boolean {
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    return text.includes('refer') || text.includes('recommend') || text.includes('know anyone');
  }

  private checkFollowUp(segments: any[]): boolean {
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    return text.includes('call back') || text.includes('follow up') || text.includes('contact you');
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      );
      return Math.round(parseFloat(stdout.trim()));
    } catch (error) {
      console.warn('Could not get audio duration, using default:', error);
      return 0;
    }
  }

  async getRecordings(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) {
      where.processingStatus = status;
    }

    return await this.prisma.conversationRecording.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: true,
        _count: {
          select: {
            patterns: true,
            pausePatterns: true,
            turnTakings: true,
            interruptionEvents: true,
          },
        },
      },
    });
  }

  async getRecordingDetails(recordingId: string, companyId: string) {
    const recording = await this.prisma.conversationRecording.findFirst({
      where: { id: recordingId, companyId },
      include: {
        transcript: true,
        analysis: true,
        patterns: true,
        pausePatterns: true,
        speechPatterns: true,
        acknowledgements: true,
        turnTakings: true,
        interruptionEvents: true,
        learningInsights: true,
      },
    });

    if (!recording) {
      throw new HttpException('Recording not found', HttpStatus.NOT_FOUND);
    }

    return recording;
  }

  async deleteRecording(recordingId: string, companyId: string) {
    const recording = await this.prisma.conversationRecording.findFirst({
      where: { id: recordingId, companyId },
    });

    if (!recording) {
      throw new HttpException('Recording not found', HttpStatus.NOT_FOUND);
    }

    if (fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }

    await this.prisma.conversationRecording.delete({
      where: { id: recordingId },
    });

    return { status: 'deleted', message: 'Recording deleted successfully' };
  }

  async getPatterns(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.recordingId) where.recordingId = query.recordingId;
    if (query.patternType) where.patternType = query.patternType;
    if (query.speaker) where.speaker = query.speaker;

    return await this.prisma.conversationPattern.findMany({
      where,
      take: query.limit || 100,
      orderBy: { occurrenceTime: 'asc' },
    });
  }

  async getPausePatterns(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.recordingId) where.recordingId = query.recordingId;

    return await this.prisma.pausePattern.findMany({
      where,
      take: query.limit || 100,
      orderBy: { duration: 'desc' },
    });
  }

  async getAcknowledgements(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.recordingId) where.recordingId = query.recordingId;

    return await this.prisma.acknowledgementPattern.findMany({
      where,
      take: query.limit || 100,
      orderBy: { frequency: 'desc' },
    });
  }

  async getTurnTakingPatterns(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.recordingId) where.recordingId = query.recordingId;

    return await this.prisma.turnTakingPattern.findMany({
      where,
      take: query.limit || 100,
      orderBy: { transitionTime: 'asc' },
    });
  }

  async getInterruptions(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.recordingId) where.recordingId = query.recordingId;

    return await this.prisma.interruptionEvent.findMany({
      where,
      take: query.limit || 100,
      orderBy: { occurrenceTime: 'asc' },
    });
  }
}
