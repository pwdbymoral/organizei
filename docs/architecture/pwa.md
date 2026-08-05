# PWA

Manifesto e service worker nativo simples são usados: Next 16 + App Router tem integração estável sem plugin, enquanto Serwist não foi adotado sem evidência de compatibilidade específica. Cacheia apenas shell público; requests com cookie e conteúdo autenticado nunca entram no cache. Atualização usa `skipWaiting`/`clients.claim`; logout deve limpar caches locais.
