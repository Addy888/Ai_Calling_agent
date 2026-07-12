import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiOperation, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { PromptService } from './prompts.service';
import { CreatePromptDto, UpdatePromptDto, PromptFilterDto, PromptStatus } from './dto/prompt.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() createPromptDto: CreatePromptDto,
  ) {
    return this.promptService.create(companyId, userId, createPromptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all prompts with pagination and filters' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() paginationDto: PaginationDto,
    @Query() filters: PromptFilterDto,
  ) {
    return this.promptService.findAll(companyId, paginationDto, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prompt by ID' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.promptService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update prompt by ID' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  update(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updatePromptDto: UpdatePromptDto,
  ) {
    return this.promptService.update(id, companyId, userId, updatePromptDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete prompt by ID' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  remove(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.promptService.remove(id, companyId);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted prompt' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  restore(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.promptService.restore(id, companyId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing prompt' })
  @ApiParam({ name: 'id', description: 'Prompt ID to duplicate' })
  duplicate(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name: string },
  ) {
    return this.promptService.duplicate(id, companyId, userId, body.name);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update prompt status' })
  @ApiParam({ name: 'id', description: 'Prompt ID' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { status: PromptStatus },
  ) {
    return this.promptService.updateStatus(id, companyId, userId, body.status);
  }
}
