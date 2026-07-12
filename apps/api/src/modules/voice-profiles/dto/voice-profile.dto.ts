import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoiceProfileDto {
  @ApiProperty({ example: 'Professional Female Voice - English' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Clear, professional voice for business calls' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ example: 'female' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: { pitch: 1.0, speed: 1.0, voice_id: 'placeholder' } })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVoiceProfileDto {
  @ApiPropertyOptional({ example: 'Professional Female Voice - English' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Clear, professional voice for business calls' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ example: 'female' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: { pitch: 1.0, speed: 1.0, voice_id: 'placeholder' } })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
