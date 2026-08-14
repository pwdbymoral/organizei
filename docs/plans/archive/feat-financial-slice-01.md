# Plano Concluído — Primeiro Vertical Slice Financeiro (feat-financial-slice-01)

Este plano registra a implementação da primeira fatia vertical do planejador familiar de fluxo de caixa, do domínio ao banco e à interface, seguindo as premissas arquiteturais do projeto.

---

## 1. Goal (Objetivo)

Implementar o fluxo financeiro essencial para um **espaço familiar compartilhado**:

- Registro de saldo confirmado como checkpoints históricos imutáveis.
- Lançamento de movimentações financeiras avulsas (entradas/saídas, valores positivos + direção, previstos e realizados).
- Linha do tempo cronológica com status das movimentações.
- Cálculo e exibição da projeção diária do saldo a partir do fuso `America/Maceio`.

---

## 2. Acceptance Criteria (Critérios de Aceitação)

### A. Modelo de Domínio (`packages/domain`)

- [x] Implementar as entidades puras `FamilySpace` e `FamilyMembership` (suporta múltiplos membros, associando usuários Better Auth).
- [x] Implementar a entidade pura `ConfirmedBalance` (checkpoint imutável com espaço, valor em centavos positivos, data/hora da confirmação, autor e data de criação).
- [x] Implementar a entidade pura `FinancialMovement` (avulsa):
  - Atributos: descrição, direção (`income | expense`), valor previsto em centavos positivos (`amount_cents > 0`), data planejada (data civil sem horário), estado (`pending`, `realized`, `canceled`), autores (criação e alteração), timestamps, e controle de concorrência.
  - Campos opcionais preparados: valor realizado, data realizada, categoria e responsáveis.
- [x] Implementar o motor de projeção diária (`DailyProjectionEngine`) puro em `packages/domain`:
  - Recebe: saldo confirmado recente, data/hora do checkpoint, data civil atual no fuso do espaço (`America/Maceio`), lista de movimentações aplicáveis, e horizonte da projeção.
  - Comportamento: Ordena e processa movimentações sem duplicar realizadas pós-checkpoint, projeta vencidas no dia de hoje, e agrega eventos diários síncronos na memória.
- [x] Garantir cobertura integral dos invariantes críticos via testes unitários e testes baseados em propriedades (`fast-check`).

### B. Persistência e Migrações (`packages/database`)

- [x] Criar e versionar tabelas no banco de dados via Drizzle ORM:
  - `family_spaces`: UUID ou ID serial, nome, auditoria.
  - `family_memberships`: Mapeamento N:M de usuários para espaços, com papéis mínimos e índices adequados.
  - `confirmed_balances`: Checkpoints imutáveis (append-only), com valor em centavos inteiros, data de confirmação, ID do usuário autor, ID do espaço.
  - `financial_movements`: Campos de valores previstos/realizados, datas, timestamps, estado, auditoria e `version`/`updated_at` para concorrência.
  - `financial_audit_logs`: Registro de modificações para auditoria de segurança.
- [x] Adicionar constraints de banco (valores positivos, relacionamento correto de espaços, validação de campos baseados em estado).
- [x] Gerar migração com `pnpm db:generate`, validar com `pnpm db:check` e aplicar em PostgreSQL real via suíte Docker. Rollback, se necessário, é corretivo e versionado.

### C. Backend e Autorização (`apps/web`)

- [x] Obter sempre o usuário autenticado da sessão segura (Better Auth) e verificar a membership no espaço.
- [x] Aplicar todas as queries e escritas filtrando e limitando pelo espaço familiar validado.
- [x] Retornar erro seguro 403/404 em acessos não autorizados sem vazar a existência de registros de outros espaços.
- [x] Implementar tratamento seguro de concorrência (comparação de `updated_at` ou `version`) com resposta amigável em caso de conflito.

### D. Frontend Sóbrio e Mobile-First (`apps/web` & `packages/ui`)

