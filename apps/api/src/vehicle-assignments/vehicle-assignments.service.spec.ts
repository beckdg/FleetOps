import { BadRequestException } from '@nestjs/common';
import { DriverStatus, VehicleStatus } from '@prisma/client';

import { isDriverAssignable } from '../drivers/constants/driver.constants';
import { isVehicleAssignable } from '../vehicles/constants/vehicle.constants';
import { VehicleAssignmentService } from './vehicle-assignments.service';

describe('VehicleAssignmentService validation', () => {
  let service: VehicleAssignmentService;

  beforeEach(() => {
    service = new VehicleAssignmentService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  describe('assertVehicleAssignable', () => {
    it('allows ACTIVE vehicles', () => {
      expect(() => service.assertVehicleAssignable(VehicleStatus.ACTIVE)).not.toThrow();
      expect(isVehicleAssignable(VehicleStatus.ACTIVE)).toBe(true);
    });

    it.each([VehicleStatus.IN_MAINTENANCE, VehicleStatus.OUT_OF_SERVICE, VehicleStatus.RETIRED])(
      'rejects %s vehicles',
      (status) => {
        expect(isVehicleAssignable(status)).toBe(false);
        expect(() => service.assertVehicleAssignable(status)).toThrow(BadRequestException);
      },
    );
  });

  describe('assertDriverAssignable', () => {
    it('allows ACTIVE drivers', () => {
      expect(() => service.assertDriverAssignable(DriverStatus.ACTIVE)).not.toThrow();
      expect(isDriverAssignable(DriverStatus.ACTIVE)).toBe(true);
    });

    it.each([DriverStatus.SUSPENDED, DriverStatus.INACTIVE])('rejects %s drivers', (status) => {
      expect(isDriverAssignable(status)).toBe(false);
      expect(() => service.assertDriverAssignable(status)).toThrow(BadRequestException);
    });
  });
});
