/**
 * Simple background job queue system using Redis/Memory
 * For handling async tasks like emails, notifications, data processing
 */

import { cache } from './cache';
import { leadSyncService } from '../formularios/services/leadSync.js';

export interface Job {
  id: string;
  type: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  error?: string;
}

export type JobHandler<T = any> = (data: T) => Promise<void>;

class SimpleQueue {
  private name: string;
  private queueKey: string;
  private processing: boolean = false;
  private handlers: Map<string, JobHandler> = new Map();
  private activeJobs: number = 0;
  private maxConcurrent: number = 5;
  
  // Circuit breaker para evitar Redis storm
  private redisAvailable: boolean = true;
  private lastRedisCheck: number = 0;
  private redisCheckInterval: number = 60000; // 1 minuto

  constructor(name: string, maxConcurrent: number = 5) {
    this.name = name;
    this.queueKey = `queue:${name}`;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Register a job handler
   */
  registerHandler<T = any>(jobType: string, handler: JobHandler<T>) {
    this.handlers.set(jobType, handler);
    console.log(`✅ Handler registrado para job type: ${jobType}`);
  }

  /**
   * Add job to queue
   */
  async add(jobType: string, data: any, options: {
    maxAttempts?: number;
    ttl?: number;
  } = {}): Promise<string> {
    const job: Job = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
    };

    const jobKey = `${this.queueKey}:${job.id}`;
    await cache.set(jobKey, job, options.ttl || 3600); // 1 hour default TTL

    // Manter índice de job IDs para o processador encontrar os jobs
    const indexKey = `${this.queueKey}:index`;
    const currentIndex = await cache.get<string[]>(indexKey) || [];
    currentIndex.push(job.id);
    await cache.set(indexKey, currentIndex, 86400); // 24 horas

    console.log(`📥 Job adicionado à fila: ${jobType} (${job.id})`);
    return job.id;
  }

