# Organizei

Planejador de fluxo de caixa familiar compartilhado, construído em público sem expor dados financeiros.

Status: **núcleo financeiro implementado**: caixa familiar consolidado, saldo inicial real, ajustes auditados, transações realizadas e previstas, recorrências, parcelamentos, pagamentos parciais, importação CSV, projeções de 30 a 365 dias e notificações configuráveis. O produto continua restrito a dois usuários internos e usa dados sintéticos no repositório.

Stack: Next.js 16, TypeScript estrito, PostgreSQL, Drizzle, Better Auth, Tailwind e Playwright.

## Executar

Copie `.env.example` para `.env`, inicie `docker compose up -d db`, execute `pnpm db:migrate`, `pnpm db:seed` e `pnpm dev`. O seed é exclusivamente sintético. Crie usuários reais somente pelo procedimento em `docs/operations/account-recovery.md`.

## Validar

`pnpm verify` executa os checks obrigatórios. Antes do primeiro E2E, o usuário deve preparar manualmente os browsers e as dependências nativas do WebKit em um terminal interativo:

```bash
sudo -v
pnpm e2e:setup
```

Depois disso, `pnpm verify:e2e` executa os E2E e `pnpm verify:all` executa todos os gates locais. O agente não consegue responder ao prompt de senha do `sudo` sozinho. Consulte [docs](docs/index.md), [desenvolvimento local](docs/operations/local-development.md), [contribuição](CONTRIBUTING.md) e [segurança](SECURITY.md). Licença MIT.
