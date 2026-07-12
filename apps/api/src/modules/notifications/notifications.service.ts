import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { 
  CreateNotificationDto, 
  UpdateNotificationDto, 
  NotificationFilterDto, 
  MarkAsReadDto, 
  BulkDeleteDto,
  NotificationType 
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        ...data,
        companyId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: userId,
      },
    });

    return {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };
  }

  async createSystemNotification(
    companyId: string, 
    title: string, 
    message: string, 
    type: NotificationType = NotificationType.SYSTEM,
    userId?: string,
    metadata?: any
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        companyId,
        userId,
        title,
        message,
        type,
        category: 'SYSTEM',
        metadata,
        createdBy: 'SYSTEM',
      },
    });

    return notification;
  }

  async findAll(companyId: string, userId: string, paginationDto: PaginationDto, filters: NotificationFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      OR: [
        { userId: userId },
        { userId: null }, // Global notifications
      ],
    };

    if (filters.types && filters.types.length > 0) {
      where.type = { in: filters.types };
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (!filters.includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(notifications, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id, 
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
      data: notification,
    };
  }

  async update(id: string, companyId: string, userId: string, data: UpdateNotificationDto) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id, 
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    return {
      success: true,
      data: updatedNotification,
      message: 'Notification updated successfully',
    };
  }

  async remove(id: string, companyId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id, 
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  async markAsRead(companyId: string, userId: string, data: MarkAsReadDto) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: data.notificationIds },
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      data: { updated: result.count },
      message: `${result.count} notifications marked as read`,
    };
  }

  async markAllAsRead(companyId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      data: { updated: result.count },
      message: `${result.count} notifications marked as read`,
    };
  }

  async bulkDelete(companyId: string, userId: string, data: BulkDeleteDto) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: data.notificationIds },
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `${result.count} notifications deleted`,
    };
  }

  async getUnreadCount(companyId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        companyId,
        OR: [
          { userId: userId },
          { userId: null },
        ],
        isRead: false,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });

    return {
      success: true,
      data: { unreadCount: count },
    };
  }

  async getStatistics(companyId: string, userId: string) {
    const [total, unread, byType] = await Promise.all([
      this.prisma.notification.count({
        where: {
          companyId,
          OR: [
            { userId: userId },
            { userId: null },
          ],
        },
      }),
      this.prisma.notification.count({
        where: {
          companyId,
          OR: [
            { userId: userId },
            { userId: null },
          ],
          isRead: false,
        },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: {
          companyId,
          OR: [
            { userId: userId },
            { userId: null },
          ],
        },
        _count: { id: true },
      }),
    ]);

    const typeStats = byType.reduce((acc, stat) => {
      acc[stat.type] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        total,
        unread,
        read: total - unread,
        byType: typeStats,
      },
    };
  }

  async cleanup() {
    // Delete expired notifications
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `Cleaned up ${result.count} expired notifications`,
    };
  }
}