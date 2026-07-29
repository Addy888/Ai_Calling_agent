import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new company' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []).map((r: any) => typeof r === 'string' ? r : r?.slug || '');
    const isSuperAdmin = roles.includes('super-admin');
    const companyId = isSuperAdmin ? undefined : user?.companyId;
    return this.companiesService.findAll(paginationDto, companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Post(':id/logo')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.companiesService.uploadLogo(id, file);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@Param('id') id: string) {
    return this.companiesService.getSettings(id);
  }

  @Patch(':id/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Param('id') id: string, @Body() settings: Record<string, any>) {
    return this.companiesService.updateSettings(id, settings);
  }
}
