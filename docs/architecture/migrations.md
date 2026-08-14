# Migrações

Altere o schema pelo fluxo expandir → migrar/validar → alterar a aplicação → remover. `drizzle-kit generate` cria SQL e `drizzle-kit migrate` aplica; o startup não migra o banco.

A migração 0008 adiciona um índice para as movimentações ativas e remove ocorrências legadas marcadas como canceladas quando elas não possuem pagamentos. Registros cancelados com pagamentos são preservados para não apagar histórico financeiro e deixam de ser carregados pela aplicação. Antes de aplicar em produção, fazer backup; a remoção de ocorrências sem pagamentos não tem rollback lógico automático.
A migração 0009 adiciona o modo de cálculo (`reconstruct_history` ou `confirmed_checkpoint`) aos checkpoints de saldo. Registros antigos permanecem sem modo e passam por recalibração explícita antes do uso do dashboard.
