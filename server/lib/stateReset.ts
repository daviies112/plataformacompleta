import fs from 'fs';
import path from 'path';
import { log } from '../production';

const DATA_DIR = path.join(process.cwd(), 'data');

const STATE_FILES = [
  'form_submission_poller_state.json',
  'cpf_processed_ids.json',
  'cpf_compliance_poller_state.json',
  'automation_state.json',
];

export function resetFormPollerState(): void {
  const filePath = path.join(DATA_DIR, 'form_submission_poller_state.json');
  const initialState = {
    lastSyncedAt: null,
    lastSyncedId: null,
    lastRunAt: null,
    totalSubmissionsProcessed: 0,
    totalErrors: 0,
    lastError: null
  };
  
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(initialState, null, 2), 'utf8');
    log('🔄 [StateReset] FormPoller state resetado');
  } catch (error) {
    console.error('❌ [StateReset] Erro ao resetar FormPoller state:', error);
  }
}

export function resetCPFProcessedIds(): void {
  const filePath = path.join(DATA_DIR, 'cpf_processed_ids.json');
  
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, '[]', 'utf8');
    log('🔄 [StateReset] CPF processed IDs resetado');
  } catch (error) {
    console.error('❌ [StateReset] Erro ao resetar CPF processed IDs:', error);
  }
}

export function resetCPFPollerState(): void {
  const filePath = path.join(DATA_DIR, 'cpf_compliance_poller_state.json');
  const initialState = {
    lastPolledAt: null,
    totalProcessed: 0,
    totalErrors: 0,
    lastError: null
  };
  
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(initialState, null, 2), 'utf8');
    log('🔄 [StateReset] CPFPoller state resetado');
  } catch (error) {
    console.error('❌ [StateReset] Erro ao resetar CPFPoller state:', error);
  }
}

export function resetAutomationState(): void {
  const filePath = path.join(DATA_DIR, 'automation_state.json');
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log('🔄 [StateReset] Automation state removido');
    }
  } catch (error) {
    console.error('❌ [StateReset] Erro ao resetar automation state:', error);
  }
}

export function resetAllPollerStates(): void {
  log('🔄 [StateReset] Resetando todos os estados de polling...');
  
  resetFormPollerState();
  resetCPFProcessedIds();
  resetCPFPollerState();
  resetAutomationState();
  
  log('✅ [StateReset] Todos os estados de polling resetados com sucesso!');
  log('📊 [StateReset] O sistema irá sincronizar todos os dados do Supabase na próxima execução.');
}

export function checkAndResetStaleStates(): void {
  log('🔍 [StateReset] Verificando estados obsoletos...');
  
  const formPollerPath = path.join(DATA_DIR, 'form_submission_poller_state.json');
  
  if (fs.existsSync(formPollerPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(formPollerPath, 'utf8'));
      
      if (data.lastSyncedAt) {
        const lastSync = new Date(data.lastSyncedAt);
        const now = new Date();
        const daysSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceSync > 7) {
          log(`⚠️ [StateReset] FormPoller não sincroniza há ${Math.floor(daysSinceSync)} dias - resetando...`);
          resetFormPollerState();
        }
      }
    } catch (error) {
      log('⚠️ [StateReset] Estado do FormPoller corrompido - resetando...');
      resetFormPollerState();
    }
  }
}

export function isFirstRun(): boolean {
  const formPollerPath = path.join(DATA_DIR, 'form_submission_poller_state.json');
  const cpfPollerPath = path.join(DATA_DIR, 'cpf_compliance_poller_state.json');
  
  return !fs.existsSync(formPollerPath) && !fs.existsSync(cpfPollerPath);
}

export function initializePollerStates(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const formPollerPath = path.join(DATA_DIR, 'form_submission_poller_state.json');
  const cpfPollerPath = path.join(DATA_DIR, 'cpf_compliance_poller_state.json');
  const cpfProcessedPath = path.join(DATA_DIR, 'cpf_processed_ids.json');
  
  if (!fs.existsSync(formPollerPath)) {
    resetFormPollerState();
  }
  
  if (!fs.existsSync(cpfPollerPath)) {
    resetCPFPollerState();
  }
  
  if (!fs.existsSync(cpfProcessedPath)) {
    resetCPFProcessedIds();
  }
  
  log('✅ [StateReset] Estados de polling inicializados');
}
