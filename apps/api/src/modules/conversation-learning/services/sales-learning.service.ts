import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface SalesPattern {
  phase: string;
  successRate: number;
  averageDuration: number;
  bestPractices: string[];
  commonMistakes: string[];
}

@Injectable()
export class SalesLearningService {
  constructor(private prisma: PrismaService) {}

  /**
   * Learn from successful sales conversations
   * Identify what works best at each stage
   */
  async learnFromConversations(companyId: string): Promise<any> {
    // Get all analyzed conversations
    const recordings = await this.prisma.conversationRecording.findMany({
      where: {
        companyId,
        processingStatus: 'COMPLETED',
        analysisStatus: 'COMPLETED',
      },
      include: {
        analysis: true,
        transcript: true,
      },
    });

    if (recordings.length === 0) {
      return {
        message: 'No recordings available for learning',
        totalRecordings: 0,
      };
    }

    // Learn patterns for each sales phase
    const greetingPatterns = await this.learnGreetingPatterns(recordings);
    const pitchPatterns = await this.learnPitchPatterns(recordings);
    const budgetPatterns = await this.learnBudgetCollectionPatterns(recordings);
    const objectionPatterns = await this.learnObjectionHandlingPatterns(recordings);
    const closingPatterns = await this.learnClosingPatterns(recordings);
    const referralPatterns = await this.learnReferralPatterns(recordings);

    // Store learned insights
    await this.storeLearnedInsights(companyId, {
      greeting: greetingPatterns,
      pitch: pitchPatterns,
      budget: budgetPatterns,
      objection: objectionPatterns,
      closing: closingPatterns,
      referral: referralPatterns,
    });

    return {
      totalRecordings: recordings.length,
      patternsLearned: {
        greeting: greetingPatterns.patterns?.length || 0,
        pitch: pitchPatterns.patterns?.length || 0,
        budget: budgetPatterns.patterns?.length || 0,
        objection: objectionPatterns.patterns?.length || 0,
        closing: closingPatterns.patterns?.length || 0,
        referral: referralPatterns.patterns?.length || 0,
      },
      recommendations: this.generateSalesRecommendations({
        greeting: greetingPatterns,
        pitch: pitchPatterns,
        budget: budgetPatterns,
        objection: objectionPatterns,
        closing: closingPatterns,
        referral: referralPatterns,
      }),
    };
  }

  /**
   * Learn best greeting patterns
   */
  private async learnGreetingPatterns(recordings: any[]): Promise<any> {
    const greetings: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript || !recording.analysis) continue;

      const transcript = recording.transcript;
      const segments = (transcript.transcriptData as any)?.segments || [];

      // Get first 3 segments (greeting phase)
      const greetingSegments = segments
        .slice(0, 3)
        .filter((s: any) => s.speaker === 'AGENT')
        .map((s: any) => s.text);

