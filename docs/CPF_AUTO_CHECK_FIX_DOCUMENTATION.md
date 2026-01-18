# Documentação: Correções do Sistema de Consulta Automática de CPF

**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Resolvido

---

## Resumo Executivo

Este documento detalha as correções implementadas para resolver o problema da consulta automática de CPF não ser disparada quando um formulário era submetido via Supabase. O problema envolvia múltiplas falhas em diferentes camadas do sistema.

---

## Problema Original

Quando um usuário submetia um formulário público:
1. Os dados eram salvos corretamente no Supabase (incluindo CPF, Instagram, endereço)
2. **MAS** a consulta automática de CPF nunca era disparada
3. **E** os dados extras (CPF, Instagram, endereço) não apareciam no lead local

---

## Causas Raiz Identificadas

### Problema 1: Background Jobs Nunca Processados

**Arquivo:** `server/index.ts`

**Causa:** As funções `initializeQueues()` e `startAutomation()` eram **importadas mas nunca chamadas** no startup do servidor.

```typescript
// ANTES (PROBLEMÁTICO)
import { initializeQueues, shutdownQueues } from "./lib/queue";
import { startAutomation, stopAutomation } from "./lib/automationManager";
// ... mas nunca eram chamadas!

// Background tasks
setImmediate(async () => {
  // Background initialization logic... (VAZIO!)
});
```

**Consequências:**
- Handlers de jobs nunca eram registrados
- Queues nunca processavam jobs enfileirados
- Polling de novas submissions nunca iniciava
- Consulta automática de CPF nunca era disparada

**Correção Aplicada:**
```typescript
// DEPOIS (CORRIGIDO)
setImmediate(async () => {
  try {
    initializeQueues();
    log('✅ Background job queues initialized');
    
    startAutomation();
    log('✅ Form submission automation started');
    
    startMonitoring();
    startAutomaticAlerting();
    log('✅ Monitoring and alerting started');
  } catch (error) {
    console.error('❌ Failed to start background services:', error);
  }
});
```

---

### Problema 2: Campos Extras Não Passados na Sincronização

**Arquivo:** `server/formularios/routes.ts`

**Causa:** Quando uma submission era processada via Supabase (rota direta), a chamada para `syncSubmissionToLead` não incluía os campos extras.

```typescript
// ANTES (INCOMPLETO)
await leadSyncService.syncSubmissionToLead({
  id: parsedData.id,
  formId: parsedData.formId,
  tenantId: tenantId,
  contactPhone: parsedData.contactPhone,
  contactName: parsedData.contactName,
  contactEmail: parsedData.contactEmail,
  totalScore: parsedData.totalScore,
  passed: parsedData.passed,
});
```

**Correção Aplicada:**
```typescript
// DEPOIS (COMPLETO)
await leadSyncService.syncSubmissionToLead({
  id: parsedData.id,
  formId: parsedData.formId,
  tenantId: tenantId,
  contactPhone: parsedData.contactPhone,
  contactName: parsedData.contactName,
  contactEmail: parsedData.contactEmail,
  contactCpf: parsedData.contactCpf,
  instagramHandle: parsedData.instagramHandle,
  birthDate: parsedData.birthDate,
  addressCep: parsedData.addressCep,
  addressStreet: parsedData.addressStreet,
  addressNumber: parsedData.addressNumber,
  addressComplement: parsedData.addressComplement,
  addressNeighborhood: parsedData.addressNeighborhood,
  addressCity: parsedData.addressCity,
  addressState: parsedData.addressState,
  agendouReuniao: parsedData.agendouReuniao,
  dataAgendamento: parsedData.dataAgendamento,
  answers: parsedData.answers,
  totalScore: parsedData.totalScore,
  passed: parsedData.passed,
});
```

---

## Arquitetura do Sistema de CPF Auto-Check

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FORMULÁRIO PÚBLICO                           │
│                 (src/features/formularios-platform)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                   │
│              (form_submissions table)                           │
│  Campos: contact_cpf, instagram_handle, address_*, etc.         │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────────┐
│   ROTA DIRETA API    │              │     FORM POLLER          │
│ POST /api/form-subs  │              │ (formSubmissionPoller.ts)│
│                      │              │ Polling a cada 2 min     │
└──────────────────────┘              └──────────────────────────┘
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PROCESSING QUEUE                        │
│                      (server/lib/queue.ts)                      │
│              Job type: sync_form_submission                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LEAD SYNC SERVICE                          │
│             (server/formularios/services/leadSync.ts)           │
│                                                                 │
│  1. Normaliza telefone e CPF                                    │
│  2. Determina qualificationStatus (approved/rejected)           │
│  3. Cria/atualiza lead no PostgreSQL local                      │
│  4. Se approved + CPF presente → triggerAutoCPFCheck()          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   triggerAutoCPFCheck()                         │
│                                                                 │
│  1. Verifica se BigDataCorp está configurado para o tenant     │
│  2. Valida o CPF                                                │
│  3. Chama checkCompliance() (verifica cache primeiro)           │
│  4. Salva resultado no Supabase Cliente                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CPF AUTO-CHECK POLLER (backup)                     │
│          (server/lib/automationManager.ts)                      │
│                                                                 │
│  Verifica a cada ciclo se há leads aprovados sem consulta CPF   │
│  Usa o tenantId correto do banco de dados                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos Críticos

