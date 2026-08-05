# Segurança do repositório

CI usa permissões mínimas, ações fixadas por SHA e não usa `pull_request_target`. O job `CI / e2e` usa somente PostgreSQL e credenciais sintéticas. Habilite no GitHub: **Settings → Code security and analysis** → Secret scanning, Push protection e CodeQL. Em **Settings → Rules → Rulesets**, exija PR, histórico linear, bloqueio de force-push e os checks `CI / verify`, `CI / e2e`, `CodeQL / analyze` e `Security / scan`.

Após autenticar: `gh auth login`, `gh auth status`. Em seguida o proprietário pode verificar com `gh repo view --web` e configurar rulesets pela interface; nenhum recurso remoto foi alterado aqui.
