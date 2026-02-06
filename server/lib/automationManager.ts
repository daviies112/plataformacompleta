import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { detectNewClients, processNewClients } from './clientMonitor';
import { pollFormSubmissions } from './formSubmissionPoller.js';
import { pollCPFCompliance, getCPFPollerState, checkApprovedSubmissionsWithoutCPF } from './cpfCompliancePoller.js';
import { getCompanySlug } from './tenantSlug';

// Configurações da automação via environment variables
export const AUTOMATION_CONFIG = {
  DETECTION_INTERVAL_MINUTES: parseInt(process.env.CLIENT_DETECTION_INTERVAL_MINUTES || '2'),
  PROCESSING_ENABLED: process.env.AUTOMATION_PROCESSING_ENABLED !== 'false',
  PERSIST_STATE: process.env.AUTOMATION_PERSIST_STATE !== 'false',
  MAX_RETRIES: parseInt(process.env.AUTOMATION_MAX_RETRIES || '3'),
  RETRY_DELAY_SECONDS: parseInt(process.env.AUTOMATION_RETRY_DELAY_SECONDS || '30'),
  
  // Form submission sync configuration
  FORM_SYNC_ENABLED: process.env.FORM_SYNC_ENABLED !== 'false',
  FORM_SYNC_INTERVAL_MINUTES: parseInt(process.env.FORM_SYNC_INTERVAL_MINUTES || '2'),
  
  // CPF compliance sync configuration
  CPF_SYNC_ENABLED: process.env.CPF_SYNC_ENABLED !== 'false',
  CPF_SYNC_INTERVAL_MINUTES: parseInt(process.env.CPF_SYNC_INTERVAL_MINUTES || '3'),
};

// Arquivo para persistir o estado da automação
const AUTOMATION_STATE_FILE = path.join(process.cwd(), 'data', 'automation_state.json');

// Interface para o estado da automação
interface AutomationState {
  isRunning: boolean;
  startedAt: string;
  lastExecutions: Record<string, {
    clientId: string;
    tenantId: string;
    lastRun: string;
    lastSuccess: string | null;
    lastError: string | null;
    consecutiveErrors: number;
    totalExecutions: number;
    totalNewClientsDetected: number;
    totalEventsCreated: number;
    status: 'running' | 'paused' | 'error' | 'stopped';
  }>;
  globalStats: {
    totalExecutions: number;
    totalNewClientsDetected: number;
    totalEventsCreated: number;
    totalErrors: number;
    uptime: number;
  };
  settings: {
    detectionIntervalMinutes: number;
    processingEnabled: boolean;
    maxRetries: number;
  };
}

// Interface para chaves de idempotência de eventos
interface EventIdempotencyCache {
  [key: string]: {
    clientKey: string; // telefone ou email do cliente
    eventId: string; // ID do evento
    createdAt: string;
    eventDate: string;
    eventTitle: string;
  };
}

// Estado em memória da automação
let automationState: AutomationState = {
  isRunning: false,
  startedAt: '',
  lastExecutions: {},
  globalStats: {
    totalExecutions: 0,
    totalNewClientsDetected: 0,
    totalEventsCreated: 0,
    totalErrors: 0,
    uptime: 0,
  },
  settings: {
    detectionIntervalMinutes: AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES,
    processingEnabled: AUTOMATION_CONFIG.PROCESSING_ENABLED,
    maxRetries: AUTOMATION_CONFIG.MAX_RETRIES,
  }
};

// Cache de idempotência para eventos
let eventIdempotencyCache: EventIdempotencyCache = {};

// Map para controlar timers ativos por tenant
const activeTimers = new Map<string, NodeJS.Timeout>();

// Timer para form submission sync
let formSyncTimer: NodeJS.Timeout | null = null;

// Timer para form mapping sync
let formMappingSyncTimer: NodeJS.Timeout | null = null;

// Timer para CPF compliance sync
let cpfSyncTimer: NodeJS.Timeout | null = null;

