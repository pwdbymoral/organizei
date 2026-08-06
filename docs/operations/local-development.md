# Desenvolvimento local

Requisitos: Node 24+, pnpm 11+ e Docker Compose.

O caminho recomendado é:

```bash
pnpm install
pnpm setup
pnpm dev
```

`pnpm setup` cria `.env.local` se necessário, sobe o PostgreSQL local, aguarda o healthcheck e aplica as migrations. O banco é exposto na porta host `5433` apenas para desenvolvimento; a aplicação usa `3000`.

O script `pnpm dev` copia `.env.local` (ou `.env`) para o arquivo ignorado `apps/web/.env.local`, carrega essas variáveis, sobe e aguarda o PostgreSQL local quando `DATABASE_URL` aponta para `localhost:5433`, aplica as migrations versionadas e inicia o Next explicitamente na porta `3000` (ou em `PORT`, se definida). Se ambos existirem na raiz, `.env.local` tem precedência. Em produção, as variáveis devem ser fornecidas pelo ambiente da Coolify.

Se a porta escolhida estiver ocupada, o comando falha com essa informação em vez de trocar silenciosamente para outra porta, pois `BETTER_AUTH_URL` e os testes precisam apontar para a mesma origem.

Para dados sintéticos, execute `pnpm db:seed` explicitamente depois do setup. Nunca execute seed em produção. Pare os serviços com `docker compose down`; os dados locais ficam no volume nomeado.

Após o seed, entre em `http://localhost:3000/login` com `ana@example.test` e `senha-sintetica-segura-123`. Essas credenciais são exclusivamente sintéticas para desenvolvimento; não as reutilize em qualquer ambiente compartilhado.

Comandos úteis:

- `pnpm test`: unitários e integração;
- `pnpm test:e2e:docker`: fluxo E2E com banco isolado e Playwright;
- `pnpm verify`: formatação, lint, tipos, testes, banco e build;
- `pnpm security:check`: auditoria de dependências.
