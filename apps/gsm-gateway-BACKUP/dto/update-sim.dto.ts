import { IsString, IsNumber, IsOptional, IsBoolean, Min, Matches } from 'class-validator';

export class UpdateSIMDto {
  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10,15}$/, {
    message: 'SIM number must be 10-15 digits',
  })
  simNumber?: string;

  @IsString()
  @IsOptional()
  operator?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Min(100)
  signalStrength?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  dailyLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  monthlyLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  preferredOperator?: string;

  @IsOptional()
  metadata?: any;
}
