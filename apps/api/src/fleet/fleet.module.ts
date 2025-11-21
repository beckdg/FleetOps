import { Module } from '@nestjs/common';

import { FleetAuditService } from './fleet-audit.service';

@Module({
  providers: [FleetAuditService],
  exports: [FleetAuditService],
})
export class FleetModule {}
