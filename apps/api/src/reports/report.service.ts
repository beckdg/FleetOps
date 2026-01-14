import { Injectable } from '@nestjs/common';
import {
  FleetSummaryReport,
  FuelAnalyticsReport,
  MaintenanceAnalyticsReport,
  OrganizationDashboardReport,
  ReportDateRangeInput,
  ReportEnvelope,
  TripAnalyticsReport,
} from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { AnalyticsService } from './analytics.service';
import { parseReportDateRange, toReportPeriod } from './constants/analytics.constants';

export type ReportType = 'dashboard' | 'fleet' | 'fuel' | 'maintenance' | 'trips';

@Injectable()
export class ReportService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async generateDashboardReport(
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<ReportEnvelope<OrganizationDashboardReport>> {
    const data = await this.analyticsService.organizationDashboard(organizationId, rangeInput);

    return this.buildReport('dashboard', organizationId, requestedByUserId, rangeInput, data);
  }

  async generateFleetReport(
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<ReportEnvelope<FleetSummaryReport>> {
    const data = await this.analyticsService.fleetSummary(organizationId, rangeInput);

    return this.buildReport('fleet', organizationId, requestedByUserId, rangeInput, data);
  }

  async generateFuelReport(
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<ReportEnvelope<FuelAnalyticsReport>> {
    const data = await this.analyticsService.fuelAnalytics(organizationId, rangeInput);

    return this.buildReport('fuel', organizationId, requestedByUserId, rangeInput, data);
  }

  async generateMaintenanceReport(
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<ReportEnvelope<MaintenanceAnalyticsReport>> {
    const data = await this.analyticsService.maintenanceAnalytics(organizationId, rangeInput);

    return this.buildReport('maintenance', organizationId, requestedByUserId, rangeInput, data);
  }

  async generateTripReport(
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<ReportEnvelope<TripAnalyticsReport>> {
    const data = await this.analyticsService.tripAnalytics(organizationId, rangeInput);

    return this.buildReport('trips', organizationId, requestedByUserId, rangeInput, data);
  }

  private buildReport<T>(
    reportType: ReportType,
    organizationId: string,
    requestedByUserId: string,
    rangeInput: ReportDateRangeInput,
    data: T,
  ): ReportEnvelope<T> {
    const range = parseReportDateRange(rangeInput);

    this.fleetAuditService.logReportGenerated({
      organizationId,
      reportType,
      requestedByUserId,
    });

    return {
      reportType,
      organizationId,
      generatedAt: new Date().toISOString(),
      format: 'json',
      period: toReportPeriod(range),
      data,
    };
  }
}
