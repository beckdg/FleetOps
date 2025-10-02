import { PrismaClient } from '@prisma/client';

export interface SeedContext {
  prisma: PrismaClient;
  logger: SeedLogger;
}

export interface Seeder {
  readonly name: string;
  run(context: SeedContext): Promise<void>;
}

export class SeedLogger {
  info(message: string): void {
    console.log(`[seed] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[seed:warn] ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[seed:error] ${message}`, error);
  }
}