  /**
   * Process jobs in the queue
   */
  async process() {
    if (this.processing) {
      console.log(`⚠️ Processamento já em andamento para fila: ${this.name}`);
      return;
    }

    this.processing = true;
    console.log(`🚀 Iniciando processamento da fila: ${this.name}`);

    while (this.processing) {
      try {
        // Wait if at max concurrent jobs
        if (this.activeJobs >= this.maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Get all jobs (simplified - in production use Redis SCAN)
        const pattern = `${this.queueKey}:*`;
        const allKeys = await this.getAllKeys(pattern);
        
        if (allKeys.length === 0) {
          // Se Redis está indisponível, esperar MAIS (30s ao invés de 1s)
          const delay = this.redisAvailable ? 1000 : 30000;
          if (!this.redisAvailable) {
            console.log(`⏳ Redis indisponível para ${this.name}, aguardando ${delay/1000}s antes de tentar novamente...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Process first available job
        const jobKey = allKeys[0];
        const job = await cache.get<Job>(jobKey);

        if (job) {
          this.processJob(job, jobKey).catch(error => {
            console.error(`❌ Erro ao processar job ${job.id}:`, error);
          });
        }

        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error('❌ Erro no processamento da fila:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🛑 Processamento da fila ${this.name} parado`);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job, jobKey: string) {
    this.activeJobs++;

    try {
      const handler = this.handlers.get(job.type);
      
      if (!handler) {
        console.error(`❌ Nenhum handler registrado para job type: ${job.type}`);
        await this.removeJobFromIndex(job.id);
        await cache.del(jobKey); // Remove job sem handler
        return;
      }

      console.log(`⚙️ Processando job: ${job.type} (${job.id})`);

      // Execute handler
      await handler(job.data);

      // Job completed successfully
      job.processedAt = Date.now();
      await this.removeJobFromIndex(job.id);
      await cache.del(jobKey);
      
      console.log(`✅ Job concluído: ${job.type} (${job.id})`);
    } catch (error) {
      job.attempts++;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Erro no job ${job.id} (tentativa ${job.attempts}/${job.maxAttempts}):`, error);

      if (job.attempts >= job.maxAttempts) {
        console.error(`❌ Job ${job.id} falhou permanentemente após ${job.attempts} tentativas`);
        
        // Move to dead letter queue
        const deadLetterKey = `${this.queueKey}:failed:${job.id}`;
        await cache.set(deadLetterKey, job, 86400); // Keep for 24 hours
        await this.removeJobFromIndex(job.id);
        await cache.del(jobKey);
      } else {
        // Retry with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        setTimeout(async () => {
          await cache.set(jobKey, job, 3600);
        }, backoffDelay);
      }
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Remove job ID from index after processing
   */
  private async removeJobFromIndex(jobId: string): Promise<void> {
    try {
      const indexKey = `${this.queueKey}:index`;
      const currentIndex = await cache.get<string[]>(indexKey) || [];
      const newIndex = currentIndex.filter(id => id !== jobId);
      await cache.set(indexKey, newIndex, 86400);
    } catch (error) {
      console.error(`❌ Erro ao remover job ${jobId} do índice:`, error);
    }
  }

  /**
   * Stop processing
   */
  stop() {
    this.processing = false;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const pattern = `${this.queueKey}:*`;
    const allKeys = await this.getAllKeys(pattern);
    const failedPattern = `${this.queueKey}:failed:*`;
    const failedKeys = await this.getAllKeys(failedPattern);

    return {
      name: this.name,
      pending: allKeys.length,
      failed: failedKeys.length,
      active: this.activeJobs,
      processing: this.processing,
    };
  }

  /**
   * Clear all jobs
   */
  async clear() {
    const pattern = `${this.queueKey}:*`;
    await cache.delPattern(pattern);
    console.log(`🗑️ Fila ${this.name} limpa`);
  }

  /**
   * Helper to get all keys (simplified) with circuit breaker
   */
  private async getAllKeys(pattern: string): Promise<string[]> {
    try {
      // Circuit breaker: se Redis está indisponível, não tenta por 1 minuto
      const now = Date.now();
      if (!this.redisAvailable && (now - this.lastRedisCheck < this.redisCheckInterval)) {
        console.log(`⚠️ Redis circuit breaker ativo para ${this.name} - esperando...`);
        return [];
      }
      
      // Try to get jobs from cache/Redis
      const indexKey = `${this.queueKey}:index`;
      const jobIds = await cache.get<string[]>(indexKey) || [];
      
      // Redis OK, resetar circuit breaker
      this.redisAvailable = true;
      this.lastRedisCheck = now;
      
      return jobIds.map(id => `${this.queueKey}:${id}`);
    } catch (error: any) {
      // Redis falhou - ativar circuit breaker
      this.redisAvailable = false;
      this.lastRedisCheck = Date.now();
      
      console.error(`❌ Redis error for ${this.name}, activating circuit breaker:`, error.message);
      
      // Parar loop se é erro de limite excedido
      if (error.message?.includes('max requests limit exceeded')) {
        console.error(`🚨 REDIS LIMIT EXCEEDED - stopping ${this.name} queue processing`);
        console.error(`🚨 Por favor, crie um novo Redis para continuar o processamento`);
        this.processing = false; // PARA O LOOP
      }
      
      return [];
    }
  }
}

// Create queue instances
export const emailQueue = new SimpleQueue('emails', 3);
export const analyticsQueue = new SimpleQueue('analytics', 5);
export const notificationQueue = new SimpleQueue('notifications', 5);
export const dataProcessingQueue = new SimpleQueue('data-processing', 2);

/**
 * Initialize all queues
 */
export function initializeQueues() {
  // Email queue handlers
  emailQueue.registerHandler('send_email', async (data: {
    to: string;
    subject: string;
    html: string;
  }) => {
    console.log(`📧 Enviando email para ${data.to}: ${data.subject}`);
    // Email sending logic will be implemented with Resend
  });

  // Analytics queue handlers
  analyticsQueue.registerHandler('track_event', async (data: {
    userId: string;
    event: string;
    properties: any;
  }) => {
    console.log(`📊 Tracking event: ${data.event} for user ${data.userId}`);
  });

  // Notification queue handlers
  notificationQueue.registerHandler('push_notification', async (data: {
    userId: string;
    title: string;
    message: string;
  }) => {
    console.log(`🔔 Sending notification to ${data.userId}: ${data.title}`);
  });

  // Data processing queue handlers
  dataProcessingQueue.registerHandler('process_upload', async (data: {
    fileId: string;
    userId: string;
  }) => {
    console.log(`⚙️ Processing upload ${data.fileId} for user ${data.userId}`);
  });

  // Form submission sync handler - sincroniza submission do Supabase para lead local
  // EXTENSÃO: Agora passa TODOS os campos da submission incluindo endereço, instagram, answers
  dataProcessingQueue.registerHandler('sync_form_submission', async (data: {
    submissionId: string;
    formId: string;
    tenantId: string;
    contactPhone: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactCpf: string | null;
    instagramHandle: string | null;
    birthDate: string | null;
    addressCep: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    agendouReuniao: boolean | null;
    dataAgendamento: string | null;
    answers: any | null;
    totalScore: number;
    passed: boolean;
    formStatus: string;
    formularioAberto: boolean;
    formularioIniciado: boolean;
    updatedAt: string;
  }) => {
    console.log(`🔄 [Queue] Sincronizando submission ${data.submissionId} para lead (tenant: ${data.tenantId}, formStatus: ${data.formStatus})`);
    
    try {
      const result = await leadSyncService.syncSubmissionToLead({
        id: data.submissionId,
        formId: data.formId,
        tenantId: data.tenantId,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactCpf: data.contactCpf,
        instagramHandle: data.instagramHandle,
        birthDate: data.birthDate,
        addressCep: data.addressCep,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement,
        addressNeighborhood: data.addressNeighborhood,
        addressCity: data.addressCity,
        addressState: data.addressState,
        agendouReuniao: data.agendouReuniao,
        dataAgendamento: data.dataAgendamento,
        answers: data.answers,
        totalScore: data.totalScore,
        passed: data.passed,
        formStatus: data.formStatus,
        formularioAberto: data.formularioAberto,
        formularioIniciado: data.formularioIniciado
      });

      if (result.success) {
        console.log(`✅ [Queue] Lead ${result.leadId} atualizado com sucesso (pipeline: ${result.pipelineStatus || 'n/a'})`);
      } else {
        console.warn(`⚠️ [Queue] Aviso na sincronização: ${result.message}`);
      }
    } catch (error: any) {
      console.error(`❌ [Queue] Erro ao sincronizar submission ${data.submissionId}:`, error);
      throw error;
    }
  });

  // Start processing all queues
  emailQueue.process().catch(console.error);
  analyticsQueue.process().catch(console.error);
  notificationQueue.process().catch(console.error);
  dataProcessingQueue.process().catch(console.error);

  console.log('✅ Todas as filas de background jobs inicializadas');
}

/**
 * Graceful shutdown
 */
export function shutdownQueues() {
  emailQueue.stop();
  analyticsQueue.stop();
  notificationQueue.stop();
  dataProcessingQueue.stop();
  console.log('🛑 Todas as filas paradas');
}

export { SimpleQueue };
