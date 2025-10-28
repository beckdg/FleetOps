export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  roleIds: string[];
}
