import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TrainingEvaluationService } from '../services/training-evaluation.service';
import {
  CreateTrainingEvaluationDto,
  UpdateTrainingEvaluationDto,
  ApproveEvaluationDto,
  RejectEvaluationDto,
  CompareModelsDto,
  ValidationRulesDto,
  EvaluationListQueryDto,
} from '../dto/training-evaluation.dto';

@ApiTags('Training Evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training-manager/evaluations')
export class TrainingEvaluationController {
  constructor(
    private readonly evaluationService: TrainingEvaluationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new training evaluation' })
  @ApiResponse({ status: 201, description: 'Evaluation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Training session or model not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createEvaluation(
    @Request() req,
    @Body() dto: CreateTrainingEvaluationDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.evaluationService.createEvaluation(companyId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update training evaluation' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 200, description: 'Evaluation updated successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateEvaluation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingEvaluationDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.updateEvaluation(companyId, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evaluation by ID' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 200, description: 'Evaluation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEvaluation(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.getEvaluation(companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List evaluations with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'evaluationType', required: false })
  @ApiQuery({ name: 'approvalStatus', required: false })
  @ApiQuery({ name: 'trainingSessionId', required: false })
  @ApiQuery({ name: 'modelRegistryId', required: false })
  @ApiResponse({ status: 200, description: 'Evaluations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listEvaluations(
    @Request() req,
    @Query() query: EvaluationListQueryDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.listEvaluations(companyId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete evaluation' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 204, description: 'Evaluation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteEvaluation(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.deleteEvaluation(companyId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve evaluation' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 200, description: 'Evaluation approved successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async approveEvaluation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApproveEvaluationDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.approveEvaluation(companyId, id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject evaluation' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 200, description: 'Evaluation rejected successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rejectEvaluation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectEvaluationDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.rejectEvaluation(companyId, id, dto);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare two models' })
  @ApiResponse({ status: 200, description: 'Models compared successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async compareModels(
    @Request() req,
    @Body() dto: CompareModelsDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.compareModels(companyId, dto);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Generate evaluation report' })
  @ApiParam({ name: 'id', description: 'Evaluation ID' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateReport(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.generateReport(companyId, id);
  }

  @Get('validation-rules')
  @ApiOperation({ summary: 'Get validation rules' })
  @ApiResponse({ status: 200, description: 'Validation rules retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getValidationRules(@Request() req) {
    const companyId = req.user.companyId;
    return this.evaluationService.getValidationRules(companyId);
  }

  @Put('validation-rules')
  @ApiOperation({ summary: 'Update validation rules' })
  @ApiResponse({ status: 200, description: 'Validation rules updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateValidationRules(
    @Request() req,
    @Body() dto: ValidationRulesDto,
  ) {
    const companyId = req.user.companyId;
    return this.evaluationService.updateValidationRules(companyId, dto);
  }
}
