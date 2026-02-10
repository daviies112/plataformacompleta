import webpush from 'web-push';
import crypto from 'crypto';
import { db } from '../db';
import { 
  deviceTokens, 
  notificationSettings, 
  notificationHistory 
} from '../../shared/db-schema.js';
import { eq, and } from 'drizzle-orm';
import { log } from '../production';

interface NotificationPayload {
  type: 'SUPABASE_NEW_DATA' | 'PLUGGY_UPDATE' | 'SYSTEM_ALERT';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface DeviceInfo {
  type: 'web' | 'ios' | 'android';
  name?: string;
  model?: string;
  userAgent?: string;
}

class NotificationService {
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private firebaseConfigured: boolean = false;

  constructor() {
    this.initializeWebPush();
    this.checkFirebaseConfig();
  }

  private initializeWebPush() {
    // Gerar chaves VAPID se não existirem
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      // Gerar novas chaves para desenvolvimento
      const keys = webpush.generateVAPIDKeys();
      this.vapidKeys = keys;
      log('⚠️  VAPID keys geradas para desenvolvimento. Configure as env vars para produção:');
      log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
      log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
    } else {
      this.vapidKeys = { publicKey, privateKey };
      log('✅ VAPID keys configuradas');
    }

    if (this.vapidKeys) {
      webpush.setVapidDetails(
        'mailto:admin@nexusintelligence.app',
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
    }
  }

  private checkFirebaseConfig() {
    try {
      const hasFirebase = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_CLIENT_EMAIL && 
                         process.env.FIREBASE_PRIVATE_KEY;
      
      if (hasFirebase) {
        log('✅ Firebase configurado para notificações');
        this.firebaseConfigured = true;
      } else {
        log('ℹ️  Firebase não configurado - usando Web Push API');
      }
    } catch (error) {
      log('⚠️  Erro ao verificar Firebase, usando Web Push API');
    }
  }

  getVapidPublicKey(): string | null {
    return this.vapidKeys?.publicKey || process.env.VAPID_PUBLIC_KEY || null;
  }

  async registerDevice(userId: string, tenantId: string, subscriptionJson: string, deviceInfo: DeviceInfo) {
    try {
      // Parsear subscription para extrair o endpoint
      const subscription = JSON.parse(subscriptionJson);
      
      // Gerar hash SHA256 do endpoint como token único
      const tokenHash = crypto
        .createHash('sha256')
        .update(subscription.endpoint)
        .digest('hex');

      await db.insert(deviceTokens).values({
        userId,
        tenantId,
        token: tokenHash,
        subscriptionData: subscriptionJson,
        deviceType: deviceInfo.type,
        deviceName: deviceInfo.name,
        deviceModel: deviceInfo.model,
        userAgent: deviceInfo.userAgent,
        lastActive: new Date(),
      }).onConflictDoUpdate({
        target: deviceTokens.token,
        set: {
          userId,
          tenantId,
          subscriptionData: subscriptionJson,
          deviceType: deviceInfo.type,
          lastActive: new Date(),
        }
      });

      log(`📱 [TENANT:${tenantId}] Dispositivo registrado para usuário ${userId}: ${deviceInfo.type} (token: ${tokenHash.substring(0, 8)}...)`);
      return { success: true, token: tokenHash };
    } catch (error) {
      log(`❌ Erro ao registrar dispositivo: ${error}`);
      throw error;
    }
  }

  async unregisterDevice(userId: string, tenantId: string, token: string) {
    try {
      // MULTI-TENANT SECURITY: Verificar propriedade antes de deletar
      await db.delete(deviceTokens).where(
        and(
          eq(deviceTokens.token, token),
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.tenantId, tenantId)
        )
      );
      log(`📱 [TENANT:${tenantId}] Dispositivo removido para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao remover dispositivo: ${error}`);
      throw error;
    }
  }

