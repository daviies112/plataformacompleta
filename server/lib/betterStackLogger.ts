/**
 * Better Stack (Logtail) logger integration with Pino
 * Optimized for FREE tier usage with batching and rate-limiting
 * 
 * SOLUÇÃO CORRETA: Usa pino.multistream() para criar múltiplos destinos de log
 * - Console stream (pino-pretty em dev, stdout em prod)
 * - Better Stack stream customizado (batching + rate-limiting + retry)
 */

import pino from 'pino';
import https from 'https';
import { Writable } from 'stream';
import { getBetterStackCredentials } from './credentialsDb';

// Mapeamento de níveis do Pino (numbers) para strings
const LEVEL_NAMES: { [key: number]: string } = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

interface PinoLogEntry {
  level: number;
  time: number;
  msg: string;
  pid?: number;
  hostname?: string;
  [key: string]: any;
}

/**
 * Stream customizado para Better Stack com batching e rate-limiting
 * Implementa a interface Writable do Node.js para ser compatível com pino.multistream()
 */
class BetterStackStream extends Writable {
  private sourceToken: string;
  private ingestingHost: string;
  private batchSize: number;
  private batchIntervalMs: number;
  private maxRetries: number;
  private logBuffer: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastSentTime = 0;
  private minSendIntervalMs = 5000; // 5s conforme requisito
  
