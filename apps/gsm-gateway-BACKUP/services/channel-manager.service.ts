import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SIMCard } from '@prisma/client';

/**
 * Channel Manager Service
 * Maps SIM Cards to Asterisk channels
 */
@Injectable()
export class ChannelManagerService {
  private readonly logger = new Logger(ChannelManagerService.name);

  // Channel format: PJSIP/gsm-{port} or DAHDI/{port} or Dongle/dongle{port}
  private channelPrefix = 'PJSIP/gsm';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Asterisk channel name for a SIM Card
   */
  getChannelForSIM(simCard: SIMCard): string {
    // Format: PJSIP/gsm-1, PJSIP/gsm-2, etc.
    const channel = `${this.channelPrefix}-${simCard.portNumber}`;
    this.logger.debug(`Mapped SIM ${simCard.simNumber} → ${channel}`);
    return channel;
  }

  /**
   * Get SIM Card from channel name
   */
  async getSIMFromChannel(channelName: string, gatewayId: string): Promise<SIMCard | null> {
    // Extract port number from channel name
    // Example: "PJSIP/gsm-1" → 1
    const portMatch = channelName.match(/gsm-(\d+)/);
    
    if (!portMatch) {
      this.logger.warn(`Could not extract port number from channel: ${channelName}`);
      return null;
    }

    const portNumber = parseInt(portMatch[1], 10);

    const simCard = await this.prisma.sIMCard.findFirst({
      where: {
        gatewayId,
        portNumber,
        isActive: true,
      },
    });

    if (!simCard) {
      this.logger.warn(`No SIM found for channel ${channelName} (port ${portNumber})`);
    }

    return simCard;
  }

  /**
   * Get channel availability for a gateway
   */
  async getAvailableChannels(gatewayId: string): Promise<string[]> {
    const availableSIMs = await this.prisma.sIMCard.findMany({
      where: {
        gatewayId,
        status: 'AVAILABLE',
        isActive: true,
      },
      orderBy: {
        portNumber: 'asc',
      },
    });

    return availableSIMs.map(sim => this.getChannelForSIM(sim));
  }

  /**
   * Validate channel format
   */
  isValidChannel(channelName: string): boolean {
    // Support multiple channel formats
    const validFormats = [
      /^PJSIP\/gsm-\d+$/,  // PJSIP/gsm-1
      /^DAHDI\/\d+$/,       // DAHDI/1
      /^Dongle\/dongle\d+$/, // Dongle/dongle1
    ];

    return validFormats.some(format => format.test(channelName));
  }

  /**
   * Get channel technology (PJSIP, DAHDI, Dongle)
   */
  getChannelTechnology(channelName: string): string {
    const match = channelName.match(/^([A-Z]+)\//);
    return match ? match[1] : 'UNKNOWN';
  }

  /**
   * Build channel with caller ID
   */
  buildChannel(simCard: SIMCard, callerId: string): string {
    const baseChannel = this.getChannelForSIM(simCard);
    // Format: PJSIP/gsm-1/9876543210
    return `${baseChannel}/${callerId}`;
  }

  /**
   * Parse channel string into components
   */
  parseChannel(channelName: string): {
    technology: string;
    device: string;
    port?: number;
    destination?: string;
  } | null {
    // Parse: "PJSIP/gsm-1/9876543210"
    const parts = channelName.split('/');
    
    if (parts.length < 2) {
      return null;
    }

    const technology = parts[0];
    const device = parts[1];
    const destination = parts[2];

    // Extract port number if available
    const portMatch = device.match(/(\d+)/);
    const port = portMatch ? parseInt(portMatch[1], 10) : undefined;

    return {
      technology,
      device,
      port,
      destination,
    };
  }

  /**
   * Get all channels for a gateway with status
   */
  async getGatewayChannelStatus(gatewayId: string): Promise<
    {
      channel: string;
      simId: string;
      simNumber: string;
      status: string;
      portNumber: number;
      available: boolean;
    }[]
  > {
    const simCards = await this.prisma.sIMCard.findMany({
      where: {
        gatewayId,
        isActive: true,
      },
      orderBy: {
        portNumber: 'asc',
      },
    });

    return simCards.map(sim => ({
      channel: this.getChannelForSIM(sim),
      simId: sim.id,
      simNumber: sim.simNumber,
      status: sim.status,
      portNumber: sim.portNumber,
      available: sim.status === 'AVAILABLE',
    }));
  }

  /**
   * Set channel prefix (for configuration)
   */
  setChannelPrefix(prefix: string): void {
    this.logger.log(`Channel prefix changed from ${this.channelPrefix} to ${prefix}`);
    this.channelPrefix = prefix;
  }

  /**
   * Get channel prefix
   */
  getChannelPrefix(): string {
    return this.channelPrefix;
  }
}
