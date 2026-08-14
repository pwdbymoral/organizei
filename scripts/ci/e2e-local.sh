#!/usr/bin/env bash
set -Eeuo pipefail

AUTH_SECRET="${BETTER_AUTH_SECRET:-$(openssl rand -hex 32)}"
export BETTER_AUTH_SECRET="$AUTH_SECRET"
export DATABASE_URL="${DATABASE_URL:-postgresql://organizei:organizei_local_only@127.0.0.1:55433/organizei}"
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://127.0.0.1:3000}"
export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"
export ORGANIZEI_E2E=true
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.cache/ms-playwright}"

compose=(docker compose -f compose.e2e.yaml -p organizei-e2e)
cleanup() {
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

"${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
"${compose[@]}" up -d postgres
until "${compose[@]}" exec -T postgres pg_isready -U organizei -d organizei >/dev/null; do
  sleep 1
done

bash scripts/ci/e2e-doctor.sh
pnpm exec tsx scripts/ci/run-e2e.ts
