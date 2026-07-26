import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateSIMDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,15}$/, {
    message: 'SIM number must be 10-15 digits',
  })
  simNumber: string;

  @IsString()
  @IsNotEmpty()
  operator: string; // Jio, Airtel, Vi, BSNL

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(32)
  portNumber: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  dailyLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  monthlyLimit?: number;

  @IsString()
  @IsOptional()
  preferredOperator?: string;

  @IsOptional()
  metadata?: any;
}
