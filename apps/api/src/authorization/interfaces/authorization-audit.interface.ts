export type AuthorizationResult = 'allowed' | 'denied';

export interface AuthorizationAuditEntry {
  userId: string;
  organizationId: string;
  requiredPermission: string;
  result: AuthorizationResult;
  reason?: 'missing_permission' | 'cross_organization' | 'admin_bypass';
}
