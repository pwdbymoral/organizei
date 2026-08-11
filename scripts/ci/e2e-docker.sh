#!/usr/bin/env bash
set -euo pipefail
trap 'docker compose stop db >/dev/null 2>&1 || true' EXIT
docker compose up -d db
until docker compose exec -T db pg_isready -U organizei -d organizei >/dev/null; do sleep 1; done
AUTH_SECRET="${BETTER_AUTH_SECRET:-$(openssl rand -hex 32)}"
BETTER_AUTH_SECRET="$AUTH_SECRET" DATABASE_URL=postgresql://organizei:organizei_local_only@localhost:5433/organizei pnpm db:migrate
BETTER_AUTH_SECRET="$AUTH_SECRET" DATABASE_URL=postgresql://organizei:organizei_local_only@localhost:5433/organizei pnpm db:seed
mkdir -p apps/web/.next test-results
docker run --rm --user 0 -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.57.0-noble chown -R "$(id -u):$(id -g)" apps/web/.next test-results
docker run --rm --user 0 -v organizei-e2e-node-modules:/work/node_modules \
  mcr.microsoft.com/playwright:v1.57.0-noble chown -R "$(id -u):$(id -g)" /work/node_modules
docker run --rm --user "$(id -u):$(id -g)" --network host --ipc=host -v "$PWD:/work" -v organizei-e2e-node-modules:/work/node_modules -w /work \
  -e CI=true \
  -e DATABASE_URL=postgresql://organizei:organizei_local_only@127.0.0.1:5433/organizei \
  -e "BETTER_AUTH_SECRET=$AUTH_SECRET" \
  -e BETTER_AUTH_URL=http://127.0.0.1:3000 \
  -e ORGANIZEI_E2E=true \
  mcr.microsoft.com/playwright:v1.57.0-noble bash -lc 'mkdir -p /tmp/bin && COREPACK_HOME=/tmp/corepack corepack enable --install-directory /tmp/bin && export COREPACK_HOME=/tmp/corepack PATH=/tmp/bin:$PATH && pnpm install --store-dir /tmp/pnpm-store --frozen-lockfile && pnpm test:e2e'