| Arquivo | Função |
|---------|--------|
| `server/index.ts` | Startup do servidor - DEVE chamar `initializeQueues()` e `startAutomation()` |
| `server/lib/queue.ts` | Define handlers de jobs e processa queues em background |
| `server/lib/formSubmissionPoller.ts` | Monitora Supabase por novas submissions |
| `server/lib/automationManager.ts` | Gerencia automação e polling de CPF |
| `server/formularios/services/leadSync.ts` | Sincroniza submissions para leads e dispara CPF check |
| `server/formularios/routes.ts` | Rotas de API para submissions (deve passar todos os campos) |
| `server/lib/bigdatacorpClient.ts` | Cliente da API BigDataCorp com suporte multi-tenant |
| `server/lib/datacorpCompliance.ts` | Lógica de verificação de compliance com cache |

---

## Configuração de Credenciais

### BigDataCorp (Consulta CPF)

As credenciais são armazenadas na tabela `bigdatacorp_config` do PostgreSQL:

| Campo | Descrição |
|-------|-----------|
| `tenant_id` | ID do tenant (ex: `dev-daviemericko_gmail_com`) |
| `token_id` | Token ID da API BigDataCorp (criptografado) |
| `chave_token` | Chave do token (criptografado) |
| `supabase_master_url` | URL do Supabase Master para cache (opcional) |
| `supabase_master_service_role_key` | Chave do Supabase Master (opcional) |

**Importante:** As credenciais são buscadas via `getCredentials(tenantId)` que:
1. Primeiro tenta buscar do banco de dados para o tenant específico
2. Se não encontrar, tenta usar variáveis de ambiente como fallback

---

## Checklist de Verificação Pós-Exportação

Após exportar o projeto, verifique:

- [ ] `server/index.ts` contém chamadas para `initializeQueues()` e `startAutomation()` no bloco `setImmediate()`
- [ ] `server/formularios/routes.ts` passa todos os campos extras para `syncSubmissionToLead()`
- [ ] Tabela `bigdatacorp_config` existe e tem credenciais para o tenant
- [ ] Logs de startup mostram:
  - `✅ Background job queues initialized`
  - `✅ Form submission automation started`
  - `✅ Handler registrado para job type: sync_form_submission`

---

## Logs Esperados (Sistema Funcionando)

```
✅ Handler registrado para job type: sync_form_submission
🚀 Iniciando processamento da fila: data-processing
✅ Todas as filas de background jobs inicializadas
✅ Form submission automation started
📊 [FormPoller] Tenant X: N submissions não sincronizadas ou atualizadas
🆔 [LeadSync] CPF normalizado: XXX.XXX.XXX-XX → XXXXXXXXXXX
✅ [LeadSync] Lead XXX atualizado com sucesso!
🔍 [LeadSync] Disparando consulta CPF automática para lead APROVADO...
✅ [CPFAutoCheck] Consulta CPF concluída - Status: approved/rejected
✅ [ClienteSupabase] Compliance salvo no Supabase do Cliente
```

---

## Troubleshooting

### CPF Auto-Check não dispara

1. **Verificar se queues estão inicializadas:**
   ```
   Logs devem mostrar: "✅ Todas as filas de background jobs inicializadas"
   ```

2. **Verificar se automação está rodando:**
   ```
   Logs devem mostrar: "✅ Form submission automation started"
   ```

3. **Verificar credenciais BigDataCorp:**
   ```sql
   SELECT tenant_id FROM bigdatacorp_config;
   ```

4. **Verificar se formulário foi aprovado:**
   - CPF auto-check só dispara quando `qualificationStatus === 'approved'`
   - Isso depende de `passed === true` na submission

### Campos extras não aparecem no lead

1. Verificar se a rota está passando todos os campos para `syncSubmissionToLead()`
2. Verificar se o FormPoller está enfileirando com os campos corretos
3. Verificar logs: `🆔 [LeadSync] CPF normalizado:` deve aparecer

---

## Histórico de Correções

| Data | Correção | Arquivo |
|------|----------|---------|
| Jan 2026 | Adicionar chamadas initializeQueues() e startAutomation() | server/index.ts |
| Jan 2026 | Passar todos campos extras para syncSubmissionToLead | server/formularios/routes.ts |

---

## Contato

Para questões sobre este sistema, consulte este documento ou verifique os arquivos mencionados.
