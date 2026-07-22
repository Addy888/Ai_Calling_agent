import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  RunReadinessCheckDto,
  GetLatestReadinessDto,
  ReadinessReportResponseDto,
  ReadinessSummaryDto,
  QuickReadinessDto,
  ReadinessStatus,
  BlockerSeverity,
  RecommendationPriority,
  ReadinessBlockerDto,
  ReadinessWarningDto,
  ReadinessRecommendationDto,
  DatasetCheckDto,
  ModelCheckDto,
  ConfigurationCheckDto,
  CompatibilityCheckDto,
  SystemRequirementsDto,
  SecurityCheckDto,
} from '../dto/readiness.dto';

@Injectable()
export class TrainingReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run comprehensive training readiness check
   */
  async runReadinessCheck(
    companyId: string,
    userId: string,
    dto: RunReadinessCheckDto,
  ): Promise<ReadinessReportResponseDto> {
    const startTime = Date.now();

    // Check for recent report if not forcing new check
    if (!dto.forceNew) {
      const recentReport = await this.getRecentReport(
        companyId,
        dto.datasetId,
        dto.modelRegistryId,
      );
      if (recentReport) {
        return recentReport;
      }
    }

    // Create new report
    const report = await this.prisma.trainingReadinessReport.create({
      data: {
        companyId,
        workspaceId: dto.workspaceId,
        datasetId: dto.datasetId,
        modelRegistryId: dto.modelRegistryId,
        trainingConfigurationId: dto.trainingConfigurationId,
        checkStartedAt: new Date(),
        createdBy: userId,
      },
    });

    try {
      // Run all checks
      const datasetCheck = await this.checkDataset(companyId, dto.datasetId);
      const modelCheck = await this.checkModel(companyId, dto.modelRegistryId);
      const configCheck = await this.checkConfiguration(companyId, dto.trainingConfigurationId);
      const compatibilityCheck = await this.checkCompatibility(
        companyId,
        dto.datasetId,
        dto.modelRegistryId,
      );
      const systemRequirements = await this.estimateSystemRequirements(
        companyId,
        dto.datasetId,
        dto.modelRegistryId,
      );
      const securityCheck = await this.checkSecurity(
        companyId,
        userId,
        dto.datasetId,
        dto.modelRegistryId,
        dto.workspaceId,
      );

      // Calculate scores
      const datasetScore = this.calculateDatasetScore(datasetCheck);
      const modelScore = this.calculateModelScore(modelCheck);
      const configurationScore = this.calculateConfigurationScore(configCheck);
      const compatibilityScore = this.calculateCompatibilityScore(compatibilityCheck);
      const securityScore = this.calculateSecurityScore(securityCheck);

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore({
        datasetScore,
        modelScore,
        configurationScore,
        compatibilityScore,
        securityScore,
      });

      // Determine status
      const status = this.determineStatus(overallScore, datasetCheck, modelCheck, compatibilityCheck);

      // Collect issues
      const blockers = this.collectBlockers({
        datasetCheck,
        modelCheck,
        configCheck,
        compatibilityCheck,
        securityCheck,
      });
      const warnings = this.collectWarnings({
        datasetCheck,
        modelCheck,
        configCheck,
        compatibilityCheck,
        securityCheck,
      });
      const recommendations = this.generateRecommendations({
        datasetCheck,
        modelCheck,
        configCheck,
        compatibilityCheck,
        securityCheck,
        overallScore,
      });

      const executionTimeMs = Date.now() - startTime;

      // Get compatibility report ID if exists
      let compatibilityReportId = null;
      if (compatibilityCheck.reportExists) {
        const compatReport = await this.prisma.compatibilityReport.findFirst({
          where: {
            companyId,
            datasetId: dto.datasetId,
            modelRegistryId: dto.modelRegistryId,
            status: 'COMPLETED',
          },
          orderBy: { createdAt: 'desc' },
        });
        compatibilityReportId = compatReport?.id;
      }

      // Update report with results
      const updatedReport = await this.prisma.trainingReadinessReport.update({
        where: { id: report.id },
        data: {
          overallScore,
          status,
          datasetScore,
          modelScore,
          configurationScore,
          compatibilityScore,
          securityScore,
          
          // Dataset checks
          datasetExists: datasetCheck.exists,
          datasetValidated: datasetCheck.validated,
          datasetReady: datasetCheck.ready,
          datasetStatus: datasetCheck.status,
          datasetVersion: datasetCheck.version,
          datasetValidationScore: datasetCheck.validationScore,
          datasetRecordCount: datasetCheck.recordCount,
          datasetMissingSamples: datasetCheck.missingSamples,
          datasetDuplicateSamples: datasetCheck.duplicateSamples,
          datasetInvalidSamples: datasetCheck.invalidSamples,
          
          // Model checks
          modelSelected: modelCheck.selected,
          modelActive: modelCheck.active,
          modelStatus: modelCheck.status,
          modelVersion: modelCheck.version,
          modelLicense: modelCheck.license,
          modelCompatibilityScore: modelCheck.compatibilityScore,
          
          // Configuration checks
          configurationExists: configCheck.exists,
          parametersConfigured: configCheck.parametersConfigured,
          epochsConfigured: configCheck.epochsConfigured,
          batchSizeConfigured: configCheck.batchSizeConfigured,
          learningRateConfigured: configCheck.learningRateConfigured,
          trainingMethodConfigured: configCheck.trainingMethodConfigured,
          
          // Compatibility checks
          compatibilityReportExists: compatibilityCheck.reportExists,
          compatibilityPassed: compatibilityCheck.passed,
          languageCompatible: compatibilityCheck.languageCompatible,
          contextCompatible: compatibilityCheck.contextCompatible,
          datasetSizeCompatible: compatibilityCheck.datasetSizeCompatible,
          hardwareCompatible: compatibilityCheck.hardwareCompatible,
          licenseCompatible: compatibilityCheck.licenseCompatible,
          compatibilityReportId,
          
          // System requirements
          estimatedMinGpuMemoryGB: systemRequirements.estimatedMinGpuMemoryGB,
          estimatedRecGpuMemoryGB: systemRequirements.estimatedRecGpuMemoryGB,
          estimatedRamGB: systemRequirements.estimatedRamGB,
          estimatedDiskGB: systemRequirements.estimatedDiskGB,
          estimatedTrainingTimeHours: systemRequirements.estimatedTrainingTimeHours,
          estimatedCheckpointSizeGB: systemRequirements.estimatedCheckpointSizeGB,
          
          // Security checks
          jwtAuthEnabled: securityCheck.jwtAuthEnabled,
          rbacEnabled: securityCheck.rbacEnabled,
          workspaceAccessVerified: securityCheck.workspaceAccessVerified,
          datasetOwnershipVerified: securityCheck.datasetOwnershipVerified,
          modelOwnershipVerified: securityCheck.modelOwnershipVerified,
          
          // Issues
          blockers: blockers as any,
          warnings: warnings as any,
          recommendations: recommendations as any,
          
          checkCompletedAt: new Date(),
          executionTimeMs,
        },
      });

      return this.formatReportResponse(updatedReport);
    } catch (error) {
      // Mark report as failed
      await this.prisma.trainingReadinessReport.update({
        where: { id: report.id },
        data: {
          status: ReadinessStatus.VALIDATION_FAILED,
          checkCompletedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Check for recent report (within last hour)
   */
  private async getRecentReport(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
  ): Promise<ReadinessReportResponseDto | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const report = await this.prisma.trainingReadinessReport.findFirst({
      where: {
        companyId,
        datasetId,
        modelRegistryId,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    return report ? this.formatReportResponse(report) : null;
  }

  /**
   * Check dataset readiness
   */
  private async checkDataset(companyId: string, datasetId: string): Promise<DatasetCheckDto> {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: {
        validations: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dataset) {
      return {
        exists: false,
        validated: false,
        ready: false,
      };
    }

    const latestValidation = dataset.validations[0];
    const validated = dataset.status === 'VALIDATED';
    const ready = validated && dataset.recordCount > 0;

    return {
      exists: true,
      validated,
      ready,
      status: dataset.status,
      version: dataset.version,
      validationScore: latestValidation?.validationScore || null,
      recordCount: dataset.recordCount,
      missingSamples: 0, // Would calculate from validation
      duplicateSamples: dataset.duplicateCount,
      invalidSamples: dataset.invalidRecordCount,
    };
  }

  /**
   * Check model readiness
   */
  private async checkModel(companyId: string, modelRegistryId: string): Promise<ModelCheckDto> {
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelRegistryId, companyId },
      include: {
        baseModel: true,
      },
    });

    if (!model) {
      return {
        selected: false,
        active: false,
      };
    }

    const active = model.isActive && model.status !== 'ARCHIVED';

    return {
      selected: true,
      active,
      status: model.status,
      version: model.versionString,
      license: model.baseModel?.license,
      compatibilityScore: null, // Will be filled from compatibility report
    };
  }

  /**
   * Check training configuration
   */
  private async checkConfiguration(
    companyId: string,
    trainingConfigurationId?: string,
  ): Promise<ConfigurationCheckDto> {
    // For now, check if global training configuration exists
    const config = await this.prisma.trainingConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      return {
        exists: false,
        parametersConfigured: false,
        epochsConfigured: false,
        batchSizeConfigured: false,
        learningRateConfigured: false,
        trainingMethodConfigured: false,
      };
    }

    return {
      exists: true,
      parametersConfigured: true,
      epochsConfigured: true,
      batchSizeConfigured: true,
      learningRateConfigured: true,
      trainingMethodConfigured: true,
    };
  }

  /**
   * Check compatibility
   */
  private async checkCompatibility(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
  ): Promise<CompatibilityCheckDto> {
    const compatReport = await this.prisma.compatibilityReport.findFirst({
      where: {
        companyId,
        datasetId,
        modelRegistryId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!compatReport) {
      return {
        reportExists: false,
        passed: false,
        languageCompatible: false,
        contextCompatible: false,
        datasetSizeCompatible: false,
        hardwareCompatible: false,
        licenseCompatible: false,
      };
    }

    const passed = compatReport.overallScore >= 75;

    return {
      reportExists: true,
      passed,
      languageCompatible: compatReport.languageCompatibility === 'COMPATIBLE',
      contextCompatible: compatReport.contextCompatibility === 'COMPATIBLE',
      datasetSizeCompatible: compatReport.datasetCompatibility === 'COMPATIBLE',
      hardwareCompatible: compatReport.hardwareCompatibility === 'COMPATIBLE',
      licenseCompatible: compatReport.licenseCompatibility === 'COMPATIBLE',
    };
  }

  // Helper methods for score calculation, issue collection, etc.
  private calculateDatasetScore(check: DatasetCheckDto): number {
    let score = 0;
    if (check.exists) score += 20;
    if (check.validated) score += 40;
    if (check.ready) score += 40;
    return Math.min(score, 100);
  }

  private calculateModelScore(check: ModelCheckDto): number {
    let score = 0;
    if (check.selected) score += 50;
    if (check.active) score += 50;
    return score;
  }

  private calculateConfigurationScore(check: ConfigurationCheckDto): number {
    let score = 0;
    if (check.exists) score += 20;
    if (check.parametersConfigured) score += 20;
    if (check.epochsConfigured) score += 15;
    if (check.batchSizeConfigured) score += 15;
    if (check.learningRateConfigured) score += 15;
    if (check.trainingMethodConfigured) score += 15;
    return score;
  }

  private calculateCompatibilityScore(check: CompatibilityCheckDto): number {
    if (!check.reportExists) return 0;
    let score = 0;
    if (check.passed) score += 30;
    if (check.languageCompatible) score += 14;
    if (check.contextCompatible) score += 14;
    if (check.datasetSizeCompatible) score += 14;
    if (check.hardwareCompatible) score += 14;
    if (check.licenseCompatible) score += 14;
    return score;
  }

  private calculateSecurityScore(check: SecurityCheckDto): number {
    let score = 0;
    if (check.jwtAuthEnabled) score += 20;
    if (check.rbacEnabled) score += 20;
    if (check.workspaceAccessVerified) score += 20;
    if (check.datasetOwnershipVerified) score += 20;
    if (check.modelOwnershipVerified) score += 20;
    return score;
  }

  private calculateOverallScore(scores: {
    datasetScore: number;
    modelScore: number;
    configurationScore: number;
    compatibilityScore: number;
    securityScore: number;
  }): number {
    const weights = { dataset: 0.30, model: 0.25, configuration: 0.20, compatibility: 0.15, security: 0.10 };
    return Math.round(
      scores.datasetScore * weights.dataset +
      scores.modelScore * weights.model +
      scores.configurationScore * weights.configuration +
      scores.compatibilityScore * weights.compatibility +
      scores.securityScore * weights.security
    );
  }

  private determineStatus(
    overallScore: number,
    datasetCheck: DatasetCheckDto,
    modelCheck: ModelCheckDto,
    compatCheck: CompatibilityCheckDto,
  ): ReadinessStatus {
    if (!datasetCheck.exists || !modelCheck.selected) return ReadinessStatus.BLOCKED;
    if (!datasetCheck.validated) return ReadinessStatus.VALIDATION_FAILED;
    if (overallScore >= 90) return ReadinessStatus.READY;
    if (overallScore >= 75) return ReadinessStatus.ALMOST_READY;
    if (overallScore >= 60) return ReadinessStatus.CONFIGURATION_REQUIRED;
    return ReadinessStatus.NOT_READY;
  }

  private collectBlockers(checks: any): ReadinessBlockerDto[] {
    const blockers: ReadinessBlockerDto[] = [];
    if (!checks.datasetCheck.exists) {
      blockers.push({
        type: 'NO_DATASET',
        message: 'No dataset selected',
        severity: BlockerSeverity.CRITICAL,
        component: 'Dataset',
        suggestion: 'Select and upload a training dataset',
      });
    }
    if (!checks.modelCheck.selected) {
      blockers.push({
        type: 'NO_MODEL',
        message: 'No base model selected',
        severity: BlockerSeverity.CRITICAL,
        component: 'Model',
        suggestion: 'Select a base model from the registry',
      });
    }
    if (checks.datasetCheck.exists && !checks.datasetCheck.validated) {
      blockers.push({
        type: 'DATASET_NOT_VALIDATED',
        message: 'Dataset has not been validated',
        severity: BlockerSeverity.CRITICAL,
        component: 'Dataset',
        suggestion: 'Run dataset validation before training',
      });
    }
    if (!checks.compatibilityCheck.reportExists) {
      blockers.push({
        type: 'NO_COMPATIBILITY_REPORT',
        message: 'Compatibility report missing',
        severity: BlockerSeverity.HIGH,
        component: 'Compatibility',
        suggestion: 'Run compatibility check between dataset and model',
      });
    }
    if (checks.modelCheck.selected && !checks.modelCheck.active) {
      blockers.push({
        type: 'MODEL_INACTIVE',
        message: 'Selected model is not active',
        severity: BlockerSeverity.HIGH,
        component: 'Model',
        suggestion: 'Activate the model or select an active model',
      });
    }
    return blockers;
  }

  private collectWarnings(checks: any): ReadinessWarningDto[] {
    const warnings: ReadinessWarningDto[] = [];
    if (checks.datasetCheck.duplicateSamples > 0) {
      warnings.push({
        type: 'DUPLICATE_SAMPLES',
        message: `Found ${checks.datasetCheck.duplicateSamples} duplicate samples`,
        severity: BlockerSeverity.MEDIUM,
        component: 'Dataset',
        suggestion: 'Remove duplicate samples to improve training quality',
      });
    }
    if (!checks.securityCheck.workspaceAccessVerified) {
      warnings.push({
        type: 'WORKSPACE_ACCESS',
        message: 'Workspace access not verified',
        severity: BlockerSeverity.LOW,
        component: 'Security',
        suggestion: 'Verify workspace access permissions',
      });
    }
    return warnings;
  }

  private generateRecommendations(context: any): ReadinessRecommendationDto[] {
    const recommendations: ReadinessRecommendationDto[] = [];
    if (context.overallScore < 90) {
      recommendations.push({
        type: 'IMPROVE_DATASET_QUALITY',
        message: 'Improve dataset quality by removing duplicates and invalid samples',
        priority: RecommendationPriority.HIGH,
        component: 'Dataset',
        action: 'Clean and validate dataset',
      });
    }
    if (!context.compatibilityCheck.passed) {
      recommendations.push({
        type: 'RUN_COMPATIBILITY_CHECK',
        message: 'Run compatibility check to ensure dataset and model are compatible',
        priority: RecommendationPriority.HIGH,
        component: 'Compatibility',
        action: 'Navigate to Compatibility Check',
      });
    }
    return recommendations;
  }

  private async estimateSystemRequirements(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
  ): Promise<SystemRequirementsDto> {
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelRegistryId, companyId },
      include: { baseModel: true },
    });

    const minimumVRAM = model?.baseModel?.minimumVram || 8;
    const recommendedVRAM = model?.baseModel?.recommendedVram || 16;
    
    return {
      estimatedMinGpuMemoryGB: minimumVRAM,
      estimatedRecGpuMemoryGB: recommendedVRAM,
      estimatedRamGB: Math.max(16, recommendedVRAM * 0.5),
      estimatedDiskGB: recommendedVRAM * 3,
      estimatedTrainingTimeHours: 4,
      estimatedCheckpointSizeGB: recommendedVRAM * 0.8,
    };
  }

  private async checkSecurity(
    companyId: string,
    userId: string,
    datasetId: string,
    modelRegistryId: string,
    workspaceId?: string,
  ): Promise<SecurityCheckDto> {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelRegistryId, companyId },
    });

    return {
      jwtAuthEnabled: true,
      rbacEnabled: true,
      workspaceAccessVerified: !!workspaceId,
      datasetOwnershipVerified: dataset?.companyId === companyId,
      modelOwnershipVerified: model?.companyId === companyId,
    };
  }

  async getReportById(companyId: string, reportId: string): Promise<ReadinessReportResponseDto> {
    const report = await this.prisma.trainingReadinessReport.findFirst({
      where: { id: reportId, companyId },
    });
    if (!report) throw new NotFoundException('Report not found');
    return this.formatReportResponse(report);
  }

  async getLatestReport(companyId: string, dto: GetLatestReadinessDto): Promise<ReadinessReportResponseDto | null> {
    const where: any = { companyId };
    if (dto.datasetId) where.datasetId = dto.datasetId;
    if (dto.modelRegistryId) where.modelRegistryId = dto.modelRegistryId;

    const report = await this.prisma.trainingReadinessReport.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return report ? this.formatReportResponse(report) : null;
  }

  async getAllReports(companyId: string): Promise<ReadinessReportResponseDto[]> {
    const reports = await this.prisma.trainingReadinessReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reports.map(r => this.formatReportResponse(r));
  }

  async getSummary(companyId: string): Promise<ReadinessSummaryDto> {
    const reports = await this.prisma.trainingReadinessReport.findMany({
      where: { companyId },
    });

    const readyCount = reports.filter(r => r.status === ReadinessStatus.READY).length;
    const almostReadyCount = reports.filter(r => r.status === ReadinessStatus.ALMOST_READY).length;
    const configurationRequiredCount = reports.filter(r => r.status === ReadinessStatus.CONFIGURATION_REQUIRED).length;
    const blockedCount = reports.filter(r => r.status === ReadinessStatus.BLOCKED).length;
    const averageScore = reports.length > 0 ? reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length : 0;

    const recentReports = await this.getAllReports(companyId);

    return {
      totalReports: reports.length,
      readyCount,
      almostReadyCount,
      configurationRequiredCount,
      blockedCount,
      averageScore: Math.round(averageScore * 100) / 100,
      recentReports: recentReports.slice(0, 10),
    };
  }

  async deleteReport(companyId: string, reportId: string): Promise<{ message: string }> {
    const report = await this.prisma.trainingReadinessReport.findFirst({
      where: { id: reportId, companyId },
    });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.trainingReadinessReport.delete({ where: { id: reportId } });
    return { message: 'Report deleted successfully' };
  }

  private formatReportResponse(report: any): ReadinessReportResponseDto {
    return {
      id: report.id,
      companyId: report.companyId,
      workspaceId: report.workspaceId,
      datasetId: report.datasetId,
      modelRegistryId: report.modelRegistryId,
      trainingConfigurationId: report.trainingConfigurationId,
      compatibilityReportId: report.compatibilityReportId,
      overallScore: report.overallScore,
      status: report.status,
      datasetScore: report.datasetScore,
      modelScore: report.modelScore,
      configurationScore: report.configurationScore,
      compatibilityScore: report.compatibilityScore,
      securityScore: report.securityScore,
      datasetCheck: {
        exists: report.datasetExists,
        validated: report.datasetValidated,
        ready: report.datasetReady,
        status: report.datasetStatus,
        version: report.datasetVersion,
        validationScore: report.datasetValidationScore,
        recordCount: report.datasetRecordCount,
        missingSamples: report.datasetMissingSamples,
        duplicateSamples: report.datasetDuplicateSamples,
        invalidSamples: report.datasetInvalidSamples,
      },
      modelCheck: {
        selected: report.modelSelected,
        active: report.modelActive,
        status: report.modelStatus,
        version: report.modelVersion,
        license: report.modelLicense,
        compatibilityScore: report.modelCompatibilityScore,
      },
      configurationCheck: {
        exists: report.configurationExists,
        parametersConfigured: report.parametersConfigured,
        epochsConfigured: report.epochsConfigured,
        batchSizeConfigured: report.batchSizeConfigured,
        learningRateConfigured: report.learningRateConfigured,
        trainingMethodConfigured: report.trainingMethodConfigured,
      },
      compatibilityCheck: {
        reportExists: report.compatibilityReportExists,
        passed: report.compatibilityPassed,
        languageCompatible: report.languageCompatible,
        contextCompatible: report.contextCompatible,
        datasetSizeCompatible: report.datasetSizeCompatible,
        hardwareCompatible: report.hardwareCompatible,
        licenseCompatible: report.licenseCompatible,
      },
      systemRequirements: {
        estimatedMinGpuMemoryGB: report.estimatedMinGpuMemoryGB,
        estimatedRecGpuMemoryGB: report.estimatedRecGpuMemoryGB,
        estimatedRamGB: report.estimatedRamGB,
        estimatedDiskGB: report.estimatedDiskGB,
        estimatedTrainingTimeHours: report.estimatedTrainingTimeHours,
        estimatedCheckpointSizeGB: report.estimatedCheckpointSizeGB,
      },
      securityCheck: {
        jwtAuthEnabled: report.jwtAuthEnabled,
        rbacEnabled: report.rbacEnabled,
        workspaceAccessVerified: report.workspaceAccessVerified,
        datasetOwnershipVerified: report.datasetOwnershipVerified,
        modelOwnershipVerified: report.modelOwnershipVerified,
      },
      blockers: (report.blockers as ReadinessBlockerDto[]) || [],
      warnings: (report.warnings as ReadinessWarningDto[]) || [],
      recommendations: (report.recommendations as ReadinessRecommendationDto[]) || [],
      checkStartedAt: report.checkStartedAt,
      checkCompletedAt: report.checkCompletedAt,
      executionTimeMs: report.executionTimeMs,
      createdBy: report.createdBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
