# Documentação Técnica: Sistema de Gravações (Meetings)

Este documento detalha a implementação e arquitetura da página de **Gravações** da plataforma ExecutiveAI Pro, incluindo a integração com a API 100ms e a estratégia de recuperação de ativos.

## 1. Visão Geral
A página de Gravações permite que os usuários visualizem, gerenciem e assistam às gravações das reuniões realizadas via 100ms. O sistema foi projetado para ser resiliente a falhas comuns de APIs de vídeo, como a indisponibilidade temporária de IDs de ativos (`assetId`).

## 2. Arquitetura de Dados
As gravações são armazenadas na tabela `gravacoes` com os seguintes campos principais:
- `id`: UUID único da gravação no sistema.
- `tenantId`: Identificador do cliente (suporta UUIDs e strings customizadas como `dev-xxx`).
- `recordingId100ms`: ID da gravação retornado pelo 100ms.
- `assetId`: ID do arquivo físico para reprodução.
- `status`: Estado da gravação (started, stopped, completed, failed).

## 3. Funcionalidades Principais

### A. Sincronização Multi-Tenant
O sistema opera em modo híbrido:
1. **Banco Local (PostgreSQL):** Armazena o estado imediato das gravações.
2. **Supabase:** Sincroniza as gravações para persistência em nuvem específica do tenant.
3. **Fallback:** Caso a conexão com o Supabase falhe ou esteja vazia, o sistema prioriza os dados locais para garantir que o usuário nunca veja uma lista vazia.

### B. Estratégia de Recuperação de Vídeos (Cascade Strategy)
Para resolver o erro comum onde o 100ms retorna `404 Not Found` ao tentar gerar o link do vídeo, implementamos uma estratégia de 3 níveis:
1. **Direct Access:** Tenta gerar a URL usando o `assetId` armazenado.
2. **Recording Recovery:** Se falhar, utiliza o `recordingId100ms` para consultar a lista de ativos daquela gravação específica na API do 100ms.
3. **Auto-Update:** Ao recuperar um `assetId` perdido, o sistema atualiza automaticamente o banco de dados local e o Supabase para que as próximas visualizações sejam instantâneas.

### C. Geração de URLs Seguras (Presigned URLs)
As URLs de visualização são geradas dinamicamente com tokens de gerenciamento de curta duração, garantindo que os vídeos não fiquem expostos publicamente.

## 4. Endpoints de API
- `GET /api/reunioes/gravacoes/list`: Lista todas as gravações do tenant logado.
- `GET /api/reunioes/gravacoes/:id/url`: Gera o link de reprodução com lógica de auto-recuperação.
- `DELETE /api/reunioes/gravacoes/:id`: Remove a gravação do sistema e do storage remoto.

## 5. Frontend
A interface foi construída utilizando:
- **React + TailwindCSS:** Para um design responsivo e moderno.
- **Shadcn UI:** Componentes de Tabela, Badges e Botões.
- **Lucide Icons:** Iconografia para ações de "Assistir" e "Excluir".

---
*Documento gerado automaticamente pelo Replit Agent em 30 de Dezembro de 2025.*
