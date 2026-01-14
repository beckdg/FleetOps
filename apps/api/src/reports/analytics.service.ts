import { Injectable } from '@nestjs/common';
import {
  FleetSummaryReport,
  FuelAnalyticsReport,
  MaintenanceAnalyticsReport,
  OrganizationDashboardReport,
  ReportDateRangeInput,
  TripAnalyticsReport,
} from '@fleetops/shared-types';

import { DriverRepository } from '../drivers/drivers.repository';
import { FuelRecordRepository } from '../fuel/fuel-records.repository';
import { MaintenanceRecordRepository } from '../maintenance/maintenance-records.repository';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { TripRepository } from '../trips/trips.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import {
  buildMaintenanceAnalytics,
  buildOrganizationFuelAnalytics,
  buildTripAnalytics,
  countDriversByStatus,
  countTripsForFleetSummary,
  countVehiclesByStatus,
  parseReportDateRange,
} from './constants/analytics.constants';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly driverRepository: DriverRepository,
    private readonly tripRepository: TripRepository,
    private readonly maintenanceRecordRepository: MaintenanceRecordRepository,
    private readonly fuelRecordRepository: FuelRecordRepository,
  ) {}

  async fleetSummary(
    organizationId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<FleetSummaryReport> {
    await this.organizationRepository.requireById(organizationId);
    const range = parseReportDateRange(rangeInput);

    const [vehicles, drivers, trips] = await Promise.all([
      this.vehicleRepository.findByOrganization(organizationId),
      this.driverRepository.findByOrganization(organizationId),
      this.tripRepository.findByOrganization(organizationId),
    ]);

    return {
      ...countVehiclesByStatus(vehicles),
      ...countDriversByStatus(drivers),
      ...countTripsForFleetSummary(trips, range),
    };
  }

  async fuelAnalytics(
    organizationId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<FuelAnalyticsReport> {
    await this.organizationRepository.requireById(organizationId);
    const range = parseReportDateRange(rangeInput);

    const [records, vehicles] = await Promise.all([
      this.fuelRecordRepository.findByOrganizationInDateRange(
        organizationId,
        range.startDate,
        range.endDate,
      ),
      this.vehicleRepository.findByOrganization(organizationId),
    ]);

    return buildOrganizationFuelAnalytics(records, vehicles.length);
  }

  async maintenanceAnalytics(
    organizationId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<MaintenanceAnalyticsReport> {
    await this.organizationRepository.requireById(organizationId);
    const range = parseReportDateRange(rangeInput);

    const records = await this.maintenanceRecordRepository.findByOrganizationInDateRange(
      organizationId,
      range.startDate,
      range.endDate,
    );

    return buildMaintenanceAnalytics(records);
  }

  async tripAnalytics(
    organizationId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<TripAnalyticsReport> {
    await this.organizationRepository.requireById(organizationId);
    const range = parseReportDateRange(rangeInput);

    const trips = await this.tripRepository.findByOrganizationInDateRange(
      organizationId,
      range.startDate,
      range.endDate,
    );

    return buildTripAnalytics(trips);
  }

  async organizationDashboard(
    organizationId: string,
    rangeInput: ReportDateRangeInput = {},
  ): Promise<OrganizationDashboardReport> {
    const [fleet, fuel, maintenance, trips] = await Promise.all([
      this.fleetSummary(organizationId, rangeInput),
      this.fuelAnalytics(organizationId, rangeInput),
      this.maintenanceAnalytics(organizationId, rangeInput),
      this.tripAnalytics(organizationId, rangeInput),
    ]);

    return { fleet, fuel, maintenance, trips };
  }
}
