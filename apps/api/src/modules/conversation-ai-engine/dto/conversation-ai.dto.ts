/**
 * DTOs for Conversation AI Engine
 */

import { IsString, IsOptional, IsObject, IsNumber, IsEnum, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════
// CONVERSATION LIFECYCLE
// ═══════════════════════════════════════════════════════════════

export class StartConversationDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: 'Contact ID' })
  @IsString()
  contactId: string;

  @ApiProperty({ description: 'Call ID from telephony system' })
  @IsString()
  callId: string;

  @ApiPropertyOptional({ description: 'Optional configuration overrides' })
  @IsOptional()
  @IsObject()
  config?: Partial<AIEngineConfig>;
}

export class SendAudioChunkDto {
  @ApiProperty({ description: 'Audio data (base64 encoded)' })
  @IsString()
  audioData: string;

  @ApiPropertyOptional({ description: 'Sample rate (default: 16000)' })
  @IsOptional()
  @IsNumber()
  sampleRate?: number;

  @ApiPropertyOptional({ description: 'Number of channels (default: 1)' })
  @IsOptional()
  @IsNumber()
  channels?: number;

  @ApiPropertyOptional({ description: 'Audio encoding (default: pcm)' })
  @IsOptional()
  @IsString()
  encoding?: string;
}

export class EndConversationDto {
  @ApiPropertyOptional({ description: 'Reason for ending conversation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class GetConversationStateDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;
}

// ═══════════════════════════════════════════════════════════════
// ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export class UpdateEngineConfigDto {
  @ApiPropertyOptional({ description: 'Campaign ID to apply config' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Whisper model name' })
  @IsOptional()
  @IsEnum(['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'])
  whisperModel?: string;

  @ApiPropertyOptional({ description: 'Ollama model name' })
  @IsOptional()
  @IsString()
  ollamaModel?: string;

  @ApiPropertyOptional({ description: 'TTS voice ID' })
  @IsOptional()
  @IsString()
  ttsVoice?: string;

  @ApiPropertyOptional({ description: 'Preferred language' })
  @IsOptional()
  @IsEnum(['en', 'hi', 'mr', 'auto'])
  language?: string;

  @ApiPropertyOptional({ description: 'LLM temperature (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens for LLM response' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Silence timeout (ms)' })
  @IsOptional()
  @IsNumber()
  @Min(500)
  silenceTimeout?: number;

  @ApiPropertyOptional({ description: 'Interrupt timeout (ms)' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  interruptTimeout?: number;

  @ApiPropertyOptional({ description: 'Conversation timeout (ms)' })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  conversationTimeout?: number;

  @ApiPropertyOptional({ description: 'Enable interruption handling' })
  @IsOptional()
  @IsBoolean()
  enableInterruptions?: boolean;

  @ApiPropertyOptional({ description: 'Enable emotion detection' })
  @IsOptional()
  @IsBoolean()
  enableEmotionDetection?: boolean;

  @ApiPropertyOptional({ description: 'Enable function calling' })
  @IsOptional()
  @IsBoolean()
  enableFunctionCalling?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TESTING DTOs
// ═══════════════════════════════════════════════════════════════

export class TestWhisperDto {
  @ApiProperty({ description: 'Audio file (base64 encoded)' })
  @IsString()
  audioData: string;

  @ApiPropertyOptional({ description: 'Expected language' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class TestOllamaDto {
  @ApiProperty({ description: 'Test prompt' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Model name' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Enable streaming' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

export class TestTTSDto {
  @ApiProperty({ description: 'Text to synthesize' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Voice ID' })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiPropertyOptional({ description: 'Emotion' })
  @IsOptional()
  @IsEnum(['neutral', 'happy', 'sad', 'angry', 'excited'])
  emotion?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface AIEngineConfig {
  // STT Configuration
  whisper: {
    model: string;
    language: string;
    serviceUrl: string;
    timeout: number;
  };

  // LLM Configuration
  llm: {
    provider: 'ollama';
    model: string;
    baseUrl: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
    streaming: boolean;
  };

  // TTS Configuration
  tts: {
    provider: 'kokoro';
    voice: string;
    serviceUrl: string;
    streaming: boolean;
    emotion: boolean;
  };

  // Conversation Configuration
  conversation: {
    language: string;
    silenceTimeout: number;
    interruptTimeout: number;
    conversationTimeout: number;
    maxTurns: number;
    enableInterruptions: boolean;
  };

  // Memory Configuration
  memory: {
    shortTermTTL: number;
    sessionTTL: number;
    customerTTL: number;
    maxContextSize: number;
  };

  // Knowledge Configuration
  knowledge: {
    enabled: boolean;
    topK: number;
    minScore: number;
    timeout: number;
  };

  // Function Calling
  functions: {
    enabled: boolean;
    timeout: number;
    maxRetries: number;
  };

  // Emotion Engine
  emotion: {
    enabled: boolean;
    detectionModel: string;
    confidenceThreshold: number;
  };

  // Performance Targets
  performance: {
    sttMaxLatency: number;
    llmFirstTokenMax: number;
    knowledgeMaxLatency: number;
    totalResponseMax: number;
  };
}

// Default configuration
export const DEFAULT_AI_ENGINE_CONFIG: AIEngineConfig = {
  whisper: {
    model: 'base',
    language: 'auto',
    serviceUrl: process.env.WHISPER_SERVICE_URL || 'http://localhost:8000',
    timeout: 300,
  },
  llm: {
    provider: 'ollama',
    model: process.env.OLLAMA_MODEL || 'llama3',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 10000,
    streaming: true,
  },
  tts: {
    provider: 'kokoro',
    voice: 'default',
    serviceUrl: process.env.KOKORO_TTS_URL || 'http://localhost:8001',
    streaming: true,
    emotion: true,
  },
  conversation: {
    language: 'auto',
    silenceTimeout: 2000,
    interruptTimeout: 500,
    conversationTimeout: 300000, // 5 minutes
    maxTurns: 100,
    enableInterruptions: true,
  },
  memory: {
    shortTermTTL: 300,      // 5 minutes
    sessionTTL: 1800,       // 30 minutes
    customerTTL: 2592000,   // 30 days
    maxContextSize: 8192,
  },
  knowledge: {
    enabled: true,
    topK: 5,
    minScore: 0.7,
    timeout: 100,
  },
  functions: {
    enabled: true,
    timeout: 5000,
    maxRetries: 2,
  },
  emotion: {
    enabled: true,
    detectionModel: 'emotion-classifier',
    confidenceThreshold: 0.6,
  },
  performance: {
    sttMaxLatency: 300,
    llmFirstTokenMax: 700,
    knowledgeMaxLatency: 100,
    totalResponseMax: 1500,
  },
};
