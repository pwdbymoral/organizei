# PWA

Usamos o manifesto e um service worker nativo integrado ao Next 16 e ao App Router. O service worker armazena apenas o shell público; requests com cookie e conteúdo autenticado nunca entram no cache. A atualização usa `skipWaiting`/`clients.claim`; o logout limpa `localStorage`, `sessionStorage` e caches privados com prefixo `organizei-`, preservando o shell público.

Preferências e permissões de notificação são por usuário/dispositivo na tela **Mais**. A permissão do navegador não autoriza o service worker a armazenar dados financeiros: a tela offline continua sem conteúdo privado. Entrega remota de Web Push exige um serviço de assinatura/scheduler separado antes de ser ativada em produção.
