import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
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
import { CreateFuelRecordDto, CreateFuelStationDto } from './dto/fuel.dto';
import {
  FuelRecordResponseDto,
  FuelStationResponseDto,
  VehicleFuelSummaryResponseDto,
} from './dto/fuel-response.dto';
import { FuelRecordService } from './fuel-records.service';
import { FuelStationService } from './fuel-stations.service';

@ApiTags('Fuel')
@ApiBearerAuth()
@Controller('fuel')
export class FuelController {
  constructor(
    private readonly fuelRecordService: FuelRecordService,
    private readonly fuelStationService: FuelStationService,
  ) {}

  @Post('records')
  @RequirePermission('fuel', 'write')
  @ApiOperation({ summary: 'Create a fuel record' })
  @ApiCreatedResponse({ type: FuelRecordResponseDto })
  createFuelRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFuelRecordDto,
  ): Promise<FuelRecordResponseDto> {
    return this.fuelRecordService.createFuelRecord({
      organizationId: user.organizationId,
      createdByUserId: user.userId,
      ...dto,
    });
  }

  @Get('records')
  @RequirePermission('fuel', 'read')
  @ApiOperation({ summary: 'List fuel records' })
  @ApiOkResponse({ type: FuelRecordResponseDto, isArray: true })
  listFuelRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query('vehicleId') vehicleId?: string,
  ): Promise<FuelRecordResponseDto[]> {
    if (vehicleId) {
      return this.fuelRecordService.getVehicleFuelHistory(user.organizationId, vehicleId);
    }

    return this.fuelRecordService.findByOrganization(user.organizationId);
  }

  @Post('stations')
  @RequirePermission('fuel', 'write')
  @ApiOperation({ summary: 'Create a preferred fuel station' })
  @ApiCreatedResponse({ type: FuelStationResponseDto })
  createFuelStation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFuelStationDto,
  ): Promise<FuelStationResponseDto> {
    return this.fuelStationService.createFuelStation({
      organizationId: user.organizationId,
      ...dto,
    });
  }

  @Get('vehicles/:vehicleId/summary')
  @RequirePermission('fuel', 'read')
  @ApiOperation({ summary: 'Get vehicle fuel summary and analytics' })
  @ApiOkResponse({ type: VehicleFuelSummaryResponseDto })
  getVehicleFuelSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<VehicleFuelSummaryResponseDto> {
    return this.fuelRecordService.vehicleFuelSummary(user.organizationId, vehicleId);
  }
}