// Função para garantir que o diretório data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(AUTOMATION_STATE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Função para carregar estado da automação do arquivo
function loadAutomationStateFromFile() {
  try {
    ensureDataDirectory();
    
    // Carregar estado principal da automação
    if (fs.existsSync(AUTOMATION_STATE_FILE)) {
      const data = fs.readFileSync(AUTOMATION_STATE_FILE, 'utf8');
      const savedState = JSON.parse(data);
      
      // Mesclar com estado atual, preservando configurações dinâmicas
      automationState = {
        ...savedState,
        isRunning: false, // Sempre inicia parado após reinicialização
        settings: {
          ...savedState.settings,
          detectionIntervalMinutes: AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES,
          processingEnabled: AUTOMATION_CONFIG.PROCESSING_ENABLED,
          maxRetries: AUTOMATION_CONFIG.MAX_RETRIES,
        }
      };
      
      console.log('📄 Estado da automação carregado do arquivo com sucesso');
    }
    
    // Carregar cache de idempotência de eventos
    const idempotencyCacheFile = path.join(process.cwd(), 'data', 'event_idempotency.json');
    if (fs.existsSync(idempotencyCacheFile)) {
      const cacheData = fs.readFileSync(idempotencyCacheFile, 'utf8');
      eventIdempotencyCache = JSON.parse(cacheData);
      
      // Limpar eventos antigos (mais de 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let cleanedCount = 0;
      for (const [key, event] of Object.entries(eventIdempotencyCache)) {
        if (new Date(event.createdAt) < thirtyDaysAgo) {
          delete eventIdempotencyCache[key];
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Limpeza do cache de idempotência: ${cleanedCount} eventos antigos removidos`);
        saveEventIdempotencyCache();
      }
      
      console.log(`📄 Cache de idempotência carregado: ${Object.keys(eventIdempotencyCache).length} eventos`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar estado da automação do arquivo:', error);
  }
}

// Função para salvar estado da automação no arquivo
export function saveAutomationStateToFile(): boolean {
  if (!AUTOMATION_CONFIG.PERSIST_STATE) {
    return true; // Persistência desabilitada
  }
  
  try {
    ensureDataDirectory();
    
    // Calcular uptime
    if (automationState.startedAt) {
      const startTime = new Date(automationState.startedAt);
      const currentTime = new Date();
      automationState.globalStats.uptime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    }
    
    fs.writeFileSync(AUTOMATION_STATE_FILE, JSON.stringify(automationState, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar estado da automação no arquivo:', error);
    return false;
  }
}

// Função para salvar cache de idempotência
function saveEventIdempotencyCache(): boolean {
  if (!AUTOMATION_CONFIG.PERSIST_STATE) {
    return true;
  }
  
  try {
    ensureDataDirectory();
    const idempotencyCacheFile = path.join(process.cwd(), 'data', 'event_idempotency.json');
    fs.writeFileSync(idempotencyCacheFile, JSON.stringify(eventIdempotencyCache, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar cache de idempotência:', error);
    return false;
  }
}

// Função para gerar chave de idempotência determinística
export function generateEventIdempotencyKey(clientKey: string, eventDate: string, eventTitle: string): string {
  // Normalizar dados para gerar chave consistente
  const normalizedClientKey = clientKey.toLowerCase().trim();
  const normalizedDate = eventDate.split('T')[0]; // Apenas a data, sem horário
  const normalizedTitle = eventTitle.toLowerCase().trim();
  
  return `${normalizedClientKey}-${normalizedDate}-${normalizedTitle}`;
}

// Função para verificar se evento já foi criado (idempotência)
export function isEventAlreadyCreated(clientKey: string, eventDate: string, eventTitle: string): boolean {
  const key = generateEventIdempotencyKey(clientKey, eventDate, eventTitle);
  return eventIdempotencyCache.hasOwnProperty(key);
}

// Função para marcar evento como criado
export function markEventAsCreated(clientKey: string, eventId: string, eventDate: string, eventTitle: string): void {
  const key = generateEventIdempotencyKey(clientKey, eventDate, eventTitle);
  eventIdempotencyCache[key] = {
    clientKey,
    eventId,
    createdAt: new Date().toISOString(),
    eventDate,
    eventTitle
  };
  
  saveEventIdempotencyCache();
  console.log(`✅ Evento marcado como criado no cache de idempotência: ${key}`);
}

// Função para executar verificação automática para um cliente específico
async function executeClientAutomation(clientId: string, tenantId: string): Promise<void> {
  const executionKey = `${clientId}-${tenantId}`;
  const now = new Date().toISOString();
  
  // Inicializar dados de execução se não existir
  if (!automationState.lastExecutions[executionKey]) {
    automationState.lastExecutions[executionKey] = {
      clientId,
      tenantId,
      lastRun: '',
      lastSuccess: null,
      lastError: null,
      consecutiveErrors: 0,
      totalExecutions: 0,
      totalNewClientsDetected: 0,
      totalEventsCreated: 0,
      status: 'running'
    };
  }
  
  const execution = automationState.lastExecutions[executionKey];
  execution.lastRun = now;
  execution.totalExecutions++;
  execution.status = 'running';
  
  automationState.globalStats.totalExecutions++;
  
  console.log(`🔍 Verificando novos clientes para cliente ${clientId} (tenant: ${tenantId})`);
  
  try {
    // Detectar novos clientes
    const detectionResult = await detectNewClients(clientId, tenantId);
    
    if (detectionResult.source === 'rate_limited') {
      console.log(`⏰ Rate limit ativo para ${clientId}/${tenantId} - pulando execução`);
      return;
    }
    
    if (detectionResult.source === 'supabase_error') {
      console.log(`⚠️ Supabase não configurado para ${clientId}/${tenantId} - usando modo mock`);
      return;
    }
    
    console.log(`🔍 Verificação de novos clientes concluída:`, {
      novos: detectionResult.newClients.length,
      fonte: detectionResult.source,
      processamento: { sucessos: 0, erros: 0 }
    });
    
    // Se há novos clientes e processamento está habilitado
    if (detectionResult.newClients.length > 0 && AUTOMATION_CONFIG.PROCESSING_ENABLED) {
      console.log(`🚀 Processando ${detectionResult.newClients.length} novos clientes automaticamente...`);
      
      const processingResults = await processNewClientsWithIdempotency(clientId, detectionResult.newClients);
      
      let sucessos = 0;
      let erros = 0;
      
      for (const result of processingResults) {
        if (result.success) {
          sucessos++;
          execution.totalEventsCreated++;
          automationState.globalStats.totalEventsCreated++;
        } else {
          erros++;
        }
      }
      
      console.log(`📊 Processamento concluído: ${sucessos} sucessos, ${erros} erros`);
    }
    
    // Atualizar estatísticas de sucesso
    execution.lastSuccess = now;
    execution.consecutiveErrors = 0;
    execution.totalNewClientsDetected += detectionResult.newClients.length;
    execution.status = 'running';
    
    automationState.globalStats.totalNewClientsDetected += detectionResult.newClients.length;
    
  } catch (error) {
    console.error(`❌ Erro na automação para ${clientId}/${tenantId}:`, error);
    
    // Atualizar estatísticas de erro
    execution.lastError = error.message;
    execution.consecutiveErrors++;
    execution.status = execution.consecutiveErrors >= AUTOMATION_CONFIG.MAX_RETRIES ? 'error' : 'running';
    
    automationState.globalStats.totalErrors++;
    
    // Se muitos erros consecutivos, pausar temporariamente este cliente
    if (execution.consecutiveErrors >= AUTOMATION_CONFIG.MAX_RETRIES) {
      console.error(`⏸️ Cliente ${clientId}/${tenantId} pausado após ${execution.consecutiveErrors} erros consecutivos`);
      execution.status = 'error';
    }
  }
  
  // Salvar estado atualizado
  saveAutomationStateToFile();
}

// Função para processar novos clientes com verificação de idempotência
async function processNewClientsWithIdempotency(clientId: string, newClients: any[]): Promise<any[]> {
  const results = [];
  
  for (const client of newClients) {
    try {
      // Dados padrão para reunião automática
      const eventDate = getNextBusinessDay();
      const eventTitle = `Reunião inicial - ${client.nome_completo}`;
      const clientKey = client.email_principal || client.telefone;
      
      // Verificar se evento já foi criado (idempotência)
      if (isEventAlreadyCreated(clientKey, eventDate, eventTitle)) {
        console.log(`⚠️ Evento já existe para ${client.nome_completo} em ${eventDate} - pulando criação`);
        results.push({
          client,
          success: true,
          skipped: true,
          reason: 'Evento já existe (idempotência)'
        });
        continue;
      }
      
      // Processar normalmente usando a função existente
      const processingResult = await processNewClients(clientId, [client]);
      
      // Se sucesso, marcar no cache de idempotência
      if (processingResult.length > 0 && processingResult[0].success) {
        markEventAsCreated(clientKey, `client-${Date.now()}`, eventDate, eventTitle);
      }
      
      results.push(processingResult[0] || {
        client,
        success: false,
        error: 'Falha no processamento'
      });
      
    } catch (error) {
      console.error(`❌ Erro ao processar cliente ${client.nome_completo}:`, error);
      results.push({
        client,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Função para obter próximo dia útil
function getNextBusinessDay(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Se for sábado (6) ou domingo (0), pular para segunda-feira
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  
  return tomorrow.toISOString();
}

// Função para iniciar automação para um cliente específico
function startClientAutomation(clientId: string, tenantId: string): void {
  const timerKey = `${clientId}-${tenantId}`;
  
  // Se já existe timer para este cliente, limpar primeiro
  if (activeTimers.has(timerKey)) {
    clearInterval(activeTimers.get(timerKey)!);
    activeTimers.delete(timerKey);
  }
  
  // Executar imediatamente uma vez
  executeClientAutomation(clientId, tenantId).catch(error => {
    console.error(`❌ Erro na execução inicial para ${clientId}/${tenantId}:`, error);
  });
  
  // Configurar timer para execuções futuras
  const intervalMs = AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES * 60 * 1000;
  const timer = setInterval(() => {
    executeClientAutomation(clientId, tenantId).catch(error => {
      console.error(`❌ Erro na execução automática para ${clientId}/${tenantId}:`, error);
    });
  }, intervalMs);
  
  activeTimers.set(timerKey, timer);
  
  console.log(`⏰ Automação iniciada para ${clientId}/${tenantId} - verificação a cada ${AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES} minutos`);
}

// Função para parar automação de um cliente específico
function stopClientAutomation(clientId: string, tenantId: string): void {
  const timerKey = `${clientId}-${tenantId}`;
  
  if (activeTimers.has(timerKey)) {
    clearInterval(activeTimers.get(timerKey)!);
    activeTimers.delete(timerKey);
    
    // Atualizar status no estado
    const executionKey = `${clientId}-${tenantId}`;
    if (automationState.lastExecutions[executionKey]) {
      automationState.lastExecutions[executionKey].status = 'stopped';
    }
    
    console.log(`⏹️ Automação parada para ${clientId}/${tenantId}`);
  }
}

// ============================================================
// FORM MAPPING SYNC - Sincroniza formulários do Supabase para mapping table
// ============================================================

/**
 * Sincroniza formulários de todos os tenants do Supabase para a tabela form_tenant_mapping
 * Garante que formulários públicos possam ser acessados via /api/forms/public/:id
 */
async function syncFormsToMappingTable(): Promise<void> {
  console.log('🔄 [FormMappingSync] Iniciando sincronização de formulários do Supabase...');
  
  try {
    const { db } = await import('../db');
    
    // Tenta garantir que a tabela existe via SQL bruto se necessário
    try {
      // Usar a instância global do pool para garantir a conexão correta
      const { pool } = await import('../db');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS form_tenant_mapping (
          form_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          slug TEXT,
          company_slug TEXT,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ [FormMappingSync] Tabela form_tenant_mapping verificada/criada');
    } catch (e: any) {
      console.warn('⚠️ [FormMappingSync] Erro ao criar tabela:', e.message);
    }

    let totalSynced = 0;
    let totalErrors = 0;
    
    // Importar dependências necessárias
    const { formTenantMapping } = await import('../../shared/db-schema');
    const { eq } = await import('drizzle-orm');
    const { getDynamicSupabaseClient } = await import('../formularios/utils/supabaseClient');
    const { getSupabaseCredentials } = await import('../lib/credentialsDb');
    
    // Buscar todos os tenants configurados
    let tenants: { tenantId: string }[] = [];
    try {
      const { db } = await import('../db');
      const { supabaseConfig } = await import('../../shared/db-schema');
      const { isNotNull } = await import('drizzle-orm');
      tenants = await db.select({ tenantId: supabaseConfig.tenantId })
        .from(supabaseConfig)
        .where(isNotNull(supabaseConfig.tenantId));
    } catch (dbError: any) {
      console.log('⚠️ [FormMappingSync] Usando fallback do sistema (Secrets)');
    }
    
    if (tenants.length === 0) {
      tenants = [{ tenantId: 'system' }];
    }
    
    console.log(`📊 [FormMappingSync] Encontrados ${tenants.length} tenant(s) para sincronizar`);
    
    if (tenants.length === 0) {
      console.log('⚠️ [FormMappingSync] Nenhum tenant configurado - sincronização pulada');
      return;
    }
    
    // Sincronizar formulários de cada tenant
    for (const { tenantId } of tenants) {
      try {
        // Garante que a tabela mapping existe
        try {
          const { db } = await import('../db');
          await db.execute(require('drizzle-orm').sql`
            CREATE TABLE IF NOT EXISTS form_tenant_mapping (
              form_id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              slug TEXT,
              company_slug TEXT,
              is_public BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
        } catch (e) {}

        console.log(`🔍 [FormMappingSync] Sincronizando tenant: ${tenantId}`);
        
        // Obter credenciais do tenant
        const credentials = await getSupabaseCredentials(tenantId);
        if (!credentials) {
          console.log(`⚠️ [FormMappingSync] Tenant ${tenantId} sem credenciais - pulando`);
          continue;
        }
        
        // Criar cliente Supabase
        const supabase = await getDynamicSupabaseClient(credentials.url, credentials.anonKey);
        if (!supabase) {
          console.log(`⚠️ [FormMappingSync] Erro ao criar cliente Supabase para ${tenantId} - pulando`);
          continue;
        }
        
        // Buscar todos os formulários do tenant incluindo slug
        let { data: forms, error } = await supabase
          .from('forms')
          .select('id, is_public, slug');
        
        // Se coluna is_public ou slug não existir, buscar apenas id e assumir público
        if (error && error.code === '42703') {
          console.log(`⚠️ [FormMappingSync] Colunas faltando no tenant ${tenantId} - buscando apenas id`);
          const fallback = await supabase
            .from('forms')
            .select('id');
          
          if (fallback.error) {
            console.error(`❌ [FormMappingSync] Erro ao buscar forms do tenant ${tenantId}:`, fallback.error);
            totalErrors++;
            continue;
          }
          
          // Adicionar is_public como true e slug como null para todos
          forms = fallback.data?.map(f => ({ ...f, is_public: true, slug: null })) || [];
          error = null;
        } else if (error) {
          console.error(`❌ [FormMappingSync] Erro ao buscar forms do tenant ${tenantId}:`, error);
          totalErrors++;
          continue;
        }
        
        if (!forms || forms.length === 0) {
          console.log(`ℹ️ [FormMappingSync] Nenhum formulário encontrado no tenant ${tenantId}`);
          continue;
        }
        
        console.log(`📋 [FormMappingSync] Encontrados ${forms.length} formulário(s) no tenant ${tenantId}`);
        
        let companySlug = 'empresa';
        try {
          companySlug = await getCompanySlug(tenantId);
          console.log(`📋 [FormMappingSync] CompanySlug para tenant ${tenantId}: ${companySlug} (from hms100msConfig)`);
        } catch (e) {
          try {
            const { data: settings } = await supabase
              .from('app_settings')
              .select('company_slug, company_name')
              .single();
            if (settings?.company_slug) {
              companySlug = settings.company_slug;
            } else if (settings?.company_name) {
              companySlug = settings.company_name.toLowerCase().trim().replace(/\s+/g, '-');
            }
            console.log(`📋 [FormMappingSync] CompanySlug para tenant ${tenantId}: ${companySlug} (from Supabase fallback)`);
          } catch (settingsError) {
            console.log(`⚠️ [FormMappingSync] Não foi possível obter companySlug do tenant ${tenantId}, usando padrão: empresa`);
          }
        }
        
        // Sincronizar cada formulário
        // NOTA: isPublic defaults to true for backward compatibility
        // IMPORTANTE: NÃO sobrescrever isPublic=true para false se já estiver público localmente
        for (const form of forms) {
          try {
            const isPublicValue = form.is_public !== false; // Default to true unless explicitly false
            const formSlug = form.slug || null;
            
            // Verificar se o formulário já existe localmente
            const existingMapping = await db.select()
              .from(formTenantMapping)
              .where(eq(formTenantMapping.formId, form.id))
              .limit(1);
            
            // Se já existe e está público localmente, NÃO sobrescrever para false
            // Isso evita que o sync resete formulários que foram marcados como públicos manualmente
            const preservePublic = existingMapping.length > 0 && existingMapping[0].isPublic === true;
            const finalIsPublic = preservePublic ? true : isPublicValue;
            
            await db.insert(formTenantMapping)
              .values({
                formId: form.id,
                tenantId,
                slug: formSlug,
                companySlug: companySlug,
                isPublic: finalIsPublic,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .onConflictDoUpdate({
                target: formTenantMapping.formId,
                set: {
                  tenantId,
                  slug: formSlug,
                  companySlug: companySlug,
                  // PRESERVAR: Se já é público localmente, manter público
                  isPublic: finalIsPublic,
                  updatedAt: new Date()
                }
              });
            
            totalSynced++;
          } catch (formError) {
            console.error(`❌ [FormMappingSync] Erro ao sincronizar form ${form.id}:`, formError);
            totalErrors++;
          }
        }
        
        console.log(`✅ [FormMappingSync] Tenant ${tenantId} sincronizado com sucesso`);
        
      } catch (tenantError) {
        console.error(`❌ [FormMappingSync] Erro ao processar tenant ${tenantId}:`, tenantError);
        totalErrors++;
      }
    }
    
    console.log(`✅ [FormMappingSync] Sincronização concluída: ${totalSynced} formulário(s) sincronizado(s), ${totalErrors} erro(s)`);
    
  } catch (error: any) {
    console.error('❌ [FormMappingSync] Erro fatal na sincronização:', error);
  }
}

/**
 * Inicia job de sincronização periódica de formulários
 */
function startFormMappingSyncJob(): void {
  if (!AUTOMATION_CONFIG.FORM_SYNC_ENABLED) {
    console.log('ℹ️ [FormMappingSync] Sincronização automática de mapping desabilitada');
    return;
  }

  if (formMappingSyncTimer) {
    clearInterval(formMappingSyncTimer);
    formMappingSyncTimer = null;
  }

  // Executar imediatamente uma vez
  syncFormsToMappingTable().catch(error => {
    console.error('❌ [FormMappingSync] Erro na execução inicial:', error);
  });

  // Configurar timer para execuções futuras (5 minutos)
  const intervalMs = 5 * 60 * 1000; // 5 minutos fixo conforme requisito
  formMappingSyncTimer = setInterval(() => {
    syncFormsToMappingTable().catch(error => {
      console.error('❌ [FormMappingSync] Erro na execução automática:', error);
    });
  }, intervalMs);

  console.log('⏰ [FormMappingSync] Job de sincronização iniciado - verificação a cada 5 minutos');
}

/**
 * Para job de sincronização de formulários
 */
function stopFormMappingSyncJob(): void {
  if (formMappingSyncTimer) {
    clearInterval(formMappingSyncTimer);
    formMappingSyncTimer = null;
    console.log('⏹️ [FormMappingSync] Job de sincronização parado');
  }
}

// ============================================================
// FORM SUBMISSION SYNC (código existente)
// ============================================================

// Função para executar sincronização de formulários
async function executeFormSubmissionSync(): Promise<void> {
  console.log('🔄 [FormSync] Executando sincronização de formulários do Supabase...');
  
  try {
    const result = await pollFormSubmissions();
    
    if (result.success) {
      if (result.processedCount > 0) {
        console.log(`✅ [FormSync] Sincronização concluída: ${result.processedCount} submissions enfileiradas`);
      } else {
        console.log('ℹ️ [FormSync] Nenhuma submission nova para processar');
      }
    } else {
      console.error(`❌ [FormSync] Erro na sincronização: ${result.error}`);
    }
  } catch (error: any) {
    console.error('❌ [FormSync] Erro ao executar sincronização:', error);
  }
}

// Função para iniciar automação de form submission sync
function startFormSubmissionSync(): void {
  if (!AUTOMATION_CONFIG.FORM_SYNC_ENABLED) {
    console.log('ℹ️ [FormSync] Sincronização automática de formulários desabilitada');
    return;
  }

  if (formSyncTimer) {
    clearInterval(formSyncTimer);
    formSyncTimer = null;
  }

  // Executar imediatamente uma vez
  executeFormSubmissionSync().catch(error => {
    console.error('❌ [FormSync] Erro na execução inicial:', error);
  });

  // Configurar timer para execuções futuras
  const intervalMs = AUTOMATION_CONFIG.FORM_SYNC_INTERVAL_MINUTES * 60 * 1000;
  formSyncTimer = setInterval(() => {
    executeFormSubmissionSync().catch(error => {
      console.error('❌ [FormSync] Erro na execução automática:', error);
    });
  }, intervalMs);

  console.log(`⏰ [FormSync] Sincronização automática iniciada - verificação a cada ${AUTOMATION_CONFIG.FORM_SYNC_INTERVAL_MINUTES} minutos`);
}

// Função para parar automação de form submission sync
function stopFormSubmissionSync(): void {
  if (formSyncTimer) {
    clearInterval(formSyncTimer);
    formSyncTimer = null;
    console.log('⏹️ [FormSync] Sincronização automática de formulários parada');
  }
}

// ============================================================
// CPF COMPLIANCE SYNC - Sincroniza status de CPF para etiquetas WhatsApp
// ============================================================

// Função para executar sincronização de CPF compliance
async function executeCPFComplianceSync(): Promise<void> {
  console.log('🔄 [CPFSync] Executando sincronização de CPF compliance...');
  
  try {
    const result = await pollCPFCompliance();
    
    if (result.success) {
      if (result.processedCount > 0) {
        console.log(`✅ [CPFSync] Sincronização concluída: ${result.processedCount} consultas CPF processadas`);
      } else {
        console.log('ℹ️ [CPFSync] Nenhuma consulta CPF nova para processar');
      }
    } else {
      console.error(`❌ [CPFSync] Erro na sincronização: ${result.error}`);
    }
    
    // Also check approved submissions without CPF compliance (Supabase-only mode)
    const autoCheckResult = await checkApprovedSubmissionsWithoutCPF();
    if (autoCheckResult.processedCount > 0) {
      console.log(`✅ [CPFSync] Auto-check: ${autoCheckResult.processedCount} novas consultas CPF realizadas`);
    }
  } catch (error: any) {
    console.error('❌ [CPFSync] Erro ao executar sincronização:', error);
  }
}

// Função para iniciar automação de CPF compliance sync
function startCPFComplianceSync(): void {
  if (!AUTOMATION_CONFIG.CPF_SYNC_ENABLED) {
    console.log('ℹ️ [CPFSync] Sincronização automática de CPF desabilitada');
    return;
  }

  if (cpfSyncTimer) {
    clearInterval(cpfSyncTimer);
    cpfSyncTimer = null;
  }

  // Executar imediatamente uma vez
  executeCPFComplianceSync().catch(error => {
    console.error('❌ [CPFSync] Erro na execução inicial:', error);
  });

  // Configurar timer para execuções futuras
  const intervalMs = AUTOMATION_CONFIG.CPF_SYNC_INTERVAL_MINUTES * 60 * 1000;
  cpfSyncTimer = setInterval(() => {
    executeCPFComplianceSync().catch(error => {
      console.error('❌ [CPFSync] Erro na execução automática:', error);
    });
  }, intervalMs);

  console.log(`⏰ [CPFSync] Sincronização automática iniciada - verificação a cada ${AUTOMATION_CONFIG.CPF_SYNC_INTERVAL_MINUTES} minutos`);
}

// Função para parar automação de CPF compliance sync
function stopCPFComplianceSync(): void {
  if (cpfSyncTimer) {
    clearInterval(cpfSyncTimer);
    cpfSyncTimer = null;
    console.log('⏹️ [CPFSync] Sincronização automática de CPF parada');
  }
}

export function startAutomation(): void {
  if (automationState.isRunning) {
    console.log('⚠️ Automação já está rodando');
    return;
  }
  
  automationState.isRunning = true;
  automationState.startedAt = new Date().toISOString();
  
  startAutomationForAllTenants();
  
  startFormSubmissionSync();
  startFormMappingSyncJob();
  startCPFComplianceSync();
  
  saveAutomationStateToFile();
}

async function startAutomationForAllTenants(): Promise<void> {
  try {
    console.log('🔍 Buscando tenants do banco de dados...');
    
    // Buscar todos os tenants configurados
    let tenants: { tenantId: string }[] = [];
    try {
      const { db } = await import('../db');
      const { supabaseConfig } = await import('../../shared/db-schema');
      const { isNotNull } = await import('drizzle-orm');
      tenants = await db.select({ tenantId: supabaseConfig.tenantId })
        .from(supabaseConfig)
        .where(isNotNull(supabaseConfig.tenantId))
        .execute();
    } catch (dbError: any) {
      console.log('⚠️ [startAutomationForAllTenants] Usando fallback do sistema (Secrets)');
    }
    
    if (tenants.length === 0) {
      tenants = [{ tenantId: 'system' }];
    }
    
    console.log(`✅ ${tenants.length} tenants encontrados no banco de dados`);
    
    for (const tenant of tenants) {
      try {
        await startClientAutomation(tenant.tenantId, tenant.tenantId);
        console.log(`✅ Automação iniciada para tenant: ${tenant.tenantId}`);
      } catch (error) {
        console.error(`❌ Erro ao iniciar automação para tenant ${tenant.tenantId}:`, error);
      }
    }
    
    console.log(`🚀 Automação iniciada para ${tenants.length} tenants`);
    console.log(`⚙️ Configuração: verificação a cada ${AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES} minutos`);
    
  } catch (error) {
    console.error('❌ Erro ao buscar tenants do banco de dados:', error);
    console.error('💡 Verifique se o banco de dados está acessível');
  }
}

// Função para parar toda a automação
export function stopAutomation(): void {
  if (!automationState.isRunning) {
    console.log('⚠️ Automação já está parada');
    return;
  }
  
  // Parar todos os timers ativos
  for (const [timerKey, timer] of activeTimers.entries()) {
    clearInterval(timer);
    console.log(`⏹️ Timer parado: ${timerKey}`);
  }
  
  activeTimers.clear();
  
  // Parar form submission sync
  stopFormSubmissionSync();
  stopFormMappingSyncJob();
  stopCPFComplianceSync();
  
  // Atualizar status de todas as execuções
  for (const executionKey of Object.keys(automationState.lastExecutions)) {
    automationState.lastExecutions[executionKey].status = 'stopped';
  }
  
  automationState.isRunning = false;
  
  console.log('🛑 Automação de detecção de novos clientes parada');
  saveAutomationStateToFile();
}

// Função para obter estado atual da automação
export function getAutomationStatus(): AutomationState {
  // Atualizar uptime em tempo real
  if (automationState.startedAt && automationState.isRunning) {
    const startTime = new Date(automationState.startedAt);
    const currentTime = new Date();
    automationState.globalStats.uptime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
  }
  
  return { ...automationState };
}

// Função para obter estatísticas do CPF Compliance Sync
export function getCPFSyncStats(): { lastPolledAt: string | null; totalProcessed: number; totalErrors: number; lastError: string | null } {
  return getCPFPollerState();
}

// Função para obter estatísticas do cache de idempotência
export function getIdempotencyStats(): { totalEvents: number; recentEvents: number; oldestEvent: string | null; newestEvent: string | null } {
  const events = Object.values(eventIdempotencyCache);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEvents = events.filter(event => new Date(event.createdAt) > sevenDaysAgo);
  
  let oldestEvent = null;
  let newestEvent = null;
  
  if (events.length > 0) {
    const dates = events.map(e => new Date(e.createdAt));
    oldestEvent = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString();
    newestEvent = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();
  }
  
  return {
    totalEvents: events.length,
    recentEvents: recentEvents.length,
    oldestEvent,
    newestEvent
  };
}

// Carregar estado na inicialização do módulo
loadAutomationStateFromFile();

// Auto-salvar estado a cada 5 minutos para preservar dados em caso de falha
setInterval(() => {
  if (automationState.isRunning) {
    saveAutomationStateToFile();
  }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📄 Recebido SIGTERM - salvando estado da automação...');
  stopAutomation();
  saveAutomationStateToFile();
});

process.on('SIGINT', () => {
  console.log('📄 Recebido SIGINT - salvando estado da automação...');
  stopAutomation();
  saveAutomationStateToFile();
});