# Plano ativo — UX de transações e realização

## Objetivo

Reduzir operações acidentais em ocorrências futuras e tornar claras as diferenças entre período, data planejada e data realizada.

## Implementado

- A tela de transações inicia no mês atual e oferece mês anterior, próximo mês e visão de todas.
- Realizadas usam `realizedDate` na lista e na edição.
- A edição de recorrências começa por uma escolha explícita de escopo: somente esta, esta e próximas ou todas as futuras.
- Uma realização pode voltar a pendente; pagamentos são removidos dentro da mesma transação e a reversão fica auditada.
- O formulário de nova transação usa presets de data e controles com altura consistente.
- A edição de uma série permite informar a data da primeira nova ocorrência sem reescrever o histórico.
- A edição iniciada por uma ocorrência realizada começa na próxima ocorrência futura e não duplica a data realizada.
- Ocorrências pendentes sem pagamentos podem ser excluídas individualmente ou junto com as próximas da série; cancelamentos não são mais criados pelo fluxo da aplicação.

## Verificação

- Unitários cobrem resolução do período.
- Integração cobre desfazer realização, pagamentos e auditoria.
- E2E cobre período padrão, escolha de escopo e desfazer realização.
- `pnpm verify:e2e` permanece obrigatório; a execução local depende de PostgreSQL e runtime de containers.
