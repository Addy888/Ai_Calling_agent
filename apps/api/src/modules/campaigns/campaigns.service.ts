import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CreateCampaignDto, UpdateCampaignDto, CampaignFilterDto, UpdateCampaignStatusDto, AssignContactsDto, AssignScriptDto, AssignPromptDto } from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, data: CreateCampaignDto) {
    // Validate script if provided
    if (data.scriptId) {
      const script = await this.prisma.script.findFirst({
        where: { id: data.scriptId, companyId, deletedAt: null, isActive: true },
      });
      if (!script) {
        throw new BadRequestException('Invalid script selected');
      }
    }

    // Validate prompt if provided
    if (data.promptId) {
      const prompt = await this.prisma.prompt.findFirst({
        where: { id: data.promptId, companyId, deletedAt: null, status: 'ACTIVE' },
      });
      if (!prompt) {
        throw new BadRequestException('Invalid prompt selected');
      }
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        scriptId: data.scriptId,
        promptId: data.promptId,
        voiceId: data.voiceId,
        settings: data.settings,
        companyId,
        userId,
        createdBy: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        script: { select: { id: true, name: true, version: true } },
        prompt: { select: { id: true, name: true, version: true } },
        _count: { select: { contacts: true, calls: true } },
      },
    });

    return {
      success: true,
      data: campaign,
      message: 'Campaign created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: CampaignFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    const search = filters.search || filters.filters?.search;
    const status = filters.status || filters.filters?.status;
    const userId = filters.userId || filters.filters?.userId;
    const scriptId = filters.scriptId || filters.filters?.scriptId;
    const promptId = filters.promptId || filters.filters?.promptId;
    const startDateFrom = filters.startDateFrom || filters.filters?.startDateFrom;
    const startDateTo = filters.startDateTo || filters.filters?.startDateTo;
    const createdAfter = filters.createdAfter || filters.filters?.createdAfter;
    const createdBefore = filters.createdBefore || filters.filters?.createdBefore;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (userId) {
      where.userId = userId;
    }

    if (scriptId) {
      where.scriptId = scriptId;
    }

    if (promptId) {
      where.promptId = promptId;
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = new Date(createdAfter);
      if (createdBefore) where.createdAt.lte = new Date(createdBefore);
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          script: { select: { id: true, name: true, version: true } },
          prompt: { select: { id: true, name: true, version: true } },
          _count: { select: { contacts: true, calls: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(campaigns, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        script: { select: { id: true, name: true, version: true, content: true, language: true } },
        prompt: { select: { id: true, name: true, version: true, content: true } },
        contacts: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            status: true,
            lastCalledAt: true,
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { contacts: true, calls: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Calculate statistics
    const statistics = await this.getCampaignStatistics(id);

    return {
      success: true,
      data: { ...campaign, statistics },
    };
  }

  async update(id: string, companyId: string, userId: string, data: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Validate status transitions
    if (data.status && campaign.status !== data.status) {
      this.validateStatusTransition(campaign.status, data.status);
    }

    // Validate script if provided
    if (data.scriptId) {
      const script = await this.prisma.script.findFirst({
        where: { id: data.scriptId, companyId, deletedAt: null, isActive: true },
      });
      if (!script) {
        throw new BadRequestException('Invalid script selected');
      }
    }

    // Validate prompt if provided
    if (data.promptId) {
      const prompt = await this.prisma.prompt.findFirst({
        where: { id: data.promptId, companyId, deletedAt: null, status: 'ACTIVE' },
      });
      if (!prompt) {
        throw new BadRequestException('Invalid prompt selected');
      }
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        scriptId: data.scriptId,
        promptId: data.promptId,
        voiceId: data.voiceId,
        settings: data.settings,
        updatedBy: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        script: { select: { id: true, name: true, version: true } },
        prompt: { select: { id: true, name: true, version: true } },
        _count: { select: { contacts: true, calls: true } },
      },
    });

    return {
      success: true,
      data: updatedCampaign,
      message: 'Campaign updated successfully',
    };
  }

  async updateStatus(id: string, companyId: string, userId: string, data: UpdateCampaignStatusDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    this.validateStatusTransition(campaign.status, data.status);

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: data.status,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: updatedCampaign,
      message: 'Campaign status updated successfully',
    };
  }

  async clone(id: string, companyId: string, userId: string, name: string) {
    const originalCampaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!originalCampaign) {
      throw new NotFoundException('Campaign not found');
    }

    const clonedCampaign = await this.prisma.campaign.create({
      data: {
        name,
        description: `${originalCampaign.description} (Copy)`,
        companyId,
        userId,
        scriptId: originalCampaign.scriptId,
        promptId: originalCampaign.promptId,
        voiceId: originalCampaign.voiceId,
        timezone: originalCampaign.timezone,
        settings: originalCampaign.settings,
        status: 'DRAFT',
        createdBy: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        script: { select: { id: true, name: true, version: true } },
        prompt: { select: { id: true, name: true, version: true } },
        _count: { select: { contacts: true, calls: true } },
      },
    });

    return {
      success: true,
      data: clonedCampaign,
      message: 'Campaign cloned successfully',
    };
  }

  async archive(id: string, companyId: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (['RUNNING', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException('Cannot archive running or scheduled campaigns');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Campaign archived successfully',
    };
  }

  async restore(id: string, companyId: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!campaign.deletedAt) {
      throw new BadRequestException('Campaign is not archived');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'DRAFT',
        updatedBy: userId,
        deletedAt: null,
      },
    });

    return {
      success: true,
      message: 'Campaign restored successfully',
    };
  }

  async remove(id: string, companyId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { _count: { select: { calls: true } } },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign._count.calls > 0) {
      throw new ConflictException('Cannot delete campaign with call history. Archive instead.');
    }

    if (['RUNNING', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException('Cannot delete running or scheduled campaigns');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  async assignContacts(id: string, companyId: string, data: AssignContactsDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Validate contacts belong to the same company
    const contactsCount = await this.prisma.contact.count({
      where: {
        id: { in: data.contactIds },
        companyId,
        deletedAt: null,
      },
    });

    if (contactsCount !== data.contactIds.length) {
      throw new BadRequestException('Some contacts not found or invalid');
    }

    // Update contacts
    await this.prisma.contact.updateMany({
      where: { id: { in: data.contactIds } },
      data: { campaignId: id },
    });

    return {
      success: true,
      data: { assigned: data.contactIds.length },
      message: `${data.contactIds.length} contacts assigned to campaign`,
    };
  }

  async removeContacts(id: string, companyId: string, data: AssignContactsDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.contact.updateMany({
      where: {
        id: { in: data.contactIds },
        campaignId: id,
      },
      data: { campaignId: null },
    });

    return {
      success: true,
      data: { removed: data.contactIds.length },
      message: `${data.contactIds.length} contacts removed from campaign`,
    };
  }

  async assignScript(id: string, companyId: string, data: AssignScriptDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (data.scriptId) {
      const script = await this.prisma.script.findFirst({
        where: { id: data.scriptId, companyId, deletedAt: null, isActive: true },
      });
      if (!script) {
        throw new BadRequestException('Invalid script selected');
      }
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: { scriptId: data.scriptId },
      include: { script: { select: { id: true, name: true, version: true } } },
    });

    return {
      success: true,
      data: updatedCampaign,
      message: data.scriptId ? 'Script assigned to campaign' : 'Script removed from campaign',
    };
  }

  async assignPrompt(id: string, companyId: string, data: AssignPromptDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (data.promptId) {
      const prompt = await this.prisma.prompt.findFirst({
        where: { id: data.promptId, companyId, deletedAt: null, status: 'ACTIVE' },
      });
      if (!prompt) {
        throw new BadRequestException('Invalid prompt selected');
      }
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: { promptId: data.promptId },
      include: { prompt: { select: { id: true, name: true, version: true } } },
    });

    return {
      success: true,
      data: updatedCampaign,
      message: data.promptId ? 'Prompt assigned to campaign' : 'Prompt removed from campaign',
    };
  }

  async getCampaignStatistics(id: string) {
    const [contactsStats, callsStats] = await Promise.all([
      this.prisma.contact.groupBy({
        by: ['status'],
        where: { campaignId: id, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.call.groupBy({
        by: ['status'],
        where: { campaignId: id, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const totalContacts = contactsStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const totalCalls = callsStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return {
      contacts: {
        total: totalContacts,
        byStatus: contactsStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      calls: {
        total: totalCalls,
        byStatus: callsStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SCHEDULED', 'ACTIVE'],
      SCHEDULED: ['ACTIVE', 'CANCELLED', 'DRAFT'],
      ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
      PAUSED: ['ACTIVE', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: ['DRAFT'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Cannot change status from ${currentStatus} to ${newStatus}`);
    }
  }
}
