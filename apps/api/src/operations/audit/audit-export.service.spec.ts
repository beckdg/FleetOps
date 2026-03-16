import { AuditEventStore } from './audit-event.store';
import { AuditExportService } from './audit-export.service';

describe('AuditExportService', () => {
  let store: AuditEventStore;
  let service: AuditExportService;

  beforeEach(() => {
    store = new AuditEventStore();
    service = new AuditExportService(store);

    store.append('job_created', { jobId: 'job-1' }, 'req-1');
    store.append('job_completed', { jobId: 'job-1' }, 'req-2');
  });

  it('exports JSON audit events', () => {
    const payload = service.exportJson();

    expect(payload.format).toBe('json');
    expect(payload.count).toBe(2);
    expect(payload.events[0]?.event).toBe('job_created');
  });

  it('exports CSV-ready audit rows', () => {
    const payload = service.exportCsvReady();

    expect(payload.format).toBe('csv');
    expect(payload.headers).toEqual(expect.arrayContaining(['event', 'requestId', 'jobId']));
    expect(payload.rows).toHaveLength(2);
  });

  it('builds storage artifacts for future object storage uploads', () => {
    const artifact = service.buildStorageArtifact('csv');

    expect(artifact.contentType).toBe('text/csv');
    expect(artifact.key).toContain('audit-exports/');
    expect(artifact.body).toContain('event,requestId');
  });
});
