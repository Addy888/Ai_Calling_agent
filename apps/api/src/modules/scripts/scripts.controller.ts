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
  ApiParam 
} from '@nestjs/swagger';
import { ScriptService } from './scripts.service';
import { CreateScriptDto, UpdateScriptDto, ScriptFilterDto } from './dto/script.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Scripts')
@Controller('scripts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a new script' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() createScriptDto: CreateScriptDto,
  ) {
    return this.scriptService.create(companyId, userId, createScriptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scripts with pagination and filters' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() paginationDto: PaginationDto,
    @Query() filters: ScriptFilterDto,
  ) {
    return this.scriptService.findAll(companyId, paginationDto, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get script by ID' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.scriptService.findOne(id, companyId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get script version history' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  getVersionHistory(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.scriptService.getVersionHistory(id, companyId);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview script with sample data' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  preview(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() sampleData?: any,
  ) {
    return this.scriptService.preview(id, companyId, sampleData);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Duplicate an existing script' })
  @ApiParam({ name: 'id', description: 'Script ID to duplicate' })
  duplicate(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name: string },
  ) {
    return this.scriptService.duplicate(id, companyId, userId, body.name);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update script' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  update(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateScriptDto: UpdateScriptDto,
  ) {
    return this.scriptService.update(id, companyId, userId, updateScriptDto);
  }

  @Patch(':id/restore')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Restore a deleted script' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  restore(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.scriptService.restore(id, companyId);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete script' })
  @ApiParam({ name: 'id', description: 'Script ID' })
  remove(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.scriptService.remove(id, companyId);
  }
}
