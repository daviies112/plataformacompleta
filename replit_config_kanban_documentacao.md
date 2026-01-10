# Documentação Técnica: Pipeline Kanban e Automações de Leads

Este documento detalha as configurações, automações e lógicas implementadas na página Kanban para os quadros de **Contato Inicial**, **Formulário Aprovado** e **Reprovado**, incluindo a solução para abertura de URLs em dispositivos móveis.

---

## 1. Arquitetura do Kanban (`src/features/kanban`)

O sistema de Kanban é alimentado por uma API unificada que agrega dados de quatro fontes principais no Supabase:
- `form_submissions`: Respostas de formulários preenchidos.
- `dados_cliente`: Dados mestre de clientes e status de reuniões.
- `formulario_envios`: Controle de links enviados via WhatsApp.
- `n8n_chat_histories`: Histórico de conversas por IA.

### Lógica de Estágios (`PIPELINE_STAGES`)
Os leads são movidos automaticamente entre colunas com base no estado dos dados:
- **Contato Inicial**: Estado padrão para novos leads vindos do WhatsApp ou importação manual.
- **Formulário Não Preenchido**: Leads que receberam um link (`formulario_envios`), mas ainda não concluíram.
- **Aprovado (Formulário)**: Leads com `qualificationStatus === 'approved'` ou pontuação acima do limite.
- **Reprovado (Formulário)**: Leads com `qualificationStatus === 'rejected'`.

---

## 2. Automações e Sincronização

### Polling de Dados (`server/routes/leadsPipelineRoutes.ts`)
O servidor implementa um sistema de cache inteligente (`leadsCache`) para evitar timeouts no Replit:
- **Tempo de Cache**: 1 minuto.
- **Agregação**: O `LeadJourneyAggregator` consolida o histórico do lead usando o telefone normalizado como chave única.
- **Status de Qualificação**: A lógica no backend converte valores booleanos, strings ("true"/"false") e numéricos (0/1) vindos do Supabase para um status padronizado no frontend.

---

## 3. Lógica de URL do Formulário e Mobile

### O Problema Mobile
Anteriormente, links de formulários passados via WhatsApp com parâmetros de query (ex: `?telefone=...`) podiam sofrer corrupção de caracteres ou ser mal interpretados por roteadores frontend, especialmente em navegadores mobile embarcados.

### A Solução (`src/features/formularios-platform/pages/FormularioPublico.tsx`)
Implementamos uma extração robusta de parâmetros que funciona em qualquer ambiente:

```typescript
const extractTelefone = (): string | null => {
  // 1. Tenta via search params padrão
  if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const tel = params.get('telefone');
    if (tel) return tel;
  }
  
  // 2. Fallback para caracteres codificados no path (%3F para ?)
  const href = decodeURIComponent(window.location.href);
  const match = href.match(/[?&]telefone=([^&]+)/);
  if (match) return match[1];
  
  // 3. Fallback para pathname (correção específica para mobile)
  const pathname = decodeURIComponent(window.location.pathname);
  const matchPath = pathname.match(/[?]telefone=([^&]+)/);
  if (matchPath) return matchPath[1];
  
  return null;
};
```

### Funcionalidades de Bloqueio e Captura:
- **Telefone Bloqueado**: Se o telefone vem da URL, o campo no formulário é marcado como `readOnly` para evitar erros de identificação.
- **Captura Automática**: Ao abrir o link, o sistema registra imediatamente o evento `iniciado` no Supabase para rastrear abandono de formulário.

---

## 4. Componentes Chave

- **`LeadCard.tsx`**: Exibe badges de status (Ativo, Pausado, Aprovado), resumo da última mensagem e indicadores de dados disponíveis (CPF, Transcrições).
- **`LeadDetailDialog`**: Modal completo que mostra:
  - Timeline de eventos.
  - Conversas formatadas (Cliente vs Agente/IA).
  - Detalhes de processos jurídicos (BigDataCorp).
  - Link direto para o formulário enviado.

---

## 5. Configurações de Banco de Dados (`shared/db-schema.ts`)

As tabelas críticas para o funcionamento deste módulo são:
1. `leads`: Armazena o estado atual no funil.
2. `form_submissions`: Dados das respostas e pontuação.
3. `formulario_envios`: Rastreia links de formulários únicos.
4. `whatsapp_qr_codes`: Gerenciamento da conexão WhatsApp.

---

*Documento gerado em 10 de Janeiro de 2026 para fins de backup e recuperação de ambiente.*