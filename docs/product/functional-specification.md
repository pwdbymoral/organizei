# Especificação funcional

Há caixa único e dois usuários. O primeiro acesso coleta um saldo inicial manual; depois, o saldo é atualizado automaticamente pelas transações realizadas. A conferência manual é um recurso de correção e permanece como checkpoint histórico. Pendências não alteram o saldo atual, mas entram no caixa disponível e nas projeções.

Movimentações têm previsto/realizado, data planejada/realizada, pendente/realizada/não ocorrerá e atraso calculado. Regra recorrente aceita exceção “apenas esta” ou “esta e próximas”; passado não é reescrito. Parcelamento é uma recorrência finita por quantidade ou data final e pagamentos podem ser parciais. Um pagamento não pode exceder o restante, estar no futuro, nem coexistir com cancelamento; a realização integral é registrada como pagamento do saldo restante.

O caixa livre é calculado de forma conservadora até o próximo recebimento conhecido, incluindo despesas pendentes até essa data. Sem recebimento futuro, usa o fim do mês como fallback e informa o período.
