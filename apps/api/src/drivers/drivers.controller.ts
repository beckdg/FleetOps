import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { CreateDriverDto } from './dto/create-driver.dto';
import { DriverResponseDto } from './dto/driver-response.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { DriverService } from './drivers.service';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @RequirePermission('drivers', 'write')
  @ApiOperation({ summary: 'Register a driver in the organization' })
  @ApiCreatedResponse({ type: DriverResponseDto })
  createDriver(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDriverDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.createDriver({
      organizationId: user.organizationId,
      ...dto,
    });
  }

  @Get()
  @RequirePermission('drivers', 'read')
  @ApiOperation({ summary: 'List organization drivers' })
  @ApiOkResponse({ type: DriverResponseDto, isArray: true })
  listDrivers(@CurrentUser() user: AuthenticatedUser): Promise<DriverResponseDto[]> {
    return this.driverService.findByOrganization(user.organizationId);
  }

  @Get(':driverId')
  @RequirePermission('drivers', 'read')
  @ApiOperation({ summary: 'Get a driver by ID' })
  @ApiOkResponse({ type: DriverResponseDto })
  getDriver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('driverId', ParseUUIDPipe) driverId: string,
  ): Promise<DriverResponseDto> {
    return this.driverService.findById(user.organizationId, driverId);
  }

  @Patch(':driverId/status')
  @RequirePermission('drivers', 'write')
  @ApiOperation({ summary: 'Update driver operational status' })
  @ApiOkResponse({ type: DriverResponseDto })
  updateDriverStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: UpdateDriverStatusDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.updateDriverStatus({
      organizationId: user.organizationId,
      driverId,
      status: dto.status,
      changedByUserId: user.userId,
    });
  }
}
