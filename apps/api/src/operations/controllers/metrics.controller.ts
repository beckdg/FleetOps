import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../authorization/decorators/require-permission.decorator';
import { MetricsService, MetricsSnapshot } from '../metrics/metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @RequirePermission('metrics', 'read')
  @ApiOperation({ summary: 'Get operational metrics snapshot' })
  @ApiOkResponse({ description: 'JSON metrics snapshot' })
  getMetrics(): MetricsSnapshot {
    return this.metricsService.getSnapshot();
  }
}
