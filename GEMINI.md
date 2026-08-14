# Organizei — instruções canônicas

Missão: construir um planejador familiar de fluxo de caixa, público no código e privado nos dados. Nunca inclua dados reais, segredos, dumps ou logs sensíveis.

Estrutura: `apps/web` compõe rotas/UI; `packages/database` guarda schema e migrações; `packages/domain` fica puro; `packages/ui` guarda componentes compartilhados. Consulte `docs/index.md` antes de alterações de produto.

Fluxo obrigatório: leia este arquivo; classifique a mudança; carregue somente skills pertinentes; inspecione módulo, testes e consumidores; faça análise de impacto e critérios; escreva/atualize testes; implemente a menor mudança; revise segurança/PWA/tema/a11y quando aplicável; atualize documentação; execute checks e apresente evidências.

Documentação: escreva o estado atual de forma autônoma. Não descreva uma decisão por oposição a alternativas históricas, discussões ou conteúdo removido, exceto em ADRs, planos arquivados, changelogs, incidentes, migrações e compatibilidade, onde o histórico tiver função documental. Mantenha uma negação apenas quando ela registrar uma limitação, um requisito de segurança, um invariante, um limite de escopo, um comportamento contraintuitivo ou uma prevenção de uso incorreto. Na revisão, procure contrastes (`não X, mas Y`, `em vez de`, `não usa`, `sem depender de`), adjetivos avaliativos, intensificadores, transições e listas artificiais; remova-os somente quando nenhuma informação real desaparecer. Prefira verbos concretos e evidência. Preserve identificadores, comandos, contratos, precisão, gênero e voz do documento. Faça alterações locais, não substituições mecânicas, e registre no handoff os arquivos alterados, exemplos representativos e negações mantidas por necessidade.

TDD é um gate, não apenas uma recomendação. Para mudanças de comportamento, UI, copy, navegação ou interação: reproduza o teste afetado antes da implementação; registre a falha esperada; atualize o teste para o novo contrato; implemente; rode novamente o teste afetado e a suíte pertinente. Para mudanças em telas, formulários, navegação ou componentes interativos, `pnpm verify:e2e` deve passar antes do push. Se o E2E equivalente ao CI não puder ser executado localmente, não declare a mudança pronta nem faça push sem registrar explicitamente a exceção e sua autorização.

Ao trocar HTML nativo por shadcn/Radix ou alterar `Select`, `Tabs`, `Dialog`, `Drawer`, `Popover`, `Sheet`, `ToggleGroup`, headings, labels ou copy testada, revise todos os consumidores E2E. Use roles, labels e nomes acessíveis; não use APIs de elementos nativos em componentes customizados; não use texto não único sem restringir o locator à entidade selecionada; considere portais ao localizar conteúdo de Popover/Drawer/Dialog. Acessibilidade semântica — incluindo hierarquia de headings — faz parte do contrato.

Comandos: `pnpm dev`, `pnpm db:migrate`, `pnpm test`, `pnpm verify`, `pnpm verify:e2e`. Use migrações versionadas (`generate`, `migrate`), nunca `push` em produção. Reset somente em banco não produtivo e com proteção explícita.

Dependências: pesquise documentação e advisories, use versões estáveis e instale apenas quando usadas. Não crie wrappers vazios nem abstrações especulativas. Mudanças grandes exigem plano vivo em `docs/plans/active`.

Pronto significa: tipos, lint, testes pertinentes, segurança, documentação e `pnpm verify` evidenciados. Skills locais estão em `.agents/skills`; use `database-migration`, `pwa-change`, `security-review`, `ux-review` e `finance-domain-change` apenas no escopo que seus nomes indicam.
