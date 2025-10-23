import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://fleetops:fleetops@localhost:5433/fleetops_test?schema=public';
}
