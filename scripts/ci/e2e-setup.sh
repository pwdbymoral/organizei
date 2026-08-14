#!/usr/bin/env bash
set -Eeuo pipefail

playwright_version="$(node -p "require('./package.json').devDependencies['@playwright/test']")"
cache_dir="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.cache/ms-playwright}"
marker="$cache_dir/.organizei-playwright-${playwright_version}-linux.ready"

export PLAYWRIGHT_BROWSERS_PATH="$cache_dir"
mkdir -p "$cache_dir"

if [ -f "$marker" ] && find "$cache_dir" -maxdepth 2 -type d -name 'chromium-*' -print -quit | grep -q . \
  && find "$cache_dir" -maxdepth 2 -type d -name 'webkit-*' -print -quit | grep -q .; then
  echo "Playwright $playwright_version já está preparado em $cache_dir."
  exit 0
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "O E2E oficial exige Linux para reproduzir o ambiente do CI." >&2
  exit 1
fi

echo "Instalando Playwright $playwright_version, Chromium, WebKit e dependências do sistema..."
if ! pnpm exec playwright install --with-deps chromium webkit; then
  cat >&2 <<'EOF'
Não foi possível preparar o Playwright.
Em Linux, o comando precisa de APT e permissão sudo para instalar dependências nativas.
EOF
  exit 1
fi

touch "$marker"
echo "Playwright preparado em $cache_dir."
