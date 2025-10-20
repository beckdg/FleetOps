import { ConflictException, Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';

import { slugify } from '../shared/utils/slug.util';
import { CreateOrganizationData, OrganizationRepository } from './organizations.repository';

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  isActive?: boolean;
}

@Injectable()
export class OrganizationService {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const slug = input.slug ?? slugify(input.name);
    const data: CreateOrganizationData = {
      name: input.name,
      slug,
      isActive: input.isActive,
    };

    try {
      return await this.organizationRepository.create(data);
    } catch (error) {
      if (this.organizationRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Organization name or slug already exists');
      }

      throw error;
    }
  }

  findById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findById(id);
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepository.findBySlug(slug);
  }
}
