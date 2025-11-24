import {
  BadRequestException,
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
import { RequireAllPermissions } from '../authorization/decorators/require-permission.decorator';
import { AssignVehicleDto, GetActiveAssignmentQueryDto } from './dto/vehicle-assignment.dto';
import { VehicleAssignmentResponseDto } from './dto/vehicle-assignment-response.dto';
import { VehicleAssignmentService } from './vehicle-assignments.service';

@ApiTags('Vehicle Assignments')
@ApiBearerAuth()
@Controller('vehicle-assignments')
export class VehicleAssignmentsController {
  constructor(private readonly vehicleAssignmentService: VehicleAssignmentService) {}

  @Post()
  @RequireAllPermissions(
    { resource: 'vehicles', action: 'write' },
    { resource: 'drivers', action: 'write' },
  )
  @ApiOperation({ summary: 'Assign a vehicle to a driver' })
  @ApiCreatedResponse({ type: VehicleAssignmentResponseDto })
  assignVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignVehicleDto,
  ): Promise<VehicleAssignmentResponseDto> {
    return this.vehicleAssignmentService.assignVehicleToDriver({
      organizationId: user.organizationId,
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      assignedByUserId: user.userId,
    });
  }

  @Post(':assignmentId/end')
  @HttpCode(HttpStatus.OK)
  @RequireAllPermissions(
    { resource: 'vehicles', action: 'write' },
    { resource: 'drivers', action: 'write' },
  )
  @ApiOperation({ summary: 'End an active vehicle assignment' })
  @ApiOkResponse({ type: VehicleAssignmentResponseDto })
  endAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<VehicleAssignmentResponseDto> {
    return this.vehicleAssignmentService.endAssignment({
      organizationId: user.organizationId,
      assignmentId,
      endedByUserId: user.userId,
    });
  }

  @Get('active')
  @RequireAllPermissions(
    { resource: 'vehicles', action: 'read' },
    { resource: 'drivers', action: 'read' },
  )
  @ApiOperation({ summary: 'Get the active assignment for a vehicle or driver' })
  @ApiOkResponse({ type: VehicleAssignmentResponseDto })
  getActiveAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetActiveAssignmentQueryDto,
  ): Promise<VehicleAssignmentResponseDto | null> {
    if (!query.vehicleId && !query.driverId) {
      throw new BadRequestException('Either vehicleId or driverId query parameter is required');
    }

    return this.vehicleAssignmentService.getActiveAssignment({
      organizationId: user.organizationId,
      vehicleId: query.vehicleId,
      driverId: query.driverId,
    });
  }
}
