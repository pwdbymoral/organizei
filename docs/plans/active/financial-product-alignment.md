# Plano ativo — alinhamento do produto financeiro

## Objetivo

Alinhar o Organizei ao uso de um caixa familiar consolidado: saldo inicial real, transações previstas e realizadas, ajustes como transações auditadas, lançamentos rápidos e projeções de até 365 dias.

O teste de usabilidade fica fora deste plano.

## Fases e branches

1. `phase-1-financial-opening-balance`: remover checkpoints e modos de cálculo; implementar saldo inicial e ajustes.
2. `phase-2-quick-transaction-entry`: simplificar o lançamento comum e preservar opções avançadas.
3. `phase-3-long-range-cash-forecast`: adicionar horizontes de 30, 90, 180 e 365 dias.
4. `phase-4-product-documentation`: consolidar documentação, status e contratos.

A fase 1 bloqueia as fases 2 e 3. As fases 2 e 3 podem ser desenvolvidas em paralelo após a integração da fase 1. A fase 4 depende de ambas.

Fases 1 e 2 foram integradas ao `main` após passarem pelos checks obrigatórios.

Fase 3 foi integrada ao `main` após passar por `pnpm verify`, E2E, segurança e checks remotos.

Fase 4 consolida nesta branch a documentação de visão, escopo, glossário, capacidades futuras e status.

## Invariantes

- O espaço possui um caixa familiar único e consolidado.
- O saldo inicial representa o saldo real atual no momento do cadastro.
- Transações históricas anteriores ao saldo inicial permanecem no histórico e não alteram o saldo atual.
- Eventos realizados depois do saldo inicial alteram o saldo uma única vez.
- Pendências não alteram o saldo atual e entram nas projeções.
- Correção de saldo cria uma transação realizada de ajuste e seu pagamento.
- Valores financeiros usam centavos inteiros positivos e direção explícita.
- Histórico financeiro e auditoria são preservados.

## Bloqueios conhecidos

- A fase 4 precisa passar por `pnpm verify` e pelos checks remotos antes de ser integrada.
- A renomeação semântica de `plannedDate`/`planned_date` está registrada em plano externo próprio e não faz parte desta fase.

## Verificação final

Executar `pnpm verify:all`, além de `pnpm db:check`, `pnpm agents:check` e `pnpm security:check`, registrando resultados e limitações.

Estado da execução: fases 1, 2 e 3 passaram por `pnpm verify` e E2E local/remoto. A fase 4 aguarda sua própria verificação.
