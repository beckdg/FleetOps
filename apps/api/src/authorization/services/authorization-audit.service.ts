import { Injectable, Logger } from '@nestjs/common';

import { AuditEventStore } from '../../operations/audit/audit-event.store';
import { RequestContextService } from '../../operations/request-context/request-context.service';
import { AuthorizationAuditEntry } from '../interfaces/authorization-audit.interface';

@Injectable()
export class AuthorizationAuditService {
  private readonly logger = new Logger('Authorization');

  constructor(
    private readonly auditEventStore: AuditEventStore,
    private readonly requestContextService: RequestContextService,
  ) {}

  logAuthorizationCheck(entry: AuthorizationAuditEntry): void {
    const requestId = this.requestContextService.getRequestId();
    const payload: Record<string, string> = {
      userId: entry.userId,
      organizationId: entry.organizationId,
      requiredPermission: entry.requiredPermission,
      result: entry.result,
      ...(entry.reason ? { reason: entry.reason } : {}),
    };

    this.auditEventStore.append('authorization_check', payload, requestId);
    this.logger.log(
      JSON.stringify({
        event: 'authorization_check',
        requestId,
        ...payload,
      }),
    );
  }
}
