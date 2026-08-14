# Contas

Cadastro público permanece desativado. Execute a CLI somente em terminal interativo, com `DATABASE_URL` e `BETTER_AUTH_SECRET` presentes no ambiente seguro. A senha nunca é argumento, variável persistente ou saída do comando.

Crie os dois usuários iniciais com `pnpm admin:user:create pessoa@example.test "Nome"`. Para recuperar acesso, use `pnpm admin:user:reset-password pessoa@example.test`; isto também revoga sessões. Para encerramento de sessão sem trocar senha: `pnpm admin:user:revoke-sessions pessoa@example.test`. `pnpm admin:user:list` mostra apenas ID, nome, e-mail e data; auditoria registra ação e alvo, nunca credenciais.

Em produção, inclua `ORGANIZEI_ADMIN_CONFIRM=yes` apenas na execução interativa aprovada. Para investigar falhas, confirme migrações e conexão antes. Rollback significa restaurar um backup e investigar o registro de auditoria; não edite senhas no banco.
