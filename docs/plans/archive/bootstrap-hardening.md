# Bootstrap hardening

Status: concluído em 2026-08-05, sem implementar domínio financeiro.

Escopo entregue: CI com permissões mínimas e ações fixadas por SHA; E2E no container oficial Playwright não-root, com PostgreSQL privado na rede do job; CLI administrativa executada em processos filhos contra PostgreSQL real; health com resposta 503 estável quando a consulta essencial falha; PWA com shell público, sem cache autenticado e limpeza de armazenamento privado no logout.

Evidências locais: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, unitários, integração com PostgreSQL real, `pnpm db:check`, `pnpm agents:check`, `pnpm security:check`, `pnpm verify`, `pnpm test:e2e:docker` e `pnpm audit --json` (zero vulnerabilidades). A exceção de Gitleaks é somente o fingerprint histórico `ca19a0e384eef34e4b2973541e3104f871c28b28:tests/integration/database.test.ts:generic-api-key:23`; o valor era sintético e não há allowlist por regra, arquivo ou commit.

Evidências remotas do commit `9fde4a0`: `CI / verify` passou em 1m26s; `CI / e2e` em 1m40s; Chromium e WebKit continuam executados separadamente; `CodeQL / analyze` passou em 57s; `Security / scan` em 23s; OSV e Trivy passaram. A execução anterior que instalava browsers excedia 25 minutos; o job atual não baixa browsers em execução.

Próximo marco: primeiro vertical slice financeiro, iniciado em um plano novo.
