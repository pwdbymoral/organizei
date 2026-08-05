# Autenticação

Better Auth com credenciais, cadastro público desativado, cookies seguros em produção e limite de tentativas. Criação inicial e recuperação ocorrem por comando administrativo seguro documentado; passkeys, TOTP e reautenticação ficam preparados, não instalados. A CLI pode receber a senha por stdin com `--password-stdin`, nunca por argumento; reset e revogação removem as sessões persistidas do usuário.
