import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  FleetSummaryReport,
  FuelAnalyticsReport,
  MaintenanceAnalyticsReport,
  OrganizationDashboardReport,
  ReportEnvelope,
  TripAnalyticsReport,
} from '@fleetops/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportEnvelopeDto } from './dto/report-response.dto';
import { ReportService } from './report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Get organization dashboard report' })
  @ApiOkResponse({ type: ReportEnvelopeDto })
  getDashboardReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ): Promise<ReportEnvelope<OrganizationDashboardReport>> {
    return this.reportService.generateDashboardReport(user.organizationId, user.userId, query);
  }

  @Get('fleet')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Get fleet summary report' })
  @ApiOkResponse({ type: ReportEnvelopeDto })
  getFleetReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ): Promise<ReportEnvelope<FleetSummaryReport>> {
    return this.reportService.generateFleetReport(user.organizationId, user.userId, query);
  }

  @Get('fuel')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Get fuel analytics report' })
  @ApiOkResponse({ type: ReportEnvelopeDto })
  getFuelReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ): Promise<ReportEnvelope<FuelAnalyticsReport>> {
    return this.reportService.generateFuelReport(user.organizationId, user.userId, query);
  }

  @Get('maintenance')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Get maintenance analytics report' })
  @ApiOkResponse({ type: ReportEnvelopeDto })
  getMaintenanceReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ): Promise<ReportEnvelope<MaintenanceAnalyticsReport>> {
    return this.reportService.generateMaintenanceReport(user.organizationId, user.userId, query);
  }

  @Get('trips')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Get trip analytics report' })
  @ApiOkResponse({ type: ReportEnvelopeDto })
  getTripReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ): Promise<ReportEnvelope<TripAnalyticsReport>> {
    return this.reportService.generateTripReport(user.organizationId, user.userId, query);
  }
}
