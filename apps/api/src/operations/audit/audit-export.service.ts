import { Injectable } from '@nestjs/common';

import { AuditEventStore, AuditExportRecord, StoredAuditEvent } from './audit-event.store';

export interface AuditExportJsonPayload {
  format: 'json';
  exportedAt: string;
  count: number;
  events: StoredAuditEvent[];
}

export interface AuditExportCsvPayload {
  format: 'csv';
  exportedAt: string;
  count: number;
  headers: string[];
  rows: string[][];
}

export interface AuditStorageArtifact {
  contentType: string;
  key: string;
  body: string;
}

@Injectable()
export class AuditExportService {
  constructor(private readonly auditEventStore: AuditEventStore) {}

  exportJson(limit?: number): AuditExportJsonPayload {
    const events = this.auditEventStore.list(limit);

    return {
      format: 'json',
      exportedAt: new Date().toISOString(),
      count: events.length,
      events,
    };
  }

  exportCsvReady(limit?: number): AuditExportCsvPayload {
    const events = this.auditEventStore.list(limit);
    const records = events.map((event) => this.toExportRecord(event));
    const headerSet = new Set<string>(['event', 'requestId', 'occurredAt']);

    for (const record of records) {
      for (const key of Object.keys(record.fields)) {
        headerSet.add(key);
      }
    }

    const headers = [...headerSet];
    const rows = records.map((record) =>
      headers.map((header) => {
        if (header === 'event') {
          return record.event;
        }

        if (header === 'requestId') {
          return record.requestId ?? '';
        }

        if (header === 'occurredAt') {
          return record.occurredAt;
        }

        return record.fields[header] ?? '';
      }),
    );

    return {
      format: 'csv',
      exportedAt: new Date().toISOString(),
      count: records.length,
      headers,
      rows,
    };
  }

  buildStorageArtifact(format: 'json' | 'csv', limit?: number): AuditStorageArtifact {
    if (format === 'json') {
      const payload = this.exportJson(limit);

      return {
        contentType: 'application/json',
        key: `audit-exports/${payload.exportedAt}.json`,
        body: JSON.stringify(payload),
      };
    }

    const payload = this.exportCsvReady(limit);

    return {
      contentType: 'text/csv',
      key: `audit-exports/${payload.exportedAt}.csv`,
      body: this.serializeCsv(payload),
    };
  }

  private serializeCsv(payload: AuditExportCsvPayload): string {
    const lines = [payload.headers.join(',')];

    for (const row of payload.rows) {
      lines.push(row.map((value) => this.escapeCsvValue(value)).join(','));
    }

    return lines.join('\n');
  }

  private escapeCsvValue(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private toExportRecord(event: StoredAuditEvent): AuditExportRecord {
    return {
      event: event.event,
      requestId: event.requestId ?? null,
      occurredAt: event.occurredAt,
      fields: event.payload,
    };
  }
}
