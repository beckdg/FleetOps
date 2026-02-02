import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuelRecordResponse, VehicleFuelSummary } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { WEBHOOK_EVENT_TYPES } from '../integrations/constants/integrations.constants';
import { WebhookPublisherService } from '../integrations/webhook-publisher.service';
import { NotificationEventService } from '../notifications/notification-events.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { TripRepository } from '../trips/trips.repository';
import { UserRepository } from '../users/users.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import {
  buildFuelAnalyticsSnapshot,
  calculateAverageCostPerKilometer,
  calculateAverageFuelPerTrip,
  calculateKilometersDriven,
  calculateLitersPerKilometer,
  calculateTotalCost,
  odometerRegressionErrorMessage,
  tripOrganizationMismatchMessage,
  tripVehicleMismatchMessage,
} from './constants/fuel.constants';
import { CreateFuelRecordData, FuelRecordRepository } from './fuel-records.repository';
import { FuelStationRepository } from './fuel-stations.repository';
import { toFuelRecordResponse } from './fuel.mapper';

export interface CreateFuelRecordInput {
  organizationId: string;
  vehicleId: string;
  tripId?: string;
  fuelStationId?: string;
  odometerReading: number;
  litersPurchased: string;
  pricePerLiter: string;
  filledAt: string;
  createdByUserId: string;
}

@Injectable()
export class FuelRecordService {
  constructor(
    private readonly fuelRecordRepository: FuelRecordRepository,
    private readonly fuelStationRepository: FuelStationRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly tripRepository: TripRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
    private readonly notificationEventService: NotificationEventService,
    private readonly webhookPublisherService: WebhookPublisherService,
  ) {}

