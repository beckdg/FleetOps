import { Module } from '@nestjs/common';

import { OrganizationRepository } from './organizations.repository';
import { OrganizationService } from './organizations.service';

/**
 * Organizations module — tenant root for FleetOps multi-tenant SaaS.
 *
 * Each organization owns users, roles, vehicles, drivers, trips, maintenance,
 * and other operational data via organizationId scoping.
 */
@Module({
  providers: [OrganizationRepository, OrganizationService],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationsModule {}
