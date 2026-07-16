import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VoiceGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum VoiceLanguage {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
}

export class CreateVoiceProviderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiEndpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateVoiceLibraryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: VoiceLanguage })
  @IsEnum(VoiceLanguage)
  language: VoiceLanguage;

  @ApiProperty({ enum: VoiceGender })
  @IsEnum(VoiceGender)
  gender: VoiceGender;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  voiceCode: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateVoiceLibraryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VoiceConfigurationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  speakingSpeed: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  pitch: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  volume: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(2000)
  pauseBetweenSentences: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5000)
  pauseBetweenParagraphs: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  @IsOptional()
  voiceTemperature?: number;
}

export class VoicePreviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  voiceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  saveToHistory?: boolean;
}

export class VoiceGenerationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ enum: VoiceLanguage })
  @IsEnum(VoiceLanguage)
  language: VoiceLanguage;

  @ApiProperty({ enum: VoiceGender })
  @IsEnum(VoiceGender)
  gender: VoiceGender;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  saveToHistory?: boolean;
}

export class VoiceHistoryQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: VoiceLanguage })
  @IsEnum(VoiceLanguage)
  @IsOptional()
  language?: VoiceLanguage;

  @ApiPropertyOptional({ enum: VoiceGender })
  @IsEnum(VoiceGender)
  @IsOptional()
  gender?: VoiceGender;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

export class SetActiveVoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  voiceId: string;
}
