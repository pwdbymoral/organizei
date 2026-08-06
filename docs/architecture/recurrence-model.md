# Recorrência

Regra imutável por versão; exceção pode alterar somente uma ocorrência ou cortar série para próximas. Ocorrências históricas não são reescritas: ao criar uma versão futura, somente ocorrências pendentes a partir da data efetiva são canceladas e rematerializadas. Recorrência mensal calcula cada ocorrência a partir da âncora original para preservar dias 29, 30, 31 e fim de mês. Séries ativas são materializadas idempotentemente até o horizonte anual do painel.