      if (greetingSegments.length > 0) {
        const greetingAnalysis = recording.analysis.greetingAnalysis as any;
        greetings.push({
          text: greetingSegments.join(' '),
          duration: greetingAnalysis?.duration || 0,
          style: greetingAnalysis?.style || 'UNKNOWN',
          formality: greetingAnalysis?.formality || 'MEDIUM',
          language: greetingAnalysis?.language || 'ENGLISH',
        });
      }
    }

    // Analyze patterns
    const patterns = this.extractCommonPatterns(greetings.map((g) => g.text));
    const avgDuration = this.calculateAverage(greetings.map((g) => g.duration));
    const mostCommonStyle = this.findMostCommon(greetings.map((g) => g.style));
    const bestFormality = this.findMostCommon(greetings.map((g) => g.formality));

    return {
      patterns,
      averageDuration: avgDuration,
      recommendedStyle: mostCommonStyle,
      recommendedFormality: bestFormality,
      bestPractices: this.extractGreetingBestPractices(greetings),
      examples: greetings.slice(0, 5).map((g) => g.text),
    };
  }

  /**
   * Learn best pitch patterns
   */
  private async learnPitchPatterns(recordings: any[]): Promise<any> {
    const pitches: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript) continue;

      const segments = (recording.transcript.transcriptData as any)?.segments || [];

      // Find introduction/pitch segments
      const pitchSegments = segments.filter((s: any) => {
        const text = s.text.toLowerCase();
        return (
          s.speaker === 'AGENT' &&
          (text.includes('calling from') ||
            text.includes('offering') ||
            text.includes('have') ||
            text.includes('great opportunity'))
        );
      });

      if (pitchSegments.length > 0) {
        pitches.push({
          text: pitchSegments.map((s: any) => s.text).join(' '),
          wordCount: pitchSegments.reduce((sum: number, s: any) => sum + s.text.split(' ').length, 0),
          duration: pitchSegments.reduce((sum: number, s: any) => sum + (s.end - s.start), 0),
        });
      }
    }

    const patterns = this.extractCommonPatterns(pitches.map((p) => p.text));
    const avgWordCount = this.calculateAverage(pitches.map((p) => p.wordCount));
    const avgDuration = this.calculateAverage(pitches.map((p) => p.duration));

    return {
      patterns,
      averageWordCount: Math.round(avgWordCount),
      averageDuration: Math.round(avgDuration),
      bestPractices: [
        'Keep pitch concise and focused',
        'Mention company name clearly',
        'State value proposition early',
        'Use confident language',
      ],
      examples: pitches.slice(0, 5).map((p) => p.text),
    };
  }

  /**
   * Learn best budget collection patterns
   */
  private async learnBudgetCollectionPatterns(recordings: any[]): Promise<any> {
    const budgetQuestions: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript) continue;

      const segments = (recording.transcript.transcriptData as any)?.segments || [];

      // Find budget-related questions
      const budgetSegments = segments.filter((s: any) => {
        const text = s.text.toLowerCase();
        return (
          s.speaker === 'AGENT' &&
          (text.includes('budget') ||
            text.includes('price') ||
            text.includes('invest') ||
            text.includes('spend') ||
            text.includes('afford'))
        );
      });

      for (const segment of budgetSegments) {
        budgetQuestions.push({
          text: segment.text,
          timing: segment.start,
        });
      }
    }

    const patterns = this.extractCommonPatterns(budgetQuestions.map((q) => q.text));
    const avgTiming = this.calculateAverage(budgetQuestions.map((q) => q.timing));

    return {
      patterns,
      averageTiming: Math.round(avgTiming),
      bestPractices: [
        'Ask about budget after understanding requirements',
        'Use range-based questions',
        'Frame positively (investment, not cost)',
        'Be respectful and non-judgmental',
      ],
      examples: budgetQuestions.slice(0, 5).map((q) => q.text),
    };
  }

  /**
   * Learn objection handling patterns
   */
  private async learnObjectionHandlingPatterns(recordings: any[]): Promise<any> {
    const objectionHandling: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript) continue;

      const segments = (recording.transcript.transcriptData as any)?.segments || [];

      // Find objection-response pairs
      for (let i = 0; i < segments.length - 1; i++) {
        const customerSeg = segments[i];
        const agentSeg = segments[i + 1];

        if (customerSeg.speaker === 'CUSTOMER' && agentSeg.speaker === 'AGENT') {
          const objectionIndicators = [
            'but',
            'however',
            'expensive',
            'costly',
            'far',
            'not interested',
            'think about',
          ];
          const customerText = customerSeg.text.toLowerCase();

          if (objectionIndicators.some((ind) => customerText.includes(ind))) {
            objectionHandling.push({
              objection: customerSeg.text,
              response: agentSeg.text,
              responseTime: agentSeg.start - customerSeg.end,
            });
          }
        }
      }
    }

    const responsePatterns = this.extractCommonPatterns(objectionHandling.map((o) => o.response));
    const avgResponseTime = this.calculateAverage(objectionHandling.map((o) => o.responseTime));

    return {
      patterns: responsePatterns,
      averageResponseTime: avgResponseTime,
      totalObjections: objectionHandling.length,
      bestPractices: [
        'Acknowledge the concern first',
        'Use empathy phrases',
        'Provide logical reasoning',
        'Offer alternatives',
        'Use social proof',
      ],
      examples: objectionHandling.slice(0, 5).map((o) => ({
        objection: o.objection,
        response: o.response,
      })),
    };
  }

  /**
   * Learn best closing patterns
   */
  private async learnClosingPatterns(recordings: any[]): Promise<any> {
    const closings: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript || !recording.analysis) continue;

      const segments = (recording.transcript.transcriptData as any)?.segments || [];

      // Get last 5 agent segments
      const agentSegments = segments.filter((s: any) => s.speaker === 'AGENT');
      const closingSegments = agentSegments.slice(-5);

      if (closingSegments.length > 0) {
        const closingAnalysis = recording.analysis.closingAnalysis as any;
        closings.push({
          text: closingSegments.map((s: any) => s.text).join(' '),
          duration: closingAnalysis?.duration || 0,
          style: closingAnalysis?.style || 'STANDARD',
          hasFollowUp: closingAnalysis?.hasFollowUp || false,
        });
      }
    }

    const patterns = this.extractCommonPatterns(closings.map((c) => c.text));
    const avgDuration = this.calculateAverage(closings.map((c) => c.duration));
    const followUpRate = closings.filter((c) => c.hasFollowUp).length / closings.length;

    return {
      patterns,
      averageDuration: avgDuration,
      followUpRate: Math.round(followUpRate * 100),
      bestPractices: [
        'Summarize key points',
        'Confirm next action',
        'Set specific follow-up time',
        'Thank the customer warmly',
        'End on positive note',
      ],
      examples: closings.slice(0, 5).map((c) => c.text),
    };
  }

  /**
   * Learn referral request patterns
   */
  private async learnReferralPatterns(recordings: any[]): Promise<any> {
    const referrals: any[] = [];

    for (const recording of recordings) {
      if (!recording.transcript || !recording.analysis) continue;

      const segments = (recording.transcript.transcriptData as any)?.segments || [];
      const closingAnalysis = recording.analysis.closingAnalysis as any;

      // Find referral request segments
      const referralSegments = segments.filter((s: any) => {
        const text = s.text.toLowerCase();
        return (
          s.speaker === 'AGENT' &&
          (text.includes('refer') ||
            text.includes('recommend') ||
            text.includes('know anyone') ||
            text.includes('friends') ||
            text.includes('family'))
        );
      });

      if (referralSegments.length > 0) {
        referrals.push({
          text: referralSegments.map((s: any) => s.text).join(' '),
          timing: referralSegments[0].start,
          hasReferralRequest: closingAnalysis?.hasReferralRequest || false,
        });
      }
    }

    const patterns = this.extractCommonPatterns(referrals.map((r) => r.text));
    const requestRate = (referrals.filter((r) => r.hasReferralRequest).length / recordings.length) * 100;

    return {
      patterns,
      requestRate: Math.round(requestRate),
      bestPractices: [
        'Ask after successful conversation',
        'Frame as helping others',
        'Make it easy to refer',
        'Offer incentive if applicable',
      ],
      examples: referrals.slice(0, 5).map((r) => r.text),
    };
  }

  /**
   * Extract common patterns from text array
   */
  private extractCommonPatterns(texts: string[]): any[] {
    if (texts.length === 0) return [];

    // Find common phrases (3+ words)
    const phraseCounts = new Map<string, number>();

    for (const text of texts) {
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
      }
    }

    // Get patterns that appear in at least 20% of texts
    const threshold = Math.max(2, Math.floor(texts.length * 0.2));
    const patterns = Array.from(phraseCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({
        phrase,
        frequency: count,
        percentage: Math.round((count / texts.length) * 100),
      }));

    return patterns;
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Find most common value
   */
  private findMostCommon(values: string[]): string {
    if (values.length === 0) return 'UNKNOWN';

    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = values[0];
    for (const [value, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  /**
   * Extract greeting best practices
   */
  private extractGreetingBestPractices(greetings: any[]): string[] {
    const practices: string[] = [];

    // Analyze common characteristics
    const hasTimeBasedGreeting = greetings.some((g) =>
      g.text.toLowerCase().includes('good morning') ||
      g.text.toLowerCase().includes('good afternoon') ||
      g.text.toLowerCase().includes('good evening')
    );

    const hasNameMention = greetings.some((g) =>
      g.text.toLowerCase().includes('my name is') || g.text.toLowerCase().includes('this is')
    );

    const avgDuration = this.calculateAverage(greetings.map((g) => g.duration));

    if (hasTimeBasedGreeting) {
      practices.push('Use time-appropriate greetings (Good morning/afternoon/evening)');
    }

    if (hasNameMention) {
      practices.push('Introduce yourself with your name');
    }

    if (avgDuration < 15) {
      practices.push('Keep greeting brief and warm (under 15 seconds)');
    }

    practices.push('Maintain friendly and confident tone');
    practices.push('Use respectful language');

    return practices;
  }

  /**
   * Generate sales recommendations
   */
  private generateSalesRecommendations(patterns: any): string[] {
    const recommendations: string[] = [];

    // Greeting recommendations
    if (patterns.greeting.averageDuration > 20) {
      recommendations.push('Shorten greeting phase to keep customer engaged');
    }

    // Pitch recommendations
    if (patterns.pitch.averageWordCount > 100) {
      recommendations.push('Make pitch more concise - aim for 50-80 words');
    }

    // Budget recommendations
    if (patterns.budget.averageTiming < 30) {
      recommendations.push('Ask budget questions later after building rapport');
    }

    // Objection handling
    if (patterns.objection.totalObjections > 0 && patterns.objection.averageResponseTime > 3) {
      recommendations.push('Respond to objections faster - aim for under 2 seconds');
    }

    // Closing recommendations
    if (patterns.closing.followUpRate < 50) {
      recommendations.push('Always set clear follow-up action before ending call');
    }

    // Referral recommendations
    if (patterns.referral.requestRate < 30) {
      recommendations.push('Ask for referrals more consistently after successful conversations');
    }

    return recommendations;
  }

  /**
   * Store learned insights in database
   */
  private async storeLearnedInsights(companyId: string, patterns: any) {
    await this.prisma.learningInsight.create({
      data: {
        companyId,
        insightType: 'CONVERSATION_FLOW',
        category: 'SALES_PATTERNS',
        title: 'Sales Conversation Patterns Learned',
        description: 'Patterns extracted from analyzed sales conversations',
        recommendation: 'Apply these learned patterns to improve conversation quality',
        confidence: 85,
        supportingData: patterns,
        priority: 1,
        isApplied: false,
      },
    });
  }
}
