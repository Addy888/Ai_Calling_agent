import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class BehaviorProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(companyId: string) {
    let profile = await this.prisma.conversationBehaviorProfile.findUnique({
      where: { companyId },
    });

    if (!profile) {
      profile = await this.generateProfile(companyId);
    }

    return profile;
  }

  async generateProfile(companyId: string) {
    const recordings = await this.prisma.conversationRecording.findMany({
      where: { companyId, analysisStatus: 'COMPLETED' },
      include: {
        analysis: true,
        pausePatterns: true,
        turnTakings: true,
        acknowledgements: true,
        speechPatterns: true,
      },
    });

    if (recordings.length === 0) {
      throw new HttpException(
        'No analyzed recordings found. Please upload and analyze recordings first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const greetingStyle = this.analyzeGreetingStyle(recordings);
    const speakingSpeedRange = this.analyzeSpeakingSpeed(recordings);
    const pauseTimingRules = this.analyzePauseTiming(recordings);
    const turnTakingStrategy = this.analyzeTurnTaking(recordings);
    const acknowledgementLibrary = this.buildAcknowledgementLibrary(recordings);
    const interruptionHandling = this.analyzeInterruptionHandling(recordings);
    const questionTimingRules = this.analyzeQuestionTiming(recordings);
    const answerStrategy = this.analyzeAnswerStrategy(recordings);
    const closingStyle = this.analyzeClosingStyle(recordings);
    const conversationFlowRules = this.analyzeConversationFlow(recordings);

    const profile = await this.prisma.conversationBehaviorProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        profileName: 'AI Agent Behavior Profile',
        description: `Generated from ${recordings.length} analyzed conversations`,
        greetingStyle,
        speakingSpeedRange,
        pauseTimingRules,
        turnTakingStrategy,
        acknowledgementLibrary,
        interruptionHandling,
        questionTimingRules,
        answerStrategy,
        closingStyle,
        conversationFlowRules,
        learnedFromRecordings: recordings.length,
        confidenceScore: 0.75 + (Math.min(recordings.length, 20) / 20) * 0.2,
        lastUpdatedFrom: recordings[recordings.length - 1].id,
      },
      update: {
        greetingStyle,
        speakingSpeedRange,
        pauseTimingRules,
        turnTakingStrategy,
        acknowledgementLibrary,
        interruptionHandling,
        questionTimingRules,
        answerStrategy,
        closingStyle,
        conversationFlowRules,
        learnedFromRecordings: recordings.length,
        confidenceScore: 0.75 + (Math.min(recordings.length, 20) / 20) * 0.2,
        lastUpdatedFrom: recordings[recordings.length - 1].id,
      },
    });

    return profile;
  }

  private analyzeGreetingStyle(recordings: any[]) {
    const greetings = recordings
      .map(r => r.analysis?.greetingAnalysis)
      .filter(g => g);

    return {
      averageDuration: this.average(greetings.map(g => g.duration)),
      commonStyles: this.frequencyCount(greetings.map(g => g.style)),
      formalityLevel: this.mostCommon(greetings.map(g => g.formality)),
      languageDistribution: this.frequencyCount(greetings.map(g => g.language)),
      bestPractices: [
        'Start with warm greeting',
        'Confirm contact identity',
        'State purpose within 10 seconds',
        'Ask permission to continue',
      ],
    };
  }

  private analyzeSpeakingSpeed(recordings: any[]) {
    const speeds = recordings
      .map(r => r.analysis?.agentSpeakingSpeed)
      .filter(s => s > 0);

    return {
      min: Math.min(...speeds),
      max: Math.max(...speeds),
      average: this.average(speeds),
      recommended: Math.round(this.average(speeds)),
      guidance: 'Maintain consistent speed between 130-160 words per minute',
    };
  }

  private analyzePauseTiming(recordings: any[]) {
    const allPauses = recordings.flatMap(r => r.pausePatterns || []);
    
    const pausesByType = {};
    allPauses.forEach(p => {
      if (!pausesByType[p.pauseType]) pausesByType[p.pauseType] = [];
      pausesByType[p.pauseType].push(p.duration);
    });

    const rules = {};
    Object.keys(pausesByType).forEach(type => {
      rules[type] = {
        averageDuration: Math.round(this.average(pausesByType[type])),
        minDuration: Math.min(...pausesByType[type]),
        maxDuration: Math.max(...pausesByType[type]),
        occurrences: pausesByType[type].length,
      };
    });

    return {
      pauseTypeDistribution: rules,
      generalGuidelines: {
        afterQuestion: '800-1500ms',
        beforeImportantInfo: '500-800ms',
        naturalBreath: '300-600ms',
        turnTaking: '200-500ms',
      },
    };
  }

  private analyzeTurnTaking(recordings: any[]) {
    const allTurns = recordings.flatMap(r => r.turnTakings || []);
    
    return {
      averageTransitionPause: Math.round(this.average(allTurns.map(t => t.pauseBeforeTransition))),
      smoothTransitions: (allTurns.filter(t => t.isSmooth).length / allTurns.length) * 100,
      interruptionRate: (allTurns.filter(t => t.wasInterrupted).length / allTurns.length) * 100,
      guidelines: [
        'Wait for customer to finish speaking',
        'Use 300-500ms pause before responding',
        'Never interrupt during customer statements',
        'Allow natural conversation rhythm',
      ],
    };
  }

  private buildAcknowledgementLibrary(recordings: any[]) {
    const allAcks = recordings.flatMap(r => r.acknowledgements || []);
    
    const byLanguage = {};
    allAcks.forEach(ack => {
      if (!byLanguage[ack.language]) byLanguage[ack.language] = [];
      byLanguage[ack.language].push(ack.acknowledgementText);
    });

    Object.keys(byLanguage).forEach(lang => {
      byLanguage[lang] = [...new Set(byLanguage[lang])];
    });

    return {
      acknowledgements: byLanguage,
      usageGuidelines: {
        frequency: 'Every 15-30 seconds during customer speech',
        timing: 'During natural pauses in customer speech',
        variety: 'Rotate between different acknowledgements',
      },
      topAcknowledgements: this.getTopN(allAcks.map(a => a.acknowledgementText), 10),
    };
  }

  private analyzeInterruptionHandling(recordings: any[]) {
    return {
      strategy: 'WAIT_AND_LISTEN',
      rules: [
        'Never interrupt customer during active speech',
        'If interrupted, pause and let customer complete',
        'Resume gracefully after customer pause',
        'Acknowledge interruption politely',
      ],
      recoveryTechniques: [
        'Use phrases like "As I was saying..."',
        'Briefly summarize before continuing',
        'Ask if customer needs clarification',
      ],
    };
  }

  private analyzeQuestionTiming(recordings: any[]) {
    return {
      timing: {
        afterGreeting: '5-10 seconds',
        betweenQuestions: '3-5 seconds',
        afterAnswer: '2-3 seconds',
      },
      style: 'OPEN_ENDED',
      guidelines: [
        'Ask one question at a time',
        'Wait for complete answer before next question',
        'Use clarifying questions when needed',
        'Allow thinking time after complex questions',
      ],
    };
  }

  private analyzeAnswerStrategy(recordings: any[]) {
    return {
      structure: 'CLEAR_AND_CONCISE',
      maxLength: '20-30 seconds',
      guidelines: [
        'Answer directly and clearly',
        'Provide specific information',
        'Use examples when helpful',
        'Check for understanding',
      ],
      pauseAfterAnswer: '500-800ms',
    };
  }

  private analyzeClosingStyle(recordings: any[]) {
    const closings = recordings
      .map(r => r.analysis?.closingAnalysis)
      .filter(c => c);

    return {
      averageDuration: this.average(closings.map(c => c.duration)),
      commonStyles: this.frequencyCount(closings.map(c => c.style)),
      includeReferralRequest: (closings.filter(c => c.hasReferralRequest).length / closings.length) * 100,
      includeFollowUp: (closings.filter(c => c.hasFollowUp).length / closings.length) * 100,
      structure: [
        'Summarize key points',
        'Confirm next steps',
        'Request referral',
        'Thank customer',
        'End positively',
      ],
    };
  }

  private analyzeConversationFlow(recordings: any[]) {
    return {
      idealFlow: [
        'GREETING',
        'INTRODUCTION',
        'QUALIFICATION',
        'INFORMATION_COLLECTION',
        'OBJECTION_HANDLING',
        'CLOSING',
      ],
      transitionGuidelines: {
        greetingToIntro: 'Smooth with permission',
        introToQualification: 'Ask open-ended question',
        qualificationToInfo: 'Based on positive response',
        infoToClosing: 'After addressing concerns',
      },
      flexibility: 'Allow natural conversation flow while maintaining structure',
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private frequencyCount(items: any[]): any {
    const counts = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }

  private mostCommon(items: any[]): any {
    const counts = this.frequencyCount(items);
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b), null);
  }

  private getTopN(items: any[], n: number): any[] {
    const counts = this.frequencyCount(items);
    return Object.entries(counts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, n)
      .map(([item]) => item);
  }
}
