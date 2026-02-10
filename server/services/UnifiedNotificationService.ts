import NotificationService from './NotificationService';
import { sendNotificationEmail, sendBillingEmail } from '../lib/email';
import { log } from '../production';
import { db } from '../db';
import { notificationSettings } from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';

interface UnifiedNotificationPayload {
  userId: string;
  type: 'CALENDAR' | 'PLUGGY' | 'WHATSAPP' | 'DASHBOARD' | 'CLIENT' | 'SYSTEM';
  title: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  channels?: {
    push?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
  // Templates de email personalizados
  email?: {
    subject?: string;
    actionText?: string;
    actionUrl?: string;
  };
}

interface NotificationResult {
  success: boolean;
  channels: {
    push?: { success: boolean; sent?: number; error?: string };
    email?: { success: boolean; messageId?: string; error?: string };
    whatsapp?: { success: boolean; messageId?: string; error?: string };
  };
}

class UnifiedNotificationService {
  /**
   * Envia notificação por todos os canais configurados pelo usuário
   */
  async send(payload: UnifiedNotificationPayload): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: false,
      channels: {}
    };

    try {
      // Buscar preferências do usuário
      const userSettings = await this.getUserNotificationPreferences(payload.userId);
      
      // Determinar quais canais usar
      const channels = this.determineChannels(payload, userSettings);

      // Enviar por Push Notification
      if (channels.push) {
        result.channels.push = await this.sendPush(payload);
      }

      // Enviar por Email
      if (channels.email) {
        result.channels.email = await this.sendEmail(payload);
      }

      // Enviar por WhatsApp
      if (channels.whatsapp) {
        result.channels.whatsapp = await this.sendWhatsApp(payload);
      }

      // Marcar como sucesso se pelo menos um canal funcionou
      result.success = Object.values(result.channels).some(ch => ch?.success);

      log(`📬 Notificação unificada enviada para ${payload.userId}: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      log(`❌ Erro ao enviar notificação unificada: ${error}`);
      throw error;
    }
  }

  /**
   * Envia notificação push
   */
  private async sendPush(payload: UnifiedNotificationPayload) {
    try {
      // Mapear tipo para o NotificationService
      const typeMap: Record<string, 'SUPABASE_NEW_DATA' | 'PLUGGY_UPDATE' | 'SYSTEM_ALERT'> = {
        'CALENDAR': 'SYSTEM_ALERT',
        'PLUGGY': 'PLUGGY_UPDATE',
        'WHATSAPP': 'SYSTEM_ALERT',
        'DASHBOARD': 'SYSTEM_ALERT',
        'CLIENT': 'SUPABASE_NEW_DATA',
        'SYSTEM': 'SYSTEM_ALERT'
      };

      const result = await NotificationService.sendNotification(payload.userId, {
        type: typeMap[payload.type],
        title: payload.title,
        body: payload.body,
        data: payload.data
      });

      return {
        success: result.success,
        sent: result.sent,
        error: result.success ? undefined : 'Failed to send push notification'
      };
    } catch (error: any) {
      log(`❌ Erro ao enviar push: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia notificação por email
   */
  private async sendEmail(payload: UnifiedNotificationPayload) {
    try {
      // Buscar email do usuário
      const userEmail = await this.getUserEmail(payload.userId);
      if (!userEmail) {
        return {
          success: false,
          error: 'User email not found'
        };
      }

      const subject = payload.email?.subject || payload.title;
      const actionText = payload.email?.actionText;
      const actionUrl = payload.email?.actionUrl || payload.data?.url;

      // Usar template apropriado baseado no tipo
      if (payload.type === 'PLUGGY' && payload.data?.billingType) {
        await sendBillingEmail(userEmail, payload.data.billingType, payload.data);
      } else {
        await sendNotificationEmail(
          userEmail,
          subject,
          payload.body,
          actionUrl,
          actionText
        );
      }

      return {
        success: true,
        messageId: 'queued'
      };
    } catch (error: any) {
      log(`❌ Erro ao enviar email: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia notificação por WhatsApp (Evolution API)
   */
  private async sendWhatsApp(payload: UnifiedNotificationPayload) {
    try {
      // Buscar número de WhatsApp do usuário
      const userPhone = await this.getUserPhone(payload.userId);
      if (!userPhone) {
        return {
          success: false,
          error: 'User phone not found'
        };
      }

      // Buscar credenciais do Evolution API
      const evolutionApi = await this.getEvolutionApiConfig();
      if (!evolutionApi) {
        return {
          success: false,
          error: 'Evolution API not configured'
        };
      }

      // Montar mensagem formatada
      const message = this.formatWhatsAppMessage(payload);

      // Enviar mensagem via Evolution API
      const response = await fetch(`${evolutionApi.apiUrl}/message/sendText/${evolutionApi.instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': evolutionApi.apiKey
        },
        body: JSON.stringify({
          number: userPhone,
          text: message
        })
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.key?.id || 'sent'
      };
    } catch (error: any) {
      log(`❌ Erro ao enviar WhatsApp: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determina quais canais devem ser usados baseado nas preferências do usuário
   */
  private determineChannels(
    payload: UnifiedNotificationPayload,
    userSettings: any
  ): { push: boolean; email: boolean; whatsapp: boolean } {
    // Se especificado explicitamente no payload, usar essas configurações
    if (payload.channels) {
      return {
        push: payload.channels.push ?? false,
        email: payload.channels.email ?? false,
        whatsapp: payload.channels.whatsapp ?? false
      };
    }

    // Caso contrário, usar preferências do usuário
    const priority = payload.priority || 'normal';
    
    return {
      // Push sempre ativo se estiver habilitado
      push: userSettings.pushEnabled === 'true',
      
      // Email para prioridade normal ou superior
      email: userSettings.emailEnabled === 'true' && 
             ['normal', 'high', 'urgent'].includes(priority),
      
      // WhatsApp apenas para prioridade alta ou urgente
      whatsapp: userSettings.whatsappEnabled === 'true' && 
                ['high', 'urgent'].includes(priority)
    };
  }

  /**
   * Busca preferências de notificação do usuário
   */
  private async getUserNotificationPreferences(userId: string) {
    const [settings] = await db.select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));

    return {
      pushEnabled: settings?.enabled || 'true',
      emailEnabled: settings?.emailEnabled || 'true',
      whatsappEnabled: settings?.whatsappEnabled || 'false',
      email: settings?.email || null,
      phone: settings?.phone || null
    };
  }

  /**
   * Busca email do usuário
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    const [settings] = await db.select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));

    // Se encontrou email nas configurações, usar
    if (settings?.email) {
      return settings.email;
    }

    // Fallback para email do ambiente (desenvolvimento)
    return process.env.CLIENT_LOGIN_EMAIL || null;
  }

  /**
   * Busca telefone do usuário
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    const [settings] = await db.select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));

    // Retornar número de WhatsApp se configurado
    return settings?.phone || null;
  }

  /**
   * Busca configurações do Evolution API
   */
  private async getEvolutionApiConfig(): Promise<{ apiUrl: string; apiKey: string; instance: string } | null> {
    // TODO: Buscar do banco de dados de credenciais
    // Por enquanto, buscar das env vars
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || 'nexus-whatsapp';

    if (!apiUrl || !apiKey) {
      return null;
    }

    return { apiUrl, apiKey, instance };
  }

  /**
   * Formata mensagem para WhatsApp
   */
  private formatWhatsAppMessage(payload: UnifiedNotificationPayload): string {
    const emoji = this.getEmojiForType(payload.type);
    
    let message = `${emoji} *${payload.title}*\n\n`;
    message += `${payload.body}\n`;
    
    if (payload.data?.url) {
      const baseUrl = process.env.API_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      message += `\n🔗 ${baseUrl}${payload.data.url}`;
    }
    
    message += `\n\n_Enviado via NEXUS INTELLIGENCE_`;
    
    return message;
  }

  /**
   * Retorna emoji apropriado para o tipo de notificação
   */
  private getEmojiForType(type: string): string {
    const emojiMap: Record<string, string> = {
      'CALENDAR': '📅',
      'PLUGGY': '💰',
      'WHATSAPP': '💬',
      'DASHBOARD': '📊',
      'CLIENT': '👤',
      'SYSTEM': '⚠️'
    };
    
    return emojiMap[type] || '🔔';
  }

  /**
   * Métodos de conveniência para tipos comuns de notificação
   */

  async sendCalendarNotification(userId: string, eventTitle: string, eventTime: Date) {
    return this.send({
      userId,
      type: 'CALENDAR',
      title: '📅 Evento Próximo',
      body: `${eventTitle} - ${this.formatDateTime(eventTime)}`,
      priority: 'normal',
      data: {
        url: '/calendario',
        eventTime: eventTime.toISOString()
      },
      email: {
        subject: `Lembrete: ${eventTitle}`,
        actionText: 'Ver Calendário',
        actionUrl: '/calendario'
      }
    });
  }

  async sendPluggyNotification(userId: string, transactionDescription: string, amount: number) {
    return this.send({
      userId,
      type: 'PLUGGY',
      title: '💰 Nova Transação',
      body: `${transactionDescription} - ${this.formatCurrency(amount)}`,
      priority: Math.abs(amount) > 1000 ? 'high' : 'normal',
      data: {
        url: '/faturamento',
        amount
      },
      email: {
        subject: 'Nova transação bancária',
        actionText: 'Ver Faturamento',
        actionUrl: '/faturamento'
      }
    });
  }

  async sendDashboardAlert(userId: string, metricName: string, value: number, threshold: number) {
    return this.send({
      userId,
      type: 'DASHBOARD',
      title: '📊 Alerta de Métrica',
      body: `${metricName} atingiu ${value} (limite: ${threshold})`,
      priority: 'high',
      data: {
        url: '/dashboard',
        metricName,
        value,
        threshold
      },
      email: {
        subject: `Alerta: ${metricName} acima do limite`,
        actionText: 'Ver Dashboard',
        actionUrl: '/dashboard'
      }
    });
  }

  async sendClientNotification(userId: string, clientName: string, action: string) {
    return this.send({
      userId,
      type: 'CLIENT',
      title: '👤 Atualização de Cliente',
      body: `${clientName}: ${action}`,
      priority: 'normal',
      data: {
        url: '/clientes',
        clientName,
        action
      }
    });
  }

  async sendSystemAlert(userId: string, alertTitle: string, alertBody: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'high') {
    return this.send({
      userId,
      type: 'SYSTEM',
      title: `⚠️ ${alertTitle}`,
      body: alertBody,
      priority,
      data: {
        url: '/configuracoes'
      },
      email: {
        subject: `Sistema: ${alertTitle}`,
        actionText: 'Ver Configurações',
        actionUrl: '/configuracoes'
      }
    });
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
}

export default new UnifiedNotificationService();
