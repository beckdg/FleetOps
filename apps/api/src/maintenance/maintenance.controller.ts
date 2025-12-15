import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
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
import {
  CompleteMaintenanceDto,
  MaintenanceActionDto,
  ScheduleMaintenanceDto,
} from './dto/maintenance.dto';
import { MaintenanceRecordResponseDto } from './dto/maintenance-response.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermission('maintenance', 'write')
  @ApiOperation({ summary: 'Schedule vehicle maintenance' })
  @ApiCreatedResponse({ type: MaintenanceRecordResponseDto })
  scheduleMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ScheduleMaintenanceDto,
  ): Promise<MaintenanceRecordResponseDto> {
    return this.maintenanceService.scheduleMaintenance({
      organizationId: user.organizationId,
      createdByUserId: user.userId,
      ...dto,
    });
  }

  @Get()
  @RequirePermission('maintenance', 'read')
  @ApiOperation({ summary: 'List maintenance records' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto, isArray: true })
  listMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('vehicleId') vehicleId?: string,
  ): Promise<MaintenanceRecordResponseDto[]> {
    if (vehicleId) {
      return this.maintenanceService.listVehicleMaintenance(user.organizationId, vehicleId);
    }

    return this.maintenanceService.findByOrganization(user.organizationId);
  }

  @Post(':maintenanceId/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('maintenance', 'write')
  @ApiOperation({ summary: 'Start scheduled maintenance' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  startMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: MaintenanceActionDto,
  ): Promise<MaintenanceRecordResponseDto> {
    return this.maintenanceService.startMaintenance({
      organizationId: user.organizationId,
      maintenanceId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }

  @Post(':maintenanceId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('maintenance', 'write')
  @ApiOperation({ summary: 'Complete in-progress maintenance' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  completeMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRecordResponseDto> {
    return this.maintenanceService.completeMaintenance({
      organizationId: user.organizationId,
      maintenanceId,
      actorUserId: user.userId,
      notes: dto.notes,
      actualCost: dto.actualCost,
    });
  }

  @Post(':maintenanceId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('maintenance', 'write')
  @ApiOperation({ summary: 'Cancel scheduled or in-progress maintenance' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  cancelMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: MaintenanceActionDto,
  ): Promise<MaintenanceRecordResponseDto> {
    return this.maintenanceService.cancelMaintenance({
      organizationId: user.organizationId,
      maintenanceId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }
}
