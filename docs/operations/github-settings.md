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

- O job de E2E originalmente falhava por atingir o timeout de 25 minutos do GitHub Actions na etapa de instalação das dependências do sistema e download do Chromium/WebKit. Para solucionar, o workflow foi otimizado para rodar dentro do container oficial do Playwright, reduzindo drasticamente o tempo de inicialização na CI.
- Não use secrets em workflows vindos de forks.
