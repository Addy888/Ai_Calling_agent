import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';
import { 
  CreateNotificationDto, 
  UpdateNotificationDto, 
  NotificationFilterDto, 
  MarkAsReadDto, 
  BulkDeleteDto 
} from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @Permissions('notifications.create')
  async create(
    @CurrentUser() user: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(user.companyId, user.id, createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @Permissions('notifications.read')
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query() filters: NotificationFilterDto,
  ) {
    return this.notificationsService.findAll(user.companyId, user.id, paginationDto, filters);
  }

  @Get('count/unread')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @Permissions('notifications.read')
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.companyId, user.id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @Permissions('notifications.read')
  async getStatistics(@CurrentUser() user: any) {
    return this.notificationsService.getStatistics(user.companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @Permissions('notifications.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.findOne(id, user.companyId, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  @Permissions('notifications.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, user.companyId, user.id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @Permissions('notifications.delete')
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.remove(id, user.companyId, user.id);
  }

  @Post('mark-as-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  @Permissions('notifications.update')
  async markAsRead(
    @CurrentUser() user: any,
    @Body() markAsReadDto: MarkAsReadDto,
  ) {
    return this.notificationsService.markAsRead(user.companyId, user.id, markAsReadDto);
  }

  @Post('mark-all-as-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @Permissions('notifications.update')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.companyId, user.id);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: 200, description: 'Notifications deleted successfully' })
  @Permissions('notifications.delete')
  async bulkDelete(
    @CurrentUser() user: any,
    @Body() bulkDeleteDto: BulkDeleteDto,
  ) {
    return this.notificationsService.bulkDelete(user.companyId, user.id, bulkDeleteDto);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup expired notifications' })
  @ApiResponse({ status: 200, description: 'Expired notifications cleaned up' })
  @Permissions('notifications.delete')
  async cleanup() {
    return this.notificationsService.cleanup();
  }
}