  async createFuelRecord(input: CreateFuelRecordInput): Promise<FuelRecordResponse> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );
    await this.vehicleRepository.requireInOrganization(input.vehicleId, input.organizationId);

    if (input.odometerReading < 0) {
      throw new BadRequestException('Odometer reading must be non-negative');
    }

    const litersPurchased = new Prisma.Decimal(input.litersPurchased);
    const pricePerLiter = new Prisma.Decimal(input.pricePerLiter);

    if (litersPurchased.lte(0)) {
      throw new BadRequestException('Liters purchased must be greater than zero');
    }

    if (pricePerLiter.lte(0)) {
      throw new BadRequestException('Price per liter must be greater than zero');
    }

    const filledAt = new Date(input.filledAt);

    if (Number.isNaN(filledAt.getTime())) {
      throw new BadRequestException('Invalid fill date');
    }

    await this.validateVehicleOdometerReading(input.vehicleId, input.odometerReading);

    if (input.tripId) {
      await this.assertTripBelongsToVehicleAndOrganization(
        input.tripId,
        input.organizationId,
        input.vehicleId,
      );
    }

    if (input.fuelStationId) {
      await this.fuelStationRepository.requireInOrganization(
        input.fuelStationId,
        input.organizationId,
      );
    }

    const totalCost = calculateTotalCost(litersPurchased, pricePerLiter);

    const data: CreateFuelRecordData = {
      organizationId: input.organizationId,
      vehicleId: input.vehicleId,
      tripId: input.tripId,
      fuelStationId: input.fuelStationId,
      odometerReading: input.odometerReading,
      litersPurchased,
      pricePerLiter,
      totalCost,
      filledAt,
      createdByUserId: input.createdByUserId,
    };

    const record = await this.fuelRecordRepository.create(data);

    this.fleetAuditService.logFuelRecordCreated({
      organizationId: record.organizationId,
      fuelRecordId: record.id,
      vehicleId: record.vehicleId,
      tripId: record.tripId,
      totalCost: record.totalCost.toString(),
      createdByUserId: input.createdByUserId,
    });

    await this.notificationEventService.onFuelRecordCreated(record, record.createdByUserId);

    await this.webhookPublisherService.publish(
      record.organizationId,
      WEBHOOK_EVENT_TYPES.FUEL_RECORD_CREATED,
      {
        fuelRecordId: record.id,
        vehicleId: record.vehicleId,
        tripId: record.tripId,
        totalCost: record.totalCost.toString(),
        litersPurchased: record.litersPurchased.toString(),
        filledAt: record.filledAt.toISOString(),
      },
    );

    return toFuelRecordResponse(record);
  }

  async getVehicleFuelHistory(
    organizationId: string,
    vehicleId: string,
  ): Promise<FuelRecordResponse[]> {
    await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);
    const records = await this.fuelRecordRepository.findByVehicle(organizationId, vehicleId);
    return records.map(toFuelRecordResponse);
  }

  async findByOrganization(organizationId: string): Promise<FuelRecordResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const records = await this.fuelRecordRepository.findByOrganization(organizationId);
    return records.map(toFuelRecordResponse);
  }

  async calculateVehicleFuelConsumption(
    organizationId: string,
    vehicleId: string,
  ): Promise<string | null> {
    const records = await this.getAnalyticsRecords(organizationId, vehicleId);
    const snapshot = buildFuelAnalyticsSnapshot(records);
    const kilometersDriven = calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer);

    return calculateLitersPerKilometer(snapshot.totalLiters, kilometersDriven);
  }

  async calculateVehicleFuelCost(organizationId: string, vehicleId: string): Promise<string> {
    const records = await this.getAnalyticsRecords(organizationId, vehicleId);
    const snapshot = buildFuelAnalyticsSnapshot(records);

    return snapshot.totalCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString();
  }

  async averageCostPerKilometer(organizationId: string, vehicleId: string): Promise<string | null> {
    const records = await this.getAnalyticsRecords(organizationId, vehicleId);
    const snapshot = buildFuelAnalyticsSnapshot(records);
    const kilometersDriven = calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer);

    return calculateAverageCostPerKilometer(snapshot.totalCost, kilometersDriven);
  }

  async averageFuelPerTrip(organizationId: string, vehicleId: string): Promise<string | null> {
    const records = await this.getAnalyticsRecords(organizationId, vehicleId);
    const snapshot = buildFuelAnalyticsSnapshot(records);

    return calculateAverageFuelPerTrip(snapshot.totalLiters, snapshot.uniqueTripCount);
  }

  async vehicleFuelSummary(organizationId: string, vehicleId: string): Promise<VehicleFuelSummary> {
    await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);

    const records = await this.fuelRecordRepository.findByVehicle(organizationId, vehicleId);
    const snapshot = buildFuelAnalyticsSnapshot(records);
    const kilometersDriven = calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer);

    return {
      vehicleId,
      recordCount: snapshot.recordCount,
      totalLiters: snapshot.totalLiters.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP).toString(),
      totalCost: snapshot.totalCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString(),
      kilometersDriven,
      litersPerKilometer: calculateLitersPerKilometer(snapshot.totalLiters, kilometersDriven),
      averageCostPerKilometer: calculateAverageCostPerKilometer(
        snapshot.totalCost,
        kilometersDriven,
      ),
      averageFuelPerTrip: calculateAverageFuelPerTrip(
        snapshot.totalLiters,
        snapshot.uniqueTripCount,
      ),
      tripFuelRecordCount: snapshot.tripFuelRecordCount,
    };
  }

  assertOdometerNotDecreasing(previousReading: number | null, newReading: number): void {
    if (previousReading !== null && newReading < previousReading) {
      throw new BadRequestException(odometerRegressionErrorMessage(previousReading, newReading));
    }
  }

  private async validateVehicleOdometerReading(
    vehicleId: string,
    odometerReading: number,
  ): Promise<void> {
    const previousReading = await this.fuelRecordRepository.findMaxOdometerByVehicle(vehicleId);
    this.assertOdometerNotDecreasing(previousReading, odometerReading);
  }

  private async assertTripBelongsToVehicleAndOrganization(
    tripId: string,
    organizationId: string,
    vehicleId: string,
  ): Promise<void> {
    const trip = await this.tripRepository.requireById(tripId);

    if (trip.organizationId !== organizationId) {
      throw new BadRequestException(tripOrganizationMismatchMessage());
    }

    if (trip.vehicleId !== vehicleId) {
      throw new BadRequestException(tripVehicleMismatchMessage());
    }
  }

  private async getAnalyticsRecords(organizationId: string, vehicleId: string) {
    await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);
    return this.fuelRecordRepository.findByVehicle(organizationId, vehicleId);
  }
}
