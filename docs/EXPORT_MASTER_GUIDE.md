# ExecutiveAI Pro - Guia Master de Exportação

**Data:** 2026-01-27
**Versão:** 1.0.0
**Objetivo:** Documento exaustivo para exportação e reconstrução 100% completa da plataforma

---

## SUMÁRIO EXECUTIVO

Este documento consolida TODAS as informações necessárias para exportar o projeto ExecutiveAI Pro via GitHub e reconstruí-lo em qualquer ambiente sem perda de funcionalidades.

### Estatísticas da Plataforma

| Categoria | Quantidade | Fonte Autoritativa |
|-----------|------------|-------------------|
| Arquivos Backend (server/) | 142 arquivos .ts | - |
| Arquivos Frontend (src/) | 904 arquivos .tsx/.ts | - |
| Endpoints de API | 269 | `data/audit/api_routes.json` |
| Tabelas Supabase | 68 (9 Owner + 59 Tenant) | `data/audit/supabase_tables.json` |
| Variáveis de Ambiente | 106 | `data/audit/environment_vars.json` |
| Integrações Externas | 11 | `data/audit/integrations.json` |
| Automações/Pollers | 28 (9 pollers + 19 jobs) | `data/audit/automations.json` |
| Arquivos de Dados Persistentes | 10 | `data/audit/data_files.json` |
| Documentos de Referência | 20 | `docs/` |

> **IMPORTANTE:** Os arquivos em `data/audit/` contêm a lista completa e autoritativa de cada categoria. Este documento resume os pontos críticos, mas para reconstrução 100%, consulte os arquivos de auditoria.

---

## SEÇÃO 1: CORREÇÕES CRÍTICAS (NUNCA ESQUECER)

### 1.1 Pagar.me - Correções de Janeiro 2026

**PROBLEMA:** PIX parou de funcionar após exportação anterior.
**CAUSA:** Faltava `closed: true` e `expires_in` era NUMBER ao invés de STRING.

| Campo | ERRADO | CORRETO |
|-------|--------|---------|
| `closed` | Ausente | `closed: true` |
| `expires_in` | `86400` (number) | `"86400"` (string) |

**ARQUIVO:** `server/services/pagarme.ts`

```typescript
// CORRETO - método createPixOrder()
const orderData = {
  closed: true,  // OBRIGATÓRIO!
  customer: {...},
  items: [...],
  payments: [{
    payment_method: 'pix',
    pix: {
      expires_in: String(expiresIn),  // DEVE ser STRING!
      additional_information: [...]
    }
  }]
};
```

**VERIFICAÇÃO PÓS-EXPORTAÇÃO:**
```bash
grep -n "closed: true" server/services/pagarme.ts
# Deve retornar 3 linhas (createPixOrder, createCardOrder, createCardOrderWithData)
```

### 1.2 BigDataCorp - Cache de Consultas

**PROBLEMA:** Consultas de cache não apareciam no histórico.
**CAUSA:** Não criava novo registro no datacorp_checks para cache hits.

**SOLUÇÃO:** Agora cria registro com `source: 'cache_hit_manual'` e `origin_check_id` apontando para original.

**ARQUIVO:** `server/lib/datacorpCompliance.ts`

### 1.3 Solicitação de Produtos (Product Requests)

**TABELAS NECESSÁRIAS:**
- `product_requests` (Supabase Tenant)

**ARQUIVOS:**
- `server/routes/split.ts` - GET/PATCH `/api/split/product-requests`
- `src/pages/solicitacoes.tsx` - Interface admin

### 1.4 Fluxo de Assinatura Digital - Correções Janeiro 2026

**PROBLEMA 1:** Campo "Bairro" no formulário de endereço não salvava (coluna não existe no Supabase).
**SOLUÇÃO:** Campo removido do formulário. Campos obrigatórios agora são: Rua, Número, Cidade, Estado, CEP.

