# Especificação funcional

Há caixa único e dois usuários. O primeiro acesso coleta um saldo inicial manual; depois, a interface apresenta o saldo atual estimado a partir do último checkpoint e dos eventos realizados posteriormente. Pendências não alteram o saldo atual, mas entram no caixa livre e nas projeções.

Movimentações têm previsto/realizado, data planejada/realizada, pendente/realizada/não ocorrerá e atraso calculado. Regra recorrente aceita exceção “apenas esta” ou “esta e próximas”; passado não é reescrito. Parcelamento é uma recorrência finita por quantidade ou data final e pagamentos podem ser parciais. Um pagamento não pode exceder o restante, estar no futuro, nem coexistir com cancelamento; a realização integral é registrada como pagamento do saldo restante.

O caixa livre é calculado de forma conservadora até o próximo recebimento conhecido, incluindo despesas pendentes até essa data. Sem recebimento futuro, usa o fim do mês como fallback e informa o período.
