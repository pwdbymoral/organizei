# Estratégia QA

Vitest cobre funções puras; Testcontainers usa PostgreSQL real; Playwright cobre smoke, a11y, PWA e visual de telas fundamentais. `fast-check` será adotado junto ao domínio financeiro.

## Execução em Integração Contínua (CI)

Para otimizar o tempo de execução e evitar o download de navegadores e dependências de sistema na CI (o que causava timeouts acima de 25 minutos), a suíte E2E executa dentro da imagem Docker oficial do Playwright. A imagem é fixada na versão exata de `@playwright/test` e no digest `mcr.microsoft.com/playwright:v1.57.0-noble@sha256:3bed4b1a12f2338642f3d8cba28e291deef3c66bd4a964bbeb3e57bbff511dbd`.

A conexão com o banco de dados PostgreSQL (iniciado como um container de serviço pelo GitHub Actions) é estabelecida usando o host de rede interno do Docker (`postgres`) em vez de `localhost`; a porta não é publicada no runner. Chromium e WebKit rodam separadamente com um worker.
