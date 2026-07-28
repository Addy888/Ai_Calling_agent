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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TelephonyProfileService } from './telephony-profile.service';
import { CreateTelephonyProfileDto, UpdateTelephonyProfileDto, TelephonyProfileFilterDto } from './dto/telephony-profile.dto';

@ApiTags('Telephony Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/telephony-profiles')
export class TelephonyProfileController {
  constructor(private readonly telephonyProfileService: TelephonyProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new telephony profile' })
  @ApiResponse({ status: 201, description: 'Telephony profile created successfully' })
  async create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() data: CreateTelephonyProfileDto,
  ) {
    const profile = await this.telephonyProfileService.create(companyId, userId, data);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Telephony profile created successfully',
      data: profile,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all telephony profiles' })
  @ApiResponse({ status: 200, description: 'Telephony profiles retrieved successfully' })
  async findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filters: TelephonyProfileFilterDto,
  ) {
    const result = await this.telephonyProfileService.findAll(companyId, filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Telephony profiles retrieved successfully',
      data: result,
    };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default telephony profile' })
  @ApiResponse({ status: 200, description: 'Default telephony profile retrieved successfully' })
  async getDefault(@CurrentUser('companyId') companyId: string) {
    const profile = await this.telephonyProfileService.getDefault(companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Default telephony profile retrieved successfully',
      data: profile,
    };
  }

  @Get('gateways')
  @ApiOperation({ summary: 'Get available GSM gateways with SIM cards' })
  @ApiResponse({ status: 200, description: 'Available gateways retrieved successfully' })
  async getAvailableGateways(@CurrentUser('companyId') companyId: string) {
    const gateways = await this.telephonyProfileService.getAvailableGateways(companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Available gateways retrieved successfully',
      data: gateways,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a telephony profile by ID' })
  @ApiResponse({ status: 200, description: 'Telephony profile retrieved successfully' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const profile = await this.telephonyProfileService.findOne(id, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Telephony profile retrieved successfully',
      data: profile,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a telephony profile' })
  @ApiResponse({ status: 200, description: 'Telephony profile updated successfully' })
  async update(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() data: UpdateTelephonyProfileDto,
  ) {
    const profile = await this.telephonyProfileService.update(id, companyId, userId, data);
    return {
      statusCode: HttpStatus.OK,
      message: 'Telephony profile updated successfully',
      data: profile,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a telephony profile' })
  @ApiResponse({ status: 204, description: 'Telephony profile deleted successfully' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.telephonyProfileService.delete(id, companyId);
  }
}
