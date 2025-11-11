import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  RequireOrganizationScope,
  RequirePermission,
} from '../authorization/decorators/require-permission.decorator';

@ApiTags('Test Protected')
@ApiBearerAuth()
@Controller('test-protected')
export class TestProtectedController {
  @Get('users')
  @ApiOperation({ summary: 'Sample route protected by users.read permission' })
  @ApiOkResponse({ description: 'Access granted' })
  @RequirePermission('users', 'read')
  getUsers(): { resource: string } {
    return { resource: 'users' };
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Sample route protected by vehicles.read permission' })
  @ApiOkResponse({ description: 'Access granted' })
  @RequirePermission('vehicles', 'read')
  getVehicles(): { resource: string } {
    return { resource: 'vehicles' };
  }

  @Get('organizations/:organizationId/users')
  @ApiOperation({ summary: 'Sample route with organization scope and users.read permission' })
  @ApiOkResponse({ description: 'Access granted' })
  @RequirePermission('users', 'read')
  @RequireOrganizationScope('organizationId')
  getOrganizationUsers(@Param('organizationId') organizationId: string): {
    organizationId: string;
    resource: string;
  } {
    return {
      organizationId,
      resource: 'users',
    };
  }
}
