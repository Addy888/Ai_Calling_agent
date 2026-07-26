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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GSMManagerService } from './services/gsm-manager.service';
import { SIMManagerService } from './services/sim-manager.service';
import { ChannelManagerService } from './services/channel-manager.service';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';
import { CreateSIMDto } from './dto/create-sim.dto';
import { UpdateSIMDto } from './dto/update-sim.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/gsm-gateway')
@UseGuards(JwtAuthGuard)
export class GSMGatewayController {
  constructor(
    private readonly gsmManager: GSMManagerService,
    private readonly simManager: SIMManagerService,
    private readonly channelManager: ChannelManagerService,
  ) {}

  // ========================================================================
  // GATEWAY MANAGEMENT
  // ========================================================================

  /**
   * Create a new GSM Gateway
   * POST /api/v1/gsm-gateway
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGateway(
    @Body() dto: CreateGatewayDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const gateway = await this.gsmManager.createGateway({
      ...dto,
      companyId,
    });

    return {
      success: true,
      message: 'GSM Gateway created successfully',
      data: gateway,
    };
  }

  /**
   * Get all GSM Gateways
   * GET /api/v1/gsm-gateway
   */
  @Get()
  async getAllGateways(@Request() req: any) {
    const companyId = req.user.companyId;

    const gateways = await this.gsmManager.getAllGateways(companyId);

    return {
      success: true,
      data: gateways,
      total: gateways.length,
    };
  }

  /**
   * Get a specific GSM Gateway
   * GET /api/v1/gsm-gateway/:id
   */
  @Get(':id')
  async getGateway(
    @Param('id') gatewayId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const gateway = await this.gsmManager.getGateway(gatewayId, companyId);

    return {
      success: true,
      data: gateway,
    };
  }

  /**
   * Update a GSM Gateway
   * PUT /api/v1/gsm-gateway/:id
   */
  @Put(':id')
  async updateGateway(
    @Param('id') gatewayId: string,
    @Body() dto: UpdateGatewayDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const gateway = await this.gsmManager.updateGateway(gatewayId, companyId, dto);

    return {
      success: true,
      message: 'GSM Gateway updated successfully',
      data: gateway,
    };
  }

  /**
   * Delete a GSM Gateway
   * DELETE /api/v1/gsm-gateway/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGateway(
    @Param('id') gatewayId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    await this.gsmManager.deleteGateway(gatewayId, companyId);

    return {
      success: true,
      message: 'GSM Gateway deleted successfully',
    };
  }

  /**
   * Perform health check on gateway
   * GET /api/v1/gsm-gateway/:id/health
   */
  @Get(':id/health')
  async performHealthCheck(
    @Param('id') gatewayId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const health = await this.gsmManager.performHealthCheck(gatewayId, companyId);

    return {
      success: true,
      data: health,
    };
  }

  // ========================================================================
  // SIM CARD MANAGEMENT
  // ========================================================================

  /**
   * Add a SIM Card to Gateway
   * POST /api/v1/gsm-gateway/:id/sims
   */
  @Post(':id/sims')
  @HttpCode(HttpStatus.CREATED)
  async addSIMCard(
    @Param('id') gatewayId: string,
    @Body() dto: CreateSIMDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const simCard = await this.gsmManager.addSIMCard({
      gatewayId,
      companyId,
      ...dto,
    });

    return {
      success: true,
      message: 'SIM Card added successfully',
      data: simCard,
    };
  }

  /**
   * Get all SIM Cards for a Gateway
   * GET /api/v1/gsm-gateway/:id/sims
   */
  @Get(':id/sims')
  async getSIMCards(
    @Param('id') gatewayId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const simCards = await this.gsmManager.getSIMCards(gatewayId, companyId);

    return {
      success: true,
      data: simCards,
      total: simCards.length,
    };
  }

  /**
   * Update a SIM Card
   * PUT /api/v1/gsm-gateway/sims/:simId
   */
  @Put('sims/:simId')
  async updateSIMCard(
    @Param('simId') simId: string,
    @Body() dto: UpdateSIMDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const simCard = await this.gsmManager.updateSIMCard(simId, companyId, dto);

    return {
      success: true,
      message: 'SIM Card updated successfully',
      data: simCard,
    };
  }

  /**
   * Delete a SIM Card
   * DELETE /api/v1/gsm-gateway/sims/:simId
   */
  @Delete('sims/:simId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSIMCard(
    @Param('simId') simId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    await this.gsmManager.deleteSIMCard(simId, companyId);

    return {
      success: true,
      message: 'SIM Card deleted successfully',
    };
  }

  /**
   * Get SIM Card statistics
   * GET /api/v1/gsm-gateway/sims/:simId/stats
   */
  @Get('sims/:simId/stats')
  async getSIMStatistics(
    @Param('simId') simId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;

    const stats = await this.gsmManager.getSIMStatistics(simId, companyId);

    return {
      success: true,
      data: stats,
    };
  }

  // ========================================================================
  // SIM SELECTION
  // ========================================================================

  /**
   * Get an available SIM Card based on criteria
   * GET /api/v1/gsm-gateway/sims/available
   */
  @Get('sims/available')
  async getAvailableSIM(
    @Query('targetOperator') targetOperator?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId;

    const sim = await this.simManager.getOptimalSIM(companyId, targetOperator);

    if (!sim) {
      return {
        success: false,
        message: 'No available SIM found',
        data: null,
      };
    }

    return {
      success: true,
      data: sim,
    };
  }

  /**
   * Mark SIM as in use
   * POST /api/v1/gsm-gateway/sims/:simId/mark-in-use
   */
  @Post('sims/:simId/mark-in-use')
  async markSIMInUse(
    @Param('simId') simId: string,
    @Body() body: { callId: string; phoneNumber: string },
  ) {
    await this.simManager.markSIMInUse(simId, body.callId, body.phoneNumber);

    return {
      success: true,
      message: 'SIM marked as in use',
    };
  }

  /**
   * Mark SIM as available
   * POST /api/v1/gsm-gateway/sims/:simId/mark-available
   */
  @Post('sims/:simId/mark-available')
  async markSIMAvailable(
    @Param('simId') simId: string,
    @Body() body: { callId: string; success: boolean; duration?: number },
  ) {
    await this.simManager.markSIMAvailable(simId, body.callId, body.success, body.duration);

    return {
      success: true,
      message: 'SIM marked as available',
    };
  }

  // ========================================================================
  // CHANNEL MANAGEMENT
  // ========================================================================

  /**
   * Get channel status for a gateway
   * GET /api/v1/gsm-gateway/:id/channels
   */
  @Get(':id/channels')
  async getChannelStatus(
    @Param('id') gatewayId: string,
    @Request() req: any,
  ) {
    const channelStatus = await this.channelManager.getGatewayChannelStatus(gatewayId);

    return {
      success: true,
      data: channelStatus,
    };
  }

  /**
   * Get available channels
   * GET /api/v1/gsm-gateway/:id/channels/available
   */
  @Get(':id/channels/available')
  async getAvailableChannels(@Param('id') gatewayId: string) {
    const channels = await this.channelManager.getAvailableChannels(gatewayId);

    return {
      success: true,
      data: channels,
      total: channels.length,
    };
  }
}
