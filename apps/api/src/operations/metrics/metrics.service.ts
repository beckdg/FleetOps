import { Injectable } from '@nestjs/common';

export interface MetricsSnapshot {
  collectedAt: string;
  requests: {
    total: number;
    failed: number;
  };
  jobs: {
    completed: number;
    failed: number;
    successRate: number;
    failureRate: number;
  };
  webhooks: {
    delivered: number;
    failed: number;
    successRate: number;
    failureRate: number;
  };
}

@Injectable()
export class MetricsService {
  private requestTotal = 0;
  private requestFailed = 0;
  private jobCompleted = 0;
  private jobFailed = 0;
  private webhookDelivered = 0;
  private webhookFailed = 0;

  recordRequest(success: boolean): void {
    this.requestTotal += 1;

    if (!success) {
      this.requestFailed += 1;
    }
  }

  recordJobCompleted(): void {
    this.jobCompleted += 1;
  }

  recordJobFailed(): void {
    this.jobFailed += 1;
  }

  recordWebhookDelivery(success: boolean): void {
    if (success) {
      this.webhookDelivered += 1;
      return;
    }

    this.webhookFailed += 1;
  }

  getSnapshot(): MetricsSnapshot {
    const jobTotal = this.jobCompleted + this.jobFailed;
    const webhookTotal = this.webhookDelivered + this.webhookFailed;

    return {
      collectedAt: new Date().toISOString(),
      requests: {
        total: this.requestTotal,
        failed: this.requestFailed,
      },
      jobs: {
        completed: this.jobCompleted,
        failed: this.jobFailed,
        successRate: this.rate(this.jobCompleted, jobTotal),
        failureRate: this.rate(this.jobFailed, jobTotal),
      },
      webhooks: {
        delivered: this.webhookDelivered,
        failed: this.webhookFailed,
        successRate: this.rate(this.webhookDelivered, webhookTotal),
        failureRate: this.rate(this.webhookFailed, webhookTotal),
      },
    };
  }

  reset(): void {
    this.requestTotal = 0;
    this.requestFailed = 0;
    this.jobCompleted = 0;
    this.jobFailed = 0;
    this.webhookDelivered = 0;
    this.webhookFailed = 0;
  }

  private rate(part: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Number((part / total).toFixed(4));
  }
}
