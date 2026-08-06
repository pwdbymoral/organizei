# Notificações e preferências

As preferências de alertas são salvas por usuário e podem ser ajustadas em **Configurações**. Cada dispositivo possui uma assinatura Push própria, com timezone IANA e revogação independente. Nenhum valor, descrição de movimentação ou saldo é incluído em notificações ou na tela bloqueada.

O MVP entrega os seguintes avisos por Web Push, quando o usuário concede permissão e ativa o dispositivo:

| Tipo                 | Quando                                  | Texto seguro                                   |
| -------------------- | --------------------------------------- | ---------------------------------------------- |
| Lembrete de registro | Horário diário configurado              | “Lembrete: registre as movimentações de hoje.” |
| Resumo diário        | A partir das 08:00 locais               | “Seu resumo diário está pronto no Organizei.”  |
| Vencimentos próximos | Existe pendência nos próximos dois dias | “Há movimentações próximas para revisar.”      |
| Saldo baixo          | A projeção possui primeiro dia negativo | “A previsão do caixa merece sua atenção.”      |

O worker de notificações roda como recurso separado na Coolify, usando as mesmas fontes e o mesmo banco da aplicação. Entregas são idempotentes por usuário, tipo e data; assinaturas inválidas são removidas. Se VAPID, worker ou permissão não estiverem disponíveis, a interface mostra o estado inativo em vez de prometer envio.