**PROBLEMA 2:** Após captura do comprovante de endereço, usuário precisava clicar em botão para avançar.
**SOLUÇÃO:** Progressão automática após 1.5 segundos quando comprovante é salvo com sucesso.

**ARQUIVOS MODIFICADOS:**

| Arquivo | Mudança |
|---------|---------|
| `src/components/assinatura/steps/ResellerWelcomeStep.tsx` | Campo "Bairro" removido do formulário e validação |
| `src/components/assinatura/steps/ResidenceProofStep.tsx` | Progressão automática após salvar comprovante |
| `src/contexts/ContractContext.tsx` | `AddressData.neighborhood` agora é opcional (?) |

**VERIFICAÇÃO PÓS-EXPORTAÇÃO:**
```bash
# Verificar que neighborhood é opcional no tipo
grep -n "neighborhood?" src/contexts/ContractContext.tsx
# Deve retornar: neighborhood?: string;

# Verificar que progressão automática está presente
grep -n "Avançando automaticamente" src/components/assinatura/steps/ResidenceProofStep.tsx
# Deve retornar a mensagem de avanço automático

# Verificar que Bairro não é mais obrigatório no formulário
grep -c "Bairro" src/components/assinatura/steps/ResellerWelcomeStep.tsx
# Deve retornar 1 (apenas no interface, não no formulário)
```

**COLUNAS DE ENDEREÇO NO SUPABASE (Tenant):**
```
address_street, address_number, address_complement, address_city, address_state, address_zipcode
```
> **ATENÇÃO:** A coluna `address_neighborhood` NÃO EXISTE no banco. Nunca tentar salvar esse campo!

---

## SEÇÃO 2: ARQUIVOS ESSENCIAIS

### 2.1 Backend (server/)

| Arquivo | Função | Crítico |
|---------|--------|---------|
| `server/services/pagarme.ts` | Cliente Pagar.me API V5 | SIM |
| `server/services/commission.ts` | Cálculo de taxas e tiers | SIM |
| `server/routes/pagarme.ts` | Rotas admin pagamentos | SIM |
| `server/routes/pagarmePublic.ts` | Checkout público | SIM |
| `server/routes/split.ts` | Gerenciamento split | SIM |
| `server/routes/compliance.ts` | Consultas CPF | SIM |
| `server/lib/bigdatacorpClient.ts` | Cliente BigDataCorp | SIM |
| `server/lib/datacorpCompliance.ts` | Lógica compliance | SIM |
| `server/lib/supabaseMaster.ts` | Conexão Supabase Master | SIM |
| `server/lib/clienteSupabase.ts` | Conexão Supabase Cliente | SIM |
| `server/lib/automationManager.ts` | Gerencia pollers | SIM |
| `server/lib/formSubmissionPoller.ts` | Poller de formulários | SIM |
| `server/lib/cpfCompliancePoller.ts` | Poller de CPF | SIM |
| `server/lib/contractSyncPoller.ts` | Sincroniza contratos | SIM |
| `server/config/supabaseOwner.ts` | Config Supabase Owner | SIM |
| `server/index.ts` | Entry point principal | SIM |
| `server/routes.ts` | Registro de rotas | SIM |
| `server/routes/auth.ts` | Autenticação admin | SIM |
| `server/routes/resellerAuth.ts` | Autenticação revendedoras | SIM |
| `server/lib/multiTenantAuth.ts` | Middleware multi-tenant | SIM |
| `server/lib/multiTenantSupabase.ts` | Supabase multi-tenant | SIM |
| `server/lib/walletService.ts` | Sistema de carteira | SIM |
| `server/routes/wallet.ts` | Rotas de carteira | SIM |
| `server/lib/NotificationService.ts` | Notificações | SIM |
| `server/lib/queue.ts` | Sistema de filas | SIM |
| `server/storage.ts` | Interface de storage | SIM |
| `server/db.ts` | Conexão Drizzle ORM | SIM |

> **NOTA:** Para lista completa de todos os 142 arquivos backend, exportar todo o diretório `server/` é obrigatório.

