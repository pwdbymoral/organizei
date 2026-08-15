# Plano ativo — Importação CSV discreta e orientada

## Objetivo

Manter a importação CSV disponível para quem precisa importar dados, sem competir com o lançamento manual de transações, e explicar o contrato do arquivo para pessoas e ferramentas de IA.

## Estado atual

- A tela de transações oferece `Importar CSV` em `Mais ações`, dentro de uma Sheet responsiva.
- A Sheet reúne modelo, guia de campos, prompt copiável para IA, seleção de arquivo, prévia e confirmação.
- O modelo baixado continua contendo somente os cabeçalhos separados por ponto e vírgula.
- O guia documenta as 12 colunas, formatos, valores aceitos e regras condicionais.
- A importação permanece validada antes da gravação e atômica.

## Contrato do guia

- `tipo`: `transacao` ou `recorrencia`.
- `direcao`: `income` ou `expense`.
- `situacao`: `realizada` ou `pendente`.
- Datas usam `AAAA-MM-DD`.
- Valores usam números positivos com até duas casas; o parser aceita o formato brasileiro.
- `data_pagamento` é obrigatória para lançamentos realizados.
- Recorrências usam `periodicidade` e `inicio_recorrencia`.
- `fim_recorrencia` e `quantidade_ocorrencias` são alternativas.
- `inicio_recorrencia` deve ser igual à primeira `data_planejada`.
- `fim_recorrencia` deve ser igual ou posterior à primeira data planejada.
- `quantidade_ocorrencias` aceita de 1 a 120 ocorrências.
- Uma importação pode gerar no máximo 5.000 movimentações.
- `valor_realizado` pode divergir de `valor` quando o pagamento real for diferente da previsão e só vale para lançamentos realizados.

## Verificação

- Unitários cobrem o alinhamento do guia com os cabeçalhos e o prompt para IA.
- E2E cobre descoberta progressiva, abertura da Sheet, acessibilidade, prévia e importação válida.
- `pnpm verify` e `pnpm verify:e2e` são obrigatórios antes do handoff.
