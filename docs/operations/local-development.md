# Desenvolvimento local

Node 24 e pnpm 11. Copie env, `docker compose up -d db` (porta host 5433), `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`. Pare com `docker compose down`; dados locais ficam no volume nomeado. A conveniência `pnpm test:e2e:docker` requer a imagem Playwright; a execução obrigatória acontece na CI.
