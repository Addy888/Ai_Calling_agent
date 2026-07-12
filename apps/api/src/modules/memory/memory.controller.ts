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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CreateConversationMemoryDto,
  UpdateConversationMemoryDto,
  CreateCustomerMemoryDto,
  UpdateCustomerMemoryDto,
  CreateSessionMemoryDto,
  UpdateSessionMemoryDto,
  CreateMemorySnapshotDto,
  UpdateMemoryConfigurationDto,
  GetCustomerContextDto,
  RestoreConversationDto,
  LeadStatus,
} from './dto/memory.dto';

@ApiTags('AI Memory Manager')
@Controller('memory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post('conversation')
  @Permissions('memory:create')
  @ApiOperation({ summary: 'Create conversation memory' })
  @ApiResponse({ status: 201, description: 'Conversation memory created' })
  async createConversationMemory(@Body() dto: CreateConversationMemoryDto) {
    const memory = await this.memoryService.createConversationMemory(dto);
    return {
      success: true,
      data: memory,
      message: 'Conversation memory created successfully',
    };
  }

  @Put('conversation/:sessionId')
  @Permissions('memory:update')
  @ApiOperation({ summary: 'Update conversation memory' })
  @ApiResponse({ status: 200, description: 'Conversation memory updated' })
  async updateConversationMemory(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateConversationMemoryDto,
  ) {
    const memory = await this.memoryService.updateConversationMemory(sessionId, dto);
    return {
      success: true,
      data: memory,
      message: 'Conversation memory updated successfully',
    };
  }

  @Get('conversation/:sessionId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get conversation memory by session ID' })
  @ApiResponse({ status: 200, description: 'Conversation memory retrieved' })
  async getConversationMemory(@Param('sessionId') sessionId: string) {
    const memory = await this.memoryService.getConversationMemory(sessionId);
    return {
      success: true,
      data: memory,
      message: 'Conversation memory retrieved successfully',
    };
  }

  @Delete('conversation/:sessionId')
  @Permissions('memory:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete conversation memory' })
  @ApiResponse({ status: 200, description: 'Conversation memory deleted' })
  async deleteConversationMemory(@Param('sessionId') sessionId: string) {
    return this.memoryService.deleteConversationMemory(sessionId);
  }

  @Post('conversation/:sessionId/clear')
  @Permissions('memory:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear session and end conversation' })
  @ApiResponse({ status: 200, description: 'Session cleared' })
  async clearSession(@Param('sessionId') sessionId: string) {
    return this.memoryService.clearSession(sessionId);
  }

  @Post('customer')
  @Permissions('memory:create')
  @ApiOperation({ summary: 'Create customer memory' })
  @ApiResponse({ status: 201, description: 'Customer memory created' })
  async createCustomerMemory(@Body() dto: CreateCustomerMemoryDto) {
    const memory = await this.memoryService.createCustomerMemory(dto);
    return {
      success: true,
      data: memory,
      message: 'Customer memory created successfully',
    };
  }

  @Put('customer/:conversationId')
  @Permissions('memory:update')
  @ApiOperation({ summary: 'Update customer memory' })
  @ApiResponse({ status: 200, description: 'Customer memory updated' })
  async updateCustomerMemory(
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateCustomerMemoryDto,
  ) {
    const memory = await this.memoryService.updateCustomerMemory(conversationId, dto);
    return {
      success: true,
      data: memory,
      message: 'Customer memory updated successfully',
    };
  }

  @Get('customer/:conversationId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get customer memory by conversation ID' })
  @ApiResponse({ status: 200, description: 'Customer memory retrieved' })
  async getCustomerMemory(@Param('conversationId') conversationId: string) {
    const memory = await this.memoryService.getCustomerMemory(conversationId);
    return {
      success: true,
      data: memory,
      message: 'Customer memory retrieved successfully',
    };
  }

  @Get('customer/by-contact/:companyId/:contactId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get customer memory by contact ID' })
  @ApiResponse({ status: 200, description: 'Customer memory retrieved' })
  async getCustomerMemoryByContact(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
  ) {
    const memory = await this.memoryService.getCustomerMemoryByContact(companyId, contactId);
    return {
      success: true,
      data: memory,
      message: 'Customer memory retrieved successfully',
    };
  }

  @Get('customer/by-phone/:companyId/:phoneNumber')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get customer memory by phone number' })
  @ApiResponse({ status: 200, description: 'Customer memory retrieved' })
  async getCustomerMemoryByPhone(
    @Param('companyId') companyId: string,
    @Param('phoneNumber') phoneNumber: string,
  ) {
    const memory = await this.memoryService.getCustomerMemoryByPhone(companyId, phoneNumber);
    return {
      success: true,
      data: memory,
      message: 'Customer memory retrieved successfully',
    };
  }

  @Post('session')
  @Permissions('memory:create')
  @ApiOperation({ summary: 'Create session memory' })
  @ApiResponse({ status: 201, description: 'Session memory created' })
  async createSessionMemory(@Body() dto: CreateSessionMemoryDto) {
    const memory = await this.memoryService.createSessionMemory(dto);
    return {
      success: true,
      data: memory,
      message: 'Session memory created successfully',
    };
  }

  @Put('session/:sessionId')
  @Permissions('memory:update')
  @ApiOperation({ summary: 'Update session memory' })
  @ApiResponse({ status: 200, description: 'Session memory updated' })
  async updateSessionMemory(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionMemoryDto,
  ) {
    const memory = await this.memoryService.updateSessionMemory(sessionId, dto);
    return {
      success: true,
      data: memory,
      message: 'Session memory updated successfully',
    };
  }

  @Get('session/:sessionId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get session memory' })
  @ApiResponse({ status: 200, description: 'Session memory retrieved' })
  async getSessionMemory(@Param('sessionId') sessionId: string) {
    const memory = await this.memoryService.getSessionMemory(sessionId);
    return {
      success: true,
      data: memory,
      message: 'Session memory retrieved successfully',
    };
  }

  @Post('snapshot')
  @Permissions('memory:create')
  @ApiOperation({ summary: 'Create memory snapshot' })
  @ApiResponse({ status: 201, description: 'Memory snapshot created' })
  async createMemorySnapshot(@Body() dto: CreateMemorySnapshotDto) {
    const snapshot = await this.memoryService.createMemorySnapshot(dto);
    return {
      success: true,
      data: snapshot,
      message: 'Memory snapshot created successfully',
    };
  }

  @Get('snapshot/:conversationId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get memory snapshots for a conversation' })
  @ApiResponse({ status: 200, description: 'Memory snapshots retrieved' })
  async getMemorySnapshots(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
  ) {
    const snapshots = await this.memoryService.getMemorySnapshots(conversationId, limit);
    return {
      success: true,
      data: snapshots,
      message: 'Memory snapshots retrieved successfully',
    };
  }

  @Get('history/:conversationId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get memory history for a conversation' })
  @ApiResponse({ status: 200, description: 'Memory history retrieved' })
  async getMemoryHistory(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
  ) {
    const history = await this.memoryService.getMemoryHistory(conversationId, limit);
    return {
      success: true,
      data: history,
      message: 'Memory history retrieved successfully',
    };
  }

  @Get('configuration/:companyId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get memory configuration' })
  @ApiResponse({ status: 200, description: 'Memory configuration retrieved' })
  async getMemoryConfiguration(@Param('companyId') companyId: string) {
    const config = await this.memoryService.getMemoryConfiguration(companyId);
    return {
      success: true,
      data: config,
      message: 'Memory configuration retrieved successfully',
    };
  }

  @Put('configuration/:companyId')
  @Permissions('memory:update')
  @ApiOperation({ summary: 'Update memory configuration' })
  @ApiResponse({ status: 200, description: 'Memory configuration updated' })
  async updateMemoryConfiguration(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateMemoryConfigurationDto,
  ) {
    const config = await this.memoryService.updateMemoryConfiguration(companyId, dto);
    return {
      success: true,
      data: config,
      message: 'Memory configuration updated successfully',
    };
  }

  @Post('context')
  @Permissions('memory:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer context for AI' })
  @ApiResponse({ status: 200, description: 'Customer context retrieved' })
  async getCustomerContext(@Body() dto: GetCustomerContextDto) {
    const context = await this.memoryService.getCustomerContext(dto);
    return {
      success: true,
      data: context,
      message: 'Customer context retrieved successfully',
    };
  }

  @Post('restore')
  @Permissions('memory:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore conversation from previous session' })
  @ApiResponse({ status: 200, description: 'Conversation restored' })
  async restoreConversation(@Body() dto: RestoreConversationDto) {
    const restored = await this.memoryService.restoreConversation(dto);
    return {
      success: true,
      data: restored,
      message: 'Conversation restored successfully',
    };
  }

  @Post('merge/:sourceSessionId/:targetSessionId')
  @Permissions('memory:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge two conversation memories' })
  @ApiResponse({ status: 200, description: 'Memories merged' })
  async mergeMemory(
    @Param('sourceSessionId') sourceSessionId: string,
    @Param('targetSessionId') targetSessionId: string,
  ) {
    const merged = await this.memoryService.mergeMemory(sourceSessionId, targetSessionId);
    return {
      success: true,
      data: merged,
      message: 'Memories merged successfully',
    };
  }

  @Post('cleanup/:companyId')
  @Permissions('memory:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup expired sessions' })
  @ApiResponse({ status: 200, description: 'Expired sessions cleaned up' })
  async cleanupExpiredSessions(@Param('companyId') companyId: string) {
    return this.memoryService.cleanupExpiredSessions(companyId);
  }

  @Get('active/:companyId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get active conversations' })
  @ApiResponse({ status: 200, description: 'Active conversations retrieved' })
  async getActiveConversations(@Param('companyId') companyId: string) {
    const conversations = await this.memoryService.getActiveConversations(companyId);
    return {
      success: true,
      data: conversations,
      message: 'Active conversations retrieved successfully',
    };
  }

  @Get('conversations/:companyId/:contactId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get all conversations for a contact' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  async getConversationsByContact(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
  ) {
    const conversations = await this.memoryService.getConversationsByContact(companyId, contactId);
    return {
      success: true,
      data: conversations,
      message: 'Conversations retrieved successfully',
    };
  }

  @Get('leads/:companyId/:leadStatus')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get leads by status' })
  @ApiResponse({ status: 200, description: 'Leads retrieved' })
  async getLeadsByStatus(
    @Param('companyId') companyId: string,
    @Param('leadStatus') leadStatus: LeadStatus,
  ) {
    const leads = await this.memoryService.getLeadsByStatus(companyId, leadStatus);
    return {
      success: true,
      data: leads,
      message: 'Leads retrieved successfully',
    };
  }

  @Get('timeline/:companyId/:contactId')
  @Permissions('memory:read')
  @ApiOperation({ summary: 'Get customer timeline' })
  @ApiResponse({ status: 200, description: 'Customer timeline retrieved' })
  async getCustomerTimeline(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
  ) {
    const timeline = await this.memoryService.getCustomerTimeline(companyId, contactId);
    return {
      success: true,
      data: timeline,
      message: 'Customer timeline retrieved successfully',
    };
  }
}
