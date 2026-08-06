# PWA

Manifesto e service worker nativo simples são usados: Next 16 + App Router tem integração estável sem plugin, enquanto Serwist não foi adotado sem evidência de compatibilidade específica. Cacheia apenas shell público; requests com cookie e conteúdo autenticado nunca entram no cache. Atualização usa `skipWaiting`/`clients.claim`; logout limpa `localStorage`, `sessionStorage` e caches privados com prefixo `organizei-`, preservando somente o shell público.

Preferências e permissões de notificação são por usuário/dispositivo na tela **Mais**. A permissão do navegador não autoriza o service worker a armazenar dados financeiros: a tela offline continua sem conteúdo privado. Entrega remota de Web Push exige um serviço de assinatura/scheduler separado antes de ser ativada em produção.
