import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CampaignContactFilterDto } from './dto/campaign-contact.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CampaignContactsService {
  private readonly logger = new Logger(CampaignContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all contacts for a campaign
   */
  async findAll(campaignId: string, companyId: string, filters?: CampaignContactFilterDto) {
    const where: Prisma.CampaignContactWhereInput = {
      campaignId,
      companyId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.uploadId) {
      where.uploadId = filters.uploadId;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { fullName: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.campaignContact.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      this.prisma.campaignContact.count({ where }),
    ]);

    return {
      items: contacts,
      total,
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get a single campaign contact
   */
  async findOne(id: string, campaignId: string, companyId: string) {
    const contact = await this.prisma.campaignContact.findFirst({
      where: {
        id,
        campaignId,
        companyId,
      },
      include: {
        upload: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Campaign contact not found');
    }

    return contact;
  }

  /**
   * Get campaign contact statistics
   */
  async getStatistics(campaignId: string, companyId: string) {
    const [
      total,
      pending,
      queued,
      calling,
      connected,
      completed,
      failed,
      busy,
      noAnswer,
      invalidNumber,
    ] = await Promise.all([
      this.prisma.campaignContact.count({
        where: { campaignId, companyId },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'PENDING' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'QUEUED' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'CALLING' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'CONNECTED' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'COMPLETED' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'FAILED' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'BUSY' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'NO_ANSWER' },
      }),
      this.prisma.campaignContact.count({
        where: { campaignId, companyId, status: 'INVALID_NUMBER' },
      }),
    ]);

    return {
      total,
      pending,
      queued,
      calling,
      connected,
      completed,
      failed,
      busy,
      noAnswer,
      invalidNumber,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
    };
  }

  /**
   * Delete a campaign contact
   */
  async delete(id: string, campaignId: string, companyId: string) {
    const contact = await this.prisma.campaignContact.findFirst({
      where: {
        id,
        campaignId,
        companyId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Campaign contact not found');
    }

    // Only allow deletion if not yet called
    if (contact.status !== 'PENDING' && contact.status !== 'QUEUED') {
      throw new Error('Cannot delete contact that has been called');
    }

    await this.prisma.campaignContact.delete({
      where: { id },
    });

    this.logger.log(`Campaign contact deleted: ${id}`);
    return { message: 'Contact deleted successfully' };
  }

  /**
   * Bulk delete campaign contacts
   */
  async bulkDelete(contactIds: string[], campaignId: string, companyId: string) {
    const deleted = await this.prisma.campaignContact.deleteMany({
      where: {
        id: { in: contactIds },
        campaignId,
        companyId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
    });

    this.logger.log(`Bulk deleted ${deleted.count} campaign contacts`);
    return {
      deleted: deleted.count,
      message: `${deleted.count} contacts deleted successfully`,
    };
  }
}
