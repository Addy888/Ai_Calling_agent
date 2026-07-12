import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateFollowUpDto, UpdateFollowUpDto, CancelFollowUpDto, FollowUpStatus } from '../dto/conversation-followup.dto';

@Injectable()
export class FollowUpManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFollowUpDto) {
    return this.prisma.conversationFollowUp.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        followUpType: dto.followUpType,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        reason: dto.reason,
        notes: dto.notes,
        status: FollowUpStatus.SCHEDULED,
      },
    });
  }

  async update(id: string, dto: UpdateFollowUpDto) {
    const followUp = await this.prisma.conversationFollowUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return this.prisma.conversationFollowUp.update({
      where: { id },
      data: {
        status: dto.status,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledTime: dto.scheduledTime,
        reason: dto.reason,
        notes: dto.notes,
      },
    });
  }

  async cancel(id: string, dto: CancelFollowUpDto) {
    return this.prisma.conversationFollowUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
      },
    });
  }

  async complete(id: string) {
    return this.prisma.conversationFollowUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markReminderSent(id: string) {
    return this.prisma.conversationFollowUp.update({
      where: { id },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
        status: FollowUpStatus.REMINDED,
      },
    });
  }

  async findById(id: string) {
    const followUp = await this.prisma.conversationFollowUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return followUp;
  }

  async findBySession(sessionId: string) {
    return this.prisma.conversationFollowUp.findMany({
      where: { sessionId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findByCompany(companyId: string, status?: FollowUpStatus) {
    const where: any = { companyId };
    if (status) where.status = status;

    return this.prisma.conversationFollowUp.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findUpcoming(companyId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.conversationFollowUp.findMany({
      where: {
        companyId,
        status: FollowUpStatus.SCHEDULED,
        scheduledDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findOverdue(companyId: string) {
    const now = new Date();

    return this.prisma.conversationFollowUp.findMany({
      where: {
        companyId,
        status: FollowUpStatus.SCHEDULED,
        scheduledDate: {
          lt: now,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getFollowUpStats(companyId: string) {
    const [total, scheduled, reminded, completed, cancelled, overdue] = await Promise.all([
      this.prisma.conversationFollowUp.count({ where: { companyId } }),
      this.prisma.conversationFollowUp.count({ where: { companyId, status: FollowUpStatus.SCHEDULED } }),
      this.prisma.conversationFollowUp.count({ where: { companyId, status: FollowUpStatus.REMINDED } }),
      this.prisma.conversationFollowUp.count({ where: { companyId, status: FollowUpStatus.COMPLETED } }),
      this.prisma.conversationFollowUp.count({ where: { companyId, status: FollowUpStatus.CANCELLED } }),
      this.prisma.conversationFollowUp.count({
        where: {
          companyId,
          status: FollowUpStatus.SCHEDULED,
          scheduledDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      scheduled,
      reminded,
      completed,
      cancelled,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }
}