  constructor(sourceToken: string, ingestingHost: string = 'in.logs.betterstack.com') {
    super();
    this.sourceToken = sourceToken;
    this.ingestingHost = ingestingHost;
    this.batchSize = 10; // 10 logs por batch
    this.batchIntervalMs = 5000; // Flush a cada 5s
    this.maxRetries = 3; // 3 tentativas com exponential backoff
    
    this.startFlushTimer();
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Better Stack] Stream initialized - batching enabled');
      console.log(`  - Batch size: ${this.batchSize} logs`);
      console.log(`  - Batch interval: ${this.batchIntervalMs}ms`);
      console.log(`  - Min send interval: ${this.minSendIntervalMs}ms`);
      console.log(`  - Max retries: ${this.maxRetries}`);
    }
  }
  
  /**
   * Método _write implementado para interface Writable
   * Este método é chamado pelo Pino para cada log entry
   */
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    try {
      const msg = chunk.toString();
      const logEntry: PinoLogEntry = JSON.parse(msg);
      
      // Converter para formato Better Stack
      const betterStackLog = {
        dt: new Date(logEntry.time).toISOString(),
        level: LEVEL_NAMES[logEntry.level] || 'info',
        message: logEntry.msg || '',
        ...logEntry,
      };
      
      this.logBuffer.push(betterStackLog);
      
      // Debug log apenas em dev
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Better Stack] Buffered log: "${logEntry.msg}" (${this.logBuffer.length}/${this.batchSize})`);
      }
      
      // Flush se atingiu o tamanho do batch
      if (this.logBuffer.length >= this.batchSize) {
        this.flush().then(() => callback()).catch(() => callback());
      } else {
        callback();
      }
    } catch (error) {
      // Silenciosamente ignora erros de parsing para não quebrar o logger
      callback();
    }
  }
  
  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.batchIntervalMs);
  }
  
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    
    // Rate-limiting: espera pelo menos 5s entre envios
    if (timeSinceLastSend < this.minSendIntervalMs) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Better Stack] Rate-limited (waited ${timeSinceLastSend}ms < ${this.minSendIntervalMs}ms)`);
      }
      return;
    }
    
    const logsToSend = this.logBuffer.splice(0, this.batchSize);
    this.lastSentTime = now;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Better Stack] Flushing ${logsToSend.length} logs to Better Stack...`);
    }
    
    await this.sendLogs(logsToSend);
  }
  
  private async sendLogs(logs: any[], retryCount = 0): Promise<void> {
    return new Promise((resolve) => {
      const payload = JSON.stringify(logs);
      
      const options = {
        hostname: this.ingestingHost,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sourceToken}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Better Stack] ✅ Successfully sent ${logs.length} logs (status: ${res.statusCode})`);
            }
            resolve();
          } else if (retryCount < this.maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Better Stack] ⚠️ Got status ${res.statusCode}, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
            }
            setTimeout(() => {
              this.sendLogs(logs, retryCount + 1).then(resolve);
            }, delay);
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.error(`[Better Stack] ❌ Failed after ${this.maxRetries} retries, status: ${res.statusCode}`);
            }
            resolve();
          }
        });
      });
      
      req.on('error', (error) => {
        if (retryCount < this.maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Better Stack] ⚠️ Request error: ${error.message}, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
          }
          setTimeout(() => {
            this.sendLogs(logs, retryCount + 1).then(resolve);
          }, delay);
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[Better Stack] ❌ Failed after ${this.maxRetries} retries:`, error.message);
          }
          resolve();
        }
      });
      
      req.write(payload);
      req.end();
    });
  }
  
  async shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

// Variáveis globais
let logger: pino.Logger | null = null;
let betterStackEnabled = false;
let betterStackStream: BetterStackStream | null = null;

/**
 * Initialize Better Stack logger usando pino.multistream()
 * Esta é a abordagem correta conforme documentação oficial do Pino
 */
export async function initializeBetterStackLogger(): Promise<pino.Logger> {
  if (logger) {
    return logger;
  }

  try {
    const credentials = await getBetterStackCredentials();
    
    if (!credentials || !credentials.sourceToken) {
      console.log('⚠️ Better Stack não configurado - usando logger padrão');
      betterStackEnabled = false;
      
      // Logger simples sem Better Stack
      logger = pino({
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      });
      
      return logger;
    }

    betterStackEnabled = true;
    const ingestingHost = credentials.ingestingHost || 'in.logs.betterstack.com';

    // Criar stream Better Stack
    betterStackStream = new BetterStackStream(credentials.sourceToken, ingestingHost);

    // Criar array de streams para multistream
    const streams: pino.StreamEntry[] = [];
    
    // Stream 1: Console (pino-pretty em dev, stdout em prod)
    if (process.env.NODE_ENV === 'production') {
      streams.push({
        level: 'info',
        stream: process.stdout,
      });
    } else {
      // Em dev, criar pretty stream
      const prettyStream = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      });
      
      streams.push({
        level: process.env.LOG_LEVEL || 'info',
        stream: prettyStream,
      });
    }
    
    // Stream 2: Better Stack (custom stream com batching e rate-limiting)
    streams.push({
      level: 'info',
      stream: betterStackStream,
    });

    // Criar logger com multistream
    logger = pino({
      level: process.env.LOG_LEVEL || 'info',
    }, pino.multistream(streams));

    console.log('✅ Better Stack logger inicializado com pino.multistream()');
    console.log('   - Console logging: ativo');
    console.log('   - Better Stack logging: ativo com batching/rate-limiting');
    
    return logger;
  } catch (error) {
    console.error('❌ Erro ao inicializar Better Stack logger:', error);
    
    // Fallback para logger padrão
    logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
    
    return logger;
  }
}

/**
 * Get logger instance (lazy initialization)
 */
export async function getLogger(): Promise<pino.Logger> {
  if (!logger) {
    await initializeBetterStackLogger();
  }
  return logger!;
}

/**
 * Check if Better Stack is enabled
 */
export function isBetterStackEnabled(): boolean {
  return betterStackEnabled;
}

/**
 * Shutdown logger and flush pending logs
 */
export async function shutdownLogger(): Promise<void> {
  if (betterStackStream) {
    await betterStackStream.shutdown();
  }
}

/**
 * Log helper functions
 */
export async function logInfo(message: string, data?: any) {
  const log = await getLogger();
  log.info(data || {}, message);
}

export async function logError(message: string, error?: any) {
  const log = await getLogger();
  log.error({ error: error?.message || error }, message);
}

export async function logWarn(message: string, data?: any) {
  const log = await getLogger();
  log.warn(data || {}, message);
}

export async function logDebug(message: string, data?: any) {
  const log = await getLogger();
  log.debug(data || {}, message);
}

export { logger };
