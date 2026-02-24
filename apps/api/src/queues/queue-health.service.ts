import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QUEUE_NAMES, QueueName } from './constants/queue.constants';

export interface QueueHealthSnapshot {
  name: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  isHealthy: boolean;
}

@Injectable()
export class QueueHealthService {
  private readonly queueNames = Object.values(QUEUE_NAMES);

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK_DELIVERY) private readonly webhookDeliveryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MAINTENANCE_REMINDERS)
    private readonly maintenanceRemindersQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private readonly reportGenerationQueue: Queue,
  ) {}

  async getHealth(): Promise<{ queues: QueueHealthSnapshot[]; checkedAt: string }> {
    const queues = await Promise.all([
      this.buildSnapshot(QUEUE_NAMES.WEBHOOK_DELIVERY, this.webhookDeliveryQueue),
      this.buildSnapshot(QUEUE_NAMES.NOTIFICATIONS, this.notificationsQueue),
      this.buildSnapshot(QUEUE_NAMES.MAINTENANCE_REMINDERS, this.maintenanceRemindersQueue),
      this.buildSnapshot(QUEUE_NAMES.REPORT_GENERATION, this.reportGenerationQueue),
    ]);

    return {
      queues,
      checkedAt: new Date().toISOString(),
    };
  }

  private async buildSnapshot(name: QueueName, queue: Queue): Promise<QueueHealthSnapshot> {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );

    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
      isHealthy: (counts.paused ?? 0) === 0,
    };
  }
}
