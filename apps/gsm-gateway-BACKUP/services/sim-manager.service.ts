/**
 * SIM Manager Service
 * Handles SIM card selection, availability checking, and usage tracking
 * 
 * Key Features:
 * - Intelligent SIM selection algorithm
 * - Load balancing across SIMs
 * - Usage limit enforcement
 * - Signal strength prioritization
 * - Operator matching for cost optimization
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SIMManagerService {
  private readonly logger = new Logger(SIMManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get optimal SIM for outbound call
   * Selection criteria:
   * 1. Status must be AVAILABLE
   * 2. Not exceeding daily/monthly limits
   * 3. Good signal strength (>= 50%)
   * 4. Prefer same operator as destination (if known)
   * 5. Load balance by current usage
   */
  async getOptimalSIM(companyId: string, preferredOperator?: string): Promise<any> {
    this.logger.log(`Finding optimal SIM for company: ${companyId}`);

    try {
      // Get all AVAILABLE SIMs for company
      const availableSIMs = await this.prisma.sIMCard.findMany({
        where: {
          companyId,
          status: 'AVAILABLE',
          isActive: true,
          gateway: {
            status: 'ONLINE',
          },
        },
        include: {
          gateway: true,
        },
      });

      if (availableSIMs.length === 0) {
        throw new Error('No active SIMs available');
      }

      this.logger.log(`Found ${availableSIMs.length} active SIMs`);

      // Filter by limits
      const simsWithinLimits = availableSIMs.filter((sim) => {
        const dailyAvailable = sim.dailyUsage < sim.dailyLimit;
        const monthlyAvailable = sim.monthlyUsage < sim.monthlyLimit;
        const goodSignal = !sim.signalStrength || sim.signalStrength >= 50;

        return dailyAvailable && monthlyAvailable && goodSignal;
      });

      if (simsWithinLimits.length === 0) {
        this.logger.warn('No SIMs within limits, using any available SIM');
        // Fallback: use SIM with lowest usage
        const sortedByUsage = [...availableSIMs].sort((a, b) => a.dailyUsage - b.dailyUsage);
        return sortedByUsage[0];
      }

      // Score each SIM
      const scoredSIMs = simsWithinLimits.map((sim) => {
        let score = 0;

        // Signal strength (0-40 points)
        if (sim.signalStrength) {
          score += (sim.signalStrength / 100) * 40;
        } else {
          score += 30; // Default if signal unknown
        }

        // Operator matching (20 points)
        if (preferredOperator && sim.operator === preferredOperator) {
          score += 20;
        }

        // Load balancing - prefer less used SIMs (0-40 points)
        const usageRatio = sim.dailyUsage / sim.dailyLimit;
        score += (1 - usageRatio) * 40;

        return { sim, score };
      });

      // Sort by score (highest first)
      scoredSIMs.sort((a, b) => b.score - a.score);

      const selectedSIM = scoredSIMs[0].sim;

      this.logger.log(`Selected SIM: ${selectedSIM.simNumber} (${selectedSIM.operator}) - Score: ${scoredSIMs[0].score.toFixed(2)}`);
      this.logger.log(`  Signal: ${selectedSIM.signalStrength}%, Usage: ${selectedSIM.dailyUsage}/${selectedSIM.dailyLimit}`);

      // Mark as recently used (don't update database yet, will be updated when call starts)
      return selectedSIM;
    } catch (error) {
      this.logger.error(`Failed to get optimal SIM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark SIM as in use (call started)
   */
  async markSIMInUse(simId: string, callId: string, phoneNumber: string): Promise<void> {
    this.logger.log(`Marking SIM ${simId} as in use for call ${callId}`);

    try {
      await this.prisma.$transaction([
        // Update SIM status
        this.prisma.sIMCard.update({
          where: { id: simId },
          data: {
            status: 'IN_USE',
            lastUsedAt: new Date(),
            dailyUsage: { increment: 1 },
            monthlyUsage: { increment: 1 },
            totalCalls: { increment: 1 },
          },
        }),

        // Create call log
        this.prisma.sIMCallLog.create({
          data: {
            simId,
            callSid: callId,
            phoneNumber,
            direction: 'OUTBOUND',
            status: 'DIALING',
            startTime: new Date(),
          },
        }),
      ]);

      this.logger.log(`✅ SIM ${simId} marked as in use`);
    } catch (error) {
      this.logger.error(`Failed to mark SIM as in use: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark SIM as available (call ended)
   */
  async markSIMAvailable(simId: string, callId: string, success: boolean, duration?: number): Promise<void> {
    this.logger.log(`Marking SIM ${simId} as available (call ${callId} ended)`);

    try {
      await this.prisma.$transaction([
        // Update SIM status back to AVAILABLE
        this.prisma.sIMCard.update({
          where: { id: simId },
          data: {
            status: 'AVAILABLE',
            successfulCalls: success ? { increment: 1 } : undefined,
            failedCalls: !success ? { increment: 1 } : undefined,
          },
        }),

        // Update call log
        this.prisma.sIMCallLog.updateMany({
          where: {
            simId,
            callSid: callId,
          },
          data: {
            status: success ? 'COMPLETED' : 'FAILED',
            duration: duration || 0,
            endTime: new Date(),
          },
        }),
      ]);

      this.logger.log(`✅ SIM ${simId} marked as available`);
    } catch (error) {
      this.logger.error(`Failed to mark SIM as available: ${error.message}`);
      // Don't throw - this is cleanup, shouldn't break call flow
    }
  }

  /**
   * Get SIM by ID
   */
  async getSIM(simId: string): Promise<any> {
    return this.prisma.sIMCard.findUnique({
      where: { id: simId },
      include: {
        gateway: true,
      },
    });
  }

  /**
   * Get SIM by number
   */
  async getSIMByNumber(companyId: string, simNumber: string): Promise<any> {
    return this.prisma.sIMCard.findFirst({
      where: {
        companyId,
        simNumber,
      },
      include: {
        gateway: true,
      },
    });
  }

  /**
   * Get all SIMs for company
   */
  async getAllSIMs(companyId: string): Promise<any[]> {
    return this.prisma.sIMCard.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        gateway: true,
      },
      orderBy: [
        { simNumber: 'asc' },
      ],
    });
  }

  /**
   * Get SIM statistics
   */
  async getSIMStats(simId: string): Promise<any> {
    const sim = await this.prisma.sIMCard.findUnique({
      where: { id: simId },
    });

    if (!sim) {
      throw new Error(`SIM ${simId} not found`);
    }

    // Get usage stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await this.prisma.sIMCallLog.aggregate({
      where: {
        simId,
        createdAt: {
          gte: today,
        },
      },
      _count: true,
      _sum: {
        duration: true,
      },
    });

    // Get total stats
    const totalStats = await this.prisma.sIMCallLog.aggregate({
      where: { simId },
      _count: true,
      _sum: {
        duration: true,
      },
    });

    return {
      sim,
      today: {
        calls: todayStats._count,
        duration: todayStats._sum.duration || 0,
      },
      total: {
        calls: totalStats._count,
        duration: totalStats._sum.duration || 0,
      },
      availability: {
        dailyRemaining: sim.dailyLimit - sim.dailyUsage,
        monthlyRemaining: sim.monthlyLimit - sim.monthlyUsage,
      },
    };
  }

  /**
   * Reset daily counters (should be run at midnight)
   */
  async resetDailyCounters(): Promise<void> {
    this.logger.log('Resetting daily SIM counters...');

    const result = await this.prisma.sIMCard.updateMany({
      where: {
        isActive: true,
      },
      data: {
        dailyUsage: 0,
      },
    });

    this.logger.log(`✅ Reset daily counters for ${result.count} SIMs`);
  }

  /**
   * Reset monthly counters (should be run on 1st of month)
   */
  async resetMonthlyCounters(): Promise<void> {
    this.logger.log('Resetting monthly SIM counters...');

    const result = await this.prisma.sIMCard.updateMany({
      where: {
        isActive: true,
      },
      data: {
        monthlyUsage: 0,
      },
    });

    this.logger.log(`✅ Reset monthly counters for ${result.count} SIMs`);
  }

  /**
   * Check if SIM limit exceeded
   */
  async checkLimitExceeded(simId: string): Promise<boolean> {
    const sim = await this.getSIM(simId);

    if (!sim) {
      return true; // Treat as exceeded if SIM not found
    }

    const dailyExceeded = sim.dailyUsage >= sim.dailyLimit;
    const monthlyExceeded = sim.monthlyUsage >= sim.monthlyLimit;

    if (dailyExceeded || monthlyExceeded) {
      // Update status if limit exceeded
      await this.prisma.sIMCard.update({
        where: { id: simId },
        data: { status: 'LIMIT_EXCEEDED' },
      });

      return true;
    }

    return false;
  }

  /**
   * Get SIM usage summary for company
   */
  async getCompanyUsageSummary(companyId: string): Promise<any> {
    const sims = await this.getAllSIMs(companyId);

    const summary = {
      totalSIMs: sims.length,
      availableSIMs: sims.filter(s => s.status === 'AVAILABLE').length,
      inUseSIMs: sims.filter(s => s.status === 'IN_USE').length,
      inactiveSIMs: sims.filter(s => s.status !== 'AVAILABLE' && s.status !== 'IN_USE').length,
      totalCallsToday: sims.reduce((sum, s) => sum + s.dailyUsage, 0),
      totalCallsThisMonth: sims.reduce((sum, s) => sum + s.monthlyUsage, 0),
      averageSignal: sims.filter(s => s.signalStrength).reduce((sum, s) => sum + s.signalStrength, 0) / sims.filter(s => s.signalStrength).length || 0,
      sims: sims.map(s => ({
        id: s.id,
        simNumber: s.simNumber,
        operator: s.operator,
        status: s.status,
        signal: s.signalStrength,
        callsToday: s.dailyUsage,
        dailyLimit: s.dailyLimit,
        usagePercent: (s.dailyUsage / s.dailyLimit) * 100,
      })),
    };

    return summary;
  }
}
