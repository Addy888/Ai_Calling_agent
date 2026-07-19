import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class InsightGenerationService {
  constructor(private prisma: PrismaService) {}

  async getInsights(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.insightType) where.insightType = query.insightType;
    if (query.category) where.category = query.category;
    if (query.minConfidence) where.confidence = { gte: query.minConfidence };
    if (query.isApplied !== undefined) where.isApplied = query.isApplied;

    return await this.prisma.learningInsight.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { confidence: 'desc' }],
      take: query.limit || 50,
    });
  }

  async getInsightDetails(insightId: string, companyId: string) {
    const insight = await this.prisma.learningInsight.findFirst({
      where: { id: insightId, companyId },
      include: {
        recording: true,
      },
    });

    if (!insight) {
      throw new HttpException('Insight not found', HttpStatus.NOT_FOUND);
    }

    return insight;
  }

  async applyInsight(insightId: string, companyId: string, applicationDetails: any) {
    const insight = await this.prisma.learningInsight.findFirst({
      where: { id: insightId, companyId },
    });

    if (!insight) {
      throw new HttpException('Insight not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.learningInsight.update({
      where: { id: insightId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        metadata: {
          ...(insight.metadata as object || {}),
          applicationDetails,
        },
      },
    });

    return {
      status: 'applied',
      message: 'Insight applied successfully',
    };
  }

  async generateInsightsFromRecording(recording: any) {
    const insights = [];

    const analysis = await this.prisma.conversationAnalysis.findUnique({
      where: { recordingId: recording.id },
    });

    if (!analysis) return insights;

    if (analysis.agentSpeakingSpeed < 100 || analysis.agentSpeakingSpeed > 180) {
      insights.push({
        recordingId: recording.id,
        companyId: recording.companyId,
        insightType: 'SPEAKING_SPEED',
        category: 'SPEECH_PATTERN',
        title: 'Speaking Speed Optimization',
        description: `Agent speaking speed is ${analysis.agentSpeakingSpeed} WPM. Optimal range is 130-160 WPM.`,
        recommendation: analysis.agentSpeakingSpeed < 100 
          ? 'Increase speaking speed to improve engagement'
          : 'Reduce speaking speed for better comprehension',
        confidence: 0.85,
        supportingData: { currentSpeed: analysis.agentSpeakingSpeed, targetRange: [130, 160] },
        priority: 2,
      });
    }

    const pausePatterns = await this.prisma.pausePattern.findMany({
      where: { recordingId: recording.id },
    });

    const awkwardSilences = pausePatterns.filter(p => p.pauseType === 'AWKWARD_SILENCE');
    if (awkwardSilences.length > 2) {
      insights.push({
        recordingId: recording.id,
        companyId: recording.companyId,
        insightType: 'PAUSE_TIMING',
        category: 'CONVERSATION_FLOW',
        title: 'Reduce Awkward Silences',
        description: `Found ${awkwardSilences.length} awkward silences in conversation.`,
        recommendation: 'Use active listening acknowledgements and smoother transitions',
        confidence: 0.8,
        supportingData: { count: awkwardSilences.length, occurrences: awkwardSilences.map(s => s.occurrenceTime) },
        priority: 3,
      });
    }

    const turnTakings = await this.prisma.turnTakingPattern.findMany({
      where: { recordingId: recording.id },
    });

    const smoothRate = turnTakings.filter(t => t.isSmooth).length / turnTakings.length;
    if (smoothRate < 0.7) {
      insights.push({
        recordingId: recording.id,
        companyId: recording.companyId,
        insightType: 'TURN_TAKING',
        category: 'CONVERSATION_FLOW',
        title: 'Improve Turn Taking',
        description: `Only ${Math.round(smoothRate * 100)}% of turn transitions were smooth.`,
        recommendation: 'Wait for natural pauses before speaking, use 300-500ms pause',
        confidence: 0.82,
        supportingData: { smoothRate, totalTurns: turnTakings.length },
        priority: 2,
      });
    }

    if (insights.length > 0) {
      await this.prisma.learningInsight.createMany({
        data: insights,
      });
    }

    return insights;
  }
}
