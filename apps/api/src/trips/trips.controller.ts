import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateTripDto, TripActionDto } from './dto/create-trip.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { TripService } from './trips.service';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @RequirePermission('trips', 'write')
  @ApiOperation({ summary: 'Create a planned trip' })
  @ApiCreatedResponse({ type: TripResponseDto })
  createTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTripDto,
  ): Promise<TripResponseDto> {
    return this.tripService.createTrip({
      organizationId: user.organizationId,
      createdByUserId: user.userId,
      ...dto,
    });
  }

  @Get()
  @RequirePermission('trips', 'read')
  @ApiOperation({ summary: 'List organization trips' })
  @ApiOkResponse({ type: TripResponseDto, isArray: true })
  listTrips(@CurrentUser() user: AuthenticatedUser): Promise<TripResponseDto[]> {
    return this.tripService.findByOrganization(user.organizationId);
  }

  @Get('active')
  @RequirePermission('trips', 'read')
  @ApiOperation({ summary: 'List active trips (planned, dispatched, in progress)' })
  @ApiOkResponse({ type: TripResponseDto, isArray: true })
  getActiveTrips(@CurrentUser() user: AuthenticatedUser): Promise<TripResponseDto[]> {
    return this.tripService.getActiveTrips(user.organizationId);
  }

  @Post(':tripId/dispatch')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trips', 'write')
  @ApiOperation({ summary: 'Dispatch a planned trip' })
  @ApiOkResponse({ type: TripResponseDto })
  dispatchTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: TripActionDto,
  ): Promise<TripResponseDto> {
    return this.tripService.dispatchTrip({
      organizationId: user.organizationId,
      tripId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }

  @Post(':tripId/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trips', 'write')
  @ApiOperation({ summary: 'Start a dispatched trip' })
  @ApiOkResponse({ type: TripResponseDto })
  startTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: TripActionDto,
  ): Promise<TripResponseDto> {
    return this.tripService.startTrip({
      organizationId: user.organizationId,
      tripId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }

  @Post(':tripId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trips', 'write')
  @ApiOperation({ summary: 'Complete an in-progress trip' })
  @ApiOkResponse({ type: TripResponseDto })
  completeTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: TripActionDto,
  ): Promise<TripResponseDto> {
    return this.tripService.completeTrip({
      organizationId: user.organizationId,
      tripId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }

  @Post(':tripId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trips', 'write')
  @ApiOperation({ summary: 'Cancel a planned or dispatched trip' })
  @ApiOkResponse({ type: TripResponseDto })
  cancelTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: TripActionDto,
  ): Promise<TripResponseDto> {
    return this.tripService.cancelTrip({
      organizationId: user.organizationId,
      tripId,
      actorUserId: user.userId,
      notes: dto.notes,
    });
  }
}
