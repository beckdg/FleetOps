import { Injectable } from '@nestjs/common';
import { MaintenanceEvent, MaintenanceEventType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateMaintenanceEventData {
  maintenanceRecordId: string;
  eventType: MaintenanceEventType;
  createdByUserId: string;
  notes?: string;
}

@Injectable()
export class MaintenanceEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMaintenanceEventData): Promise<MaintenanceEvent> {
    return this.prisma.maintenanceEvent.create({ data });
  }

  findByMaintenanceRecordId(maintenanceRecordId: string): Promise<MaintenanceEvent[]> {
    return this.prisma.maintenanceEvent.findMany({
      where: { maintenanceRecordId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}
