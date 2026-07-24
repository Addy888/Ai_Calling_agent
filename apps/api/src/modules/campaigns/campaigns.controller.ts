import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignService } from './campaigns.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilterDto,
  UpdateCampaignStatusDto,
  AssignContactsDto,
  AssignScriptDto,
  AssignPromptDto,
  CloneCampaignDto,
} from './dto/campaign.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    return this.campaignService.create(companyId, userId, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns with pagination and filters' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() query: CampaignFilterDto,
  ) {
    return this.campaignService.findAll(companyId, query, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.campaignService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  update(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, companyId, userId, updateCampaignDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() updateStatusDto: UpdateCampaignStatusDto,
  ) {
    return this.campaignService.updateStatus(id, companyId, userId, updateStatusDto);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone an existing campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID to clone' })
  clone(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() cloneDto: CloneCampaignDto,
  ) {
    return this.campaignService.clone(id, companyId, userId, cloneDto.name);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  archive(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignService.archive(id, companyId, userId);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore an archived campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  restore(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignService.restore(id, companyId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  remove(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.campaignService.remove(id, companyId);
  }

  @Post(':id/contacts/assign')
  @ApiOperation({ summary: 'Assign contacts to campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  assignContacts(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() assignContactsDto: AssignContactsDto,
  ) {
    return this.campaignService.assignContacts(id, companyId, assignContactsDto);
  }

  @Post(':id/contacts/remove')
  @ApiOperation({ summary: 'Remove contacts from campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  removeContacts(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() assignContactsDto: AssignContactsDto,
  ) {
    return this.campaignService.removeContacts(id, companyId, assignContactsDto);
  }

  @Patch(':id/script')
  @ApiOperation({ summary: 'Assign or remove script from campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  assignScript(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() assignScriptDto: AssignScriptDto,
  ) {
    return this.campaignService.assignScript(id, companyId, assignScriptDto);
  }

  @Patch(':id/prompt')
  @ApiOperation({ summary: 'Assign or remove prompt from campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  assignPrompt(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() assignPromptDto: AssignPromptDto,
  ) {
    return this.campaignService.assignPrompt(id, companyId, assignPromptDto);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  getStatistics(@Param('id') id: string) {
    return this.campaignService.getCampaignStatistics(id);
  }
}
