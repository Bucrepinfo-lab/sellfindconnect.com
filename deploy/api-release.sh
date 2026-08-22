#!/bin/sh
# Fly / DigitalOcean release command: apply Prisma migrations, then load
# idempotent reference data (continents, countries, industries).
# Fail closed if DATABASE_URL is missing so PERSISTENCE_DRIVER=prisma never
# boots against an unmigrated or unconfigured database.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required before hosted Prisma migrate deploy." >&2
  exit 1
fi

echo "Applying Prisma migrations..."
# The first hosted deploy recorded 20260625000000_finance_durability as failed
# (UTF-8 BOM at byte 0; no SQL ran). Prisma then reports P3009 until that row
# is marked rolled back. This is a no-op when the row is not in a failed state.
set +e
npm run migrate:resolve:finance-durability -w @telpen/database
set -e
npm run db:migrate:deploy

if [ "${SKIP_DB_SEED:-}" = "true" ]; then
  echo "Skipping reference-data seed (SKIP_DB_SEED=true)."
  exit 0
fi

if [ ! -f packages/domain/dist/index.js ]; then
  echo "packages/domain/dist is required to seed reference data." >&2
  exit 1
fi

echo "Seeding continents, countries, and industry categories..."
node packages/database/prisma/seed.mjs
