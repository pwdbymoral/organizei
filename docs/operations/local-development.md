# Desenvolvimento local

Requisitos: Node 24+, pnpm 11+ e Docker Compose.

O caminho recomendado é:

```bash
pnpm install
pnpm setup
pnpm dev
```

`pnpm setup` cria `.env.local` se necessário, sobe o PostgreSQL local, aguarda o healthcheck e aplica as migrations. O banco é exposto na porta host `5433` apenas para desenvolvimento; a aplicação usa `3000`.

Para dados sintéticos, execute `pnpm db:seed` explicitamente depois do setup. Nunca execute seed em produção. Pare os serviços com `docker compose down`; os dados locais ficam no volume nomeado.

Comandos úteis:

- `pnpm test`: unitários e integração;
- `pnpm test:e2e:docker`: fluxo E2E com banco isolado e Playwright;
- `pnpm verify`: formatação, lint, tipos, testes, banco e build;
- `pnpm security:check`: auditoria de dependências.
