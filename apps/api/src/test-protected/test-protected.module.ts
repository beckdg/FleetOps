import { Module } from '@nestjs/common';

import { TestProtectedController } from './test-protected.controller';

@Module({
  controllers: [TestProtectedController],
})
export class TestProtectedModule {}