### 2.2 Frontend (src/)

| Arquivo/Pasta | Função |
|---------------|--------|
| `src/App.tsx` | Rotas principais |
| `src/pages/` | 109+ páginas |
| `src/components/` | Componentes UI |
| `src/features/revendedora/` | Sistema NEXUS |
| `src/lib/queryClient.ts` | React Query config |
| `src/hooks/` | Hooks customizados |

### 2.3 Dados Persistentes (data/)

| Arquivo | Função | Backup |
|---------|--------|--------|
| `data/supabase-config.json` | Conexão Supabase | OBRIGATÓRIO |
| `data/credentials.json` | Credenciais criptografadas | OBRIGATÓRIO |
| `data/assinatura_contracts.json` | Contratos (13MB) | OBRIGATÓRIO |
| `data/assinatura_global_config.json` | Config visual | OBRIGATÓRIO |
| `data/automation_state.json` | Estado automações | Recomendado |
| `data/form_submission_poller_state.json` | Estado forms | Recomendado |
| `data/cpf_compliance_poller_state.json` | Estado CPF | Recomendado |
| `data/cpf_auto_check_processed.json` | IDs processados | Recomendado |
| `data/cpf_processed_ids.json` | IDs sync | Recomendado |
| `data/app_promotion_config.json` | Config app | Opcional |

### 2.4 Documentação (docs/)

| Documento | Conteúdo |
|-----------|----------|
| `PLATFORM_COMPLETE.md` | Visão geral completa |
| `PAGARME_PIX_CRITICAL_FIXES.md` | Correções PIX |
| `PAGARME_SPLIT_IMPLEMENTATION.md` | Sistema de Split |
| `BIGDATACORP_CPF_COMPLIANCE.md` | Sistema BigDataCorp |
| `CODE_BACKUP_PAGARME.md` | Backup do código |
| `RESELLER_SYSTEM_DOCUMENTATION.md` | Sistema revendedoras |
| `DATA_ISOLATION_IMPLEMENTATION.md` | Isolamento de dados |
| `MASTER_SYNC_ARCHITECTURE.md` | Arquitetura sync |

### 2.5 Auditoria (data/audit/)

| Arquivo | Conteúdo |
|---------|----------|
| `api_routes.json` | 287 endpoints com auth types |
| `automations.json` | 28 pollers e jobs |
| `data_files.json` | 14 arquivos persistentes |
| `environment_vars.json` | 67 variáveis ambiente |
| `frontend_structure.json` | 109+ páginas/componentes |
| `integrations.json` | 11 integrações externas |
| `supabase_tables.json` | 68 tabelas com campos |

---

## SEÇÃO 3: VARIÁVEIS DE AMBIENTE

### 3.1 Secrets Críticos (OBRIGATÓRIOS)

```bash
# Banco de Dados
DATABASE_URL=postgresql://...

# Autenticação
SESSION_SECRET=<32 bytes hex>
JWT_SECRET=<auto-gerado se não existir>

# Supabase Owner (Central)
SUPABASE_OWNER_URL=https://xxx.supabase.co
SUPABASE_OWNER_SERVICE_KEY=eyJxxx

# Pagar.me (Produção)
CHAVE_SECRETA_PRODUCAO=sk_live_xxx
CHAVE_PUBLICA_PRODUCAO=pk_live_xxx
```

### 3.2 Secrets Opcionais

```bash
# BigDataCorp (Consulta CPF)
TOKEN_ID=xxx
CHAVE_TOKEN=xxx
SUPABASE_MASTER_URL=https://xxx.supabase.co
SUPABASE_MASTER_SERVICE_ROLE_KEY=eyJxxx

# 100ms (Reuniões)
HMS_APP_ACCESS_KEY=xxx
HMS_APP_SECRET=xxx
HMS_MANAGEMENT_TOKEN=xxx
HMS_TEMPLATE_ID=xxx

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://xxx
EVOLUTION_API_KEY=xxx
EVOLUTION_INSTANCE=xxx

# Total Express (Frete)
TOTAL_EXPRESS_USER=xxx
TOTAL_EXPRESS_PASS=xxx
TOTAL_EXPRESS_REID=xxx
```

