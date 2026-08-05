# Organizei

Planejador de fluxo de caixa familiar compartilhado, construído em público sem expor dados financeiros.

Status: **primeiro vertical slice financeiro implementado**: espaço familiar, checkpoints append-only, movimentações avulsas, projeção diária e auditoria mínima. Recorrências, parcelamentos e pagamentos parciais continuam fora deste marco.

Stack: Next.js 16, TypeScript estrito, PostgreSQL, Drizzle, Better Auth, Tailwind e Playwright.

## Executar

Copie `.env.example` para `.env`, inicie `docker compose up -d db`, execute `pnpm db:migrate`, `pnpm db:seed` e `pnpm dev`. O seed é exclusivamente sintético. Crie usuários reais somente pelo procedimento em `docs/operations/account-recovery.md`.

## Validar

`pnpm verify` executa os checks obrigatórios; `pnpm verify:e2e` executa E2E. Consulte [docs](docs/index.md), [contribuição](CONTRIBUTING.md) e [segurança](SECURITY.md). Licença MIT.