  async sendNotification(userId: string, tenantId: string, notification: NotificationPayload) {
    try {
      // Buscar configurações do usuário
      const settings = await this.getUserSettings(userId, tenantId);

      // Verificar se notificações estão habilitadas
      if (settings.enabled !== 'true') {
        return { success: false, reason: 'notifications_disabled' };
      }

      // Verificar se o tipo específico está habilitado
      if (!this.isTypeEnabled(settings, notification.type)) {
        return { success: false, reason: 'notification_type_disabled' };
      }

      // Verificar horário silencioso
      if (this.isQuietHours(settings)) {
        return { success: false, reason: 'quiet_hours' };
      }

      // Buscar dispositivos do usuário - MULTI-TENANT: filtrar por userId AND tenantId
      const devices = await db.select()
        .from(deviceTokens)
        .where(and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.tenantId, tenantId)
        ));

      if (devices.length === 0) {
        return { success: false, reason: 'no_devices' };
      }

      // Preparar payload
      const payload = this.preparePayload(notification, settings);

      // Enviar para todos os dispositivos usando subscriptionData
      const results = await Promise.all(
        devices.map(device => this.sendToDevice(userId, tenantId, device.subscriptionData, payload))
      );

      const successCount = results.filter(r => r.success).length;

      // Salvar no histórico - MULTI-TENANT: incluir tenantId
      await db.insert(notificationHistory).values({
        userId,
        tenantId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sentAt: new Date(),
        success: successCount > 0 ? 'true' : 'false',
        devicesSent: successCount,
      });

      log(`🔔 [TENANT:${tenantId}] Notificação enviada para ${successCount}/${devices.length} dispositivos`);

