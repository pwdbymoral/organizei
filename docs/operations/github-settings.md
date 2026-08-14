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

- O job de E2E usa o runner nativo `ubuntu-24.04`, executa `pnpm e2e:setup` e roda Chromium/WebKit diretamente no host. O PostgreSQL é um service container isolado, publicado apenas na porta do job e acessado por `127.0.0.1:5432`. Local e CI compartilham o mesmo bootstrap e `scripts/ci/run-e2e.ts`, que aquece as rotas principais antes dos browsers.
- O `pnpm verify` executa checks independentes em paralelo e deixa o build para a segunda fase. O runner registra a duração de cada check no log para comparar a execução real entre runs. Como referência, o run `31595063072` da `main` levou 2m03s em `verify` e 2m40s em E2E antes desta alteração.
- Não use secrets em workflows vindos de forks.
