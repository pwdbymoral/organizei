# Coolify

## Topologia

Use dois recursos privados na mesma rede da Coolify:

1. aplicação web a partir do `Dockerfile` deste repositório;
2. PostgreSQL persistente separado.

Somente a aplicação recebe domínio público. O PostgreSQL não recebe porta pública. A aplicação escuta internamente em `3000` e possui healthcheck em `/api/health`.

## Variáveis

Configure em runtime, nunca no Dockerfile ou no repositório:

| Variável             | Obrigatória | Observação                                     |
| -------------------- | ----------- | ---------------------------------------------- |
| `DATABASE_URL`       | sim         | hostname interno do PostgreSQL, banco dedicado |
| `BETTER_AUTH_SECRET` | sim         | segredo aleatório com pelo menos 32 caracteres |
| `BETTER_AUTH_URL`    | sim         | URL HTTPS pública da aplicação                 |

Não use as credenciais do `compose.yaml` em produção. `NEXT_PUBLIC_APP_URL` só deve ser configurada se uma feature pública futura realmente a utilizar.

## Primeiro deploy e releases

1. Crie o PostgreSQL com volume persistente e backup externo.
2. Crie o recurso Docker apontando para este repositório e para a porta interna `3000`.
3. Configure domínio, HTTPS e healthcheck.
4. Configure as variáveis de runtime.
5. Faça backup antes da primeira migration de produção.
6. Execute `pnpm db:migrate` em um job/release temporário conectado ao mesmo `DATABASE_URL`.
7. Faça o rollout da imagem e confirme `/api/health`.
8. Verifique login, carregamento do dashboard e criação de uma movimentação sintética.

Rollback deve reverter a imagem somente depois de avaliar a migration aplicada. Migrations não devem ser desfeitas automaticamente nem por `db:push`.

## Preview deployments

Cada preview deve ter aplicação, URL e PostgreSQL isolados. O preview recebe um `BETTER_AUTH_URL` próprio, executa `pnpm db:migrate` antes de iniciar e nunca aponta para o banco de produção. Ao fechar o preview, remova o recurso e seu volume conforme a política de retenção da equipe.
