import { SetMetadata } from '@nestjs/common';

import {
  ORGANIZATION_SCOPE_PARAM_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../constants/authorization.constants';

export interface RequiredPermissionMetadata {
  resource: string;
  action: string;
}

export const RequireAllPermissions = (
  ...permissions: RequiredPermissionMetadata[]
): ReturnType<typeof SetMetadata> => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequirePermission = (
  resource: string,
  action: string,
): ReturnType<typeof SetMetadata> => RequireAllPermissions({ resource, action });

/**
 * Validates that the route organization parameter matches the authenticated user's organization.
 */
export const RequireOrganizationScope = (
  paramName = 'organizationId',
): ReturnType<typeof SetMetadata> => SetMetadata(ORGANIZATION_SCOPE_PARAM_KEY, paramName);
