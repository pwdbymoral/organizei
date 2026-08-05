# Domínio

Regras puras do domínio financeiro: entidades de espaço/membership, checkpoints confirmados e motor de projeção diária. Valores de movimentação usam sempre centavos inteiros positivos acompanhados de direção; o saldo de um checkpoint é não negativo neste primeiro marco.

O motor trata datas civis em `America/Maceio`, ignora cancelamentos, não duplica realizações já cobertas pelo checkpoint e move pendências vencidas para o dia atual.
