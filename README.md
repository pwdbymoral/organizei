# Organizei

Planejador de fluxo de caixa familiar compartilhado, construído em público sem expor dados financeiros.

Status: **fundação técnica concluída**; funcionalidades financeiras estão **planejadas**, não implementadas.

Stack: Next.js 16, TypeScript estrito, PostgreSQL, Drizzle, Better Auth, Tailwind e Playwright.

## Executar

Copie `.env.example` para `.env`, inicie `docker compose up -d db`, execute `pnpm db:migrate` e `pnpm dev`. Crie os dois usuários somente pelo procedimento em `docs/operations/account-recovery.md`.

## Validar

`pnpm verify` executa os checks obrigatórios; `pnpm verify:e2e` executa E2E. Consulte [docs](docs/index.md), [contribuição](CONTRIBUTING.md) e [segurança](SECURITY.md). Licença MIT.
