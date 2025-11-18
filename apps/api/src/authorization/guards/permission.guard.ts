import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator';
import { formatPermissionKey } from '../../shared/utils/permission-key.util';
import { PermissionResolutionService } from '../../permissions/permission-resolution.service';
import { RoleRepository } from '../../roles/roles.repository';
import {
  ADMIN_ROLE_NAME,
  ORGANIZATION_SCOPE_PARAM_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../constants/authorization.constants';
import { RequiredPermissionMetadata } from '../decorators/require-permission.decorator';
import { AuthorizationAuditService } from '../services/authorization-audit.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolutionService: PermissionResolutionService,
    private readonly roleRepository: RoleRepository,
    private readonly authorizationAuditService: AuthorizationAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermissionMetadata[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const permissionKeys = requiredPermissions.map((permission) =>
      formatPermissionKey(permission.resource, permission.action),
    );
    const requiredPermissionLabel = permissionKeys.join(',');

    const organizationScopeParam = this.reflector.getAllAndOverride<string>(
      ORGANIZATION_SCOPE_PARAM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (organizationScopeParam) {
      const requestedOrganizationId = request.params?.[organizationScopeParam];

      if (
        typeof requestedOrganizationId === 'string' &&
        requestedOrganizationId !== user.organizationId
      ) {
        this.authorizationAuditService.logAuthorizationCheck({
          userId: user.userId,
          organizationId: user.organizationId,
          requiredPermission: requiredPermissionLabel,
          result: 'denied',
          reason: 'cross_organization',
        });

        throw new ForbiddenException('Cross-organization access denied');
      }
    }

    const hasAdminRole = await this.roleRepository.userHasRoleByName(
      user.userId,
      user.organizationId,
      ADMIN_ROLE_NAME,
    );

    if (hasAdminRole) {
      this.authorizationAuditService.logAuthorizationCheck({
        userId: user.userId,
        organizationId: user.organizationId,
        requiredPermission: requiredPermissionLabel,
        result: 'allowed',
        reason: 'admin_bypass',
      });

      return true;
    }

    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionResolutionService.userHasPermission(
        user.userId,
        permission.resource,
        permission.action,
      );

      if (!hasPermission) {
        this.authorizationAuditService.logAuthorizationCheck({
          userId: user.userId,
          organizationId: user.organizationId,
          requiredPermission: formatPermissionKey(permission.resource, permission.action),
          result: 'denied',
          reason: 'missing_permission',
        });

        throw new ForbiddenException('Insufficient permissions');
      }
    }

    this.authorizationAuditService.logAuthorizationCheck({
      userId: user.userId,
      organizationId: user.organizationId,
      requiredPermission: requiredPermissionLabel,
      result: 'allowed',
    });

    return true;
  }
}
