# Deploy

O `Dockerfile` produz uma imagem standalone e executa o servidor como usuário não-root na porta `3000`. Segredos são exclusivamente runtime.

Checklist de release:

- build da imagem com `pnpm install --frozen-lockfile` e `pnpm build`;
- `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` configuradas no ambiente alvo;
- backup verificado antes da migration;
- `pnpm db:migrate` executado explicitamente;
- healthcheck `/api/health` verde;
- login e uma operação financeira sintética validados;
- logs revisados sem tokens, senhas ou dados financeiros reais.

Não existe deploy automático neste repositório. O pipeline/preview da Coolify deve ser configurado no projeto remoto seguindo `coolify.md`.
