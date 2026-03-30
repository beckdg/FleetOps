export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  checks: {
    database: {
      connected: boolean;
      latencyMs?: number;
      error?: string;
    };
    redis: {
      connected: boolean;
      latencyMs?: number;
      error?: string;
    };
    queues: {
      checkedAt: string;
      queues: Array<{
        name: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
        isHealthy: boolean;
      }>;
    };
  };
}
