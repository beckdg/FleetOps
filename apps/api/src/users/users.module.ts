import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module';
import { UserRepository } from './users.repository';
import { UserService } from './users.service';

@Module({
  imports: [OrganizationsModule],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UsersModule {}
