# Especificação funcional

Há caixa único e dois usuários. Movimentações têm previsto/realizado, data planejada/realizada, pendente/realizada/não ocorrerá e atraso calculado. Regra recorrente aceita exceção “apenas esta” ou “esta e próximas”; passado não é reescrito. Parcelamento é uma recorrência finita por quantidade ou data final e pagamentos podem ser parciais. Um pagamento não pode exceder o restante, estar no futuro, nem coexistir com cancelamento; a realização integral é registrada como pagamento do saldo restante.
