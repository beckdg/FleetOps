import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { OrganizationRepository } from '../organizations/organizations.repository';
import { RoleRepository } from '../roles/roles.repository';
import { RoleService } from '../roles/roles.service';
import { UserRepository } from '../users/users.repository';
import { UserService } from '../users/users.service';
import { EnvironmentVariables } from '../shared/constants/env.validation';
import { AuthRepository } from './auth.repository';
import { DEFAULT_REGISTRATION_ROLE } from './constants/auth.constants';
import { AuthTokensResponseDto } from './dto/auth-tokens-response.dto';
import { AuthUserProfileDto } from './dto/auth-user-profile.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { addDurationToDate, generateRefreshToken, hashRefreshToken } from './utils/token.util';

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly roleRepository: RoleRepository,
    private readonly roleService: RoleService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(input: RegisterDto): Promise<AuthTokensResponseDto> {
    const organization = await this.requireActiveOrganizationBySlug(input.organizationSlug);

    const user = await this.userService.createUser({
      organizationId: organization.id,
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await this.assignDefaultRole(user);

    return this.issueTokenPair(user);
  }

  async login(input: LoginDto): Promise<AuthTokensResponseDto> {
    const user = await this.validateCredentials(
      input.organizationSlug,
      input.email,
      input.password,
    );

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponseDto> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findValidRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(storedToken.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.revokeRefreshToken(storedToken.id);

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findValidRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.revokeRefreshToken(storedToken.id);
  }

  async getCurrentUserProfile(userId: string): Promise<AuthUserProfileDto> {
    const user = await this.userRepository.requireActiveById(userId);
    const roleIds = await this.roleRepository.findRoleIdsByUserId(user.id);

    return this.toUserProfile(user, roleIds);
  }

  private async validateCredentials(
    organizationSlug: string,
    email: string,
    password: string,
  ): Promise<User> {
    const organization = await this.requireActiveOrganizationBySlug(organizationSlug);
    const user = await this.userRepository.findByEmail(organization.id, email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async requireActiveOrganizationBySlug(slug: string) {
    const organization = await this.organizationRepository.findBySlug(slug);

    if (!organization) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }

    if (!organization.isActive) {
      throw new BadRequestException('Organization is inactive');
    }

    return organization;
  }

  private async assignDefaultRole(user: User): Promise<void> {
    const role = await this.roleRepository.findByName(
      user.organizationId,
      DEFAULT_REGISTRATION_ROLE,
    );

    if (!role) {
      throw new BadRequestException(
        `Default role "${DEFAULT_REGISTRATION_ROLE}" is not configured for this organization`,
      );
    }

    await this.roleService.assignRoleToUser(user.id, role.id);
  }

  private async issueTokenPair(user: User): Promise<AuthTokenPair> {
    const roleIds = await this.roleRepository.findRoleIdsByUserId(user.id);
    const accessToken = await this.createAccessToken(user, roleIds);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createAccessToken(user: User, roleIds: string[]): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roleIds,
    };

    return this.jwtService.signAsync(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const { rawToken, tokenHash } = generateRefreshToken();
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
    const expiresAt = addDurationToDate(new Date(), refreshExpiresIn);

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  private toUserProfile(user: User, roleIds: string[]): AuthUserProfileDto {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roleIds,
    };
  }
}
