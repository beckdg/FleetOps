import { Injectable } from '@nestjs/common';

export interface StoredAuditEvent {
  id: string;
  event: string;
  requestId?: string;
  payload: Record<string, string>;
  occurredAt: string;
}

export interface AuditExportRecord {
  event: string;
  requestId: string | null;
  occurredAt: string;
  fields: Record<string, string>;
}

@Injectable()
export class AuditEventStore {
  private readonly events: StoredAuditEvent[] = [];
  private maxSize = 10_000;

  configure(maxSize: number): void {
    this.maxSize = maxSize;
  }

  append(event: string, payload: Record<string, string>, requestId?: string): StoredAuditEvent {
    const record: StoredAuditEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      event,
      requestId,
      payload,
      occurredAt: new Date().toISOString(),
    };

    this.events.push(record);

    if (this.events.length > this.maxSize) {
      this.events.splice(0, this.events.length - this.maxSize);
    }

    return record;
  }

  list(limit?: number): StoredAuditEvent[] {
    if (!limit || limit >= this.events.length) {
      return [...this.events];
    }

    return this.events.slice(this.events.length - limit);
  }

  clear(): void {
    this.events.length = 0;
  }
}
