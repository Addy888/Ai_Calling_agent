import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ScriptLanguage {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
}

export class CreateScriptDto {
  @ApiProperty({ example: 'Welcome Script v1' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Hello {firstName}, this is {agentName} calling from {companyName}...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'Initial greeting script for cold calls' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ScriptLanguage, default: ScriptLanguage.ENGLISH })
  @IsEnum(ScriptLanguage)
  @IsOptional()
  language?: ScriptLanguage;

  @ApiPropertyOptional({ example: '1.0.0', default: '1.0.0' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateScriptDto extends PartialType(CreateScriptDto) {}

export class ScriptFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ScriptLanguage })
  @IsOptional()
  @IsEnum(ScriptLanguage)
  language?: ScriptLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
