export interface FuelStationResponse {
  id: string;
  organizationId: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface FuelRecordResponse {
  id: string;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  fuelStationId: string | null;
  odometerReading: number;
  litersPurchased: string;
  pricePerLiter: string;
  totalCost: string;
  filledAt: string;
  createdByUserId: string;
  createdAt: string;
}

export interface VehicleFuelSummary {
  vehicleId: string;
  recordCount: number;
  totalLiters: string;
  totalCost: string;
  kilometersDriven: number | null;
  litersPerKilometer: string | null;
  averageCostPerKilometer: string | null;
  averageFuelPerTrip: string | null;
  tripFuelRecordCount: number;
}
