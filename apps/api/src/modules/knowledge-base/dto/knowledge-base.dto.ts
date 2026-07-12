import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KnowledgeBaseType {
  FAQ = 'FAQ',
  POLICY = 'POLICY',
  PRICING = 'PRICING',
  DOCUMENTATION = 'DOCUMENTATION',
  WEBSITE = 'WEBSITE',
  CUSTOM = 'CUSTOM',
}

export class CreateKnowledgeBaseDto {
  @ApiProperty({ example: 'Product Pricing Information' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ enum: KnowledgeBaseType, example: KnowledgeBaseType.PRICING })
  @IsEnum(KnowledgeBaseType)
  type: KnowledgeBaseType;

  @ApiProperty({ example: 'Our pricing starts at $99/month for the basic plan...' })
  @IsString()
  content: string;

  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ example: 'https://example.com/pricing' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  source?: string;

  @ApiPropertyOptional({ example: 'Product Information' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: ['pricing', 'plans', 'billing'] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: { language: 'en', author: 'John Doe' } })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateKnowledgeBaseDto {
  @ApiPropertyOptional({ example: 'Product Pricing Information' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: KnowledgeBaseType })
  @IsEnum(KnowledgeBaseType)
  @IsOptional()
  type?: KnowledgeBaseType;

  @ApiPropertyOptional({ example: 'Our pricing starts at $99/month for the basic plan...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'https://example.com/pricing' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  source?: string;

  @ApiPropertyOptional({ example: 'Product Information' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: ['pricing', 'plans', 'billing'] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: { language: 'en', author: 'John Doe' } })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
