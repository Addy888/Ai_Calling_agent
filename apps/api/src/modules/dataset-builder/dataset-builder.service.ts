import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  BuildConversationDatasetDto,
  BuildKnowledgeDatasetDto,
  BuildPromptDatasetDto,
  BuildScriptDatasetDto,
  BuildFAQDatasetDto,
  BuildBusinessRuleDatasetDto,
  BuildEvaluationDatasetDto,
} from './dto/dataset-builder.dto';

@Injectable()
export class DatasetBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildConversationDataset(
    companyId: string,
    datasetId: string,
    dto: BuildConversationDatasetDto,
  ) {
    const where: any = { companyId };

    if (dto.startDate) {
      where.startedAt = { gte: new Date(dto.startDate) };
    }
    if (dto.endDate) {
      where.startedAt = { ...where.startedAt, lte: new Date(dto.endDate) };
    }
    if (dto.campaignIds && dto.campaignIds.length > 0) {
      where.campaignId = { in: dto.campaignIds };
    }

    const sessions = await this.prisma.conversationSession.findMany({
      where,
      include: {
        timeline: true,
        questions: true,
        objections: true,
        summary: true,
      },
      take: 1000,
    });

    const records = [];
    for (const session of sessions) {
      records.push({
        datasetId,
        companyId,
        recordType: 'CONVERSATION_SESSION',
        recordData: {
          sessionId: session.sessionId,
          state: session.currentState,
          result: session.conversationResult,
          duration: session.totalDuration,
          timeline: session.timeline.map((t) => ({
            eventType: t.eventType,
            customerInput: t.customerInput,
            systemResponse: t.systemResponse,
            intent: t.intentDetected,
            confidence: t.confidenceScore,
          })),
          questions: session.questions.map((q) => ({
            question: q.questionText,
            answer: q.customerAnswer,
            type: q.questionType,
          })),
          objections: session.objections.map((o) => ({
            type: o.objectionType,
            text: o.objectionText,
            resolved: o.wasResolved,
          })),
          summary: session.summary,
        },
        sourceType: 'CONVERSATION_SESSION',
        sourceId: session.id,
        language: session.language,
      });
    }

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} conversation records to dataset`,
    };
  }

  async buildKnowledgeDataset(
    companyId: string,
    datasetId: string,
    dto: BuildKnowledgeDatasetDto,
  ) {
    const where: any = { companyId, isActive: true };

    if (dto.categories && dto.categories.length > 0) {
      where.category = { in: dto.categories };
    }
    if (dto.documentIds && dto.documentIds.length > 0) {
      where.id = { in: dto.documentIds };
    }

    const documents = await this.prisma.knowledgeDocument.findMany({
      where,
      include: {
        chunks: {
          where: { isActive: true },
        },
      },
      take: 500,
    });

    const records = [];
    for (const doc of documents) {
      records.push({
        datasetId,
        companyId,
        recordType: 'KNOWLEDGE_DOCUMENT',
        recordData: {
          documentId: doc.id,
          name: doc.name,
          fileType: doc.fileType,
          category: doc.category,
          content: doc.content,
          extractedText: doc.extractedText,
          chunks: doc.chunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            content: c.content,
            tokenCount: c.tokenCount,
          })),
        },
        sourceType: 'KNOWLEDGE_DOCUMENT',
        sourceId: doc.id,
        language: doc.language,
      });
    }

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} knowledge records to dataset`,
    };
  }

  async buildPromptDataset(
    companyId: string,
    datasetId: string,
    dto: BuildPromptDatasetDto,
  ) {
    const where: any = { companyId };

    if (dto.promptIds && dto.promptIds.length > 0) {
      where.id = { in: dto.promptIds };
    }

    const prompts = await this.prisma.prompt.findMany({
      where,
      take: 500,
    });

    const promptTemplates = await this.prisma.promptTemplate.findMany({
      where: {
        OR: [{ companyId }, { isSystem: true }],
        isActive: true,
      },
      take: 500,
    });

    const records = [
      ...prompts.map((p) => ({
        datasetId,
        companyId,
        recordType: 'PROMPT',
        recordData: {
          promptId: p.id,
          name: p.name,
          content: p.content,
          version: p.version,
          status: p.status,
          temperature: p.temperature,
          maxTokens: p.maxTokens,
        },
        sourceType: 'PROMPT',
        sourceId: p.id,
        language: 'en',
      })),
      ...promptTemplates.map((pt) => ({
        datasetId,
        companyId,
        recordType: 'PROMPT_TEMPLATE',
        recordData: {
          templateId: pt.id,
          name: pt.name,
          category: pt.category,
          template: pt.template,
          variables: pt.variables,
          version: pt.version,
        },
        sourceType: 'PROMPT_TEMPLATE',
        sourceId: pt.id,
        language: pt.language,
      })),
    ];

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} prompt records to dataset`,
    };
  }

  async buildScriptDataset(
    companyId: string,
    datasetId: string,
    dto: BuildScriptDatasetDto,
  ) {
    const where: any = { companyId, isActive: true };

    if (dto.scriptIds && dto.scriptIds.length > 0) {
      where.id = { in: dto.scriptIds };
    }

    const scripts = await this.prisma.script.findMany({
      where,
      include: {
        versions: {
          include: {
            nodes: true,
            branches: true,
            variables: true,
          },
        },
      },
      take: 200,
    });

    const records = [];
    for (const script of scripts) {
      records.push({
        datasetId,
        companyId,
        recordType: 'SCRIPT',
        recordData: {
          scriptId: script.id,
          name: script.name,
          content: script.content,
          version: script.version,
          language: script.language,
          versions: script.versions.map((v) => ({
            version: v.version,
            status: v.status,
            nodes: v.nodes.map((n) => ({
              nodeId: n.nodeId,
              type: n.type,
              name: n.name,
              content: n.content,
              order: n.order,
            })),
            branches: v.branches.map((b) => ({
              from: b.fromNodeId,
              to: b.toNodeId,
              condition: b.condition,
            })),
            variables: v.variables.map((vr) => ({
              name: vr.name,
              type: vr.type,
              defaultValue: vr.defaultValue,
            })),
          })),
        },
        sourceType: 'SCRIPT',
        sourceId: script.id,
        language: script.language,
      });
    }

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} script records to dataset`,
    };
  }

  async buildFAQDataset(
    companyId: string,
    datasetId: string,
    dto: BuildFAQDatasetDto,
  ) {
    const where: any = { companyId, type: 'FAQ', isActive: true };

    if (dto.categories && dto.categories.length > 0) {
      where.category = { in: dto.categories };
    }

    const faqs = await this.prisma.knowledgeBase.findMany({
      where,
      take: 1000,
    });

    const records = faqs.map((faq) => ({
      datasetId,
      companyId,
      recordType: 'FAQ',
      recordData: {
        faqId: faq.id,
        title: faq.title,
        content: faq.content,
        category: faq.category,
        tags: faq.tags,
      },
      sourceType: 'FAQ',
      sourceId: faq.id,
      language: 'en',
    }));

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} FAQ records to dataset`,
    };
  }

  async buildBusinessRuleDataset(
    companyId: string,
    datasetId: string,
    dto: BuildBusinessRuleDatasetDto,
  ) {
    const where: any = { companyId, isActive: true };

    if (dto.ruleTypes && dto.ruleTypes.length > 0) {
      where.ruleType = { in: dto.ruleTypes };
    }
    if (dto.categories && dto.categories.length > 0) {
      where.category = { in: dto.categories };
    }

    const rules = await this.prisma.businessRule.findMany({
      where,
      take: 500,
    });

    const records = rules.map((rule) => ({
      datasetId,
      companyId,
      recordType: 'BUSINESS_RULE',
      recordData: {
        ruleId: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        category: rule.category,
        conditions: rule.conditions,
        actions: rule.actions,
        priority: rule.priority,
      },
      sourceType: 'BUSINESS_RULE',
      sourceId: rule.id,
      language: 'en',
    }));

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} business rule records to dataset`,
    };
  }

  async buildEvaluationDataset(
    companyId: string,
    datasetId: string,
    dto: BuildEvaluationDatasetDto,
  ) {
    const where: any = { companyId };

    if (dto.startDate) {
      where.evaluatedAt = { gte: new Date(dto.startDate) };
    }
    if (dto.endDate) {
      where.evaluatedAt = { ...where.evaluatedAt, lte: new Date(dto.endDate) };
    }

    const evaluations = await this.prisma.evaluationReport.findMany({
      where,
      include: {
        conversationScoring: true,
        scriptEvaluation: true,
        knowledgeEvaluation: true,
        decisionEvaluation: true,
        leadEvaluation: true,
        safetyEvaluation: true,
      },
      take: 1000,
    });

    const records = evaluations.map((evaluation) => ({
      datasetId,
      companyId,
      recordType: 'EVALUATION',
      recordData: {
        conversationId: evaluation.conversationId,
        overallScore: evaluation.overallScore,
        conversationScore: evaluation.conversationScore,
        scriptComplianceScore: evaluation.scriptComplianceScore,
        knowledgeAccuracyScore: evaluation.knowledgeAccuracyScore,
        decisionAccuracyScore: evaluation.decisionAccuracyScore,
        leadQualityScore: evaluation.leadQualityScore,
        safetyScore: evaluation.safetyScore,
        issues: evaluation.issues,
        recommendations: evaluation.recommendations,
        details: {
          conversation: evaluation.conversationScoring,
          script: evaluation.scriptEvaluation,
          knowledge: evaluation.knowledgeEvaluation,
          decision: evaluation.decisionEvaluation,
          lead: evaluation.leadEvaluation,
          safety: evaluation.safetyEvaluation,
        },
      },
      sourceType: 'EVALUATION_REPORT',
      sourceId: evaluation.id,
      language: 'en',
    }));

    if (records.length > 0) {
      await this.prisma.trainingDatasetRecord.createMany({
        data: records,
      });

      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          recordCount: { increment: records.length },
          validRecordCount: { increment: records.length },
        },
      });
    }

    return {
      recordsAdded: records.length,
      message: `Added ${records.length} evaluation records to dataset`,
    };
  }
}
