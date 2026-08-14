#!/usr/bin/env bash
set -Eeuo pipefail

playwright_version="$(node -p "require('./package.json').devDependencies['@playwright/test']")"
cache_dir="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.cache/ms-playwright}"
marker="$cache_dir/.organizei-playwright-${playwright_version}-linux.ready"

export PLAYWRIGHT_BROWSERS_PATH="$cache_dir"
echo "Node: $(node --version)"
echo "Playwright: $(pnpm exec playwright --version)"
echo "Browser cache: $cache_dir"

missing=0
if [ ! -f "$marker" ]; then
  echo "ERRO: bootstrap ausente; execute pnpm e2e:setup." >&2
  missing=1
fi
for browser in chromium webkit; do
  if ! find "$cache_dir" -maxdepth 2 -type d -name "${browser}-*" -print -quit 2>/dev/null | grep -q .; then
    echo "ERRO: browser $browser ausente; execute pnpm e2e:setup." >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "Playwright e browsers estão preparados."
