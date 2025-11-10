import { Injectable, Logger } from '@nestjs/common';

import { AuthorizationAuditEntry } from '../interfaces/authorization-audit.interface';

@Injectable()
export class AuthorizationAuditService {
  private readonly logger = new Logger('Authorization');

  logAuthorizationCheck(entry: AuthorizationAuditEntry): void {
    this.logger.log(
      JSON.stringify({
        event: 'authorization_check',
        userId: entry.userId,
        organizationId: entry.organizationId,
        requiredPermission: entry.requiredPermission,
        result: entry.result,
        ...(entry.reason ? { reason: entry.reason } : {}),
      }),
    );
  }
}