      return {
        success: successCount > 0,
        sent: successCount,
        total: devices.length,
      };
    } catch (error) {
      log(`❌ Erro ao enviar notificação: ${error}`);
      throw error;
    }
  }

  private async sendToDevice(userId: string, tenantId: string, subscriptionData: string, payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Parse do subscription data
      const subscription = JSON.parse(subscriptionData);

      // Enviar usando Web Push API
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        {
          TTL: 24 * 60 * 60, // 24 horas
        }
      );

      return { success: true };
    } catch (error: any) {
      // Remover tokens inválidos
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Gerar hash do endpoint para remover
        const subscription = JSON.parse(subscriptionData);
        const tokenHash = crypto
          .createHash('sha256')
          .update(subscription.endpoint)
          .digest('hex');
        await this.unregisterDevice(userId, tenantId, tokenHash);
      }

      log(`❌ Erro ao enviar para dispositivo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private preparePayload(notification: NotificationPayload, settings: any) {
    const notifIcons: Record<string, string> = {
      SUPABASE_NEW_DATA: '📊',
      CALENDAR_EVENT: '📅',
      PLUGGY_UPDATE: '💰',
      SYSTEM_ALERT: '⚠️',
    };

    return {
      title: notification.title,
      body: settings.showPreview === 'true' ? notification.body : 'Nova notificação',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-72x72.png',
      image: notification.image,
      tag: notification.type,
      requireInteraction: notification.type === 'SYSTEM_ALERT',
      data: {
        type: notification.type,
        timestamp: new Date().toISOString(),
        url: notification.data?.url || '/',
        ...notification.data,
      },
      actions: notification.actions || [],
      vibrate: settings.vibration === 'true' ? [200, 100, 200] : undefined,
    };
  }

  private async getUserSettings(userId: string, tenantId: string) {
    // MULTI-TENANT: filtrar por userId AND tenantId
    const [settings] = await db.select()
      .from(notificationSettings)
      .where(and(
        eq(notificationSettings.userId, userId),
        eq(notificationSettings.tenantId, tenantId)
      ));

    if (!settings) {
      // Criar configurações padrão - MULTI-TENANT: incluir tenantId
      const defaultSettings = {
        userId,
        tenantId,
        enabled: 'true',
        sound: 'true',
        vibration: 'true',
        badge: 'true',
        showPreview: 'true',
        quietHoursEnabled: 'false',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        supabaseEnabled: 'true',
        calendarEnabled: 'true',
        pluggyEnabled: 'true',
        systemEnabled: 'true',
      };

      await db.insert(notificationSettings).values(defaultSettings);
      return defaultSettings;
    }

    return settings;
  }

  async updateUserSettings(userId: string, tenantId: string, settings: Partial<typeof notificationSettings.$inferInsert>) {
    try {
      // MULTI-TENANT: incluir tenantId nas configurações
      await db.insert(notificationSettings)
        .values({ userId, tenantId, ...settings } as any)
        .onConflictDoUpdate({
          target: [notificationSettings.userId, notificationSettings.tenantId],
          set: { ...settings, updatedAt: new Date() },
        });

      log(`⚙️  [TENANT:${tenantId}] Configurações atualizadas para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao atualizar configurações: ${error}`);
      throw error;
    }
  }

  private isTypeEnabled(settings: any, type: string): boolean {
    const typeMap: Record<string, string> = {
      SUPABASE_NEW_DATA: 'supabaseEnabled',
      CALENDAR_EVENT: 'calendarEnabled',
      PLUGGY_UPDATE: 'pluggyEnabled',
      SYSTEM_ALERT: 'systemEnabled',
    };

    const settingKey = typeMap[type];
    return !settingKey || settings[settingKey] === 'true';
  }

  private isQuietHours(settings: any): boolean {
    if (settings.quietHoursEnabled !== 'true') return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }

  async getNotificationHistory(userId: string, tenantId: string, limit: number = 50) {
    try {
      // MULTI-TENANT: filtrar por userId AND tenantId
      const history = await db.select()
        .from(notificationHistory)
        .where(and(
          eq(notificationHistory.userId, userId),
          eq(notificationHistory.tenantId, tenantId)
        ))
        .orderBy(notificationHistory.sentAt)
        .limit(limit);

      return history;
    } catch (error) {
      log(`❌ Erro ao buscar histórico: ${error}`);
      throw error;
    }
  }

  async markAsRead(userId: string, tenantId: string, notificationId: number) {
    try {
      // MULTI-TENANT SECURITY: Verificar propriedade antes de atualizar
      await db.update(notificationHistory)
        .set({ read: 'true', readAt: new Date() })
        .where(
          and(
            eq(notificationHistory.id, notificationId),
            eq(notificationHistory.userId, userId),
            eq(notificationHistory.tenantId, tenantId)
          )
        );

      log(`✅ [TENANT:${tenantId}] Notificação ${notificationId} marcada como lida para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Erro ao marcar como lida: ${error}`);
      throw error;
    }
  }
}

// Lazy singleton pattern to avoid blocking module imports
let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!instance) {
    instance = new NotificationService();
  }
  return instance;
}

// Export a proxy object that lazily initializes the instance
export default {
  getVapidPublicKey: () => getNotificationService().getVapidPublicKey(),
  registerDevice: (userId: string, tenantId: string, ...args: Parameters<NotificationService['registerDevice']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().registerDevice(userId, tenantId, ...args),
  unregisterDevice: (userId: string, tenantId: string, ...args: Parameters<NotificationService['unregisterDevice']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().unregisterDevice(userId, tenantId, ...args),
  getUserSettings: (userId: string, tenantId: string) => getNotificationService().getUserSettings(userId, tenantId),
  updateUserSettings: (userId: string, tenantId: string, ...args: Parameters<NotificationService['updateUserSettings']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().updateUserSettings(userId, tenantId, ...args),
  sendNotification: (userId: string, tenantId: string, ...args: Parameters<NotificationService['sendNotification']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().sendNotification(userId, tenantId, ...args),
  getNotificationHistory: (userId: string, tenantId: string, ...args: Parameters<NotificationService['getNotificationHistory']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().getNotificationHistory(userId, tenantId, ...args),
  markAsRead: (userId: string, tenantId: string, ...args: Parameters<NotificationService['markAsRead']> extends [string, string, ...infer Rest] ? Rest : never) => 
    getNotificationService().markAsRead(userId, tenantId, ...args),
};
