import { Module } from '@nestjs/common';

import { AuditEventStore } from './audit-event.store';
import { AuditExportService } from './audit-export.service';

@Module({
  providers: [AuditEventStore, AuditExportService],
  exports: [AuditEventStore, AuditExportService],
})
export class AuditStoreModule {}