### 3.3 Variáveis de Ambiente (não secrets)

```bash
# Configurações de ambiente
NODE_ENV=production
TOTAL_EXPRESS_TEST_MODE=false

# Automação
FORM_SYNC_ENABLED=true
FORM_SYNC_INTERVAL_MINUTES=2
CPF_SYNC_ENABLED=true
CPF_SYNC_INTERVAL_MINUTES=3
```

---

## SEÇÃO 4: TABELAS SUPABASE

### 4.1 Supabase Owner (9 tabelas)

| Tabela | Descrição | Campos Críticos |
|--------|-----------|-----------------|
| `admins` | Administradores | id, email, password_hash |
| `revendedoras` | Revendedoras NEXUS | id, nome, cpf, email, pagarme_recipient_id |
| `admin_supabase_credentials` | Credenciais multi-tenant | admin_email, supabase_url, service_key |
| `admin_branding` | Branding por admin | admin_email, logo_url, colors |
| `admin_users` | Usuários por admin | email, admin_email, role |
| `companies` | Empresas | id, name, cnpj |
| `company_reseller_assignments` | Relação empresa-revendedora | company_id, reseller_id |
| `n8n_api_keys` | Chaves N8N | key, admin_email, permissions |
| `bigdatacorp_config` | Credenciais BigDataCorp | admin_email, token_id, chave_token |

### 4.2 Supabase Tenant (59+ tabelas) - Principais

| Tabela | Descrição |
|--------|-----------|
| `products` | Catálogo de produtos |
| `categories` | Categorias de produtos |
| `reseller_stores` | Lojas públicas das revendedoras |
| `product_requests` | Solicitações de produtos |
| `sales_with_split` | Vendas com split de pagamento |
| `commission_config` | Configuração de comissões |
| `platform_settings` | Configurações da plataforma |
| `forms` | Formulários dinâmicos |
| `form_submissions` | Respostas dos formulários |
| `leads` | Leads gerados |
| `contracts` | Contratos de assinatura |
| `reunioes` | Reuniões 100ms |
| `gravacoes` | Gravações de reuniões |
| `envios` | Envios de frete |
| `datacorp_checks` | Consultas CPF (Master) |
| `cpf_compliance_results` | Resultados CPF (resumo) |

### 4.3 SQL de Criação das Tabelas Críticas

Ver arquivos em `docs/`:
- `SQL_SETUP_SPLIT_TABLES.sql`
- `SQL_CREATE_SALES_TABLE.sql`
- `SQL_SETUP_PLATFORM_SETTINGS.sql`
- `WALLET_SUPABASE_SQL.md`

---

## SEÇÃO 5: INTEGRAÇÕES EXTERNAS

### 5.1 Pagar.me (Pagamentos)

| Item | Valor |
|------|-------|
| API | https://api.pagar.me/core/v5 |
| Modelo | PSP (não Gateway) |
| Métodos | PIX, Cartão de Crédito |
| Split | Sim, com comissões dinâmicas |
| Taxa Pagar.me | 3% |
| Taxa Desenvolvedor | 3% (re_cmkn7cdx110b10l9tp8yk0j92) |

**Correções críticas:** Ver Seção 1.1

### 5.2 BigDataCorp (Compliance CPF)

| Item | Valor |
|------|-------|
| API | https://plataforma.bigdatacorp.com.br/pessoas |
| APIs Usadas | basic_data, collections, processes |
| Custo Total | R$ 0,17 por consulta |
| Cache | 7 dias |
| Rate Limit | 2 req/s |

### 5.3 Supabase (Banco de Dados)

| Item | Valor |
|------|-------|
| Arquitetura | Dual (Owner + Tenant) |
| Owner | Autenticação central |
| Tenant | Dados operacionais |

### 5.4 Outras Integrações

