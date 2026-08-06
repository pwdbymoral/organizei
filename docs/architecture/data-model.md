# Modelo conceitual futuro

Espaço familiar possui membros, checkpoints manuais de saldo e movimentações. O usuário vê “Saldo atual”; o domínio deriva esse valor a partir do último checkpoint e dos eventos realizados depois dele, sem incluir pendências. Recorrência possui versões de regra e ocorrências; ocorrência recebe realizações parciais. Categoria e responsável são opcionais e permanecem pós-MVP. Auditoria e preferências são independentes e as preferências pertencem diretamente ao usuário.

Assinaturas Push pertencem ao usuário e ao dispositivo, não ao espaço. Entregas possuem chave idempotente, status e tentativas para que o worker possa repetir com segurança sem duplicar alertas. Payloads não carregam dados financeiros. Simulação é temporária e não persiste; importação e integração bancária continuam futuras. Criado por não é responsável financeiro.
