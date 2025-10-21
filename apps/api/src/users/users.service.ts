import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { OrganizationRepository } from '../organizations/organizations.repository';
import { CreateUserData, UpdateUserData, UserRepository } from './users.repository';

export interface CreateUserInput {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async createUser(input: CreateUserInput): Promise<User> {
    await this.organizationRepository.requireById(input.organizationId);

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const data: CreateUserData = {
      organizationId: input.organizationId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive,
    };

    try {
      return await this.userRepository.create(data);
    } catch (error) {
      if (this.userRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('User email already exists in this organization');
      }

      throw error;
    }
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    await this.userRepository.requireActiveById(userId);

    const data: UpdateUserData = {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive,
    };

    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    }

    try {
      return await this.userRepository.update(userId, data);
    } catch (error) {
      if (this.userRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('User email already exists in this organization');
      }

      if (this.userRepository.isNotFoundError(error)) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      throw error;
    }
  }

  async deactivateUser(userId: string): Promise<User> {
    await this.userRepository.requireActiveById(userId);

    try {
      return await this.userRepository.deactivate(userId);
    } catch (error) {
      if (this.userRepository.isNotFoundError(error)) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      throw error;
    }
  }

  findById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
}
