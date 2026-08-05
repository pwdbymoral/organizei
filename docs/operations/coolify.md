# Coolify

Crie recurso Docker para app e PostgreSQL separado, configure domínio `app.organizei.forjacorp.com`, HTTPS e health check. Aplique `pnpm db:migrate` explicitamente antes do rollout; rollback reverte imagem, não migração destrutiva.
