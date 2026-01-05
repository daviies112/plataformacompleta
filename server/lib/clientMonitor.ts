import { 
  getDynamicSupabaseClient,
  getDashboardDataFromSupabase
} from './multiTenantSupabase';

// Interface para representar um cliente
interface ClientRecord {
  id: string;
  telefone: string;
  nome_completo: string;
  email_principal: string;
  tenant_id: string;
  primeiro_contato: string;
  ultimo_contato: string | null;
  [key: string]: any; // Para outros campos do dashboard
}

// Interface para o estado do cache
interface ClientCacheState {
  clients: ClientRecord[];
  lastUpdate: Date;
  lastCheck: Date;
}

// Cache em memória para cada tenant/cliente
const clientCache = new Map<string, ClientCacheState>();

// Configurações do sistema
const CACHE_TIMEOUT_MINUTES = 5; // Cache expira em 5 minutos
const MIN_POLLING_INTERVAL_SECONDS = 30; // Mínimo 30 segundos entre verificações

/**
 * Obtém o cache atual para um cliente específico
 */
export function getClientCache(clientId: string, tenantId: string): ClientCacheState | null {
  const cacheKey = `${clientId}-${tenantId}`;
  return clientCache.get(cacheKey) || null;
}

/**
 * Atualiza o cache com novos dados de clientes
 */
export function updateClientCache(clientId: string, tenantId: string, clients: ClientRecord[]): void {
  const cacheKey = `${clientId}-${tenantId}`;
  const now = new Date();
  
  clientCache.set(cacheKey, {
    clients: clients.map(client => ({
      ...client,
      id: client.telefone || client.idx?.toString() || 'unknown', // Usar telefone como ID único
    })),
    lastUpdate: now,
    lastCheck: now
  });
  
  console.log(`✅ Cache atualizado para ${cacheKey}: ${clients.length} clientes`);
}

/**
 * Verifica se o cache está válido (não expirado)
 */
export function isCacheValid(clientId: string, tenantId: string): boolean {
  const cache = getClientCache(clientId, tenantId);
  if (!cache) return false;
  
  const now = new Date();
  const timeDiff = now.getTime() - cache.lastUpdate.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  
  return minutesDiff < CACHE_TIMEOUT_MINUTES;
}

/**
 * Verifica se é muito cedo para fazer uma nova verificação (rate limiting)
 */
export function canPerformCheck(clientId: string, tenantId: string): boolean {
  const cache = getClientCache(clientId, tenantId);
  if (!cache) return true;
  
  const now = new Date();
  const timeDiff = now.getTime() - cache.lastCheck.getTime();
  const secondsDiff = timeDiff / 1000;
  
  return secondsDiff >= MIN_POLLING_INTERVAL_SECONDS;
}

/**
 * Atualiza apenas o timestamp da última verificação
 */
export function updateLastCheck(clientId: string, tenantId: string): void {
  const cache = getClientCache(clientId, tenantId);
  if (cache) {
    cache.lastCheck = new Date();
  }
}

/**
 * Detecta novos clientes comparando com o cache
 */
export async function detectNewClients(clientId: string, tenantId: string): Promise<{
  newClients: ClientRecord[];
  totalClients: number;
  source: string;
}> {
  console.log(`🔍 Iniciando detecção de novos clientes para ${clientId}/${tenantId}`);
  
  // Verificar se é muito cedo para uma nova verificação
  if (!canPerformCheck(clientId, tenantId)) {
    const cache = getClientCache(clientId, tenantId);
    const lastCheck = cache?.lastCheck || new Date();
    const waitTime = MIN_POLLING_INTERVAL_SECONDS - Math.floor((new Date().getTime() - lastCheck.getTime()) / 1000);
    
    console.log(`⏰ Rate limit ativo. Aguarde ${waitTime} segundos para próxima verificação`);
    return {
      newClients: [],
      totalClients: cache?.clients.length || 0,
      source: 'rate_limited'
    };
  }
  
  // Buscar dados atuais do Supabase
  const currentClients = await getDashboardDataFromSupabase(clientId, tenantId);
  
  if (!currentClients) {
    console.log(`❌ Não foi possível buscar dados do Supabase para cliente ${clientId}`);
    updateLastCheck(clientId, tenantId);
    return {
      newClients: [],
      totalClients: 0,
      source: 'supabase_error'
    };
  }
  
  // Atualizar timestamp da verificação
  updateLastCheck(clientId, tenantId);
  
  // Verificar se existe cache anterior
  const previousCache = getClientCache(clientId, tenantId);
  
  if (!previousCache || !isCacheValid(clientId, tenantId)) {
    // Primeira verificação ou cache expirado - inicializar cache
    console.log(`🆕 Inicializando cache para ${clientId}/${tenantId} com ${currentClients.length} clientes`);
    updateClientCache(clientId, tenantId, currentClients);
    return {
      newClients: [],
      totalClients: currentClients.length,
      source: 'cache_initialized'
    };
  }
  
  // Comparar com cache anterior para detectar novos clientes
  const previousClientIds = new Set(previousCache.clients.map(c => c.id));
  const newClients = currentClients.filter(client => {
    const clientId = client.telefone || client.idx?.toString() || 'unknown';
    return !previousClientIds.has(clientId);
  });
  
  // Atualizar cache com dados atuais
  updateClientCache(clientId, tenantId, currentClients);
  
  if (newClients.length > 0) {
    console.log(`🎉 ${newClients.length} novos clientes detectados:`, newClients.map(c => ({
      telefone: c.telefone,
      nome: c.nome_completo,
      email: c.email_principal
    })));
  } else {
    console.log(`✅ Nenhum novo cliente detectado. Total: ${currentClients.length} clientes`);
  }
  
  return {
    newClients,
    totalClients: currentClients.length,
    source: 'comparison_complete'
  };
}

/**
 * Processa automaticamente novos clientes detectados
 * Note: Google Calendar integration removed - only logging new clients
 */
export async function processNewClients(
  clientId: string, 
  newClients: ClientRecord[]
): Promise<Array<{
  client: ClientRecord;
  error?: string;
  success: boolean;
}>> {
  
  if (newClients.length === 0) {
    return [];
  }
  
  console.log(`🚀 Processando ${newClients.length} novos clientes...`);
  
  const results = [];
  
  for (const client of newClients) {
    try {
      // Log new client detection
      console.log(`✅ Novo cliente detectado: ${client.nome_completo} (${client.telefone})`);
      
      results.push({
        client,
        success: true
      });
      
    } catch (error: any) {
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

/**
 * Limpa cache expirado (função de limpeza)
 */
export function cleanExpiredCache(): void {
  const now = new Date();
  const expiredKeys = [];
  
  for (const [key, cache] of clientCache.entries()) {
    const timeDiff = now.getTime() - cache.lastUpdate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff > CACHE_TIMEOUT_MINUTES * 2) { // Remover cache muito antigo
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => {
    clientCache.delete(key);
    console.log(`🧹 Cache expirado removido: ${key}`);
  });
}

/**
 * Obtém estatísticas do cache para debugging
 */
export function getCacheStats(): any {
  const stats = {
    totalCaches: clientCache.size,
    caches: []
  };
  
  for (const [key, cache] of clientCache.entries()) {
    stats.caches.push({
      key,
      clientCount: cache.clients.length,
      lastUpdate: cache.lastUpdate,
      lastCheck: cache.lastCheck,
      isValid: isCacheValid(...key.split('-'))
    });
  }
  
  return stats;
}