# Plano ativo — Robustez do MVP financeiro

## Objetivo

Concluir o MVP financeiro com recorrências e pagamentos corretos, uma interface utilizável em telas pequenas, tratamento de falhas acessível e evidência de qualidade proporcional ao risco financeiro.

## Escopo e limites

- Inclui saldo confirmado, movimentações, recorrências semanais/mensais, exceções, parcelamento, pagamentos parciais e projeções diária/mensal.
- Mantém a regra de caixa familiar único e autorização por associação ao espaço.
- Não inclui CSV, simulações, categorias, responsáveis ou novos papéis de acesso.
- Usar componentes acessíveis de uma biblioteca estável somente quando reduzirem trabalho real; customizar com os tokens existentes e não criar wrappers vazios.

## Critérios de aceite

- Uma exceção pode afetar somente uma ocorrência ou esta e as próximas, sem mudar qualquer ocorrência passada.
- Recorrências preservam a âncora de dia do mês (incluindo 29, 30 e fim de mês), respeitam data final ou quantidade total de parcelas e continuam materializadas no horizonte de projeção.
- Todo valor realizado tem uma origem coerente: pagamento(s) ou realização integral; não é possível realizar, cancelar ou pagar um saldo incompatível com pagamentos prévios.
- Falhas de validação e conflito concorrente são explicadas no próprio fluxo, com foco e anúncio acessível.
- Fluxos financeiros funcionam por teclado e em viewport móvel, sem sobreposição, rolagem horizontal nem alvos de toque insuficientes.
- Banco preserva integridade referencial e metadados Drizzle coerentes; toda alteração é uma migração aditiva versionada.
- `pnpm verify`, integração PostgreSQL e E2E executam com resultados registrados antes de encerrar o plano.

## Etapas

### 1. Corrigir o modelo e as invariantes de recorrência

- [x] Definir a semântica de âncora mensal e implementar geração sem deriva após fevereiro.
- [x] Modelar exceção de uma ocorrência sem alterar a regra-base.
- [x] Corrigir divisão futura: encerrar somente ocorrências a partir da data efetiva, preservar pendentes anteriores e transferir o limite restante de parcelas.
- [ ] Adicionar proteção contra concorrência na criação da próxima versão da série.
- [x] Materializar séries ativas até o horizonte de projeção de forma idempotente na leitura/rotina apropriada.

### 2. Consolidar pagamentos, realização e projeções

- [x] Escolher e documentar a fonte de verdade para realização integral e pagamento parcial.
- [x] Impedir realização/cancelamento incompatível com pagamentos existentes e validar a data de pagamento.
- [x] Corrigir projeções para considerar o estado realizado e pagamentos no instante correto, sem duplicação nem antecipação indevida.
- [x] Adicionar FKs e constraints necessárias entre ocorrência, regra e pagamentos; regenerar a metadata da migração de forma coerente.

### 3. Entregar os fluxos de produto e UX

- [x] Incluir fim por data na criação/edição de recorrência e controles reais para editar “esta” e “esta e próximas”.
- [x] Substituir ações densas em linha por controles responsivos e acessíveis, usando primitivos estáveis quando agregarem diálogo, menu ou feedback.
- [ ] Aplicar formatação pt-BR de moeda/data e estados claros de pendente, saldo restante, realizado e cancelado.
- [x] Exibir mensagens de sucesso, validação e conflito com foco previsível e região de anúncio.
- [ ] Validar tema claro/escuro, foco, contraste e alvos de toque.

### 4. Cobertura e verificação de risco

- [ ] Testes unitários para mês curto/fim de mês, limites, exceções e projeção com pagamentos em datas distintas.
- [ ] Testes de integração PostgreSQL para isolamento, integridade referencial, corrida de pagamento e preservação de histórico ao dividir série.
- [ ] E2E para criação/edição de recorrência, exceções, parcelas, pagamento parcial, falhas recuperáveis, teclado, axe e viewports móvel/desktop.
- [ ] Executar `pnpm verify`, `pnpm test:integration` em runtime com PostgreSQL e `pnpm verify:e2e`; registrar os resultados no PR.

### 5. Documentação e encerramento

- [ ] Atualizar escopo, especificação funcional e decisões de recorrência conforme o comportamento entregue.
- [ ] Fazer revisão de segurança, impacto, PWA e UX após as alterações.
- [ ] Arquivar este plano somente após todos os critérios estarem evidenciados.

## Riscos conhecidos

- Lançar recorrência com alteração retroativa pode corromper a confiança no histórico financeiro.
- Mudanças em projeção podem alterar saldos exibidos; requerem casos de regressão explícitos.
- Componentes de formulário e feedback mal integrados podem regredir acessibilidade mesmo com Axe sem violações na tela inicial.
- A indisponibilidade local de runtime de contêiner impede afirmar a passagem dos testes de integração; a CI ou Docker local é obrigatório para a evidência final.

## Módulos afetados

- `packages/domain`: datas civis, regras de recorrência, pagamentos e projeções.
- `packages/database`: schema, constraints, migrações e metadata Drizzle.
- `apps/web/src/lib/financial-core.ts` e ações: autorização, transações e invariantes.
- `apps/web/src/app/add` e `apps/web/src/app/app`: formulários, estados e responsividade.
- `tests/unit`, `tests/integration`, `tests/e2e` e documentação de produto/qualidade.

## Estado atual

As fundações de recorrência, pagamentos parciais e projeções já estão registradas nos commits `f1ab34f`, `cf34bbb` e `d6aa602`. Os itens acima permanecem pendentes; este plano não representa conclusão do MVP.
