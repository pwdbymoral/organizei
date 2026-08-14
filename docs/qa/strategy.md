# Estratégia QA

Vitest cobre funções puras; Testcontainers usa PostgreSQL real; Playwright cobre smoke, a11y, PWA e visual de telas fundamentais. `fast-check` será adotado junto ao domínio financeiro.

## Execução em Integração Contínua (CI)

Local e CI executam a suíte E2E no Ubuntu nativo. O bootstrap `pnpm e2e:setup` instala Chromium, WebKit e suas dependências para a versão exata de `@playwright/test` em `.cache/ms-playwright`; o CI mantém esse diretório em cache por versão do lockfile. `pnpm verify:e2e` valida o bootstrap e executa os testes.

A conexão com o banco de dados PostgreSQL usa um serviço isolado: `127.0.0.1:55433` localmente e `127.0.0.1:5432` no GitHub Actions. `scripts/ci/e2e-local.ts` orquestra o Compose local; o runner compartilhado `scripts/ci/run-e2e.ts` prepara migrations, seed e aplicação e executa Chromium e WebKit em paralelo, cada um com um worker e seu próprio output/log. O mesmo runner TypeScript é usado localmente e no GitHub Actions.

O gate recomendado para agentes é `pnpm verify:all`, que executa `pnpm verify` e `pnpm verify:e2e`. O E2E oficial usa o mesmo bootstrap e o mesmo runner em local e CI. `pnpm e2e:doctor` diagnostica versão, cache e browsers; `pnpm test:e2e` permanece disponível para diagnóstico sem banco.
