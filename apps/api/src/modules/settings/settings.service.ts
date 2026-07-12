import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { 
  CreateSettingDto, 
  UpdateSettingDto, 
  SettingFilterDto, 
  BulkUpdateSettingsDto,
  CompanySettingsDto,
  NotificationSettingsDto,
  SecuritySettingsDto,
  SettingType,
  SettingCategory 
} from './dto/setting.dto';

@Injectable()
export class SettingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, data: CreateSettingDto) {
    const setting = await this.prisma.setting.upsert({
      where: {
        companyId_key: {
          companyId,
          key: data.key,
        },
      },
      update: {
        value: data.value,
        type: data.type,
        updatedBy: userId,
      },
      create: {
        ...data,
        companyId,
        createdBy: userId,
      },
    });

    return {
      success: true,
      data: setting,
      message: 'Setting created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: SettingFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (filters.search) {
      where.OR = [
        { key: { contains: filters.search } },
        { value: { contains: filters.search } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.publicOnly) {
      where.isPublic = true;
    }

    const [settings, total] = await Promise.all([
      this.prisma.setting.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { key: 'asc' },
      }),
      this.prisma.setting.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(settings, total, page, limit),
    };
  }

  async findOne(key: string, companyId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        companyId_key: {
          companyId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return {
      success: true,
      data: setting,
    };
  }

  async findByCategory(companyId: string, category: SettingCategory) {
    const settings = await this.prisma.setting.findMany({
      where: {
        companyId,
        category,
      },
      orderBy: { key: 'asc' },
    });

    return {
      success: true,
      data: settings,
    };
  }

  async update(key: string, companyId: string, userId: string, data: UpdateSettingDto) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        companyId_key: {
          companyId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    const updatedSetting = await this.prisma.setting.update({
      where: {
        companyId_key: {
          companyId,
          key,
        },
      },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: updatedSetting,
      message: 'Setting updated successfully',
    };
  }

  async bulkUpdate(companyId: string, userId: string, data: BulkUpdateSettingsDto) {
    const results = await Promise.all(
      data.settings.map(async (setting) => {
        return this.prisma.setting.upsert({
          where: {
            companyId_key: {
              companyId,
              key: setting.key,
            },
          },
          update: {
            value: setting.value,
            type: setting.type || SettingType.STRING,
            category: setting.category,
            updatedBy: userId,
          },
          create: {
            key: setting.key,
            value: setting.value,
            type: setting.type || SettingType.STRING,
            category: setting.category || SettingCategory.APPLICATION,
            companyId,
            createdBy: userId,
          },
        });
      })
    );

    return {
      success: true,
      data: results,
      message: `${results.length} settings updated successfully`,
    };
  }

  async remove(key: string, companyId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: {
        companyId_key: {
          companyId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    await this.prisma.setting.delete({
      where: {
        companyId_key: {
          companyId,
          key,
        },
      },
    });

    return {
      success: true,
      message: 'Setting deleted successfully',
    };
  }

  async getCompanySettings(companyId: string) {
    const settings = await this.prisma.setting.findMany({
      where: {
        companyId,
        category: SettingCategory.COMPANY,
      },
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = this.parseSettingValue(setting.value, setting.type);
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: settingsMap,
    };
  }

  async updateCompanySettings(companyId: string, userId: string, data: CompanySettingsDto) {
    const settingsToUpdate = [];

    if (data.companyName !== undefined) {
      settingsToUpdate.push({
        key: 'company.name',
        value: data.companyName,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.companyEmail !== undefined) {
      settingsToUpdate.push({
        key: 'company.email',
        value: data.companyEmail,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.companyPhone !== undefined) {
      settingsToUpdate.push({
        key: 'company.phone',
        value: data.companyPhone,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.companyAddress !== undefined) {
      settingsToUpdate.push({
        key: 'company.address',
        value: data.companyAddress,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.companyWebsite !== undefined) {
      settingsToUpdate.push({
        key: 'company.website',
        value: data.companyWebsite,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.timezone !== undefined) {
      settingsToUpdate.push({
        key: 'company.timezone',
        value: data.timezone,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.currency !== undefined) {
      settingsToUpdate.push({
        key: 'company.currency',
        value: data.currency,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.dateFormat !== undefined) {
      settingsToUpdate.push({
        key: 'company.dateFormat',
        value: data.dateFormat,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (data.timeFormat !== undefined) {
      settingsToUpdate.push({
        key: 'company.timeFormat',
        value: data.timeFormat,
        type: SettingType.STRING,
        category: SettingCategory.COMPANY,
      });
    }

    if (settingsToUpdate.length > 0) {
      await this.bulkUpdate(companyId, userId, { settings: settingsToUpdate });
    }

    return {
      success: true,
      message: 'Company settings updated successfully',
    };
  }

  async getNotificationSettings(companyId: string) {
    const settings = await this.prisma.setting.findMany({
      where: {
        companyId,
        category: SettingCategory.NOTIFICATION,
      },
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = this.parseSettingValue(setting.value, setting.type);
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: settingsMap,
    };
  }

  async updateNotificationSettings(companyId: string, userId: string, data: NotificationSettingsDto) {
    const settingsToUpdate = [];

    if (data.emailNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.email.enabled',
        value: data.emailNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (data.smsNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.sms.enabled',
        value: data.smsNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (data.pushNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.push.enabled',
        value: data.pushNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (data.campaignNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.campaigns.enabled',
        value: data.campaignNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (data.systemNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.system.enabled',
        value: data.systemNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (data.securityNotifications !== undefined) {
      settingsToUpdate.push({
        key: 'notifications.security.enabled',
        value: data.securityNotifications.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.NOTIFICATION,
      });
    }

    if (settingsToUpdate.length > 0) {
      await this.bulkUpdate(companyId, userId, { settings: settingsToUpdate });
    }

    return {
      success: true,
      message: 'Notification settings updated successfully',
    };
  }

  async getSecuritySettings(companyId: string) {
    const settings = await this.prisma.setting.findMany({
      where: {
        companyId,
        category: SettingCategory.SECURITY,
      },
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = this.parseSettingValue(setting.value, setting.type);
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: settingsMap,
    };
  }

  async updateSecuritySettings(companyId: string, userId: string, data: SecuritySettingsDto) {
    const settingsToUpdate = [];

    if (data.sessionTimeout !== undefined) {
      settingsToUpdate.push({
        key: 'security.sessionTimeout',
        value: data.sessionTimeout.toString(),
        type: SettingType.NUMBER,
        category: SettingCategory.SECURITY,
      });
    }

    if (data.passwordExpiry !== undefined) {
      settingsToUpdate.push({
        key: 'security.passwordExpiry',
        value: data.passwordExpiry.toString(),
        type: SettingType.NUMBER,
        category: SettingCategory.SECURITY,
      });
    }

    if (data.twoFactorAuth !== undefined) {
      settingsToUpdate.push({
        key: 'security.twoFactorAuth',
        value: data.twoFactorAuth.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.SECURITY,
      });
    }

    if (data.loginAttemptLimit !== undefined) {
      settingsToUpdate.push({
        key: 'security.loginAttemptLimit',
        value: data.loginAttemptLimit.toString(),
        type: SettingType.NUMBER,
        category: SettingCategory.SECURITY,
      });
    }

    if (data.lockoutDuration !== undefined) {
      settingsToUpdate.push({
        key: 'security.lockoutDuration',
        value: data.lockoutDuration.toString(),
        type: SettingType.NUMBER,
        category: SettingCategory.SECURITY,
      });
    }

    if (data.strongPasswords !== undefined) {
      settingsToUpdate.push({
        key: 'security.strongPasswords',
        value: data.strongPasswords.toString(),
        type: SettingType.BOOLEAN,
        category: SettingCategory.SECURITY,
      });
    }

    if (settingsToUpdate.length > 0) {
      await this.bulkUpdate(companyId, userId, { settings: settingsToUpdate });
    }

    return {
      success: true,
      message: 'Security settings updated successfully',
    };
  }

  async getAllSettings(companyId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { companyId },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    const groupedSettings = settings.reduce((acc, setting) => {
      const category = setting.category || 'OTHER';
      if (!acc[category]) {
        acc[category] = {};
      }
      acc[category][setting.key] = {
        value: this.parseSettingValue(setting.value, setting.type),
        type: setting.type,
        description: setting.description,
        isPublic: setting.isPublic,
        metadata: setting.metadata,
        updatedAt: setting.updatedAt,
      };
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: groupedSettings,
    };
  }

  private parseSettingValue(value: string, type: string): any {
    switch (type) {
      case SettingType.BOOLEAN:
        return value === 'true';
      case SettingType.NUMBER:
        return parseFloat(value);
      case SettingType.JSON:
      case SettingType.ARRAY:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}
