# Documentação Técnica: Implementação do Sistema de Reuniões e Calendário

Este documento detalha exaustivamente os passos e componentes necessários para o funcionamento do sistema de agendamento de reuniões com integração 100ms e exibição em calendário no projeto ExecutiveAI Pro.

## 1. Arquitetura do Sistema

O sistema é dividido em três camadas principais:
1.  **Banco de Dados (Drizzle ORM)**: Armazenamento persistente das reuniões.
2.  **Backend (Express)**: APIs para CRUD, gerenciamento de tokens 100ms e webhooks.
3.  **Frontend (React)**: Interface de usuário com calendário interativo e dashboard.

---

## 2. Camada de Dados (Shared Schema)

As tabelas principais em `shared/db-schema.ts` são:
- `reunioes`: Armazena título, descrição, datas de início/fim, status, e o `roomId100ms`.
- `meeting_tenants` & `hms_100ms_config`: Armazenam as chaves de API (Access Key, Secret) necessárias para integrar com o serviço 100ms.

---

## 3. Backend (Servidor Express)

### 3.1. Rotas de API (`server/routes/meetings.ts`)
Este arquivo contém a lógica de negócio:
- `GET /api/reunioes`: Lista todas as reuniões do tenant atual.
- `POST /api/reunioes`: Cria um novo agendamento.
- `POST /api/reunioes/:id/start`: Cria uma sala no 100ms via API e atualiza o status para `em_andamento`.
- `GET /api/reunioes/:id/token`: Gera um token de acesso seguro para o participante entrar na sala.

### 3.2. Registro de Rotas (`server/routes.ts`)
As rotas de reunião devem ser registradas com o middleware de tenant para garantir isolamento de dados:
```typescript
app.use("/api/reunioes", requireTenant, (await import("./routes/meetings")).default);
```

### 3.3. Serviços de Integração (`server/services/meetings/hms100ms.ts`)
Lida com as chamadas externas para o 100ms (criar sala, desativar, gerenciar gravações).

---

## 4. Frontend (Interface React)

### 4.1. Hook de Gerenciamento (`src/features/reuniao-platform/hooks/useReuniao.ts`)
Utiliza `react-query` para gerenciar o estado global das reuniões e sincronizar com o backend.
- `addMeeting`: Função para criar agendamentos.
- `meetings`: Lista reativa de reuniões.

### 4.2. Calendário Interativo (`src/features/reuniao-platform/components/CalendarioPage.tsx`)
Implementado com `react-big-calendar`:
- **Conversão de Dados**: As reuniões do banco são mapeadas para o formato de eventos do calendário.
- **Interação**: Clicar em um horário abre o modal de criação; clicar em um evento mostra os detalhes e link da reunião.
- **Visualização**: Diferenciação visual entre reuniões online (100ms) e presenciais.

### 4.3. Modal de Agendamento (`src/features/reuniao-platform/modals/CreateEventModal.tsx`)
Formulário validado com `zod` e `react-hook-form`:
- Permite definir título, tipo (online/presencial), data e horários.
- Calcula a duração automaticamente e envia para a API.

### 4.4. Hub de Reuniões (`src/features/reuniao-platform/pages/ReuniaoHubPage.tsx`)
Centraliza as abas de Dashboard, Calendário, Gravações e Configurações. Utiliza `lazy loading` para otimizar a performance.

---

## 5. Fluxo de Funcionamento (Passo a Passo)

1.  **Agendamento**: O usuário acessa o Calendário e clica em "Nova Reunião". O `CreateEventModal` coleta os dados e chama `addMeeting`.
2.  **Persistência**: O backend salva a reunião no Postgres com status `agendada`.
3.  **Exibição**: O `CalendarioPage` detecta a nova reunião via `react-query` e a renderiza no grid de horários.
4.  **Início da Reunião**: No horário marcado, o usuário clica no evento e depois em "Iniciar Reunião". O backend cria a sala no 100ms e gera o link.
5.  **Participação**: O link é compartilhado com os convidados, que entram na sala usando tokens gerados dinamicamente.

---

## 6. Localização dos Arquivos Chave

| Componente | Caminho no Projeto |
| :--- | :--- |
| API de Reuniões | `server/routes/meetings.ts` |
| Hook Frontend | `src/features/reuniao-platform/hooks/useReuniao.ts` |
| Página Calendário | `src/features/reuniao-platform/components/CalendarioPage.tsx` |
| Modal de Criação | `src/features/reuniao-platform/modals/CreateEventModal.tsx` |
| Configuração Global | `server/routes.ts` |

---

## 7. Como Replicar

1.  **Backend**: Copie o arquivo `server/routes/meetings.ts` e certifique-se de registrá-lo em `server/routes.ts`.
2.  **Schema**: Verifique se as tabelas `reunioes` e `hms100msConfig` estão presentes no seu `db-schema.ts`.
3.  **Frontend**: Importe a pasta `src/features/reuniao-platform` para o seu projeto.
4.  **Dependências**: Certifique-se de ter instalado:
    - `react-big-calendar`
    - `date-fns`
    - `@tanstack/react-query`
    - `lucide-react`
5.  **Rotas**: Adicione a rota `/reuniao/*` no seu roteador principal (`DesktopApp.tsx` e `MobileApp.tsx`).