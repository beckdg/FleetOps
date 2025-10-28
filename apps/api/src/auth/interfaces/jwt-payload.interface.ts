export interface JwtPayload {
  sub: string;
  organizationId: string;
  email: string;
  roleIds: string[];
}
