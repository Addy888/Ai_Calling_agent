import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, IsArray, Min, Max } from 'class-validator';

export class UploadRecordingDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  agentSpeakerId?: string;

  @IsString()
  @IsOptional()
  customerSpeakerId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class AnalyzeRecordingDto {
  @IsString()
  recordingId: string;

  @IsBoolean()
  @IsOptional()
  forceReanalysis?: boolean;
}

export class UploadScriptDto {
  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class GetInsightsDto {
  @IsString()
  @IsOptional()
  insightType?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @IsBoolean()
  @IsOptional()
  isApplied?: boolean;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetPatternsDto {
  @IsString()
  @IsOptional()
  recordingId?: string;

  @IsString()
  @IsOptional()
  patternType?: string;

  @IsString()
  @IsOptional()
  speaker?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetConversationRulesDto {
  @IsString()
  @IsOptional()
  ruleType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minSuccessRate?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetResponseStrategiesDto {
  @IsString()
  @IsOptional()
  triggerIntent?: string;

  @IsString()
  @IsOptional()
  strategyType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class AskQuestionDto {
  @IsString()
  question: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class ApplyInsightDto {
  @IsString()
  insightId: string;

  @IsObject()
  @IsOptional()
  applicationDetails?: any;
}

export class CreateConversationRuleDto {
  @IsString()
  ruleType: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsObject()
  condition: any;

  @IsObject()
  action: any;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateConversationRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  condition?: any;

  @IsObject()
  @IsOptional()
  action?: any;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateResponseStrategyDto {
  @IsString()
  triggerIntent: string;

  @IsString()
  strategyType: string;

  @IsString()
  strategyName: string;

  @IsString()
  description: string;

  @IsString()
  responseTemplate: string;

  @IsNumber()
  @IsOptional()
  pauseBefore?: number;

  @IsNumber()
  @IsOptional()
  pauseAfter?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(2.0)
  speakingSpeed?: number;

  @IsString()
  @IsOptional()
  emotionalTone?: string;

  @IsString()
  @IsOptional()
  languageStyle?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class UpdateResponseStrategyDto {
  @IsString()
  @IsOptional()
  strategyName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  responseTemplate?: string;

  @IsNumber()
  @IsOptional()
  pauseBefore?: number;

  @IsNumber()
  @IsOptional()
  pauseAfter?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(2.0)
  speakingSpeed?: number;

  @IsString()
  @IsOptional()
  emotionalTone?: string;

  @IsString()
  @IsOptional()
  languageStyle?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class GetLearningStatsDto {
  @IsString()
  @IsOptional()
  statType?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsOptional()
  dimensions?: string[];
}
