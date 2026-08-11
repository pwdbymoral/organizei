# Migrações

Fluxo é expandir, migrar/validar, alterar aplicação e remover. `drizzle-kit generate` cria SQL e `drizzle-kit migrate` aplica; startup não migra banco.

A migração 0008 adiciona um índice para as movimentações ativas e remove ocorrências legadas marcadas como canceladas quando elas não possuem pagamentos. Registros cancelados com pagamentos são preservados para não apagar histórico financeiro e deixam de ser carregados pela aplicação. Antes de aplicar em produção, fazer backup; a remoção de ocorrências sem pagamentos não tem rollback lógico automático.
