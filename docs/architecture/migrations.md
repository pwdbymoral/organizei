# Migrações

Altere o schema pelo fluxo expandir → migrar/validar → alterar a aplicação → remover. `drizzle-kit generate` cria SQL e `drizzle-kit migrate` aplica; o startup não migra o banco.

A migração 0008 adiciona um índice para as movimentações ativas e remove ocorrências legadas marcadas como canceladas quando elas não possuem pagamentos. Registros cancelados com pagamentos são preservados para não apagar histórico financeiro e deixam de ser carregados pela aplicação. Antes de aplicar em produção, fazer backup; a remoção de ocorrências sem pagamentos não tem rollback lógico automático.
A migração 0009 adiciona o modo de cálculo (`reconstruct_history` ou `confirmed_checkpoint`) aos registros legados de saldo. Esses registros permanecem preservados para compatibilidade durante a migração do modelo.

A migração 0010 cria um saldo inicial por espaço a partir do saldo efetivo calculado no modelo legado. A aplicação passa a gravar e ler o saldo inicial; os registros confirmados antigos são preservados durante a compatibilidade. Antes de aplicar em produção, fazer backup e validar o saldo calculado antes e depois da migração.
