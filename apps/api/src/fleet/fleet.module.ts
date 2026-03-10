import { Module } from '@nestjs/common';

import { AuditStoreModule } from '../operations/audit/audit-store.module';
import { RequestContextModule } from '../operations/request-context/request-context.module';
import { FleetAuditService } from './fleet-audit.service';

@Module({
  imports: [AuditStoreModule, RequestContextModule],
  providers: [FleetAuditService],
  exports: [FleetAuditService],
})
export class FleetModule {}
