import type { Express, Request, Response } from 'express';
import NotificationService from '../services/NotificationService';
import IntegrationListeners from '../services/IntegrationListeners';
import UnifiedNotificationService from '../services/UnifiedNotificationService';
import { log } from '../production';
import { db } from '../db';
import { notificationSettings } from '../../shared/db-schema.js';
import { eq, and } from 'drizzle-orm';

export function registerNotificationRoutes(app: Express) {
  // ============ ROTAS DE DISPOSITIVOS ============

  // Obter chave pública VAPID
  app.get('/api/notifications/vapid-public-key', (req: Request, res: Response) => {
    try {
      // Verificar autenticação para garantir multi-tenant isolation
      if (!(req.session as any)?.userId && !(req.session as any)?.tenantId) {
        return res.json({ success: false, error: 'Não autenticado' });
      }

      const publicKey = NotificationService.getVapidPublicKey();
      if (!publicKey) {
        return res.json({ success: false, error: 'VAPID keys not configured' });
      }
      res.json({ publicKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Registrar dispositivo
  app.post('/api/notifications/devices/register', async (req: Request, res: Response) => {
    try {
      const { subscription, deviceInfo } = req.body;

      // MULTI-TENANT: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const result = await NotificationService.registerDevice(
        userId,
        tenantId,
        JSON.stringify(subscription), // Armazenar subscription completa como JSON
        {
          type: deviceInfo?.type || 'web',
          name: deviceInfo?.name,
          model: deviceInfo?.model,
          userAgent: req.headers['user-agent']
        }
      );

      log(`📱 [TENANT:${tenantId}] Dispositivo registrado para usuário ${userId} - Token: ${result.token?.substring(0, 8)}...`);
      res.json(result); // Retorna { success: true, token: hash }
    } catch (error: any) {
      log(`❌ Erro ao registrar dispositivo: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Remover dispositivo
  app.delete('/api/notifications/devices/:token', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { token } = req.params;
      // Passar userId e tenantId para verificar propriedade antes de deletar
      const result = await NotificationService.unregisterDevice(userId, tenantId, token);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ROTAS DE CONFIGURAÇÕES ============

  // Obter configurações
  app.get('/api/notifications/settings', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const settings = await NotificationService.getUserSettings(userId, tenantId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar configurações
  app.put('/api/notifications/settings', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const settings = req.body;
      const result = await NotificationService.updateUserSettings(userId, tenantId, settings);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ROTAS DE HISTÓRICO ============

  // Obter histórico de notificações
  app.get('/api/notifications/history', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await NotificationService.getNotificationHistory(userId, tenantId, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marcar notificação como lida
  app.post('/api/notifications/history/:id/read', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Obter userId e tenantId da sessão
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const notificationId = parseInt(req.params.id);
      // Passar userId e tenantId para verificar propriedade antes de atualizar
      const result = await NotificationService.markAsRead(userId, tenantId, notificationId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ROTAS DE TESTE ============

  // Enviar notificação de teste
  app.post('/api/notifications/test', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const result = await NotificationService.sendNotification(userId, tenantId, {
        type: 'SYSTEM_ALERT',
        title: '🔔 Notificação de Teste',
        body: 'Suas notificações estão funcionando perfeitamente! 🎉',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
          url: '/'
        }
      });

      res.json(result);
    } catch (error: any) {
      log(`❌ Erro ao enviar notificação de teste: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ WEBHOOKS ============

  // Webhook do Pluggy
  app.post('/api/notifications/webhooks/pluggy', async (req: Request, res: Response) => {
    try {
      const event = req.body;

      log(`💰 Webhook Pluggy recebido - Event: ${event.event}`);

      // Responder imediatamente
      res.status(200).send('OK');

      // Processar em background
      setImmediate(() => {
        IntegrationListeners.handlePluggyWebhook(event);
      });
    } catch (error: any) {
      log(`❌ Erro no webhook do Pluggy: ${error.message}`);
      res.status(500).send('Error');
    }
  });

  // ============ SETUP DE INTEGRAÇÕES ============

  // Registrar conexão Pluggy
  app.post('/api/notifications/integrations/pluggy/register', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { itemId, connectorId, connectorName } = req.body;

      // MULTI-TENANT: Passar tenantId para o método
      const result = await IntegrationListeners.registerPluggyConnection(
        userId,
        tenantId,
        itemId,
        connectorId,
        connectorName
      );

      res.json(result);
    } catch (error: any) {
      log(`❌ Erro ao registrar conexão Pluggy: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Configurar listeners do Supabase
  app.post('/api/notifications/integrations/supabase/setup', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      // MULTI-TENANT: Passar tenantId para o método
      await IntegrationListeners.setupSupabaseListeners(userId, tenantId);

      res.json({ success: true, message: 'Supabase listeners configurados' });
    } catch (error: any) {
      log(`❌ Erro ao configurar listeners do Supabase: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ UNIFIED NOTIFICATIONS ============

  // Testar notificação unificada (todos os canais)
  app.post('/api/notifications/unified/test', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { type, channels } = req.body;

      let result;

      switch (type) {
        case 'pluggy':
          result = await UnifiedNotificationService.sendPluggyNotification(
            userId,
            'Compra no Supermercado',
            -250.50
          );
          break;

        case 'dashboard':
          result = await UnifiedNotificationService.sendDashboardAlert(
            userId,
            'Receita Mensal',
            150000,
            100000
          );
          break;

        case 'client':
          result = await UnifiedNotificationService.sendClientNotification(
            userId,
            'João Silva',
            'Novo cliente adicionado'
          );
          break;

        case 'system':
          result = await UnifiedNotificationService.sendSystemAlert(
            userId,
            'Limite de Armazenamento',
            'Você está usando 85% do seu espaço disponível.',
            'high'
          );
          break;

        default:
          // Envio personalizado
          result = await UnifiedNotificationService.send({
            userId,
            type: 'SYSTEM',
            title: '🔔 Notificação de Teste Unificada',
            body: 'Esta é uma notificação enviada por todos os canais configurados!',
            priority: 'normal',
            channels: channels || undefined,
            data: {
              test: true,
              timestamp: new Date().toISOString(),
              url: '/'
            },
            email: {
              subject: 'Teste de Notificação Unificada',
              actionText: 'Abrir Dashboard',
              actionUrl: '/dashboard'
            }
          });
      }

      res.json(result);
    } catch (error: any) {
      log(`❌ Erro ao testar notificação unificada: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Enviar notificação unificada personalizada
  app.post('/api/notifications/unified/send', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { type, title, body, priority, channels, data, email } = req.body;

      const result = await UnifiedNotificationService.send({
        userId,
        type: type || 'SYSTEM',
        title,
        body,
        priority: priority || 'normal',
        channels,
        data,
        email
      });

      res.json(result);
    } catch (error: any) {
      log(`❌ Erro ao enviar notificação unificada: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ CONFIGURAÇÃO DE CANAIS ============

  // Configurar email e telefone para notificações
  app.post('/api/notifications/channels/configure', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { email, phone, emailEnabled, whatsappEnabled } = req.body;

      // MULTI-TENANT SECURITY: Buscar configuração existente filtrando por userId AND tenantId
      const [existing] = await db.select()
        .from(notificationSettings)
        .where(and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.tenantId, tenantId)
        ));

      if (existing) {
        // MULTI-TENANT SECURITY: Atualizar apenas dados do tenant correto
        await db.update(notificationSettings)
          .set({
            email: email || existing.email,
            phone: phone || existing.phone,
            emailEnabled: emailEnabled !== undefined ? emailEnabled : existing.emailEnabled,
            whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : existing.whatsappEnabled,
            updatedAt: new Date()
          })
          .where(and(
            eq(notificationSettings.userId, userId),
            eq(notificationSettings.tenantId, tenantId)
          ));
      } else {
        // MULTI-TENANT SECURITY: Criar nova configuração com tenantId
        await db.insert(notificationSettings).values({
          userId,
          tenantId,
          email,
          phone,
          emailEnabled: emailEnabled ?? 'true',
          whatsappEnabled: whatsappEnabled ?? 'false'
        });
      }

      res.json({
        success: true,
        message: 'Canais de notificação configurados com sucesso'
      });
    } catch (error: any) {
      log(`❌ Erro ao configurar canais: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar configuração de canais
  app.get('/api/notifications/channels', async (req: Request, res: Response) => {
    try {
      // MULTI-TENANT SECURITY: Exigir autenticação válida (sem fallback dev_user)
      const userId = (req.session as any)?.userId;
      const tenantId = (req.session as any)?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      // MULTI-TENANT SECURITY: Buscar apenas dados do tenant correto
      const [settings] = await db.select()
        .from(notificationSettings)
        .where(and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.tenantId, tenantId)
        ));

      res.json({
        email: settings?.email ?? null,
        phone: settings?.phone ?? null,
        emailEnabled: settings?.emailEnabled ?? 'true',
        whatsappEnabled: settings?.whatsappEnabled ?? 'false'
      });
    } catch (error: any) {
      log(`❌ Erro ao buscar canais: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  log('✅ Rotas de notificações registradas');
}
