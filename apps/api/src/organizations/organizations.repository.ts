import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateOrganizationData {
  name: string;
  slug: string;
  isActive?: boolean;
}

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateOrganizationData): Promise<Organization> {
    return this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        isActive: data.isActive ?? true,
      },
    });
  }

  findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  requireById(id: string): Promise<Organization> {
    return this.findById(id).then((organization) => {
      if (!organization) {
        throw new NotFoundException(`Organization ${id} not found`);
      }

      return organization;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
