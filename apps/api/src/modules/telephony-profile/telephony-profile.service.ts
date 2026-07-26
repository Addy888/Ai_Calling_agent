import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTelephonyProfileDto, UpdateTelephonyProfileDto, TelephonyProfileFilterDto } from './dto/telephony-profile.dto';
import { Prisma, TelephonyProvider } from '@prisma/client';

@Injectable()
export class TelephonyProfileService {
  private readonly logger = new Logger(TelephonyProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new telephony profile
   */
  async create(companyId: string, userId: string, data: CreateTelephonyProfileDto) {
    this.logger.log(`Creating telephony profile: ${data.name} for company: ${companyId}`);

    // Validate gateway and SIM if GSM Gateway provider
    if (data.provider === TelephonyProvider.GSM_GATEWAY) {
      if (!data.gatewayId || !data.simId) {
        throw new BadRequestException('Gateway ID and SIM ID are required for GSM Gateway provider');
      }

      // Verify gateway exists and is active
      const gateway = await this.prisma.gSMGateway.findFirst({
        where: {
          id: data.gatewayId,
          companyId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (!gateway) {
        throw new NotFoundException('Active GSM Gateway not found');
      }

      // Verify SIM exists, is active, and belongs to the gateway
      const sim = await this.prisma.sIMCard.findFirst({
        where: {
          id: data.simId,
          gatewayId: data.gatewayId,
          companyId,
          isActive: true,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (!sim) {
        throw new NotFoundException('Active SIM card not found for this gateway');
      }

      // Verify caller number matches SIM number
      if (sim.simNumber !== data.callerNumber) {
        throw new BadRequestException(`Caller number must match SIM number: ${sim.simNumber}`);
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.telephonyProfile.updateMany({
        where: {
          companyId,
          isDefault: true,
          deletedAt: null,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const profile = await this.prisma.telephonyProfile.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        provider: data.provider,
        gatewayId: data.gatewayId,
        simId: data.simId,
        callerNumber: data.callerNumber,
        isDefault: data.isDefault || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        config: data.config || {},
        metadata: data.metadata || {},
        createdBy: userId,
      },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    this.logger.log(`Telephony profile created: ${profile.id}`);
    return profile;
  }

  /**
   * Get all telephony profiles for a company
   */
  async findAll(companyId: string, filters?: TelephonyProfileFilterDto) {
    const where: Prisma.TelephonyProfileWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    if (filters?.gatewayId) {
      where.gatewayId = filters.gatewayId;
    }

    const profiles = await this.prisma.telephonyProfile.findMany({
      where,
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Enrich with gateway and SIM details
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        let gatewayDetails = null;
        let simDetails = null;

        if (profile.provider === TelephonyProvider.GSM_GATEWAY && profile.gatewayId) {
          const gateway = await this.prisma.gSMGateway.findUnique({
            where: { id: profile.gatewayId },
            select: {
              id: true,
              name: true,
              ipAddress: true,
              port: true,
              model: true,
              status: true,
              isOnline: true,
              activePorts: true,
              totalPorts: true,
            },
          });
          gatewayDetails = gateway;

          if (profile.simId) {
            const sim = await this.prisma.sIMCard.findUnique({
              where: { id: profile.simId },
              select: {
                id: true,
                simNumber: true,
                operator: true,
                portNumber: true,
                status: true,
                signal: true,
                callsToday: true,
                dailyLimit: true,
                isActive: true,
                isPreferred: true,
              },
            });
            simDetails = sim;
          }
        }

        return {
          ...profile,
          gateway: gatewayDetails,
          sim: simDetails,
        };
      })
    );

    return {
      items: enrichedProfiles,
      total: enrichedProfiles.length,
    };
  }

  /**
   * Get a single telephony profile
   */
  async findOne(id: string, companyId: string) {
    const profile = await this.prisma.telephonyProfile.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Telephony profile not found');
    }

    // Enrich with gateway and SIM details
    let gatewayDetails = null;
    let simDetails = null;

    if (profile.provider === TelephonyProvider.GSM_GATEWAY && profile.gatewayId) {
      gatewayDetails = await this.prisma.gSMGateway.findUnique({
        where: { id: profile.gatewayId },
      });

      if (profile.simId) {
        simDetails = await this.prisma.sIMCard.findUnique({
          where: { id: profile.simId },
        });
      }
    }

    return {
      ...profile,
      gateway: gatewayDetails,
      sim: simDetails,
    };
  }

  /**
   * Update a telephony profile
   */
  async update(id: string, companyId: string, userId: string, data: UpdateTelephonyProfileDto) {
    const existing = await this.prisma.telephonyProfile.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Telephony profile not found');
    }

    // Validate changes if updating gateway/SIM
    if (data.provider === TelephonyProvider.GSM_GATEWAY || existing.provider === TelephonyProvider.GSM_GATEWAY) {
      const gatewayId = data.gatewayId || existing.gatewayId;
      const simId = data.simId || existing.simId;

      if (gatewayId && simId) {
        const sim = await this.prisma.sIMCard.findFirst({
          where: {
            id: simId,
            gatewayId: gatewayId,
            companyId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!sim) {
          throw new NotFoundException('SIM card not found for this gateway');
        }

        // If updating caller number, verify it matches SIM
        const callerNumber = data.callerNumber || existing.callerNumber;
        if (callerNumber && sim.simNumber !== callerNumber) {
          throw new BadRequestException(`Caller number must match SIM number: ${sim.simNumber}`);
        }
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.telephonyProfile.updateMany({
        where: {
          companyId,
          isDefault: true,
          id: { not: id },
          deletedAt: null,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await this.prisma.telephonyProfile.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    this.logger.log(`Telephony profile updated: ${id}`);
    return updated;
  }

  /**
   * Delete a telephony profile (soft delete)
   */
  async delete(id: string, companyId: string) {
    const existing = await this.prisma.telephonyProfile.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        campaigns: {
          where: {
            status: {
              in: ['ACTIVE', 'SCHEDULED'],
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Telephony profile not found');
    }

    if (existing.campaigns.length > 0) {
      throw new ConflictException(
        `Cannot delete telephony profile. It is being used by ${existing.campaigns.length} active campaign(s)`
      );
    }

    await this.prisma.telephonyProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Telephony profile deleted: ${id}`);
    return { message: 'Telephony profile deleted successfully' };
  }

  /**
   * Get default telephony profile
   */
  async getDefault(companyId: string) {
    const profile = await this.prisma.telephonyProfile.findFirst({
      where: {
        companyId,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('No default telephony profile found');
    }

    return profile;
  }

  /**
   * Get available GSM gateways for a company
   */
  async getAvailableGateways(companyId: string) {
    const gateways = await this.prisma.gSMGateway.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        sims: {
          where: {
            isActive: true,
            status: 'ACTIVE',
            deletedAt: null,
          },
          orderBy: [
            { isPreferred: 'desc' },
            { priority: 'desc' },
            { callsToday: 'asc' },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return gateways;
  }
}
