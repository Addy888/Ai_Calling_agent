import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ValidationEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateCoverage(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: { records: true },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const coverageResults = [];

    if (dataset.datasetType === 'KNOWLEDGE') {
      const totalKnowledge = await this.prisma.knowledgeDocument.count({
        where: { companyId, isActive: true },
      });
      const coveredKnowledge = new Set(
        dataset.records.filter((r) => r.sourceType === 'KNOWLEDGE_DOCUMENT').map((r) => r.sourceId),
      ).size;

      coverageResults.push({
        datasetId,
        companyId,
        coverageType: 'KNOWLEDGE',
        category: 'documents',
        expectedCount: totalKnowledge,
        actualCount: coveredKnowledge,
        coveragePercentage: totalKnowledge > 0 ? (coveredKnowledge / totalKnowledge) * 100 : 0,
      });
    }

    if (dataset.datasetType === 'PROMPT') {
      const totalPrompts = await this.prisma.prompt.count({ where: { companyId } });
      const coveredPrompts = new Set(
        dataset.records.filter((r) => r.sourceType === 'PROMPT').map((r) => r.sourceId),
      ).size;

      coverageResults.push({
        datasetId,
        companyId,
        coverageType: 'PROMPT',
        category: 'prompts',
        expectedCount: totalPrompts,
        actualCount: coveredPrompts,
        coveragePercentage: totalPrompts > 0 ? (coveredPrompts / totalPrompts) * 100 : 0,
      });
    }

    if (dataset.datasetType === 'SCRIPT') {
      const totalScripts = await this.prisma.script.count({
        where: { companyId, isActive: true },
      });
      const coveredScripts = new Set(
        dataset.records.filter((r) => r.sourceType === 'SCRIPT').map((r) => r.sourceId),
      ).size;

      coverageResults.push({
        datasetId,
        companyId,
        coverageType: 'SCRIPT',
        category: 'scripts',
        expectedCount: totalScripts,
        actualCount: coveredScripts,
        coveragePercentage: totalScripts > 0 ? (coveredScripts / totalScripts) * 100 : 0,
      });
    }

    if (dataset.datasetType === 'CONVERSATION') {
      const totalSessions = await this.prisma.conversationSession.count({
        where: { companyId },
      });
      const coveredSessions = new Set(
        dataset.records
          .filter((r) => r.sourceType === 'CONVERSATION_SESSION')
          .map((r) => r.sourceId),
      ).size;

      coverageResults.push({
        datasetId,
        companyId,
        coverageType: 'CONVERSATION',
        category: 'sessions',
        expectedCount: totalSessions,
        actualCount: coveredSessions,
        coveragePercentage: totalSessions > 0 ? (coveredSessions / totalSessions) * 100 : 0,
      });
    }

    if (dataset.datasetType === 'BUSINESS_RULE') {
      const totalRules = await this.prisma.businessRule.count({
        where: { companyId, isActive: true },
      });
      const coveredRules = new Set(
        dataset.records.filter((r) => r.sourceType === 'BUSINESS_RULE').map((r) => r.sourceId),
      ).size;

      coverageResults.push({
        datasetId,
        companyId,
        coverageType: 'BUSINESS_RULE',
        category: 'rules',
        expectedCount: totalRules,
        actualCount: coveredRules,
        coveragePercentage: totalRules > 0 ? (coveredRules / totalRules) * 100 : 0,
      });
    }

    if (coverageResults.length > 0) {
      await this.prisma.datasetCoverage.deleteMany({ where: { datasetId } });
      await this.prisma.datasetCoverage.createMany({ data: coverageResults });
    }

    return coverageResults;
  }

  async validateDataQuality(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: { records: true },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const qualityChecks = [];
    let totalIssues = 0;

    const duplicateCheck = await this.checkDuplicates(dataset);
    qualityChecks.push(duplicateCheck);
    totalIssues += duplicateCheck.issuesFound;

    const formatCheck = await this.checkFormat(dataset);
    qualityChecks.push(formatCheck);
    totalIssues += formatCheck.issuesFound;

    const contentCheck = await this.checkContent(dataset);
    qualityChecks.push(contentCheck);
    totalIssues += contentCheck.issuesFound;

    const referenceCheck = await this.checkReferences(dataset);
    qualityChecks.push(referenceCheck);
    totalIssues += referenceCheck.issuesFound;

    for (const check of qualityChecks) {
      await this.prisma.datasetQualityCheck.create({
        data: {
          datasetId: dataset.id,
          companyId,
          checkType: check.checkType,
          status: check.issuesFound === 0 ? 'PASSED' : 'FAILED',
          issuesFound: check.issuesFound,
          issueDetails: check.issueDetails,
          qualityScore: check.qualityScore,
          recommendations: check.recommendations,
          autoFixable: check.autoFixable,
        },
      });
    }

    const overallQuality =
      qualityChecks.reduce((sum, c) => sum + c.qualityScore, 0) / qualityChecks.length;

    return {
      overallQuality,
      totalIssues,
      checks: qualityChecks,
    };
  }

  private async checkDuplicates(dataset: any) {
    const records = dataset.records;
    const seen = new Map<string, string[]>();
    const duplicates: any[] = [];

    for (const record of records) {
      const key = JSON.stringify(record.recordData);
      if (seen.has(key)) {
        seen.get(key)!.push(record.id);
        duplicates.push({ recordId: record.id, duplicateOf: seen.get(key)![0] });
      } else {
        seen.set(key, [record.id]);
      }
    }

    const qualityScore = records.length > 0 ? ((records.length - duplicates.length) / records.length) * 100 : 100;

    return {
      checkType: 'DUPLICATE_DETECTION',
      issuesFound: duplicates.length,
      issueDetails: duplicates,
      qualityScore,
      recommendations: duplicates.length > 0 ? ['Remove duplicate records to improve data quality'] : [],
      autoFixable: true,
    };
  }

  private async checkFormat(dataset: any) {
    const records = dataset.records;
    const formatIssues: any[] = [];

    for (const record of records) {
      if (!record.recordData || typeof record.recordData !== 'object') {
        formatIssues.push({ recordId: record.id, issue: 'Invalid record data format' });
      } else if (Object.keys(record.recordData).length === 0) {
        formatIssues.push({ recordId: record.id, issue: 'Empty record data' });
      }
    }

    const qualityScore = records.length > 0 ? ((records.length - formatIssues.length) / records.length) * 100 : 100;

    return {
      checkType: 'FORMAT_VALIDATION',
      issuesFound: formatIssues.length,
      issueDetails: formatIssues,
      qualityScore,
      recommendations: formatIssues.length > 0 ? ['Fix invalid format records'] : [],
      autoFixable: false,
    };
  }

  private async checkContent(dataset: any) {
    const records = dataset.records;
    const contentIssues: any[] = [];

    for (const record of records) {
      const data = record.recordData;
      if (data && typeof data === 'object') {
        const hasContent = Object.values(data).some((v) => v && String(v).trim().length > 0);
        if (!hasContent) {
          contentIssues.push({ recordId: record.id, issue: 'No meaningful content found' });
        }
      }
    }

    const qualityScore = records.length > 0 ? ((records.length - contentIssues.length) / records.length) * 100 : 100;

    return {
      checkType: 'CONTENT_VALIDATION',
      issuesFound: contentIssues.length,
      issueDetails: contentIssues,
      qualityScore,
      recommendations: contentIssues.length > 0 ? ['Remove or fix records with no content'] : [],
      autoFixable: false,
    };
  }

  private async checkReferences(dataset: any) {
    const records = dataset.records;
    const referenceIssues: any[] = [];

    for (const record of records) {
      if (record.sourceId) {
        let exists = false;
        try {
          switch (record.sourceType) {
            case 'KNOWLEDGE_DOCUMENT':
              exists = !!(await this.prisma.knowledgeDocument.findUnique({
                where: { id: record.sourceId },
              }));
              break;
            case 'PROMPT':
              exists = !!(await this.prisma.prompt.findUnique({
                where: { id: record.sourceId },
              }));
              break;
            case 'SCRIPT':
              exists = !!(await this.prisma.script.findUnique({
                where: { id: record.sourceId },
              }));
              break;
            case 'CONVERSATION_SESSION':
              exists = !!(await this.prisma.conversationSession.findUnique({
                where: { id: record.sourceId },
              }));
              break;
            default:
              exists = true;
          }
        } catch {
          exists = false;
        }

        if (!exists) {
          referenceIssues.push({
            recordId: record.id,
            issue: `Referenced ${record.sourceType} not found: ${record.sourceId}`,
          });
        }
      }
    }

    const qualityScore = records.length > 0 ? ((records.length - referenceIssues.length) / records.length) * 100 : 100;

    return {
      checkType: 'REFERENCE_INTEGRITY',
      issuesFound: referenceIssues.length,
      issueDetails: referenceIssues,
      qualityScore,
      recommendations: referenceIssues.length > 0 ? ['Remove records with broken references'] : [],
      autoFixable: true,
    };
  }

  async generateReadinessReport(companyId: string, versionId?: string) {
    let trainingVersion;

    if (versionId) {
      trainingVersion = await this.prisma.trainingVersion.findFirst({
        where: { id: versionId, companyId },
      });
    } else {
      trainingVersion = await this.prisma.trainingVersion.findFirst({
        where: { companyId, isCurrent: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!trainingVersion) {
      return this.generateEmptyReadinessReport(companyId);
    }

    const datasets = await this.prisma.trainingDataset.findMany({
      where: { companyId, isActive: true },
      include: {
        coverage: true,
        validations: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    const datasetsByType = datasets.reduce((acc, ds) => {
      if (!acc[ds.datasetType]) acc[ds.datasetType] = [];
      acc[ds.datasetType].push(ds);
      return acc;
    }, {} as Record<string, any[]>);

    const knowledgeReadiness = this.calculateTypeReadiness(datasetsByType.KNOWLEDGE || []);
    const conversationReadiness = this.calculateTypeReadiness(datasetsByType.CONVERSATION || []);
    const promptReadiness = this.calculateTypeReadiness(datasetsByType.PROMPT || []);
    const scriptReadiness = this.calculateTypeReadiness(datasetsByType.SCRIPT || []);
    const decisionReadiness = this.calculateTypeReadiness(datasetsByType.BUSINESS_RULE || []);
    const evaluationReadiness = this.calculateTypeReadiness(datasetsByType.EVALUATION || []);

    const overallReadiness =
      (knowledgeReadiness * 0.25 +
        conversationReadiness * 0.2 +
        promptReadiness * 0.15 +
        scriptReadiness * 0.15 +
        decisionReadiness * 0.15 +
        evaluationReadiness * 0.1);

    const config = await this.prisma.trainingConfiguration.findUnique({
      where: { companyId },
    });

    const readinessThreshold = config?.readinessThreshold || 85.0;
    const isReady = overallReadiness >= readinessThreshold;

    const blockers: any[] = [];
    const warnings: any[] = [];
    const recommendations: any[] = [];

    if (knowledgeReadiness < 70) {
      blockers.push({
        type: 'LOW_KNOWLEDGE_READINESS',
        message: `Knowledge readiness is ${knowledgeReadiness.toFixed(1)}%, needs to be at least 70%`,
        severity: 'critical',
      });
    }

    if (conversationReadiness < 60) {
      warnings.push({
        type: 'LOW_CONVERSATION_READINESS',
        message: `Conversation readiness is ${conversationReadiness.toFixed(1)}%, recommended minimum is 60%`,
        severity: 'medium',
      });
    }

    if (datasets.length < 5) {
      recommendations.push({
        type: 'INCREASE_DATASET_DIVERSITY',
        message: 'Create more datasets to improve AI training diversity',
        priority: 'high',
      });
    }

    const readinessReport = await this.prisma.readinessReport.upsert({
      where: { trainingVersionId: trainingVersion.id },
      create: {
        trainingVersionId: trainingVersion.id,
        companyId,
        overallReadiness,
        knowledgeReadiness,
        conversationReadiness,
        promptReadiness,
        scriptReadiness,
        decisionReadiness,
        evaluationReadiness,
        knowledgeCoverage: this.calculateAverageCoverage(datasetsByType.KNOWLEDGE || []),
        conversationCoverage: this.calculateAverageCoverage(datasetsByType.CONVERSATION || []),
        promptCoverage: this.calculateAverageCoverage(datasetsByType.PROMPT || []),
        scriptCoverage: this.calculateAverageCoverage(datasetsByType.SCRIPT || []),
        businessRuleCoverage: this.calculateAverageCoverage(datasetsByType.BUSINESS_RULE || []),
        dataQualityScore: this.calculateAverageQuality(datasets),
        validationScore: this.calculateAverageValidation(datasets),
        consistencyScore: 85.0,
        isReady,
        readinessThreshold,
        blockers,
        warnings,
        recommendations,
        readinessBreakdown: {
          knowledge: knowledgeReadiness,
          conversation: conversationReadiness,
          prompt: promptReadiness,
          script: scriptReadiness,
          decision: decisionReadiness,
          evaluation: evaluationReadiness,
        },
      },
      update: {
        overallReadiness,
        knowledgeReadiness,
        conversationReadiness,
        promptReadiness,
        scriptReadiness,
        decisionReadiness,
        evaluationReadiness,
        knowledgeCoverage: this.calculateAverageCoverage(datasetsByType.KNOWLEDGE || []),
        conversationCoverage: this.calculateAverageCoverage(datasetsByType.CONVERSATION || []),
        promptCoverage: this.calculateAverageCoverage(datasetsByType.PROMPT || []),
        scriptCoverage: this.calculateAverageCoverage(datasetsByType.SCRIPT || []),
        businessRuleCoverage: this.calculateAverageCoverage(datasetsByType.BUSINESS_RULE || []),
        dataQualityScore: this.calculateAverageQuality(datasets),
        validationScore: this.calculateAverageValidation(datasets),
        isReady,
        blockers,
        warnings,
        recommendations,
        readinessBreakdown: {
          knowledge: knowledgeReadiness,
          conversation: conversationReadiness,
          prompt: promptReadiness,
          script: scriptReadiness,
          decision: decisionReadiness,
          evaluation: evaluationReadiness,
        },
        calculatedAt: new Date(),
      },
    });

    return readinessReport;
  }

  private generateEmptyReadinessReport(companyId: string) {
    return {
      companyId,
      overallReadiness: 0,
      knowledgeReadiness: 0,
      conversationReadiness: 0,
      promptReadiness: 0,
      scriptReadiness: 0,
      decisionReadiness: 0,
      evaluationReadiness: 0,
      isReady: false,
      blockers: [
        {
          type: 'NO_TRAINING_VERSION',
          message: 'No training version available',
          severity: 'critical',
        },
      ],
    };
  }

  private calculateTypeReadiness(datasets: any[]): number {
    if (datasets.length === 0) return 0;

    const scores = datasets.map((ds) => {
      const hasRecords = ds.recordCount > 0 ? 30 : 0;
      const validPercentage = ds.recordCount > 0 ? (ds.validRecordCount / ds.recordCount) * 40 : 0;
      const coverageScore = ds.coverage.length > 0 ? ds.coverage[0].coveragePercentage * 0.3 : 0;
      return hasRecords + validPercentage + coverageScore;
    });

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  private calculateAverageCoverage(datasets: any[]): number {
    if (datasets.length === 0) return 0;
    const coverages = datasets
      .filter((ds) => ds.coverage.length > 0)
      .map((ds) => ds.coverage[0].coveragePercentage);
    if (coverages.length === 0) return 0;
    return coverages.reduce((sum, c) => sum + c, 0) / coverages.length;
  }

  private calculateAverageQuality(datasets: any[]): number {
    if (datasets.length === 0) return 0;
    const qualities = datasets
      .filter((ds) => ds.recordCount > 0)
      .map((ds) => (ds.validRecordCount / ds.recordCount) * 100);
    if (qualities.length === 0) return 0;
    return qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
  }

  private calculateAverageValidation(datasets: any[]): number {
    if (datasets.length === 0) return 0;
    const validations = datasets
      .filter((ds) => ds.validations.length > 0 && ds.validations[0].validationScore !== null)
      .map((ds) => ds.validations[0].validationScore);
    if (validations.length === 0) return 0;
    return validations.reduce((sum, v) => sum + v, 0) / validations.length;
  }
}
