import { Injectable } from '@nestjs/common';
import { MaintenanceEventType } from '@prisma/client';

import { MaintenanceEventRepository } from './maintenance-events.repository';

export interface RecordMaintenanceEventInput {
  maintenanceRecordId: string;
  eventType: MaintenanceEventType;
  createdByUserId: string;
  notes?: string;
}

@Injectable()
export class MaintenanceEventService {
  constructor(private readonly maintenanceEventRepository: MaintenanceEventRepository) {}

  recordEvent(input: RecordMaintenanceEventInput): Promise<void> {
    return this.maintenanceEventRepository.create(input).then(() => undefined);
  }
}
