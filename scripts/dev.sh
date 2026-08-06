#!/usr/bin/env bash
set -euo pipefail

# Next resolves env files relative to apps/web. Mirror the local root file into
# the ignored app directory so monorepo development behaves like deployment.
env_file=''
if [ -f .env.local ]; then
  cp .env.local apps/web/.env.local
  env_file='.env.local'
elif [ -f .env ]; then
  cp .env apps/web/.env.local
  env_file='.env'
elif [ -f apps/web/.env.local ]; then
  env_file='apps/web/.env.local'
fi

# The E2E container already receives an isolated DATABASE_URL and has applied
# migrations before starting Next. Do not overwrite its runtime environment or
# try to access Docker from inside the Playwright container.
if [[ "${ORGANIZEI_E2E:-false}" == "true" ]]; then
  env_file=''
fi

# Apply versioned local migrations before Next starts so a fresh checkout does
# not fail when a new user preference or financial table is first accessed.
if [ -n "$env_file" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$env_file"
  set +a
  if [[ "${DATABASE_URL:-}" == *"localhost:5433"* ]]; then
    if ! command -v docker >/dev/null 2>&1; then
      echo "DATABASE_URL aponta para localhost:5433, mas Docker não está disponível. Inicie o PostgreSQL local ou ajuste DATABASE_URL." >&2
      exit 1
    fi
    docker compose up -d db
    until docker compose exec -T db pg_isready -U organizei -d organizei >/dev/null 2>&1; do
      sleep 1
    done
  fi
  pnpm db:migrate
fi

# Turbopack's development cache is disposable. Remove stale task storage left
# by a different Node/Next process or an interrupted build before booting.
rm -rf apps/web/.next/dev/cache/turbopack apps/web/.next/dev/lock

exec pnpm --filter @organizei/web dev --port "${PORT:-3000}"