| Integração | Função | Obrigatório |
|------------|--------|-------------|
| 100ms | Video conferência | Não |
| Evolution API | WhatsApp | Não |
| Total Express | Frete | Não |
| Resend | Emails | Não |
| Sentry | Monitoramento | Não |
| Redis/Upstash | Cache | Não |

---

## SEÇÃO 6: AUTOMAÇÕES E POLLERS

### 6.1 Pollers Ativos

| Poller | Intervalo | Arquivo |
|--------|-----------|---------|
| FormSubmissionPoller | 2 min | `server/lib/formSubmissionPoller.ts` |
| CPFCompliancePoller | 3 min | `server/lib/cpfCompliancePoller.ts` |
| ContractSyncPoller | 30 seg | `server/lib/contractSyncPoller.ts` |
| LimitMonitor | 5 min | `server/lib/limitMonitor.ts` |
| AutomaticAlerting | 5 min | `server/lib/alerting.ts` |
| FormMappingSyncJob | 5 min | `server/lib/automationManager.ts` |
| AutomationStatePersistence | 5 min | `server/lib/automationManager.ts` |

### 6.2 Filas de Jobs

| Fila | Handlers |
|------|----------|
| emailQueue | send_email |
| analyticsQueue | track_event |
| notificationsQueue | push_notification |
| dataProcessingQueue | process_upload, sync_form_submission |

---

## SEÇÃO 7: CHECKLIST DE EXPORTAÇÃO

### 7.1 Antes de Exportar

- [ ] Verificar se `closed: true` está em `server/services/pagarme.ts`
- [ ] Verificar se `expires_in` é STRING em `server/services/pagarme.ts`
- [ ] Backup de `data/` (especialmente `supabase-config.json`)
- [ ] Backup de `data/assinatura_contracts.json` (13MB)
- [ ] Verificar secrets estão documentados (não commitados)

### 7.2 Após Importar

**Fase 1: Configuração Básica**
- [ ] Configurar secrets no novo ambiente (ver Seção 3)
- [ ] Restaurar `data/supabase-config.json` (CRÍTICO!)
- [ ] Restaurar `data/credentials.json` (CRÍTICO!)
- [ ] Executar `npm install`
- [ ] Executar `npm run dev`
- [ ] Verificar logs (sem erros críticos)

**Fase 2: Verificar Conexões Supabase**
- [ ] Verificar `SUPABASE_OWNER_URL` aponta para o projeto correto
- [ ] Verificar `SUPABASE_OWNER_SERVICE_KEY` é válido
- [ ] Testar query: `GET /api/supabase/check-connection` deve retornar `{ connected: true }`
- [ ] Se usar Master: verificar `SUPABASE_MASTER_URL` e `SUPABASE_MASTER_SERVICE_ROLE_KEY`
- [ ] Verificar `data/supabase-config.json` contém credenciais do Tenant corretas

**Fase 3: Testes Funcionais**
- [ ] Testar login admin (usa Owner Supabase)
- [ ] Testar login revendedora (usa Owner Supabase, tabela `revendedoras`)
- [ ] Testar pagamento PIX (usa Pagar.me, verificar `closed: true`)
- [ ] Testar consulta CPF (usa BigDataCorp, verificar Master Supabase)
- [ ] Testar solicitação de produtos (usa Tenant Supabase)

### 7.3 Verificação de Integridade

```bash
# Verificar correções críticas
grep -n "closed: true" server/services/pagarme.ts
grep -n "String(" server/services/pagarme.ts | grep expires

# Verificar arquivos de dados
ls -la data/*.json

# Verificar tabelas
grep -roh "\.from(['\"][^'\"]*['\"])" server/ | sort | uniq | wc -l
```

---

## SEÇÃO 8: TAXAS E COMISSÕES

### 8.1 Taxas Fixas da Plataforma

| Taxa | % | Descrição |
|------|---|-----------|
| Pagar.me | 3% | Gateway (descontado do liable) |
| Desenvolvedor | 3% | Plataforma |
| **Total** | **6%** | Fixo |

