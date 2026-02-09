import { ApiProperty } from '@nestjs/swagger';
import { WebhookDeliveryStatus } from '@prisma/client';

export class ApiKeyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  keyPrefix!: string;

  @ApiProperty({ required: false, nullable: true })
  lastUsedAt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  expiresAt!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({ description: 'Plaintext key shown only once at creation' })
  plaintextKey!: string;
}

export class WebhookEndpointResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  secret!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class WebhookDeliveryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  webhookEndpointId!: string;

  @ApiProperty()
  webhookEventId!: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiProperty({ enum: WebhookDeliveryStatus })
  status!: WebhookDeliveryStatus;

  @ApiProperty({ required: false, nullable: true })
  responseCode!: number | null;

  @ApiProperty({ required: false, nullable: true })
  responseBody!: string | null;

  @ApiProperty({ required: false, nullable: true })
  deliveredAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class ApiKeyContextResponseDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  apiKeyId!: string;
}
