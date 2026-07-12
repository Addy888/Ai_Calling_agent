import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ConversationState } from './conversation-session.dto';

export enum ObjectionType {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  NEED_TIME = 'NEED_TIME',
  ALREADY_PURCHASED = 'ALREADY_PURCHASED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  BUSY = 'BUSY',
  CALL_LATER = 'CALL_LATER',
  NEED_FAMILY_DISCUSSION = 'NEED_FAMILY_DISCUSSION',
  NEED_DETAILS = 'NEED_DETAILS',
  WRONG_NUMBER = 'WRONG_NUMBER',
  DO_NOT_CALL = 'DO_NOT_CALL',
  OTHER = 'OTHER',
}

export class CreateObjectionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty({ enum: ObjectionType })
  @IsEnum(ObjectionType)
  objectionType: ObjectionType;

  @ApiProperty()
  @IsString()
  objectionText: string;

  @ApiProperty({ enum: ConversationState })
  @IsEnum(ConversationState)
  conversationState: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detectedIntent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @ApiProperty()
  @IsString()
  handlingStrategy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responseUsed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ResolveObjectionDto {
  @ApiProperty()
  @IsBoolean()
  wasResolved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ObjectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ enum: ObjectionType })
  objectionType: ObjectionType;

  @ApiProperty()
  objectionText: string;

  @ApiProperty({ enum: ConversationState })
  conversationState: ConversationState;

  @ApiPropertyOptional()
  detectedIntent?: string;

  @ApiPropertyOptional()
  confidenceScore?: number;

  @ApiProperty()
  handlingStrategy: string;

  @ApiPropertyOptional()
  responseUsed?: string;

  @ApiProperty()
  wasResolved: boolean;

  @ApiPropertyOptional()
  resolutionNotes?: string;

  @ApiProperty()
  detectedAt: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiPropertyOptional()
  metadata?: any;
}

export class ObjectionStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  resolved: number;

  @ApiProperty()
  unresolved: number;

  @ApiProperty()
  resolutionRate: number;

  @ApiProperty()
  byType: Record<ObjectionType, number>;
}
