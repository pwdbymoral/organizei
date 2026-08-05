# GitHub settings

## Segurança e Alertas

Abra **Settings → Code security and analysis** e habilite:

- Secret scanning
- Push protection
- Dependabot alerts/updates
- Code scanning

## Regras de Proteção da Branch `main`

Em **Settings → Rules → Rulesets**, crie uma regra direcionada à branch `main` com as seguintes configurações:

### Proteções Básicas (Ativas de imediato):

- **Exigir Pull Request** antes de mesclar.
- **Exigir histórico linear** (linear history).
- **Bloquear force push**.
- **Bloquear exclusão** da branch.
- **Exigir resolução de todas as conversas** nos Pull Requests.

### Status Checks Obrigatórios (Habilitar após nomes estabilizarem e executarem com sucesso):

- `CI / verify`
- `CI / e2e`
- `CodeQL / analyze`
- `Security / scan`

## Histórico de Infraestrutura de CI

- O job de E2E originalmente falhava por atingir o timeout de 25 minutos do GitHub Actions na etapa de instalação das dependências do sistema e download do Chromium/WebKit. Para solucionar, o workflow roda dentro do container oficial do Playwright, fixado em `v1.57.0-noble@sha256:3bed4b1a12f2338642f3d8cba28e291deef3c66bd4a964bbeb3e57bbff511dbd`, como UID não-root 1001. O PostgreSQL é acessado apenas pela rede interna do job (`postgres:5432`), sem publicar porta no runner.
- Não use secrets em workflows vindos de forks.
