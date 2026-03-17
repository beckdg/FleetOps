import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../authorization/decorators/require-permission.decorator';
import {
  AuditExportCsvPayload,
  AuditExportJsonPayload,
  AuditExportService,
} from '../audit/audit-export.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditExportService: AuditExportService) {}

  @Get('export')
  @RequirePermission('audit', 'read')
  @ApiOperation({ summary: 'Export buffered audit events' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Audit export payload' })
  exportAudit(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('limit') limit?: string,
  ): AuditExportJsonPayload | AuditExportCsvPayload {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    if (format === 'csv') {
      return this.auditExportService.exportCsvReady(parsedLimit);
    }

    return this.auditExportService.exportJson(parsedLimit);
  }
}
