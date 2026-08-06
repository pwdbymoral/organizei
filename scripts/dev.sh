#!/usr/bin/env bash
set -euo pipefail

# Next resolves env files relative to apps/web. Mirror the local root file into
# the ignored app directory so monorepo development behaves like deployment.
if [ -f .env.local ]; then
  cp .env.local apps/web/.env.local
elif [ -f .env ]; then
  cp .env apps/web/.env.local
fi

# Apply versioned local migrations before Next starts so a fresh checkout does
# not fail when a new user preference or financial table is first accessed.
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  pnpm db:migrate
fi

# Turbopack's development cache is disposable. Remove stale task storage left
# by a different Node/Next process or an interrupted build before booting.
rm -rf apps/web/.next/dev/cache/turbopack apps/web/.next/dev/lock

exec pnpm --filter @organizei/web dev
