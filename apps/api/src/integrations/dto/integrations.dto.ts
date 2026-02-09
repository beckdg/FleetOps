import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production ERP connector' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false, example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CreateWebhookEndpointDto {
  @ApiProperty({ example: 'Fleet telemetry sink' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'https://example.com/webhooks/fleetops' })
  @IsUrl({ require_tld: false })
  url!: string;
}

export class UpdateWebhookEndpointDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
