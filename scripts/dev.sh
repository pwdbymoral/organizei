#!/usr/bin/env bash
set -euo pipefail

# Next resolves env files relative to apps/web. Mirror the local root file into
# the ignored app directory so monorepo development behaves like deployment.
if [ -f .env.local ]; then
  cp .env.local apps/web/.env.local
elif [ -f .env ]; then
  cp .env apps/web/.env.local
fi

exec pnpm --filter @organizei/web dev
