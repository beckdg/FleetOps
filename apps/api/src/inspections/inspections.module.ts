import { Module, forwardRef } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { InspectionRepository } from './inspections.repository';
import { InspectionService } from './inspections.service';
import { InspectionsController } from './inspections.controller';

@Module({
  imports: [
    OrganizationsModule,
    UsersModule,
    VehiclesModule,
    FleetModule,
    NotificationsModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [InspectionsController],
  providers: [InspectionRepository, InspectionService],
  exports: [InspectionService, InspectionRepository],
})
export class InspectionsModule {}
