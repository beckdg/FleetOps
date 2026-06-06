#!/bin/sh
set -e

cd /app

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  prisma migrate deploy --schema=./prisma/schema.prisma
fi

exec "$@"
