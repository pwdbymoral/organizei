# Domínio

Regras puras do domínio financeiro: entidades de espaço/membership, saldo inicial real, ajustes e motor de projeção diária. Valores de movimentação usam sempre centavos inteiros positivos acompanhados de direção; o saldo inicial é não negativo.

O motor trata datas civis em `America/Maceio`, ignora cancelamentos, não duplica realizações anteriores ao saldo inicial e move pendências vencidas para o dia atual.
