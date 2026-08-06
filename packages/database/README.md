# Banco de dados

Schema de identidade, espaço familiar e fluxo financeiro. As tabelas financeiras incluem checkpoints append-only, movimentações com concorrência otimista (`version`) e trilha de auditoria mínima.

Use somente `db:generate` e `db:migrate`; `push` é proibido fora de experimentos locais descartáveis. As migrações `0002`, `0003` e `0006` são aditivas; `0006` cria preferências por usuário para tema e alertas. Para rollback em ambiente não produtivo, restaure o banco a um backup anterior ou aplique uma migração corretiva versionada — não altere uma migração já aplicada.
