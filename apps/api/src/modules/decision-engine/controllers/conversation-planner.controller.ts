import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ConversationPlannerService } from '../services/conversation-planner.service';
import { PlanConversationDto, ConversationPlanDto } from '../dto/conversation-planner.dto';

@ApiTags('Conversation Planner')
@ApiBearerAuth()
@Controller('conversation-planner')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationPlannerController {
  constructor(private readonly conversationPlannerService: ConversationPlannerService) {}

  @Post('plan')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Plan next conversation action' })
  @ApiResponse({ status: 200, description: 'Conversation planned successfully', type: ConversationPlanDto })
  async planConversation(
    @CurrentUser() user: any,
    @Body() dto: PlanConversationDto,
  ): Promise<ConversationPlanDto> {
    return this.conversationPlannerService.planConversation(user.companyId, dto);
  }
}
