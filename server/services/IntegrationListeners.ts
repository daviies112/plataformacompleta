import { createClient } from '@supabase/supabase-js';
import NotificationService from './NotificationService';
import { db } from '../db';
import { pluggyConnections } from '../../shared/db-schema.js';
import { eq, and } from 'drizzle-orm';
import { log } from '../production';

class IntegrationListeners {
  private supabaseClient: any = null;
  private setupComplete: boolean = false;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      // PRIORIDADE 1: Environment variables (SYSTEM-LEVEL - sem tenant)
      let supabaseUrl: string | null = null;
      let supabaseKey: string | null = null;
      
      try {
        const { getSupabaseCredentialsFromEnv } = await import('../lib/credentialsDb.js');
        const credentials = await getSupabaseCredentialsFromEnv();
        if (credentials && credentials.url && credentials.anonKey) {
          supabaseUrl = credentials.url;
          supabaseKey = credentials.anonKey;
          log('✅ Usando credenciais de environment variables para listeners (system-level)');
        }
      } catch (error) {
        log(`⚠️ Erro ao buscar credenciais de environment variables: ${error}`);
      }
      
      // PRIORIDADE 2: Variáveis de ambiente (Secrets) - Fallback
      if (!supabaseUrl || !supabaseKey) {
        supabaseUrl = process.env.REACT_APP_SUPABASE_URL || null;
        supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || null;
        if (supabaseUrl && supabaseKey) {
          log('✅ Usando credenciais dos Secrets (fallback) para listeners');
        }
      }

      if (supabaseUrl && supabaseKey) {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        log('✅ Supabase client inicializado para listeners');
      } else {
        log('ℹ️  Supabase não configurado - listeners não ativos');
      }
    } catch (error) {
      log(`⚠️  Erro ao inicializar Supabase client: ${error}`);
    }
  }

  // ============ SUPABASE LISTENERS ============
  
  async setupSupabaseListeners(userId: string, tenantId: string) {
    if (!this.supabaseClient) {
      log('⚠️  Supabase não configurado');
      return;
    }

    try {
      // Exemplo: Monitorar workspace pages
      const channel = this.supabaseClient
        .channel('workspace_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'pages' 
          }, 
          (payload: any) => this.handlePageInsert(userId, tenantId, payload)
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'databases' 
          }, 
          (payload: any) => this.handleDatabaseInsert(userId, tenantId, payload)
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'boards' 
          }, 
          (payload: any) => this.handleBoardInsert(userId, tenantId, payload)
        )
        .subscribe();

      log(`✅ [TENANT:${tenantId}] Supabase listeners configurados para workspace`);
      this.setupComplete = true;
    } catch (error) {
      log(`❌ Erro ao configurar Supabase listeners: ${error}`);
    }
  }

  private async handlePageInsert(userId: string, tenantId: string, payload: any) {
    log(`📄 [TENANT:${tenantId}] Nova página criada:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📄 Nova Página Criada',
      body: `Uma nova página foi criada: ${payload.new.title || 'Sem título'}`,
      data: {
        table: 'pages',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/pages/${payload.new.id}`
      }
    });
  }

  private async handleDatabaseInsert(userId: string, tenantId: string, payload: any) {
    log(`📊 [TENANT:${tenantId}] Novo database criado:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📊 Novo Database Criado',
      body: `Um novo database foi criado: ${payload.new.name || 'Sem nome'}`,
      data: {
        table: 'databases',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/databases/${payload.new.id}`
      }
    });
  }

  private async handleBoardInsert(userId: string, tenantId: string, payload: any) {
    log(`📋 [TENANT:${tenantId}] Novo board criado:`, payload.new);

    await NotificationService.sendNotification(userId, tenantId, {
      type: 'SUPABASE_NEW_DATA',
      title: '📋 Novo Board Criado',
      body: `Um novo board foi criado: ${payload.new.name || 'Sem nome'}`,
      data: {
        table: 'boards',
        record_id: payload.new.id,
        action: 'insert',
        url: `/workspace/boards/${payload.new.id}`
      }
    });
  }

  // ============ PLUGGY INTEGRATION ============

  async handlePluggyWebhook(event: any) {
    try {
      log(`💰 Evento Pluggy recebido: ${event.event}`);

      // MULTI-TENANT: Buscar conexão com tenantId
      const [connection] = await db.select()
        .from(pluggyConnections)
        .where(eq(pluggyConnections.itemId, event.data?.itemId));

      if (!connection) {
        log('⚠️  Conexão Pluggy não encontrada');
        return;
      }

      let notificationData;

      switch (event.event) {
        case 'transaction/created':
          notificationData = {
            type: 'PLUGGY_UPDATE' as const,
            title: '💰 Nova Transação',
            body: `${event.data.description || 'Transação'} - ${this.formatCurrency(event.data.amount)}`,
            data: {
              transaction_id: event.data.id,
              amount: event.data.amount,
              description: event.data.description,
              date: event.data.date,
              url: '/faturamento'
            }
          };
          break;

        case 'account/updated':
          notificationData = {
            type: 'PLUGGY_UPDATE' as const,
            title: '🔄 Conta Atualizada',
            body: 'Suas informações financeiras foram atualizadas',
            data: {
              account_id: event.data.id,
              balance: event.data.balance,
              url: '/faturamento'
            }
          };
          break;

        case 'item/error':
          notificationData = {
            type: 'SYSTEM_ALERT' as const,
            title: '⚠️ Erro de Conexão Bancária',
            body: 'Há um problema com sua conexão bancária. Verifique suas credenciais.',
            data: {
              item_id: event.data.itemId,
              error: event.data.error,
              url: '/faturamento'
            }
          };
          break;

        default:
          return;
      }

      // MULTI-TENANT: Incluir tenantId ao enviar notificação
      await NotificationService.sendNotification(connection.userId, connection.tenantId, notificationData);
      
      log(`✅ [TENANT:${connection.tenantId}] Pluggy webhook processado com sucesso`);
    } catch (error) {
      log(`❌ Erro ao processar webhook do Pluggy: ${error}`);
    }
  }

  // ============ HELPERS ============

  private formatEventTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  // MULTI-TENANT: Método para registrar conexão Pluggy com tenantId
  async registerPluggyConnection(userId: string, tenantId: string, itemId: string, connectorId?: string, connectorName?: string) {
    try {
      await db.insert(pluggyConnections).values({
        userId,
        tenantId,
        itemId,
        connectorId,
        connectorName
      }).onConflictDoUpdate({
        target: pluggyConnections.itemId,
        set: {
          userId,
          tenantId,
          connectorId,
          connectorName,
          createdAt: new Date()
        }
      });

      log(`✅ [TENANT:${tenantId}] Conexão Pluggy registrada para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao registrar conexão Pluggy: ${error}`);
      throw error;
    }
  }
}

// Lazy singleton pattern to avoid blocking module imports
let instance: IntegrationListeners | null = null;

export function getIntegrationListeners(): IntegrationListeners {
  if (!instance) {
    instance = new IntegrationListeners();
  }
  return instance;
}

// Export a proxy object that lazily initializes the instance
export default {
  setupSupabaseListeners: (...args: Parameters<IntegrationListeners['setupSupabaseListeners']>) => getIntegrationListeners().setupSupabaseListeners(...args),
  handlePluggyWebhook: (...args: Parameters<IntegrationListeners['handlePluggyWebhook']>) => getIntegrationListeners().handlePluggyWebhook(...args),
  registerPluggyConnection: (...args: Parameters<IntegrationListeners['registerPluggyConnection']>) => getIntegrationListeners().registerPluggyConnection(...args),
};
