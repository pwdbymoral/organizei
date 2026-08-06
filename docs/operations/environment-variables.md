# Variáveis

| Variável              | Momento              | Regra                                                        |
| --------------------- | -------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | runtime              | PostgreSQL do ambiente; nunca publique o host/porta do banco |
| `BETTER_AUTH_SECRET`  | runtime              | aleatório, mínimo de 32 caracteres                           |
| `BETTER_AUTH_URL`     | runtime              | URL HTTPS da aplicação                                       |
| `NEXT_PUBLIC_APP_URL` | somente se utilizada | não é necessária para o fluxo atual                          |

Essas variáveis nunca entram na imagem, no git ou nos logs. A aplicação falha ao iniciar se as variáveis obrigatórias estiverem ausentes ou inválidas.
