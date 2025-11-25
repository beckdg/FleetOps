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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehicleService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @RequirePermission('vehicles', 'write')
  @ApiOperation({ summary: 'Register a vehicle in the organization fleet' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  createVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.createVehicle({
      organizationId: user.organizationId,
      ...dto,
    });
  }

  @Get()
  @RequirePermission('vehicles', 'read')
  @ApiOperation({ summary: 'List organization vehicles' })
  @ApiOkResponse({ type: VehicleResponseDto, isArray: true })
  listVehicles(@CurrentUser() user: AuthenticatedUser): Promise<VehicleResponseDto[]> {
    return this.vehicleService.findByOrganization(user.organizationId);
  }

  @Get(':vehicleId')
  @RequirePermission('vehicles', 'read')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiOkResponse({ type: VehicleResponseDto })
  getVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.findById(user.organizationId, vehicleId);
  }

  @Patch(':vehicleId/status')
  @RequirePermission('vehicles', 'write')
  @ApiOperation({ summary: 'Update vehicle operational status' })
  @ApiOkResponse({ type: VehicleResponseDto })
  updateVehicleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: UpdateVehicleStatusDto,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.updateVehicleStatus({
      organizationId: user.organizationId,
      vehicleId,
      status: dto.status,
      changedByUserId: user.userId,
    });
  }
}
