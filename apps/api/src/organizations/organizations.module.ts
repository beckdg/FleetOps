import { Module } from '@nestjs/common';

/**
 * Organizations module scaffold.
 *
 * Organization is the tenant root for FleetOps multi-tenant SaaS.
 * All operational data (users, vehicles, drivers, trips, maintenance, etc.)
 * will be scoped to an organization once models are implemented.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class OrganizationsModule {}
