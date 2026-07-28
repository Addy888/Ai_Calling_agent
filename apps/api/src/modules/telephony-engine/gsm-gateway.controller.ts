/**
 * GSM Gateway Management Controller
 * Handles Gateway and SIM card registration and management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GatewayManagerService } from './services/gateway-manager.service';
import { SIMManagerService } from './services/sim-manager.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import {
  CreateGatewayDto,
  UpdateGatewayDto,
  GatewayResponseDto,
  GatewayStatisticsDto,
} from './dto/gateway.dto';
import {
  CreateSIMDto,
  UpdateSIMDto,
  SIMResponseDto,
  SIMStatisticsDto,
  UpdateSignalDto,
  UpdateBalanceDto,
} from './dto/sim.dto';

@ApiTags('GSM Gateway Management')
@Controller('api/v1/gsm-gateway')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GSMGatewayController {
  private readonly logger = new Logger(GSMGatewayController.name);

  constructor(
    private readonly gatewayManager: GatewayManagerService,
    private readonly simManager: SIMManagerService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  // ========================================================================
  // Gateway Management
  // ========================================================================

  @Post('gateways')
  @ApiOperation({ summary: 'Register a new GSM Gateway' })
  @ApiResponse({ status: 201, description: 'Gateway registered successfully', type: GatewayResponseDto })
  async registerGateway(
    @Body() dto: CreateGatewayDto,
    @CurrentUser() user: any,
  ): Promise<GatewayResponseDto> {
    this.logger.log(`Registering new gateway: ${dto.name}`);
    return await this.gatewayManager.registerGateway(dto);
  }

  @Get('gateways')
  @ApiOperation({ summary: 'Get all gateways for company' })
  @ApiResponse({ status: 200, description: 'List of gateways', type: [GatewayResponseDto] })
  async getGateways(
    @Query('companyId') companyId: string,
  ): Promise<GatewayResponseDto[]> {
    return await this.gatewayManager.getAvailableGateways(companyId);
  }

  @Get('gateways/:id')
  @ApiOperation({ summary: 'Get gateway by ID' })
  @ApiResponse({ status: 200, description: 'Gateway details', type: GatewayResponseDto })
  async getGateway(@Param('id') id: string): Promise<GatewayResponseDto> {
    return await this.gatewayManager.getGateway(id);
  }

  @Put('gateways/:id')
  @ApiOperation({ summary: 'Update gateway configuration' })
  @ApiResponse({ status: 200, description: 'Gateway updated successfully', type: GatewayResponseDto })
  async updateGateway(
    @Param('id') id: string,
    @Body() dto: UpdateGatewayDto,
  ): Promise<GatewayResponseDto> {
    this.logger.log(`Updating gateway: ${id}`);
    return await this.gatewayManager.updateGateway(id, dto);
  }

  @Delete('gateways/:id')
  @ApiOperation({ summary: 'Delete gateway' })
  @ApiResponse({ status: 200, description: 'Gateway deleted successfully' })
  async deleteGateway(@Param('id') id: string): Promise<GatewayResponseDto> {
    this.logger.log(`Deleting gateway: ${id}`);
    return await this.gatewayManager.deleteGateway(id);
  }

  @Get('gateways/:id/statistics')
  @ApiOperation({ summary: 'Get gateway statistics' })
  @ApiResponse({ status: 200, description: 'Gateway statistics', type: GatewayStatisticsDto })
  async getGatewayStatistics(
    @Param('id') id: string,
    @Query('days') days?: number,
  ): Promise<GatewayStatisticsDto> {
    return await this.gatewayManager.getGatewayStatistics(id, days || 7);
  }

  @Post('gateways/:id/online')
  @ApiOperation({ summary: 'Mark gateway as online' })
  @ApiResponse({ status: 200, description: 'Gateway marked as online' })
  async markGatewayOnline(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.gatewayManager.markGatewayOnline(id);
    return { success: true };
  }

  @Post('gateways/:id/offline')
  @ApiOperation({ summary: 'Mark gateway as offline' })
  @ApiResponse({ status: 200, description: 'Gateway marked as offline' })
  async markGatewayOffline(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<{ success: boolean }> {
    await this.gatewayManager.markGatewayOffline(id, reason);
    return { success: true };
  }

  // ========================================================================
  // SIM Management
  // ========================================================================

  @Post('sims')
  @ApiOperation({ summary: 'Register a new SIM card' })
  @ApiResponse({ status: 201, description: 'SIM registered successfully', type: SIMResponseDto })
  async registerSIM(
    @Body() dto: CreateSIMDto,
    @CurrentUser() user: any,
  ): Promise<SIMResponseDto> {
    this.logger.log(`Registering new SIM: ${dto.simNumber}`);
    return await this.simManager.registerSIM(dto);
  }

  @Get('sims')
  @ApiOperation({ summary: 'Get all SIM cards' })
  @ApiResponse({ status: 200, description: 'List of SIM cards', type: [SIMResponseDto] })
  async getSIMs(
    @Query('companyId') companyId: string,
    @Query('gatewayId') gatewayId?: string,
  ): Promise<SIMResponseDto[]> {
    if (gatewayId) {
      return await this.simManager.getSIMsForGateway(gatewayId);
    }
    return await this.simManager.getAvailableSIMs(companyId);
  }

  @Get('sims/available')
  @ApiOperation({ summary: 'Get available SIM cards for calling' })
  @ApiResponse({ status: 200, description: 'List of available SIM cards', type: [SIMResponseDto] })
  async getAvailableSIMs(
    @Query('companyId') companyId: string,
  ): Promise<SIMResponseDto[]> {
    return await this.simManager.getAvailableSIMs(companyId);
  }

  @Put('sims/:id')
  @ApiOperation({ summary: 'Update SIM card configuration' })
  @ApiResponse({ status: 200, description: 'SIM updated successfully', type: SIMResponseDto })
  async updateSIM(
    @Param('id') id: string,
    @Body() dto: UpdateSIMDto,
  ): Promise<SIMResponseDto> {
    this.logger.log(`Updating SIM: ${id}`);
    return await this.simManager.updateSIM(id, dto);
  }

  @Delete('sims/:id')
  @ApiOperation({ summary: 'Delete SIM card' })
  @ApiResponse({ status: 200, description: 'SIM deleted successfully' })
  async deleteSIM(@Param('id') id: string): Promise<SIMResponseDto> {
    this.logger.log(`Deleting SIM: ${id}`);
    return await this.simManager.deleteSIM(id);
  }

  @Get('sims/:id/statistics')
  @ApiOperation({ summary: 'Get SIM statistics' })
  @ApiResponse({ status: 200, description: 'SIM statistics', type: SIMStatisticsDto })
  async getSIMStatistics(
    @Param('id') id: string,
    @Query('days') days?: number,
  ): Promise<SIMStatisticsDto> {
    return await this.simManager.getSIMStatistics(id, days || 30);
  }

  @Put('sims/:id/signal')
  @ApiOperation({ summary: 'Update SIM signal strength' })
  @ApiResponse({ status: 200, description: 'Signal strength updated' })
  async updateSignalStrength(
    @Param('id') id: string,
    @Body() dto: UpdateSignalDto,
  ): Promise<{ success: boolean }> {
    await this.simManager.updateSignalStrength(id, dto.signal);
    return { success: true };
  }

  @Put('sims/:id/balance')
  @ApiOperation({ summary: 'Update SIM balance' })
  @ApiResponse({ status: 200, description: 'Balance updated' })
  async updateBalance(
    @Param('id') id: string,
    @Body() dto: UpdateBalanceDto,
  ): Promise<{ success: boolean }> {
    await this.simManager.updateBalance(id, dto.balance);
    return { success: true };
  }

  @Post('sims/reset-daily-counters')
  @ApiOperation({ summary: 'Reset daily call counters for all SIMs' })
  @ApiResponse({ status: 200, description: 'Daily counters reset' })
  async resetDailyCounters(): Promise<{ success: boolean }> {
    await this.simManager.resetDailyCounters();
    return { success: true };
  }

  @Post('sims/reset-weekly-counters')
  @ApiOperation({ summary: 'Reset weekly call counters for all SIMs' })
  @ApiResponse({ status: 200, description: 'Weekly counters reset' })
  async resetWeeklyCounters(): Promise<{ success: boolean }> {
    await this.simManager.resetWeeklyCounters();
    return { success: true };
  }

  @Post('sims/reset-monthly-counters')
  @ApiOperation({ summary: 'Reset monthly call counters for all SIMs' })
  @ApiResponse({ status: 200, description: 'Monthly counters reset' })
  async resetMonthlyCounters(): Promise<{ success: boolean }> {
    await this.simManager.resetMonthlyCounters();
    return { success: true };
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  @Get('connections')
  @ApiOperation({ summary: 'Get all Asterisk connection statuses' })
  @ApiResponse({ status: 200, description: 'Connection statuses' })
  async getConnectionStatuses() {
    return this.connectionManager.getAllConnectionStatuses();
  }

  @Get('connections/:gatewayId')
  @ApiOperation({ summary: 'Get connection status for gateway' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getConnectionStatus(@Param('gatewayId') gatewayId: string) {
    return this.connectionManager.getConnectionStatus(gatewayId);
  }

  @Post('connections/:gatewayId/health-check')
  @ApiOperation({ summary: 'Perform health check on gateway connection' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async healthCheck(@Param('gatewayId') gatewayId: string): Promise<{ healthy: boolean }> {
    const healthy = await this.connectionManager.checkHealth(gatewayId);
    return { healthy };
  }

  @Post('connections/:gatewayId/disconnect')
  @ApiOperation({ summary: 'Disconnect from gateway' })
  @ApiResponse({ status: 200, description: 'Gateway disconnected' })
  async disconnect(@Param('gatewayId') gatewayId: string): Promise<{ success: boolean }> {
    await this.connectionManager.disconnect(gatewayId);
    return { success: true };
  }
}
