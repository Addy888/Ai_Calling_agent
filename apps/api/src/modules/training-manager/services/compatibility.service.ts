import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  RunCompatibilityCheckDto,
  CompatibilityStatus,
  CompatibilityRecommendation,
  CompatibilityReportResponseDto,
  CompatibilitySummaryDto,
  LanguageCompatibilityDetail,
  ContextCompatibilityDetail,
  DatasetCompatibilityDetail,
  HardwareCompatibilityDetail,
  LicenseCompatibilityDetail,
  QuantizationDetail,
  CompatibilityWarning,
} from '../dto/compatibility.dto';

@Injectable()
export class CompatibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run comprehensive compatibility check
   */
  async runCompatibilityCheck(
    companyId: string,
    userId: string,
    dto: RunCompatibilityCheckDto,
  ): Promise<CompatibilityReportResponseDto> {
    const startTime = Date.now();

    // Validate dataset exists and is ready
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: {
        id: dto.datasetId,
        companyId,
      },
      include: {
        records: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    if (dataset.status !== 'VALIDATED') {
      throw new BadRequestException('Dataset must be validated before compatibility check');
    }

    // Validate model exists and is active
    const model = await this.prisma.modelRegistry.findFirst({
      where: {
        id: dto.modelRegistryId,
        companyId,
      },
      include: {
        baseModel: true,
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found in registry');
    }

    if (!model.isActive) {
      throw new BadRequestException('Model is not active');
    }

    // Create compatibility report
    const report = await this.prisma.compatibilityReport.create({
      data: {
        companyId,
        datasetId: dto.datasetId,
        modelRegistryId: dto.modelRegistryId,
        trainingConfigId: dto.trainingConfigId,
        status: 'RUNNING',
        checkStartedAt: new Date(),
        checkedBy: userId,
      },
    });

    try {
      // Run all compatibility checks
      const languageCheck = await this.checkLanguageCompatibility(dataset, model);
      const contextCheck = await this.checkContextCompatibility(dataset, model);
      const datasetCheck = await this.checkDatasetCompatibility(dataset, model);
      const hardwareCheck = await this.checkHardwareCompatibility(dataset, model);
      const licenseCheck = await this.checkLicenseCompatibility(model);
      const quantizationCheck = this.checkQuantizationSupport(model);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        languageScore: languageCheck.score,
        contextScore: contextCheck.score,
        datasetScore: datasetCheck.score,
        hardwareScore: hardwareCheck.score,
        licenseScore: licenseCheck.score,
      });

      // Generate recommendation
      const recommendation = this.generateRecommendation(overallScore, {
        languageStatus: languageCheck.status,
        contextStatus: contextCheck.status,
        datasetStatus: datasetCheck.status,
        hardwareStatus: hardwareCheck.status,
        licenseStatus: licenseCheck.status,
      });

      // Collect warnings and blockers
      const warnings = this.collectWarnings({
        languageCheck,
        contextCheck,
        datasetCheck,
        hardwareCheck,
        licenseCheck,
      });

      const blockers = warnings.filter(w => w.severity === 'critical');
      const suggestions = this.generateSuggestions({
        languageCheck,
        contextCheck,
        datasetCheck,
        hardwareCheck,
        licenseCheck,
      });

      const executionTime = Date.now() - startTime;

      // Update report with results
      const updatedReport = await this.prisma.compatibilityReport.update({
        where: { id: report.id },
        data: {
          languageScore: languageCheck.score,
          contextScore: contextCheck.score,
          datasetScore: datasetCheck.score,
          hardwareScore: hardwareCheck.score,
          licenseScore: licenseCheck.score,
          overallScore,
          languageCompatibility: languageCheck.status,
          contextCompatibility: contextCheck.status,
          datasetCompatibility: datasetCheck.status,
          hardwareCompatibility: hardwareCheck.status,
          licenseCompatibility: licenseCheck.status,
          recommendation: recommendation.type,
          recommendationReason: recommendation.reason,
          languageDetails: languageCheck.details as any,
          contextDetails: contextCheck.details as any,
          datasetDetails: datasetCheck.details as any,
          hardwareDetails: hardwareCheck.details as any,
          licenseDetails: licenseCheck.details as any,
          quantizationDetails: quantizationCheck as any,
          warnings: warnings.filter(w => w.severity !== 'critical') as any,
          blockers: blockers as any,
          suggestions,
          status: 'COMPLETED',
          checkCompletedAt: new Date(),
          executionTime,
        },
      });

      return this.formatReportResponse(updatedReport, dataset, model);
    } catch (error) {
      // Mark report as failed
      await this.prisma.compatibilityReport.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
          checkCompletedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Check language compatibility
   */
  private async checkLanguageCompatibility(dataset: any, model: any) {
    const datasetLanguages = [dataset.language];
    const modelLanguages = (model.baseModel?.languages as string[]) || [];

    const supportedLanguages: string[] = [];
    const partiallySupportedLanguages: string[] = [];
    const unsupportedLanguages: string[] = [];

    datasetLanguages.forEach(lang => {
      if (modelLanguages.includes(lang)) {
        supportedLanguages.push(lang);
      } else if (modelLanguages.includes('multilingual')) {
        partiallySupportedLanguages.push(lang);
      } else {
        unsupportedLanguages.push(lang);
      }
    });

    const coveragePercentage = (supportedLanguages.length / datasetLanguages.length) * 100;

    let status: CompatibilityStatus;
    let score: number;

    if (coveragePercentage === 100) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 100;
    } else if (coveragePercentage >= 50 || partiallySupportedLanguages.length > 0) {
      status = CompatibilityStatus.PARTIALLY_COMPATIBLE;
      score = 70;
    } else if (unsupportedLanguages.length > 0) {
      status = CompatibilityStatus.NOT_COMPATIBLE;
      score = 30;
    } else {
      status = CompatibilityStatus.UNKNOWN;
      score = 50;
    }

    const details: LanguageCompatibilityDetail = {
      datasetLanguages,
      modelSupportedLanguages: modelLanguages,
      supportedLanguages,
      partiallySupportedLanguages,
      unsupportedLanguages,
      coveragePercentage,
    };

    return { status, score, details };
  }

  /**
   * Check context window compatibility
   */
  private async checkContextCompatibility(dataset: any, model: any) {
    // Estimate average conversation length (assuming ~500 tokens per conversation)
    const avgConversationLength = 500;
    const maxConversationLength = 2000; // Conservative estimate
    const modelContextWindow = model.baseModel?.contextLength || 4096;

    const utilizationPercentage = (maxConversationLength / modelContextWindow) * 100;

    let status: CompatibilityStatus;
    let score: number;
    let hasWarning = false;
    let recommendation = '';

    if (utilizationPercentage <= 50) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 100;
      recommendation = 'Excellent context window capacity';
    } else if (utilizationPercentage <= 75) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 85;
      recommendation = 'Good context window capacity';
    } else if (utilizationPercentage <= 90) {
      status = CompatibilityStatus.WARNING;
      score = 70;
      hasWarning = true;
      recommendation = 'Context window may be tight for longest conversations';
    } else {
      status = CompatibilityStatus.NOT_COMPATIBLE;
      score = 40;
      hasWarning = true;
      recommendation = 'Context window insufficient for dataset';
    }

    const details: ContextCompatibilityDetail = {
      averageConversationLength: avgConversationLength,
      maxConversationLength,
      modelContextWindow,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      hasWarning,
      recommendation,
    };

    return { status, score, details };
  }

  /**
   * Check dataset size compatibility
   */
  private async checkDatasetCompatibility(dataset: any, model: any) {
    const totalSamples = dataset.recordCount || 0;
    const trainingSamples = Math.floor(totalSamples * 0.8);
    const validationSamples = Math.floor(totalSamples * 0.1);
    const testSamples = totalSamples - trainingSamples - validationSamples;

    // Estimate tokens (average 500 tokens per sample)
    const estimatedTokens = totalSamples * 500;

    // Estimate dataset size in MB
    const datasetSizeMB = Math.round((estimatedTokens * 4) / 1024 / 1024);

    let status: CompatibilityStatus;
    let score: number;
    let isAdequate = false;
    let recommendation = '';

    if (totalSamples >= 10000) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 100;
      isAdequate = true;
      recommendation = 'Excellent dataset size for training';
    } else if (totalSamples >= 5000) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 90;
      isAdequate = true;
      recommendation = 'Good dataset size for training';
    } else if (totalSamples >= 1000) {
      status = CompatibilityStatus.PARTIALLY_COMPATIBLE;
      score = 70;
      isAdequate = true;
      recommendation = 'Acceptable dataset size, consider gathering more data';
    } else if (totalSamples >= 500) {
      status = CompatibilityStatus.WARNING;
      score = 50;
      isAdequate = false;
      recommendation = 'Small dataset, results may vary';
    } else {
      status = CompatibilityStatus.NOT_COMPATIBLE;
      score = 30;
      isAdequate = false;
      recommendation = 'Dataset too small for effective training';
    }

    const details: DatasetCompatibilityDetail = {
      totalSamples,
      trainingSamples,
      validationSamples,
      testSamples,
      estimatedTokens,
      datasetSizeMB,
      isAdequate,
      recommendation,
    };

    return { status, score, details };
  }

  /**
   * Check hardware requirements
   */
  private async checkHardwareCompatibility(dataset: any, model: any) {
    const minimumVRAM = model.baseModel?.minimumVram || 8;
    const recommendedVRAM = model.baseModel?.recommendedVram || 16;

    // Estimate training VRAM (model size + optimizer + gradients + batch)
    const estimatedTrainingVRAM = recommendedVRAM * 1.5;

    // Estimate disk usage (model + dataset + checkpoints)
    const modelSizeGB = minimumVRAM * 0.8; // Rough estimate
    const datasetSizeGB = (dataset.recordCount * 500 * 4) / 1024 / 1024 / 1024;
    const checkpointSizeGB = modelSizeGB * 2;
    const estimatedDiskUsageGB = modelSizeGB + datasetSizeGB + checkpointSizeGB;

    // Estimate RAM usage
    const estimatedRAMUsageGB = Math.max(16, recommendedVRAM * 0.5);

    const meetsMinimum = true; // We don't check actual hardware
    const meetsRecommended = true;

    let status: CompatibilityStatus;
    let score: number;

    if (estimatedTrainingVRAM <= 16) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 100;
    } else if (estimatedTrainingVRAM <= 24) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 85;
    } else if (estimatedTrainingVRAM <= 40) {
      status = CompatibilityStatus.WARNING;
      score = 70;
    } else {
      status = CompatibilityStatus.WARNING;
      score = 50;
    }

    const details: HardwareCompatibilityDetail = {
      minimumVRAM,
      recommendedVRAM,
      estimatedTrainingVRAM: Math.round(estimatedTrainingVRAM * 100) / 100,
      estimatedDiskUsageGB: Math.round(estimatedDiskUsageGB * 100) / 100,
      estimatedRAMUsageGB: Math.round(estimatedRAMUsageGB * 100) / 100,
      meetsMinimum,
      meetsRecommended,
    };

    return { status, score, details };
  }

  /**
   * Check license compatibility
   */
  private async checkLicenseCompatibility(model: any) {
    const license = model.baseModel?.license || 'Unknown';
    const licenseNorm = license.toLowerCase();

    let commercialUse = false;
    let researchOnly = false;
    let openSource = false;
    const restrictions: string[] = [];

    if (licenseNorm.includes('apache') || licenseNorm.includes('mit') || licenseNorm.includes('bsd')) {
      commercialUse = true;
      openSource = true;
    } else if (licenseNorm.includes('gpl')) {
      commercialUse = true;
      openSource = true;
      restrictions.push('Must open-source derivative works');
    } else if (licenseNorm.includes('research') || licenseNorm.includes('non-commercial')) {
      researchOnly = true;
      restrictions.push('Research use only');
      restrictions.push('No commercial use');
    } else if (licenseNorm.includes('unknown')) {
      restrictions.push('License terms unclear');
    }

    let status: CompatibilityStatus;
    let score: number;

    if (commercialUse && openSource) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 100;
    } else if (commercialUse && !openSource) {
      status = CompatibilityStatus.COMPATIBLE;
      score = 85;
    } else if (researchOnly) {
      status = CompatibilityStatus.WARNING;
      score = 60;
    } else {
      status = CompatibilityStatus.UNKNOWN;
      score = 50;
    }

    const details: LicenseCompatibilityDetail = {
      licenseType: license,
      commercialUse,
      researchOnly,
      openSource,
      restrictions,
    };

    return { status, score, details };
  }

  /**
   * Check quantization support
   */
  private checkQuantizationSupport(model: any): QuantizationDetail {
    const supportedMethods = (model.baseModel?.quantizationSupport as string[]) || [];

    return {
      supportedMethods,
      fp16Supported: supportedMethods.includes('fp16') || supportedMethods.includes('float16'),
      bf16Supported: supportedMethods.includes('bf16') || supportedMethods.includes('bfloat16'),
      int8Supported: supportedMethods.includes('int8') || supportedMethods.includes('8bit'),
      int4Supported: supportedMethods.includes('int4') || supportedMethods.includes('4bit'),
      qloraSupported: supportedMethods.includes('qlora'),
      loraSupported: supportedMethods.includes('lora') || true, // Most models support LoRA
    };
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateOverallScore(scores: {
    languageScore: number;
    contextScore: number;
    datasetScore: number;
    hardwareScore: number;
    licenseScore: number;
  }): number {
    // Weighted average
    const weights = {
      language: 0.25,
      context: 0.20,
      dataset: 0.25,
      hardware: 0.15,
      license: 0.15,
    };

    const overall =
      scores.languageScore * weights.language +
      scores.contextScore * weights.context +
      scores.datasetScore * weights.dataset +
      scores.hardwareScore * weights.hardware +
      scores.licenseScore * weights.license;

    return Math.round(overall * 100) / 100;
  }

  /**
   * Generate recommendation based on scores and statuses
   */
  private generateRecommendation(
    overallScore: number,
    statuses: {
      languageStatus: CompatibilityStatus;
      contextStatus: CompatibilityStatus;
      datasetStatus: CompatibilityStatus;
      hardwareStatus: CompatibilityStatus;
      licenseStatus: CompatibilityStatus;
    },
  ): { type: CompatibilityRecommendation; reason: string } {
    const hasNotCompatible = Object.values(statuses).some(
      s => s === CompatibilityStatus.NOT_COMPATIBLE,
    );

    const hasWarning = Object.values(statuses).some(
      s => s === CompatibilityStatus.WARNING,
    );

    const hasPartial = Object.values(statuses).some(
      s => s === CompatibilityStatus.PARTIALLY_COMPATIBLE,
    );

    let type: CompatibilityRecommendation;
    let reason: string;

    if (hasNotCompatible) {
      type = CompatibilityRecommendation.NOT_RECOMMENDED;
      reason = 'Critical compatibility issues detected. Training is not recommended.';
    } else if (overallScore >= 90) {
      type = CompatibilityRecommendation.RECOMMENDED;
      reason = 'Excellent compatibility. This configuration is highly recommended for training.';
    } else if (overallScore >= 75) {
      type = CompatibilityRecommendation.ACCEPTABLE;
      reason = 'Good compatibility. This configuration is acceptable for training.';
    } else if (overallScore >= 60) {
      type = CompatibilityRecommendation.NEEDS_IMPROVEMENT;
      reason = 'Fair compatibility. Consider addressing warnings before training.';
    } else {
      type = CompatibilityRecommendation.NOT_RECOMMENDED;
      reason = 'Poor compatibility. Significant improvements needed before training.';
    }

    return { type, reason };
  }

  /**
   * Collect warnings from all checks
   */
  private collectWarnings(checks: {
    languageCheck: any;
    contextCheck: any;
    datasetCheck: any;
    hardwareCheck: any;
    licenseCheck: any;
  }): CompatibilityWarning[] {
    const warnings: CompatibilityWarning[] = [];

    // Language warnings
    if (checks.languageCheck.status === CompatibilityStatus.NOT_COMPATIBLE) {
      warnings.push({
        type: 'LANGUAGE_UNSUPPORTED',
        severity: 'critical',
        message: 'Dataset language is not supported by the model',
        suggestion: 'Choose a multilingual model or a model that supports your dataset language',
      });
    } else if (checks.languageCheck.status === CompatibilityStatus.PARTIALLY_COMPATIBLE) {
      warnings.push({
        type: 'LANGUAGE_PARTIAL',
        severity: 'warning',
        message: 'Dataset language is partially supported',
        suggestion: 'Test model performance on your specific language before full training',
      });
    }

    // Context warnings
    if (checks.contextCheck.details.hasWarning) {
      warnings.push({
        type: 'CONTEXT_WINDOW_SMALL',
        severity: checks.contextCheck.status === CompatibilityStatus.NOT_COMPATIBLE ? 'critical' : 'warning',
        message: 'Model context window may be insufficient for longest conversations',
        suggestion: 'Consider using a model with larger context window or truncating long conversations',
      });
    }

    // Dataset warnings
    if (checks.datasetCheck.status === CompatibilityStatus.WARNING || 
        checks.datasetCheck.status === CompatibilityStatus.NOT_COMPATIBLE) {
      warnings.push({
        type: 'DATASET_SIZE_SMALL',
        severity: checks.datasetCheck.status === CompatibilityStatus.NOT_COMPATIBLE ? 'critical' : 'warning',
        message: 'Dataset size may be insufficient for effective training',
        suggestion: 'Gather more training data or use data augmentation techniques',
      });
    }

    // Hardware warnings
    if (checks.hardwareCheck.details.estimatedTrainingVRAM > 40) {
      warnings.push({
        type: 'HIGH_VRAM_REQUIREMENT',
        severity: 'warning',
        message: `High VRAM requirement: ~${checks.hardwareCheck.details.estimatedTrainingVRAM}GB estimated`,
        suggestion: 'Consider using quantization, gradient checkpointing, or a smaller model',
      });
    }

    // License warnings
    if (checks.licenseCheck.details.researchOnly) {
      warnings.push({
        type: 'LICENSE_RESTRICTION',
        severity: 'warning',
        message: 'Model is restricted to research use only',
        suggestion: 'Ensure compliance with license terms for your use case',
      });
    }

    return warnings;
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(checks: {
    languageCheck: any;
    contextCheck: any;
    datasetCheck: any;
    hardwareCheck: any;
    licenseCheck: any;
  }): string[] {
    const suggestions: string[] = [];

    if (checks.languageCheck.score < 100) {
      suggestions.push('Validate model performance on your specific language subset');
    }

    if (checks.contextCheck.details.utilizationPercentage > 75) {
      suggestions.push('Monitor context window usage during training and consider truncation strategies');
    }

    if (checks.datasetCheck.details.totalSamples < 5000) {
      suggestions.push('Increase dataset size through data collection or augmentation for better results');
    }

    if (checks.hardwareCheck.details.estimatedTrainingVRAM > 24) {
      suggestions.push('Use gradient checkpointing and mixed precision training to reduce VRAM usage');
      suggestions.push('Consider using QLoRA or LoRA for parameter-efficient fine-tuning');
    }

    if (!checks.licenseCheck.details.commercialUse) {
      suggestions.push('Review license terms carefully before deployment');
    }

    suggestions.push('Run a small-scale test training before full training to validate configuration');
    suggestions.push('Monitor training metrics closely for the first few epochs');

    return suggestions;
  }

  /**
   * Get compatibility report by ID
   */
  async getReportById(companyId: string, reportId: string): Promise<CompatibilityReportResponseDto> {
    const report = await this.prisma.compatibilityReport.findFirst({
      where: {
        id: reportId,
        companyId,
      },
    });

    if (!report) {
      throw new NotFoundException('Compatibility report not found');
    }

    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: report.datasetId },
      select: {
        id: true,
        name: true,
        datasetType: true,
        recordCount: true,
        language: true,
      },
    });

    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: report.modelRegistryId },
      select: {
        id: true,
        registryName: true,
        provider: true,
        family: true,
        versionString: true,
        status: true,
      },
    });

    if (!dataset || !model) {
      throw new NotFoundException('Referenced dataset or model not found');
    }

    return this.formatReportResponse(report, dataset, model);
  }

  /**
   * Get latest compatibility report for dataset/model combination
   */
  async getLatestReport(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
  ): Promise<CompatibilityReportResponseDto | null> {
    const report = await this.prisma.compatibilityReport.findFirst({
      where: {
        companyId,
        datasetId,
        modelRegistryId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      return null;
    }

    return this.getReportById(companyId, report.id);
  }

  /**
   * Get all compatibility reports
   */
  async getAllReports(companyId: string): Promise<CompatibilityReportResponseDto[]> {
    const reports = await this.prisma.compatibilityReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formattedReports = await Promise.all(
      reports.map(async report => {
        const dataset = await this.prisma.trainingDataset.findFirst({
          where: { id: report.datasetId },
          select: {
            id: true,
            name: true,
            datasetType: true,
            recordCount: true,
            language: true,
          },
        });

        const model = await this.prisma.modelRegistry.findFirst({
          where: { id: report.modelRegistryId },
          select: {
            id: true,
            registryName: true,
            provider: true,
            family: true,
            versionString: true,
            status: true,
          },
        });

        return this.formatReportResponse(report, dataset, model);
      }),
    );

    return formattedReports;
  }

  /**
   * Get compatibility summary
   */
  async getCompatibilitySummary(companyId: string): Promise<CompatibilitySummaryDto> {
    const reports = await this.prisma.compatibilityReport.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
      },
    });

    const recommendedCount = reports.filter(
      r => r.recommendation === CompatibilityRecommendation.RECOMMENDED,
    ).length;

    const acceptableCount = reports.filter(
      r => r.recommendation === CompatibilityRecommendation.ACCEPTABLE,
    ).length;

    const needsImprovementCount = reports.filter(
      r => r.recommendation === CompatibilityRecommendation.NEEDS_IMPROVEMENT,
    ).length;

    const notRecommendedCount = reports.filter(
      r => r.recommendation === CompatibilityRecommendation.NOT_RECOMMENDED,
    ).length;

    const averageScore =
      reports.length > 0
        ? reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length
        : 0;

    const recentReports = await this.getAllReports(companyId);

    return {
      totalReports: reports.length,
      recommendedCount,
      acceptableCount,
      needsImprovementCount,
      notRecommendedCount,
      averageScore: Math.round(averageScore * 100) / 100,
      recentReports: recentReports.slice(0, 10),
    };
  }

  /**
   * Delete compatibility report
   */
  async deleteReport(companyId: string, reportId: string): Promise<{ message: string }> {
    const report = await this.prisma.compatibilityReport.findFirst({
      where: {
        id: reportId,
        companyId,
      },
    });

    if (!report) {
      throw new NotFoundException('Compatibility report not found');
    }

    await this.prisma.compatibilityReport.delete({
      where: { id: reportId },
    });

    return { message: 'Compatibility report deleted successfully' };
  }

  /**
   * Format report response
   */
  private formatReportResponse(report: any, dataset: any, model: any): CompatibilityReportResponseDto {
    return {
      id: report.id,
      companyId: report.companyId,
      datasetId: report.datasetId,
      modelRegistryId: report.modelRegistryId,
      trainingConfigId: report.trainingConfigId,
      languageScore: report.languageScore,
      contextScore: report.contextScore,
      datasetScore: report.datasetScore,
      hardwareScore: report.hardwareScore,
      licenseScore: report.licenseScore,
      overallScore: report.overallScore,
      languageCompatibility: report.languageCompatibility,
      contextCompatibility: report.contextCompatibility,
      datasetCompatibility: report.datasetCompatibility,
      hardwareCompatibility: report.hardwareCompatibility,
      licenseCompatibility: report.licenseCompatibility,
      recommendation: report.recommendation,
      recommendationReason: report.recommendationReason,
      languageDetails: report.languageDetails as LanguageCompatibilityDetail,
      contextDetails: report.contextDetails as ContextCompatibilityDetail,
      datasetDetails: report.datasetDetails as DatasetCompatibilityDetail,
      hardwareDetails: report.hardwareDetails as HardwareCompatibilityDetail,
      licenseDetails: report.licenseDetails as LicenseCompatibilityDetail,
      quantizationDetails: report.quantizationDetails as QuantizationDetail,
      warnings: (report.warnings as CompatibilityWarning[]) || [],
      blockers: (report.blockers as CompatibilityWarning[]) || [],
      suggestions: (report.suggestions as string[]) || [],
      status: report.status,
      checkStartedAt: report.checkStartedAt,
      checkCompletedAt: report.checkCompletedAt,
      executionTime: report.executionTime,
      checkedBy: report.checkedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        datasetType: dataset.datasetType,
        recordCount: dataset.recordCount,
        language: dataset.language,
      } : null,
      model: model ? {
        id: model.id,
        registryName: model.registryName,
        provider: model.provider,
        family: model.family,
        versionString: model.versionString,
        status: model.status,
      } : null,
    } as CompatibilityReportResponseDto;
  }
}
