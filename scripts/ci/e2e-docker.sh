#!/usr/bin/env bash
set -euo pipefail
trap 'docker compose stop db >/dev/null 2>&1 || true' EXIT
docker compose up -d db
until docker compose exec -T db pg_isready -U organizei -d organizei >/dev/null; do sleep 1; done
DATABASE_URL=postgresql://organizei:organizei_local_only@localhost:5433/organizei pnpm db:migrate
DATABASE_URL=postgresql://organizei:organizei_local_only@localhost:5433/organizei pnpm db:seed
docker run --rm --network host --ipc=host -v "$PWD:/work" -w /work \
  -e DATABASE_URL=postgresql://organizei:organizei_local_only@127.0.0.1:5433/organizei \
  -e BETTER_AUTH_SECRET=synthetic-test-secret-with-at-least-32-characters \
  -e BETTER_AUTH_URL=http://127.0.0.1:3000 \
  mcr.microsoft.com/playwright:v1.57.0-noble bash -lc 'corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e'
