import { Injectable, NotFoundException } from '@nestjs/common';
import { Inspection } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateInspectionData {
  organizationId: string;
  vehicleId: string;
  inspectionDate: Date;
  passed: boolean;
  notes?: string;
  inspectorName: string;
  createdByUserId: string;
}

@Injectable()
export class InspectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInspectionData): Promise<Inspection> {
    return this.prisma.inspection.create({ data });
  }

  findByOrganization(organizationId: string): Promise<Inspection[]> {
    return this.prisma.inspection.findMany({
      where: { organizationId },
      orderBy: [{ inspectionDate: 'desc' }],
    });
  }

  findByVehicle(organizationId: string, vehicleId: string): Promise<Inspection[]> {
    return this.prisma.inspection.findMany({
      where: { organizationId, vehicleId },
      orderBy: [{ inspectionDate: 'desc' }],
    });
  }

  requireById(id: string): Promise<Inspection> {
    return this.prisma.inspection.findUnique({ where: { id } }).then((inspection) => {
      if (!inspection) {
        throw new NotFoundException(`Inspection ${id} not found`);
      }

      return inspection;
    });
  }
}
