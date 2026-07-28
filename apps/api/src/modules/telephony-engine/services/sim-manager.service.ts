import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SIMManagerService {
  private readonly logger = new Logger(SIMManagerService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  async registerSIM(params: any) { return null; }
  async selectBestSIM(companyId: string, gatewayId?: string) { return null; }
  async markSIMBusy(simId: string, callId: string) { return; }
  async markSIMAvailable(simId: string, callId: string, success: boolean) { return; }
  async logSIMCall(params: any) { return; }
  async getSIMsForGateway(gatewayId: string) { return []; }
  async getAvailableSIMs(companyId: string) { return []; }
  async updateSignalStrength(simId: string, signal: number) { return; }
  async updateBalance(simId: string, balance: number) { return; }
  async resetDailyCounters() { return; }
  async resetWeeklyCounters() { return; }
  async resetMonthlyCounters() { return; }
  async getSIMStatistics(simId: string, days: number) { return null; }
  async updateSIM(simId: string, updates: any) { return null; }
  async deleteSIM(simId: string) { return null; }
}
