import fs from 'fs';
import path from 'path';

// Arquivo de log da automação
const AUTOMATION_LOG_FILE = path.join(process.cwd(), 'data', 'automation.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Interface para entrada de log
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  clientId: string;
  tenantId: string;
  message: string;
  details?: any;
}

// Função para garantir que o diretório data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(AUTOMATION_LOG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Função para rotacionar logs quando muito grandes
function rotateLogs() {
  try {
    if (!fs.existsSync(AUTOMATION_LOG_FILE)) {
      return;
    }
    
    const stats = fs.statSync(AUTOMATION_LOG_FILE);
    if (stats.size < MAX_LOG_SIZE) {
      return;
    }
    
    // Mover logs existentes
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = `${AUTOMATION_LOG_FILE}.${i}`;
      const newFile = `${AUTOMATION_LOG_FILE}.${i + 1}`;
      
      if (fs.existsSync(oldFile)) {
        if (i === MAX_LOG_FILES - 1) {
          fs.unlinkSync(oldFile); // Deletar o mais antigo
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }
    
    // Mover log atual
    fs.renameSync(AUTOMATION_LOG_FILE, `${AUTOMATION_LOG_FILE}.1`);
    
  } catch (error) {
    console.error('Erro ao rotacionar logs da automação:', error);
  }
}

// Função para escrever entrada de log
export function writeAutomationLog(
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
  clientId: string,
  tenantId: string,
  message: string,
  details?: any
): void {
  try {
    ensureDataDirectory();
    rotateLogs();
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      clientId,
      tenantId,
      message,
      details
    };
    
    const logLine = `${logEntry.timestamp} [${logEntry.level}] ${logEntry.clientId}/${logEntry.tenantId}: ${logEntry.message}`;
    const logLineWithDetails = details ? `${logLine} - Details: ${JSON.stringify(details)}\n` : `${logLine}\n`;
    
    fs.appendFileSync(AUTOMATION_LOG_FILE, logLineWithDetails, 'utf8');
    
    // Também logar no console para desenvolvimento
    const consoleMessage = `🤖 [${level}] ${clientId}/${tenantId}: ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, details || '');
        break;
      case 'WARN':
        console.warn(consoleMessage, details || '');
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV === 'development') {
          console.debug(consoleMessage, details || '');
        }
        break;
      default:
        console.log(consoleMessage, details || '');
    }
    
  } catch (error) {
    console.error('Erro ao escrever log da automação:', error);
  }
}

// Funções de conveniência para diferentes níveis de log
export const automationLogger = {
  info: (clientId: string, tenantId: string, message: string, details?: any) => 
    writeAutomationLog('INFO', clientId, tenantId, message, details),
  
  warn: (clientId: string, tenantId: string, message: string, details?: any) => 
    writeAutomationLog('WARN', clientId, tenantId, message, details),
  
  error: (clientId: string, tenantId: string, message: string, details?: any) => 
    writeAutomationLog('ERROR', clientId, tenantId, message, details),
  
  debug: (clientId: string, tenantId: string, message: string, details?: any) => 
    writeAutomationLog('DEBUG', clientId, tenantId, message, details)
};

// Função para ler logs recentes
export function getRecentAutomationLogs(maxLines: number = 100): string[] {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(AUTOMATION_LOG_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(AUTOMATION_LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    
    return lines.slice(-maxLines);
    
  } catch (error) {
    console.error('Erro ao ler logs da automação:', error);
    return [];
  }
}

// Função para limpar logs antigos
export function cleanOldLogs(): void {
  try {
    for (let i = MAX_LOG_FILES; i <= MAX_LOG_FILES + 5; i++) {
      const logFile = `${AUTOMATION_LOG_FILE}.${i}`;
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error);
  }
}