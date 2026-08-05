# Bootstrap hardening

Objetivo: fechar as lacunas verificáveis do bootstrap sem introduzir domínio financeiro.

Escopo: E2E em Docker, CLI administrativa Better Auth/PostgreSQL, auditoria e workflows de segurança, testes de saúde/PWA/autorização e validação limpa.

Aceitação: `verify`, E2E Docker Chromium/WebKit, comandos administrativos testados, imagem não-root e documentação operacional verificável.

Riscos: Docker do host e imagens Playwright; advisories transitórios; APIs internas de Better Auth. Módulos: web, database, scripts, QA, CI e docs.

Progresso: migração/auditoria administrativa, seed idempotente, script Docker E2E e workflow `CI / e2e` configurados. Verificações locais: tipos, migração e seed executados. E2E local permanece bloqueado pelo pull da imagem Playwright no Docker/WSL e não será repetido; a execução real obrigatória está pendente em `CI / e2e`. A branch padrão remota é `main`; este plano e todos os hardenings posteriores seguem em `bootstrap/foundation` via PR. O plano só pode ser arquivado após `CI / verify`, `CI / e2e`, `CodeQL / analyze` e `Security / scan` verdes.