### 8.2 Tiers de Comissão (dos 94% restantes)

| Tier | Volume Mensal | Revendedora | Empresa |
|------|---------------|-------------|---------|
| Iniciante | R$ 0-2.000 | 65% | 35% |
| Bronze | R$ 2.000-4.500 | 70% | 30% |
| Prata | R$ 4.500-10.000 | 75% | 25% |
| Ouro | > R$ 10.000 | 80% | 20% |

### 8.3 Recipient ID do Desenvolvedor

```
re_cmkn7cdx110b10l9tp8yk0j92
```

---

## SEÇÃO 9: TROUBLESHOOTING

### 9.1 PIX não funciona

1. Verificar `closed: true` em `createPixOrder()`
2. Verificar `expires_in` é STRING
3. Verificar credenciais de produção
4. Verificar logs do servidor

### 9.2 CPF não consulta

1. Verificar `TOKEN_ID` e `CHAVE_TOKEN`
2. Verificar conexão Supabase Master
3. Verificar tabela `datacorp_checks` existe
4. Verificar créditos BigDataCorp

### 9.3 Revendedora não aparece

1. Verificar tabela `revendedoras` no Owner
2. Verificar `pagarme_recipient_id` preenchido
3. Verificar conexão Owner Supabase

### 9.4 Solicitações não aparecem

1. Verificar tabela `product_requests` no Tenant
2. Verificar rota `/api/split/product-requests`
3. Verificar conexão Tenant Supabase

### 9.5 Erro de conexão Supabase após importação

1. Verificar `data/supabase-config.json` foi restaurado
2. Verificar formato do JSON está correto:
```json
{
  "url": "https://xxx.supabase.co",
  "anonKey": "eyJxxx",
  "serviceKey": "eyJxxx"
}
```
3. Verificar `data/credentials.json` foi restaurado
4. Verificar secrets `SUPABASE_OWNER_URL` e `SUPABASE_OWNER_SERVICE_KEY`
5. Testar conexão: `curl http://localhost:5000/api/supabase/check-connection`
6. Se erro "relation not found": criar tabelas no Supabase (ver docs/SQL_*.sql)

### 9.6 Login de admin/revendedora falha

1. Verificar Owner Supabase está configurado
2. Verificar tabela `admins` existe no Owner
3. Verificar tabela `revendedoras` existe no Owner
4. Verificar `SESSION_SECRET` está configurado
5. Limpar cookies do navegador

---

## SEÇÃO 10: CONTATOS E REFERÊNCIAS

### 10.1 Suporte Integrações

| Integração | Contato |
|------------|---------|
| Pagar.me | homologacao@pagar.me |
| BigDataCorp | suporte@bigdatacorp.com.br |
| Supabase | support@supabase.io |

### 10.2 Documentação Oficial

- Pagar.me: https://docs.pagar.me
- Supabase: https://supabase.com/docs
- 100ms: https://docs.100ms.live

---

## HISTÓRICO DE CORREÇÕES CRÍTICAS

| Data | Problema | Solução | Arquivo |
|------|----------|---------|---------|
| 2026-01-27 | PIX não funciona | Adicionar `closed: true` | `server/services/pagarme.ts` |
| 2026-01-27 | PIX não funciona | `expires_in` como STRING | `server/services/pagarme.ts` |
| 2026-01-27 | Cache não aparece | Criar registro para cache-hit | `server/lib/datacorpCompliance.ts` |
| 2026-01-27 | Nome CPF não aparece | Retornar personName/personCpf | `server/lib/datacorpCompliance.ts` |

---

**IMPORTANTE:** Este documento deve ser atualizado sempre que houver correções críticas ou mudanças de configuração. Ele é a fonte única de verdade para exportação e reconstrução da plataforma.

---

**Documento gerado em:** 2026-01-27
**Plataforma:** ExecutiveAI Pro v1.0.0
**Última atualização:** 2026-01-27
