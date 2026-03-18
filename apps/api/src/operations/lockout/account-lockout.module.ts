import { Module } from '@nestjs/common';

import { UsersModule } from '../../users/users.module';
import { AccountLockoutService } from './account-lockout.service';

@Module({
  imports: [UsersModule],
  providers: [AccountLockoutService],
  exports: [AccountLockoutService],
})
export class AccountLockoutModule {}
