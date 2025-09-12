import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckResponse } from '@fleetops/shared-types';

import { Public } from '../shared/decorators/public.decorator';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthCheckResponse {
    return this.healthService.getHealth();
  }
}
