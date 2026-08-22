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
set +e
migrate_out="$(npm run db:migrate:deploy 2>&1)"
migrate_status=$?
set -e
printf '%s\n' "$migrate_out"

if [ "$migrate_status" -ne 0 ]; then
  if printf '%s\n' "$migrate_out" | grep -q '20260625000000_finance_durability' \
    && printf '%s\n' "$migrate_out" | grep -q 'P3018'; then
    echo "Marking failed finance_durability as rolled back (UTF-8 BOM; no SQL applied)..."
    npm run migrate:resolve:finance-durability -w @telpen/database
    npm run db:migrate:deploy
  else
    exit "$migrate_status"
  fi
fi

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
