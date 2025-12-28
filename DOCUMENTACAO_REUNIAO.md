# Documentação Técnica: Plataforma de Reuniões (ExecutiveAI Pro)

Este documento detalha a implementação técnica da funcionalidade de videoconferência, integrando o SDK da **100ms** com o ecossistema **React + Express** do ExecutiveAI Pro.

## 1. Arquitetura Geral

A solução foi construída utilizando uma abordagem multi-camadas para garantir segurança e escalabilidade:

### Backend (Express + Drizzle)
- **Schema (`shared/schema.ts`):** Tabela `reunioes` que armazena metadados da reunião (`titulo`, `data_inicio`, `status`) e chaves de integração (`room_id_100ms`).
- **Storage (`server/storage.ts`):** Interface para CRUD de reuniões, permitindo agendamento e atualização de status em tempo real.
- **Routes (`server/routes.ts`):** Endpoints para criação de reuniões (instantâneas ou agendadas) e geração de tokens de acesso (Auth Tokens) para a 100ms.

### Frontend (React + HMS SDK)
- **Custom Hook (`useReuniao`):** Gerencia o estado das reuniões, chamadas de API para início/término e integração com TanStack Query.
- **Componente Core (`Meeting100ms`):** Utiliza o `@100mslive/react-sdk` para renderizar o grid de vídeo, controles de áudio/mídia e chat.
- **Dashboard (`ReuniaoDashboardPage`):** Interface administrativa para visualização de reuniões próximas, em andamento e histórico.

---

## 2. Fluxo de Funcionamento (Join Meeting)

1.  **Navegação:** O usuário clica em "Entrar" no card da reunião.
2.  **Roteamento:** O sistema redireciona para `/reuniao/:id`.
3.  **Detecção de Estado:** O `MeetingDetailView` detecta se a reunião está `agendada`.
4.  **Auto-Start:** Se agendada, o sistema invoca automaticamente o endpoint de início de reunião, que gera a sala na infraestrutura da 100ms.
5.  **Conexão SDK:** O componente `Meeting100ms` recebe o `roomId`, solicita um token de acesso temporário ao backend e inicializa o fluxo de mídia (WebRTC).

---

## 3. Correções e Otimizações Realizadas

### Correção de Roteamento (404)
- **Problema:** O botão "Entrar" tentava acessar `/reunioes/:id` (plural), mas a rota registrada no `App.tsx` era `/reuniao/:id` (singular).
- **Solução:** Unificamos todas as referências para o padrão singular `/reuniao`, garantindo que o `wouter` (nosso roteador) encontrasse o componente correto.

### Integração com o Hub de Reuniões
- **Melhoria:** O `ReuniaoHubPage` (que gerencia as abas de Calendário, Gravações, etc.) agora detecta automaticamente se existe um ID de reunião na URL.
- **Efeito:** Se houver um ID, ele injeta esse ID diretamente no Dashboard, permitindo que o usuário entre na sala de vídeo sem sair do contexto das abas do sistema.

### Persistência de Dados
- Implementamos a sincronização com o banco de dados PostgreSQL para que o histórico de reuniões e os nomes dos participantes sejam mantidos mesmo após a atualização da página.

---

## 4. Tecnologias Utilizadas

- **100ms SDK:** Engine de videoconferência (alternativa robusta ao Zoom/Jitsi).
- **Lucide React:** Ícones de interface.
- **Tailwind CSS + Shadcn UI:** Estilização e componentes de interface.
- **Date-fns:** Manipulação de fusos horários e formatação de datas.

---

## 5. Próximos Passos Sugeridos

- **Gravações em Nuvem:** Ativar o webhook da 100ms para salvar os links das gravações automaticamente na aba "Gravações".
- **Transcrição IA:** Integrar a transcrição de texto (já presente no UI como stub) com a API da OpenAI Whisper.
