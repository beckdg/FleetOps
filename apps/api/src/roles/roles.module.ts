import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { RoleRepository } from './roles.repository';
import { RoleService } from './roles.service';

@Module({
  imports: [OrganizationsModule, UsersModule],
  providers: [RoleRepository, RoleService],
  exports: [RoleService, RoleRepository],
})
export class RolesModule {}
