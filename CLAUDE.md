# Organizei — instruções canônicas

Missão: construir um planejador familiar de fluxo de caixa, público no código e privado nos dados. Nunca inclua dados reais, segredos, dumps ou logs sensíveis.

Estrutura: `apps/web` compõe rotas/UI; `packages/database` guarda schema e migrações; `packages/domain` fica puro; `packages/ui` guarda componentes compartilhados. Consulte `docs/index.md` antes de alterações de produto.

Fluxo obrigatório: leia este arquivo; classifique a mudança; carregue somente skills pertinentes; inspecione módulo, testes e consumidores; faça análise de impacto e critérios; escreva/atualize testes; implemente a menor mudança; revise segurança/PWA/tema/a11y quando aplicável; atualize documentação; execute checks e apresente evidências.

Comandos: `pnpm dev`, `pnpm db:migrate`, `pnpm test`, `pnpm verify`, `pnpm verify:e2e`. Use migrações versionadas (`generate`, `migrate`), nunca `push` em produção. Reset somente em banco não produtivo e com proteção explícita.

Dependências: pesquise documentação e advisories, use versões estáveis e instale apenas quando usadas. Não crie wrappers vazios nem abstrações especulativas. Mudanças grandes exigem plano vivo em `docs/plans/active`.

Pronto significa: tipos, lint, testes pertinentes, segurança, documentação e `pnpm verify` evidenciados. Skills locais estão em `.agents/skills`; use `database-migration`, `pwa-change`, `security-review`, `ux-review` e `finance-domain-change` apenas no escopo que seus nomes indicam.