- [x] Projetar interface mobile-first, sóbria, rápida e acessível (claro e escuro), coerente com o design system existente. Sem gradientes, glassmorphism ou animações decorativas.
- [x] **Home Dashboard**:
  - Saldo atual calculado, menor saldo projetado no horizonte, data da última confirmação, indicador de dia crítico (saldo negativo) e próximas movimentações.
  - Ação evidente para adicionar movimentação rápida e para novo checkpoint de saldo.
- [x] **Adição Rápida**:
  - Formulário limpo: descrição, direção (entrada/saída), valor e data planejada.
- [x] **Linha do Tempo (Timeline)**:
  - Agrupamento por dia, movimentações ordenadas e saldo ao final de cada dia.
  - Tags de status claras e ação rápida de realização direta.
  - Alerta de saldo negativo acessível.
- [x] **Confirmação de Saldo**:
  - Fluxo append-only que informa saldo disponível e cria um novo ponto de referência sem apagar os anteriores.

### E. Testes de Integração e E2E (`tests`)

- [x] Testes de integração com PostgreSQL real cobrindo: CRUD financeiro, transações, concorrência, constraints e isolamento estrito.
- [x] Testes E2E com Playwright em Chromium cobrindo fluxo compartilhado de 2 usuários, tentativas de invasão do usuário C e a11y com `@axe-core/playwright`.

---

## 3. Risks & Mitigations (Riscos e Mitigações)

- **Risco**: Isolamento incorreto de dados entre espaços familiares distintos.
  - **Mitigação**: Filtrar todas as queries do Drizzle pelo espaço autorizado obtido a partir da sessão ativa e testar acessos adversários.
- **Risco**: Inconsistências de data devido a timezones e conversões locais.
  - **Mitigação**: Seguir estritamente o fuso `America/Maceio` para datas civis e normalizar datas na projeção de domínio puro.
- **Risco**: Perda de histórico consolidado ou sobrescrita cega.
  - **Mitigação**: Manter saldos como checkpoints append-only e implementar controle de concorrência otimista nas movimentações.

---

## 4. Modules Impacted (Módulos Impactados)

- `packages/domain`: Entidades puras, invariantes críticos e motor de projeção diária.
- `packages/database`: Drizzle schema, constraints, migrações SQL versionadas.
- `apps/web`: Server Actions/API, middlewares de segurança de sessão, views mobile-first.
- `packages/testkit`: Criação de usuários e tokens de teste para múltiplos cenários de concorrência e invasão.

---

## 5. Progress (Fases de Implementação)

- [x] **Estratégia e Análise**: Estrutura mínima, com invariantes no domínio/banco e escopo de um espaço por dashboard.
- [x] **Fase 1: Domínio Pura (TDD)** — Testes unitários e property-based para o motor de projeção.
- [x] **Fase 2: Estrutura de Banco** — Tabelas, constraints e migrações `0002`/`0003` geradas e verificadas.
- [x] **Fase 3: Integração & Segurança (TDD)** — Ações autenticadas, escopo por membership, concorrência otimista e logs de auditoria transacionais.
- [x] **Fase 4: Interface do Usuário (Sóbria)** — Dashboard, adição, timeline e checkpoint responsivos nos dois temas.
- [x] **Fase 5: Testes E2E** — Cenários Playwright preparados para fluxo compartilhado, isolamento e a11y.
- [x] **Fase 6: Auditoria & Verificação** — `pnpm verify`, `pnpm verify:e2e` e auditoria de dependências concluídos.

---

## 6. Verification (Verificação de Sucesso)

- [x] Execução bem-sucedida de `pnpm verify`.
- [x] Execução bem-sucedida de `pnpm verify:e2e` (incluindo testes Docker).
- [x] Sem vulnerabilidades no `pnpm security:check`.
- [x] Documentação de dados, domínio e plano ativo atualizada.
