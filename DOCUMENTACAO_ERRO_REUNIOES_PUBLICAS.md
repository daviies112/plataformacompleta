# Documentação de Erro: Acesso às Reuniões Públicas

## 1. Descrição do Problema
O acesso externo às reuniões (via link compartilhado com clientes) não estava funcionando corretamente. Embora o lobby (pre-view) carregasse, a entrada na reunião falhava ou travava para participantes não autenticados.

## 2. Causa Raiz
O problema foi identificado como um conflito de roteamento no backend (`server/routes.ts`):
- **Middleware de Proteção Inadequado**: O endpoint `/api/reunioes/:id/token-public`, responsável por gerar o token de acesso para visitantes, estava sendo interceptado pelo middleware `requireTenant`.
- **Falta de Sessão**: Como clientes externos não possuem uma sessão de login, o middleware retornava `401 Unauthorized`, impedindo a conexão com a sala de vídeo do 100ms.
- **Registro de Rotas**: As rotas públicas estavam sendo registradas de forma que o Express as confundia com rotas privadas protegidas.

## 3. Impacto
- Clientes externos não conseguiam entrar em reuniões agendadas.
- O botão "Entrar" no lobby não funcionava para visitantes.
- Bots de gravação podiam falhar ao tentar acessar a sala.

## 4. Solução Implementada
- **Reorganização de Rotas**: Movemos o registro das rotas públicas de reunião para antes de qualquer middleware de autenticação global no `server/routes.ts`.
- **Isolamento de Endpoints**: Garantimos que `/api/reunioes/:id/public`, `/api/reunioes/:id/token-public` e `/api/reunioes/:id/room-design-public` sejam explicitamente acessíveis sem token de sessão.
- **Normalização de Caminhos**: Corrigimos a duplicidade de prefixos (`/api/reunioes/reunioes/...`) no roteador público.

## 5. Validação
- Testada a geração de token sem cabeçalhos de autenticação.
- Verificado o carregamento do design e dados da reunião de forma anônima.
- Confirmado que o `requireTenant` continua protegendo as rotas administrativas.