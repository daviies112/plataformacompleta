import { 
  getAllAdminsWithCredentials, 
  createTenantClient, 
  processPendingSyncEvents 
} from './masterSyncService';

let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;
const POLL_INTERVAL_MS = 30000;

export function startContractSyncPoller(): void {
  if (pollInterval) {
    console.log('[ContractSync] Poller já está rodando');
    return;
  }
  
  console.log('🔄 [ContractSync] Iniciando poller de sincronização de contratos...');
  
  pollInterval = setInterval(async () => {
    if (isPolling) {
      console.log('[ContractSync] Polling anterior ainda em andamento, pulando...');
      return;
    }
    
    await pollAllTenants();
  }, POLL_INTERVAL_MS);
  
  setTimeout(pollAllTenants, 5000);
}

export function stopContractSyncPoller(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[ContractSync] Poller parado');
  }
}

async function pollAllTenants(): Promise<void> {
  if (isPolling) return;
  
  isPolling = true;
  
  try {
    const admins = await getAllAdminsWithCredentials();
    
    if (!admins.length) {
      return;
    }
    
    let totalProcessed = 0;
    
    for (const admin of admins) {
      try {
        const tenantClient = createTenantClient(admin.credentials);
        const processed = await processPendingSyncEvents(admin.admin_id, tenantClient);
        totalProcessed += processed;
        
        if (processed > 0) {
          console.log(`✅ [ContractSync] Admin ${admin.admin_id}: ${processed} eventos processados`);
        }
      } catch (error) {
        console.error(`[ContractSync] Erro no admin ${admin.admin_id}:`, error);
      }
    }
    
    if (totalProcessed > 0) {
      console.log(`📊 [ContractSync] Total processado neste ciclo: ${totalProcessed}`);
    }
    
  } catch (error) {
    console.error('[ContractSync] Erro no polling:', error);
  } finally {
    isPolling = false;
  }
}

export async function manualSync(adminId: string): Promise<number> {
  const admins = await getAllAdminsWithCredentials();
  const admin = admins.find(a => a.admin_id === adminId);
  
  if (!admin) {
    console.error(`[ContractSync] Admin ${adminId} não encontrado`);
    return 0;
  }
  
  const tenantClient = createTenantClient(admin.credentials);
  return processPendingSyncEvents(adminId, tenantClient);
}
