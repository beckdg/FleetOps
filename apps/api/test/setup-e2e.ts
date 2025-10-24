process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://fleetops:fleetops@localhost:5433/fleetops_test?schema=public';
