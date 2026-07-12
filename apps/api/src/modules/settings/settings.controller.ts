import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { SettingService } from './settings.service';
import { 
  CreateSettingDto, 
  UpdateSettingDto, 
  SettingFilterDto, 
  BulkUpdateSettingsDto,
  CompanySettingsDto,
  NotificationSettingsDto,
  SecuritySettingsDto,
  SettingCategory 
} from './dto/setting.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new setting' })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  @Permissions('settings.create')
  async create(
    @CurrentUser() user: any,
    @Body() createSettingDto: CreateSettingDto,
  ) {
    return this.settingService.create(user.companyId, user.id, createSettingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @Permissions('settings.read')
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query() filters: SettingFilterDto,
  ) {
    return this.settingService.findAll(user.companyId, paginationDto, filters);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all settings grouped by category' })
  @ApiResponse({ status: 200, description: 'All settings retrieved successfully' })
  @Permissions('settings.read')
  async getAllSettings(@CurrentUser() user: any) {
    return this.settingService.getAllSettings(user.companyId);
  }

  @Get('company')
  @ApiOperation({ summary: 'Get company settings' })
  @ApiResponse({ status: 200, description: 'Company settings retrieved successfully' })
  @Permissions('settings.read')
  async getCompanySettings(@CurrentUser() user: any) {
    return this.settingService.getCompanySettings(user.companyId);
  }

  @Put('company')
  @ApiOperation({ summary: 'Update company settings' })
  @ApiResponse({ status: 200, description: 'Company settings updated successfully' })
  @Permissions('settings.update')
  async updateCompanySettings(
    @CurrentUser() user: any,
    @Body() data: CompanySettingsDto,
  ) {
    return this.settingService.updateCompanySettings(user.companyId, user.id, data);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved successfully' })
  @Permissions('settings.read')
  async getNotificationSettings(@CurrentUser() user: any) {
    return this.settingService.getNotificationSettings(user.companyId);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully' })
  @Permissions('settings.update')
  async updateNotificationSettings(
    @CurrentUser() user: any,
    @Body() data: NotificationSettingsDto,
  ) {
    return this.settingService.updateNotificationSettings(user.companyId, user.id, data);
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security settings' })
  @ApiResponse({ status: 200, description: 'Security settings retrieved successfully' })
  @Permissions('settings.read')
  async getSecuritySettings(@CurrentUser() user: any) {
    return this.settingService.getSecuritySettings(user.companyId);
  }

  @Put('security')
  @ApiOperation({ summary: 'Update security settings' })
  @ApiResponse({ status: 200, description: 'Security settings updated successfully' })
  @Permissions('settings.update')
  async updateSecuritySettings(
    @CurrentUser() user: any,
    @Body() data: SecuritySettingsDto,
  ) {
    return this.settingService.updateSecuritySettings(user.companyId, user.id, data);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get settings by category' })
  @ApiResponse({ status: 200, description: 'Category settings retrieved successfully' })
  @Permissions('settings.read')
  async getByCategory(
    @CurrentUser() user: any,
    @Param('category') category: SettingCategory,
  ) {
    return this.settingService.findByCategory(user.companyId, category);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @Permissions('settings.update')
  async bulkUpdate(
    @CurrentUser() user: any,
    @Body() data: BulkUpdateSettingsDto,
  ) {
    return this.settingService.bulkUpdate(user.companyId, user.id, data);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a setting by key' })
  @ApiResponse({ status: 200, description: 'Setting retrieved successfully' })
  @Permissions('settings.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('key') key: string,
  ) {
    return this.settingService.findOne(key, user.companyId);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a setting' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @Permissions('settings.update')
  async update(
    @CurrentUser() user: any,
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingService.update(key, user.companyId, user.id, updateSettingDto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  @Permissions('settings.delete')
  async remove(
    @CurrentUser() user: any,
    @Param('key') key: string,
  ) {
    return this.settingService.remove(key, user.companyId);
  }
}
