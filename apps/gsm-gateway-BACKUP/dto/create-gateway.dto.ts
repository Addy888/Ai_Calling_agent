import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIP, Min, Max } from 'class-validator';

export class CreateGatewayDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(32)
  totalPorts: number;

  @IsOptional()
  metadata?: any;
}
