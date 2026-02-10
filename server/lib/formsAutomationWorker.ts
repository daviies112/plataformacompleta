import { log } from '../production';
import { processAllPendingSubmissions } from './formsAutomation';
import { isClienteSupabaseConfigured } from './clienteSupabase';

let isRunning = false;
let pollingInterval: NodeJS.Timeout | null = null;
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000099";

export interface AutomationConfig {
  enabled: boolean;
  pollingIntervalMinutes: number;
  tenantId: string;
  userId: string;
  limit: number;
}

let config: AutomationConfig = {
  enabled: true,
  pollingIntervalMinutes: 0.5, // 30 segundos (monitoramento quase em tempo real)
  tenantId: DEFAULT_TENANT_ID,
  userId: DEFAULT_USER_ID,
  limit: 10,
};

async function processSubmissionsJob() {
  if (!config.enabled) {
    log('⏸️  Automação desabilitada - pulando processamento');
    return;
  }

  if (!(await isClienteSupabaseConfigured())) {
    log('⚠️  Supabase do cliente não configurado - automação desabilitada');
    return;
  }

  if (isRunning) {
    log('⏳ Job anterior ainda em execução - pulando esta rodada');
    return;
  }

  try {
    isRunning = true;
    log('🤖 [AUTOMAÇÃO] Iniciando processamento automático de submissions pendentes...');
    
    const result = await processAllPendingSubmissions(
      config.tenantId,
      config.userId,
      config.limit
    );

    if (result.total > 0) {
      log(`✅ [AUTOMAÇÃO] Processamento concluído: ${result.processed} sucesso, ${result.failed} falhas de ${result.total} total`);
    } else {
      log('ℹ️  [AUTOMAÇÃO] Nenhuma submission pendente para processar');
    }
  } catch (error: any) {
    log(`❌ [AUTOMAÇÃO] Erro no job de processamento: ${error.message}`);
  } finally {
    isRunning = false;
  }
}

export function startAutomation(customConfig?: Partial<AutomationConfig>) {
  if (customConfig) {
    config = { ...config, ...customConfig };
  }

  if (pollingInterval) {
    log('⚠️  Automação já está rodando');
    return;
  }

  if (!config.enabled) {
    log('⏸️  Automação está desabilitada');
    return;
  }

  const intervalMs = config.pollingIntervalMinutes * 60 * 1000;
  
  log(`🚀 [AUTOMAÇÃO] Iniciando worker automático`);
  log(`   Intervalo: ${config.pollingIntervalMinutes} minutos`);
  log(`   Tenant ID: ${config.tenantId}`);
  log(`   Limite por rodada: ${config.limit}`);

  // Executar imediatamente na primeira vez
  processSubmissionsJob();

  // Depois executar no intervalo configurado
  pollingInterval = setInterval(() => {
    processSubmissionsJob();
  }, intervalMs);

  log('✅ [AUTOMAÇÃO] Worker iniciado com sucesso');
}

export function stopAutomation() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    log('⏹️  [AUTOMAÇÃO] Worker parado');
  }
}

export function getAutomationConfig(): AutomationConfig {
  return { ...config };
}

export function updateAutomationConfig(newConfig: Partial<AutomationConfig>) {
  const oldConfig = { ...config };
  config = { ...config, ...newConfig };
  
  log(`⚙️  [AUTOMAÇÃO] Configuração atualizada:`);
  if (oldConfig.enabled !== config.enabled) {
    log(`   Enabled: ${oldConfig.enabled} → ${config.enabled}`);
  }
  if (oldConfig.pollingIntervalMinutes !== config.pollingIntervalMinutes) {
    log(`   Intervalo: ${oldConfig.pollingIntervalMinutes}min → ${config.pollingIntervalMinutes}min`);
  }

  // Reiniciar worker se intervalo mudou
  if (pollingInterval && oldConfig.pollingIntervalMinutes !== config.pollingIntervalMinutes) {
    stopAutomation();
    if (config.enabled) {
      startAutomation();
    }
  }

  // Iniciar/parar baseado na flag enabled
  if (!oldConfig.enabled && config.enabled) {
    startAutomation();
  } else if (oldConfig.enabled && !config.enabled) {
    stopAutomation();
  }
}

export function getAutomationStatus() {
  return {
    isRunning: pollingInterval !== null,
    isProcessing: isRunning,
    config,
    nextRunIn: pollingInterval ? `${config.pollingIntervalMinutes} minutos` : 'Parado',
  };
}
