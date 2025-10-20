import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { CreateRoleData, RoleRepository } from './roles.repository';

export interface CreateRoleInput {
  organizationId: string;
  name: string;
  description?: string;
}

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createRole(input: CreateRoleInput): Promise<Role> {
    await this.organizationRepository.requireById(input.organizationId);

    const data: CreateRoleData = {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
    };

    try {
      return await this.roleRepository.create(data);
    } catch (error) {
      if (this.roleRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Role name already exists in this organization');
      }

      throw error;
    }
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const role = await this.roleRepository.requireById(roleId);
    await this.userRepository.requireActiveInOrganization(userId, role.organizationId);

    try {
      await this.roleRepository.assignRoleToUser(userId, roleId);
    } catch (error) {
      if (this.roleRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Role is already assigned to this user');
      }

      throw error;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const role = await this.roleRepository.requireById(roleId);
    await this.userRepository.requireActiveInOrganization(userId, role.organizationId);

    try {
      await this.roleRepository.removeRoleFromUser(userId, roleId);
    } catch (error) {
      if (this.roleRepository.isNotFoundError(error)) {
        throw new NotFoundException('Role assignment not found for this user');
      }

      throw error;
    }
  }

  findByName(organizationId: string, name: string): Promise<Role | null> {
    return this.roleRepository.findByName(organizationId, name);
  }
}
