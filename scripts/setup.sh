#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null || ! command -v pnpm >/dev/null; then
  echo "Node 24+ e pnpm 11+ são necessários." >&2
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
pnpm_major="$(pnpm --version | cut -d. -f1)"
if [ "$node_major" -lt 24 ] || [ "$pnpm_major" -lt 11 ]; then
  echo "Use Node 24+ e pnpm 11+. Encontrado Node ${node_major} e pnpm ${pnpm_major}." >&2
  exit 1
fi

if [ ! -f .env.local ] && [ ! -f .env ]; then
  cp .env.example .env.local
  echo "Criado .env.local a partir de .env.example; revise o segredo antes de usar."
fi

docker compose up -d db
echo "Aguardando PostgreSQL..."
for attempt in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U organizei -d organizei >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "PostgreSQL não ficou disponível." >&2
    exit 1
  fi
  sleep 1
done

pnpm db:migrate
if [ -f .env.local ]; then
  cp .env.local apps/web/.env.local
elif [ -f .env ]; then
  cp .env apps/web/.env.local
fi
echo "Ambiente pronto. Execute 'pnpm dev' para iniciar o app."
