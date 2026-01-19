export interface ReportPeriod {
  startDate: string | null;
  endDate: string | null;
}

export type ReportFormat = 'json';

export interface ReportEnvelope<T> {
  reportType: string;
  organizationId: string;
  generatedAt: string;
  format: ReportFormat;
  period: ReportPeriod;
  data: T;
}

export interface FleetSummaryReport {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  retiredVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

export interface FuelAnalyticsReport {
  totalFuelCost: string;
  totalFuelPurchased: string;
  averageCostPerVehicle: string | null;
  highestFuelCostVehicle: VehicleFuelCostSummary | null;
  lowestFuelCostVehicle: VehicleFuelCostSummary | null;
}

export interface VehicleFuelCostSummary {
  vehicleId: string;
  totalCost: string;
}

export interface MaintenanceAnalyticsReport {
  maintenanceCount: number;
  preventiveMaintenanceCount: number;
  correctiveMaintenanceCount: number;
  emergencyMaintenanceCount: number;
  totalMaintenanceCost: string;
  averageMaintenanceCost: string | null;
}

export interface TripAnalyticsReport {
  tripCount: number;
  completedTripCount: number;
  cancelledTripCount: number;
  averageTripDurationMinutes: number | null;
  tripCompletionRate: string | null;
}

export interface OrganizationDashboardReport {
  fleet: FleetSummaryReport;
  fuel: FuelAnalyticsReport;
  maintenance: MaintenanceAnalyticsReport;
  trips: TripAnalyticsReport;
}

export interface ReportDateRangeInput {
  startDate?: string;
  endDate?: string;
}
