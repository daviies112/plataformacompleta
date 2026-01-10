# Documentação Técnica: Sistema de Videoconferência (MeetFlow/Nexus)

Este documento detalha as implementações realizadas para a plataforma de videoconferência multi-tenant, focando na infraestrutura 100ms e no sistema de acesso público para convidados.

## 1. Infraestrutura de Vídeo (100ms)
A plataforma utiliza o **100ms** como backend de infraestrutura de vídeo (SDK React v2).

### Papéis e Permissões (Roles)
- **host:** Atribuído a usuários autenticados na plataforma. Possui controle total: iniciar/parar gravação, encerrar reunião para todos, compartilhar tela e gerenciar participantes.
- **guest:** Atribuído a participantes externos via link público. Permissões restritas: apenas visualização/áudio, chat e compartilhamento de tela (se permitido pelo host).

## 2. Sistema de Acesso Público
Implementamos uma arquitetura que permite a entrada de clientes sem login, garantindo segurança e isolamento de dados.

### Rotas Públicas
- `/reuniao/:id`: Rota universal para acesso à sala.
- `/api/reunioes/:id/public`: Endpoint que retorna metadados da reunião (título, status) sem expor dados sensíveis.
- `/api/reunioes/:id/token-public`: Gera o token de acesso do 100ms especificamente com a role `guest`.

### Otimizações Mobile
- **Lazy Loading:** O componente `ReuniaoPublica` é carregado sob demanda para reduzir o tempo inicial no celular.
- **Roteamento Prioritário:** O `PlatformRouter` identifica links de reunião e ignora verificações pesadas de plataforma para carregar a sala instantaneamente.
- **Cache de Design:** Configurações de cores e logos da empresa são cacheadas por 10 minutos para evitar requisições repetitivas.

## 3. Sistema de Gravação SFU (Server-Side)
As gravações são processadas diretamente nos servidores da 100ms, evitando problemas de performance no navegador do host.
- **Endpoint de Controle:** `/api/100ms/recording/start` e `/stop`.
- **Sincronização:** Após a conclusão, a URL da gravação é automaticamente sincronizada com o banco de dados local e o Supabase do tenant.

## 4. Customização (Branding)
Cada tenant pode personalizar sua sala de reunião através do menu "Room Design":
- Cores de fundo, botões e controles.
- Logotipo personalizado com posicionamento configurável.
- Tela de entrada (Lobby) e tela de encerramento customizáveis.

---
**Data de Atualização:** 10 de Janeiro de 2026
**Status:** Implementado e Otimizado (Desktop & Mobile)
