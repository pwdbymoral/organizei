# Desenvolvimento local

Requisitos: Node 24+, pnpm 11+, Linux Ubuntu 24.04 (ou compatível) e Docker Compose para o PostgreSQL isolado.

O caminho recomendado é:

```bash
pnpm install
pnpm setup
pnpm dev
```

`pnpm setup` cria `.env.local` se necessário, sobe o PostgreSQL local, aguarda o healthcheck e aplica as migrations. O banco é exposto na porta host `5433` apenas para desenvolvimento; a aplicação usa `3000`.

O script `pnpm dev` copia `.env.local` (ou `.env`) para o arquivo ignorado `apps/web/.env.local`, carrega essas variáveis, sobe e aguarda o PostgreSQL local quando `DATABASE_URL` aponta para `localhost:5433`, aplica as migrations versionadas e inicia o Next explicitamente na porta `3000` (ou em `PORT`, se definida). Se ambos existirem na raiz, `.env.local` tem precedência. Em produção, as variáveis devem ser fornecidas pelo ambiente da Coolify.

Se a porta escolhida estiver ocupada, o comando falha e informa a porta. `BETTER_AUTH_URL` e os testes precisam apontar para a mesma origem.

Para dados sintéticos, execute `pnpm db:seed` explicitamente depois do setup. Nunca execute seed em produção. Pare os serviços com `docker compose down`; os dados locais ficam no volume nomeado.

Após o seed, entre em `http://localhost:3000/login` com `ana@example.test` e `senha-sintetica-segura-123`. Essas credenciais são exclusivamente sintéticas para desenvolvimento; não as reutilize em qualquer ambiente compartilhado.

Comandos úteis:

- `pnpm test`: unitários e integração;
- `pnpm e2e:setup`: instala Chromium, WebKit e dependências nativas no cache local;
- `pnpm e2e:doctor`: verifica se o bootstrap E2E está pronto;
- `pnpm verify:e2e`: fluxo E2E completo com browsers nativos e PostgreSQL isolado;
- `pnpm verify`: checks independentes executados em paralelo; o build roda depois que todos terminam;
- `pnpm verify:all`: todas as verificações locais equivalentes aos gates do CI;
- `pnpm security:check`: auditoria de dependências.

## Verificação completa

O comando recomendado para agentes é:

```bash
pnpm verify:all
```

O E2E usa browsers instalados em `.cache/ms-playwright` e um PostgreSQL efêmero separado, criado pelo Compose na porta `55433`. `pnpm e2e:setup` instala browsers e dependências do sistema na primeira execução; as seguintes usam o cache local. `pnpm test:e2e:local` inicia o PostgreSQL, verifica o bootstrap e chama o runner TypeScript, que inicia Chromium e WebKit em paralelo contra o mesmo servidor e banco, separando os outputs em `test-results/chromium` e `test-results/webkit`.

No primeiro bootstrap Linux, `pnpm e2e:setup` precisa de APT e permissão `sudo` para instalar as bibliotecas nativas do WebKit. Se o ambiente não permitir sudo, prepare essas dependências administrativamente antes de executar o comando.

Para diagnosticar apenas o E2E:

```bash
pnpm verify:e2e
```

Se o bootstrap estiver ausente, `pnpm verify:e2e` falha rapidamente e instrui a executar `pnpm e2e:setup`; ele não inicia downloads implícitos.
