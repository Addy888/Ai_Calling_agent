import { IsString, IsOptional, IsBoolean, IsObject, IsArray, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NodeType {
  START = 'START',
  MESSAGE = 'MESSAGE',
  QUESTION = 'QUESTION',
  CONDITION = 'CONDITION',
  BRANCH = 'BRANCH',
  VARIABLE = 'VARIABLE',
  END = 'END',
}

export enum VariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  CHOICE = 'CHOICE',
}

export class CreateScriptVersionDto {
  @ApiProperty({ description: 'Script ID' })
  @IsString()
  scriptId: string;

  @ApiProperty({ description: 'Version' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateScriptNodeDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;

  @ApiProperty({ description: 'Node ID' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Node type', enum: NodeType })
  @IsEnum(NodeType)
  type: NodeType;

  @ApiProperty({ description: 'Node name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Node content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Position' })
  @IsOptional()
  @IsObject()
  position?: any;

  @ApiPropertyOptional({ description: 'Configuration' })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({ description: 'Order' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Is entry point' })
  @IsOptional()
  @IsBoolean()
  isEntryPoint?: boolean;

  @ApiPropertyOptional({ description: 'Is exit point' })
  @IsOptional()
  @IsBoolean()
  isExitPoint?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateScriptBranchDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;

  @ApiProperty({ description: 'From node ID' })
  @IsString()
  fromNodeId: string;

  @ApiProperty({ description: 'To node ID' })
  @IsString()
  toNodeId: string;

  @ApiPropertyOptional({ description: 'Condition' })
  @IsOptional()
  @IsObject()
  condition?: any;

  @ApiPropertyOptional({ description: 'Label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Order' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateScriptVariableDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;

  @ApiProperty({ description: 'Variable name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Variable type', enum: VariableType })
  @IsEnum(VariableType)
  type: VariableType;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ExecuteScriptDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Initial variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User input' })
  @IsOptional()
  @IsString()
  userInput?: string;

  @ApiPropertyOptional({ description: 'Current node ID' })
  @IsOptional()
  @IsString()
  currentNodeId?: string;

  @ApiPropertyOptional({ description: 'Execution ID for continuation' })
  @IsOptional()
  @IsString()
  executionId?: string;
}

export class ValidateScriptDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;
}

export class PublishScriptDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;
}

export class PreviewScriptDto {
  @ApiProperty({ description: 'Version ID' })
  @IsString()
  versionId: string;

  @ApiProperty({ description: 'Sample inputs' })
  @IsArray()
  inputs: Array<{
    nodeId: string;
    input: string;
  }>;
}
