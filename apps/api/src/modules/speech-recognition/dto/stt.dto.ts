import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class StartSTTSessionDto {
  @IsString()
  @IsNotEmpty()
  callSessionId: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsBoolean()
  enablePartialResults?: boolean;
}

export class StreamAudioChunkDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  chunkDurationMs?: number;
}

export class StopSTTSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class STTSessionStatusDto {
  sessionId: string;
  callSessionId: string;
  status: string;
  language: string;
  turnsCount: number;
  totalChunksProcessed: number;
  startedAt: Date;
  endedAt?: Date;
}

export class STTProviderStatusDto {
  name: string;
  available: boolean;
  isActive: boolean;
}

export class STTEngineStatusDto {
  isRunning: boolean;
  activeSessionsCount: number;
  activeProvider: string;
}
