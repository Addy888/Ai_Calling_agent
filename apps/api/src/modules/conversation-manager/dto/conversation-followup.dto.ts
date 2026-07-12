import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID, IsDateString } from 'class-validator';

export enum FollowUpType {
  TOMORROW = 'TOMORROW',
  NEXT_WEEK = 'NEXT_WEEK',
  CUSTOM_DATE = 'CUSTOM_DATE',
  AFTER_EVENT = 'AFTER_EVENT',
  CALLBACK = 'CALLBACK',
  SEND_INFO = 'SEND_INFO',
}

export enum FollowUpStatus {
  SCHEDULED = 'SCHEDULED',
  REMINDED = 'REMINDED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export class CreateFollowUpDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiProperty({ enum: FollowUpType })
  @IsEnum(FollowUpType)
  followUpType: FollowUpType;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFollowUpDto {
  @ApiPropertyOptional({ enum: FollowUpStatus })
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelFollowUpDto {
  @ApiProperty()
  @IsString()
  cancellationReason: string;
}

export class FollowUpResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  contactId?: string;

  @ApiProperty({ enum: FollowUpType })
  followUpType: FollowUpType;

  @ApiProperty()
  scheduledDate: Date;

  @ApiPropertyOptional()
  scheduledTime?: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: FollowUpStatus })
  status: FollowUpStatus;

  @ApiProperty()
  reminderSent: boolean;

  @ApiPropertyOptional()
  reminderSentAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
