/**
 * Evolution API Routes
 * Rotas para gerenciar a conexão WhatsApp via Evolution API
 */

import express from 'express';
import {
  getQRCode,
  getInstanceStatus,
  logoutInstance,
  deleteInstance,
  createInstance,
  getEvolutionConfig,
  fetchChats,
  fetchContacts,
  fetchMessages,
  sendMessage,
  sendMedia,
  sendAudio
} from '../lib/evolutionApi';
import { credentialsStorage, decrypt } from '../lib/credentialsManager';
import { chatCacheManager } from '../lib/chatCacheManager';
import { cacheWhatsAppMessages } from '../lib/cacheStrategies';
import { authenticateToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/evolution/qrcode
 * Obtém o QR code para conectar o WhatsApp
 */
router.get('/qrcode', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado. Configure em Configurações > Evolution API',
      });
    }

    // Checking status first to avoid generating QR code if already connected
    // This fixes the "QR Code não disponível" error on frontend
    try {
      const statusData = await getInstanceStatus(config);
      if (statusData?.instance?.state === 'open') {
        console.log(`✅ [Evolution API] Instância ${config.instance} já conectada. Retornando status.`);
        return res.json({
          success: true,
          alreadyConnected: true,
          qrcode: null,
          instance: config.instance,
          message: 'WhatsApp já está conectado'
        });
      }
    } catch (statusError) {
      console.warn('⚠️ [Evolution API] Erro ao verificar status (continuando para QR code):', statusError);
    }

    const qrData = await getQRCode(config);

    res.json({
      success: true,
      qrcode: qrData.qrcode,
      instance: qrData.instance,
    });
  } catch (error) {
    console.error('Erro ao obter QR code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter QR code',
    });
  }
});

/**
 * GET /api/evolution/status
 * Verifica o status da conexão WhatsApp
 */
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const status = await getInstanceStatus(config);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter status',
    });
  }
});

/**
 * POST /api/evolution/create
 * Cria uma nova instância na Evolution API
 */
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const instance = await createInstance(config);

    res.json({
      success: true,
      instance,
    });
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar instância',
    });
  }
});

/**
 * POST /api/evolution/logout
 * Desconecta o WhatsApp
 */
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const result = await logoutInstance(config);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer logout',
    });
  }
});

/**
 * DELETE /api/evolution/delete
 * Deleta a instância WhatsApp
 */
router.delete('/delete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const result = await deleteInstance(config);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar instância',
    });
  }
});

/**
 * POST /api/evolution/chats
 * Busca todas as conversas do WhatsApp
 * 🚀 ULTRA-RÁPIDO COM CACHE REDIS COMPLETO
 * 
 * Estratégia:
 * 1. Retorna cache IMEDIATAMENTE se existir (<200ms)
 * 2. Se cache expirou, agenda refresh em BACKGROUND
 * 3. Frontend nunca espera Evolution API
 */
router.post('/chats', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚡ [ULTRA-FAST] Buscando chats com cache Redis agressivo');
    console.log('⏰ Timestamp:', new Date().toISOString());

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const forceRefresh = req.body?.forceRefresh === true;
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      console.log('❌ [BACKEND] Evolution API não configurado');
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    // ESTRATÉGIA 1: Tenta retornar do cache IMEDIATAMENTE
    if (!forceRefresh) {
      const cached = await chatCacheManager.getCachedChats(clientId, tenantId);

      if (cached) {
        const responseTime = Date.now() - startTime;
        console.log(`⚡ CACHE HIT! Retornando ${cached.chats.length} chats em ${responseTime}ms`);
        console.log(`📊 Cache info: versão ${cached.metadata.version}, última sync: ${cached.metadata.lastSync}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Agenda refresh em BACKGROUND se necessário (não bloqueia)
        const needsRefresh = await chatCacheManager.needsRefresh(clientId, tenantId);
        if (needsRefresh) {
          console.log('🔄 Cache expirando em breve - agendando refresh em background...');
          chatCacheManager.refreshChatsInBackground(clientId, tenantId, config, async (chats) => {
            return enrichChatsWithContacts(chats, clientId, tenantId, config);
          });
        }

        return res.json({
          success: true,
          chats: cached.chats,
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime,
            count: cached.chats.length,
            cached: true,
            cacheVersion: cached.metadata.version,
            lastSync: cached.metadata.lastSync,
          },
        });
      }
    }

    // ESTRATÉGIA 2: Cache vazio ou forceRefresh - fazer refresh SÍNCRONO
    console.log(forceRefresh ? '🔥 FORCE REFRESH solicitado' : '📭 Cache vazio - primeira vez');
    console.log('🔄 Fazendo refresh SÍNCRONO (bloqueante apenas na primeira vez)...');

    const enrichFn = async (chats: any[]) => {
      return enrichChatsWithContacts(chats, clientId, tenantId, config);
    };

    const cached = await chatCacheManager.forceRefreshSync(clientId, tenantId, config, enrichFn);

    const responseTime = Date.now() - startTime;
    console.log(`✅ Refresh completo! ${cached.chats.length} chats em ${responseTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      chats: cached.chats,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime,
        count: cached.chats.length,
        cached: false,
        cacheVersion: cached.metadata.version,
        lastSync: cached.metadata.lastSync,
      },
    });
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [BACKEND] ERRO ao buscar conversas:');
    console.error('  Timestamp:', new Date().toISOString());
    console.error('  Erro:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar conversas',
    });
  }
});

/**
 * Função auxiliar para enriquecer chats com nomes de contatos
 */
async function enrichChatsWithContacts(chats: any[], clientId: string, tenantId: string, config: any): Promise<any[]> {
  if (chats.length === 0) return chats;

  try {
    console.log('📇 Enriquecendo chats com nomes de contatos...');
    const { getCachedContacts } = await import('../lib/cache');
    const contactsMap = await getCachedContacts(clientId, tenantId, config);

    let enrichedCount = 0;
    const enrichedChats = chats.map((chat: any) => {
      const contact = contactsMap.contactsByJid[chat.remoteJid];

      if (contact) {
        const contactName = contact.name || contact.pushName || contact.notify;
        if (contactName && contactName !== chat.pushName) {
          enrichedCount++;
          return {
            ...chat,
            pushName: contactName,
            contactInfo: {
              name: contact.name,
              pushName: contact.pushName,
              notify: contact.notify,
            },
          };
        }
      }

      return chat;
    });

    console.log(`✅ ${enrichedCount}/${chats.length} chats enriquecidos com nomes`);
    return enrichedChats;
  } catch (error) {
    console.warn('⚠️ Erro ao enriquecer com contatos:', error);
    return chats; // Fallback: retorna chats sem enriquecimento
  }
}

/**
 * POST /api/evolution/force-sync
 * 🔧 ENDPOINT DE DEBUG: Força sincronização manual com WhatsApp Web
 * Tenta várias estratégias para forçar refresh na Evolution API
 */
router.post('/force-sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [FORCE-SYNC] Forçando sincronização manual com Evolution API');
    console.log('⏰ Timestamp:', new Date().toISOString());

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    // Estratégia 1: Buscar chats com parâmetros agressivos de refresh
    console.log('📡 Tentativa 1: Buscar chats com refresh forçado...');
    const chats = await fetchChats(config);
    console.log(`✅ Recebidos ${chats.length} chats`);

    if (chats.length > 0) {
      const mostRecent = chats[0];
      const timestamp = mostRecent.lastMessage?.messageTimestamp;
      console.log(`📅 Chat mais recente: ${mostRecent.pushName || 'N/A'}`);
      console.log(`📅 Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      message: 'Sincronização forçada',
      stats: {
        chatsFound: chats.length,
        mostRecentTimestamp: chats.length > 0 ? chats[0].lastMessage?.messageTimestamp : null,
      },
      chats: chats.slice(0, 10), // Retorna apenas os 10 primeiros para debug
    });
  } catch (error) {
    console.error('❌ [FORCE-SYNC] Erro:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao forçar sincronização',
    });
  }
});

/**
 * POST /api/evolution/contacts
 * Busca todos os contatos do WhatsApp
 */
router.post('/contacts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const contacts = await fetchContacts(config);

    res.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar contatos',
    });
  }
});

/**
 * POST /api/evolution/refresh-contacts-cache
 * 🔄 Invalida cache COMPLETO (chats + contatos) e força refresh
 * Útil quando novos contatos são adicionados ou nomes são alterados
 */
router.post('/refresh-contacts-cache', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('🔄 [REFRESH-CACHE] Invalidando cache COMPLETO (chats + contatos)...');

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const startTime = Date.now();

    // Invalida cache de chats
    await chatCacheManager.invalidateCache(clientId, tenantId);

    // Invalida cache de contatos (com isolamento multi-tenant)
    const contactsCacheKey = `evolution:contacts:${clientId}:${tenantId}:${config.instance}`;
    const { cache } = await import('../lib/cache');
    await cache.del(contactsCacheKey);

    console.log('✅ Caches invalidados (chats + contatos)');

    // Força refresh SÍNCRONO para pré-popular cache
    console.log('🔄 Pré-populando cache com novos dados...');
    const enrichFn = async (chats: any[]) => {
      return enrichChatsWithContacts(chats, clientId, tenantId, config);
    };

    const cached = await chatCacheManager.forceRefreshSync(clientId, tenantId, config, enrichFn);
    const responseTime = Date.now() - startTime;

    console.log(`✅ Cache atualizado: ${cached.chats.length} chats em ${responseTime}ms`);

    res.json({
      success: true,
      message: 'Cache completo atualizado com sucesso',
      stats: {
        chatsCount: cached.chats.length,
        responseTime,
        cacheVersion: cached.metadata.version,
        lastSync: cached.metadata.lastSync,
      },
    });
  } catch (error) {
    console.error('❌ [REFRESH-CACHE] Erro:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar cache',
    });
  }
});

/**
 * POST /api/evolution/messages
 * Busca mensagens de um chat específico com cache (5 min TTL)
 */
router.post('/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId é obrigatório',
      });
    }

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    // Cache WhatsApp message timeline (5 min TTL) with multi-tenant isolation
    const messages = await cacheWhatsAppMessages(
      clientId,
      tenantId,
      config.instance,
      chatId,
      async () => {
        console.log(`🔄 Cache MISS for messages (chat: ${chatId.substring(0, 20)}...)`);
        return await fetchMessages(config, chatId);
      },
      { compress: false, ttl: 300 }
    ).catch(async (error) => {
      console.error('❌ Cache error for WhatsApp messages, using fallback:', error);
      // Graceful degradation - fetch without cache
      return await fetchMessages(config, chatId);
    });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar mensagens',
    });
  }
});

/**
 * POST /api/evolution/send-message
 * Envia uma mensagem de texto
 */
router.post('/send-message', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { number, text } = req.body;

    if (!number || !text) {
      return res.status(400).json({
        success: false,
        error: 'number e text são obrigatórios',
      });
    }

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const result = await sendMessage(config, number, text);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
    });
  }
});

/**
 * POST /api/evolution/send-media
 * Envia mídia (imagem, vídeo, documento)
 */
router.post('/send-media', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { number, mediatype, mimetype, media, caption, fileName } = req.body;

    if (!number || !mediatype || !mimetype || !media) {
      return res.status(400).json({
        success: false,
        error: 'number, mediatype, mimetype e media são obrigatórios',
      });
    }

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const result = await sendMedia(config, number, mediatype, mimetype, media, caption, fileName);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erro ao enviar mídia:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar mídia',
    });
  }
});

/**
 * POST /api/evolution/send-audio
 * Envia um áudio
 */
router.post('/send-audio', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { number, audioBase64, mimeType } = req.body;

    if (!number || !audioBase64) {
      return res.status(400).json({
        success: false,
        error: 'number e audioBase64 são obrigatórios',
      });
    }

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    const result = await sendAudio(config, number, audioBase64, mimeType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erro ao enviar áudio:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar áudio',
    });
  }
});

/**
 * POST /api/evolution/proxy-media
 * Baixa mídia (áudio, imagem, vídeo) usando messageKey
 */
router.post('/proxy-media', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { messageKey } = req.body;

    if (!messageKey) {
      return res.status(400).json({
        success: false,
        error: 'messageKey é obrigatório',
      });
    }

    // Validar formato do messageKey
    if (!messageKey.id || !messageKey.remoteJid) {
      return res.status(400).json({
        success: false,
        error: 'messageKey deve conter id e remoteJid',
      });
    }

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    // IMPORTANTE: Limpar messageKey removendo campos extras que podem causar erro
    // Evolution API espera apenas: id, remoteJid, fromMe
    // O campo senderLid pode causar AggregateError
    const cleanedMessageKey = {
      id: messageKey.id,
      remoteJid: messageKey.remoteJid,
      fromMe: messageKey.fromMe || false
    };

    console.log('🎵 Baixando mídia via Evolution API:');
    console.log('  Original messageKey:', JSON.stringify(messageKey));
    console.log('  Cleaned messageKey:', JSON.stringify(cleanedMessageKey));
    console.log('  Instance:', config.instance);

    // Fazer requisição para Evolution API para baixar mídia
    const baseUrl = config.apiUrl.endsWith('/') ? config.apiUrl.slice(0, -1) : config.apiUrl;
    const encodedInstance = encodeURIComponent(config.instance);
    const url = `${baseUrl}/chat/getBase64FromMediaMessage/${encodedInstance}`;

    console.log('  URL:', url);

    const payload = {
      message: {
        key: cleanedMessageKey
      },
      convertToMp4: false
    };

    console.log('  Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apiKey': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('  Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('  ❌ Evolution API retornou erro:');
      console.error('  Status:', response.status, response.statusText);
      console.error('  Body:', errorText);

      throw new Error(`Evolution API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    console.log('✅ Mídia baixada com sucesso:', {
      hasBase64: !!data.base64,
      mimetype: data.mimetype,
      base64Length: data.base64?.length || 0
    });

    res.json({
      success: true,
      base64: data.base64,
      mimetype: data.mimetype,
    });
  } catch (error) {
    console.error('❌ Erro ao baixar mídia:', error);

    // Retornar erro mais amigável
    const errorMessage = error instanceof Error ? error.message : 'Erro ao baixar mídia';

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: 'A mídia pode não estar mais disponível ou o formato do messageKey está incorreto'
    });
  }
});

/**
 * POST /api/evolution/test-envio-mensagem
 * ✅ FASE 2: Endpoint de teste para enviar mensagem e verificar se aparece
 * Envia uma mensagem de teste e aguarda ela aparecer na lista de conversas
 */
router.post('/test-envio-mensagem', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: numero, mensagem',
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 [TESTE ENVIO] Iniciando teste de envio de mensagem...');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📞 Número:', numero);
    console.log('💬 Mensagem:', mensagem);

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      console.log('❌ [TESTE ENVIO] Evolution API não configurado');
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
      });
    }

    // Passo 1: Buscar chats antes do envio
    console.log('\n📊 [TESTE ENVIO] Passo 1: Buscando chats ANTES do envio...');
    const chatsBefore = await fetchChats(config);
    const totalBefore = chatsBefore.length;
    console.log('  Total de chats antes:', totalBefore);

    // Passo 2: Enviar mensagem
    console.log('\n📤 [TESTE ENVIO] Passo 2: Enviando mensagem...');
    const sendStartTime = Date.now();
    const sendResult = await sendMessage(config, numero, mensagem);
    const sendDuration = Date.now() - sendStartTime;
    console.log('  Mensagem enviada com sucesso!');
    console.log('  Tempo de envio:', sendDuration, 'ms');
    console.log('  Result:', JSON.stringify(sendResult).substring(0, 200));

    // Passo 3: Aguardar 3 segundos para a mensagem aparecer
    console.log('\n⏳ [TESTE ENVIO] Passo 3: Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Passo 4: Buscar chats DEPOIS do envio
    console.log('\n📊 [TESTE ENVIO] Passo 4: Buscando chats DEPOIS do envio...');
    const chatsAfter = await fetchChats(config);
    const totalAfter = chatsAfter.length;
    console.log('  Total de chats depois:', totalAfter);

    // Passo 5: Verificar se a mensagem aparece
    const targetJid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`;
    const conversaEncontrada = chatsAfter.find((chat: any) => chat.remoteJid === targetJid);

    if (conversaEncontrada) {
      console.log('\n✅ [TESTE ENVIO] SUCESSO! Conversa encontrada:');
      console.log('  RemoteJid:', conversaEncontrada.remoteJid);
      console.log('  PushName:', conversaEncontrada.pushName || 'N/A');
      console.log('  Última mensagem:', conversaEncontrada.lastMessage?.message?.conversation || '[Vazia]');
      console.log('  Timestamp:', conversaEncontrada.lastMessage?.messageTimestamp || 'N/A');
    } else {
      console.log('\n⚠️ [TESTE ENVIO] ATENÇÃO: Conversa NÃO encontrada na lista!');
      console.log('  JID procurado:', targetJid);
      console.log('  Total de chats:', totalAfter);
    }

    console.log('\n✅ [TESTE ENVIO] Teste concluído!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      test: {
        timestamp: new Date().toISOString(),
        steps: {
          '1_chats_before': {
            total: totalBefore,
          },
          '2_message_sent': {
            success: true,
            duration: sendDuration,
            result: sendResult,
          },
          '3_wait': {
            duration: 3000,
          },
          '4_chats_after': {
            total: totalAfter,
            difference: totalAfter - totalBefore,
          },
          '5_verification': {
            targetJid,
            found: !!conversaEncontrada,
            conversation: conversaEncontrada ? {
              remoteJid: conversaEncontrada.remoteJid,
              pushName: conversaEncontrada.pushName,
              lastMessage: conversaEncontrada.lastMessage?.message?.conversation,
              timestamp: conversaEncontrada.lastMessage?.messageTimestamp,
            } : null,
          },
        },
        conclusion: conversaEncontrada ?
          '✅ SUCESSO: Mensagem enviada e conversa apareceu na lista!' :
          '⚠️ ATENÇÃO: Mensagem enviada mas conversa não apareceu na lista!',
      },
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [TESTE ENVIO] ERRO:');
    console.error('  Timestamp:', new Date().toISOString());
    console.error('  Erro:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no teste de envio',
    });
  }
});

/**
 * GET /api/evolution/test-diagnostico
 * ✅ FASE 1: Endpoint de teste para verificar dados do backend
 * Retorna informações detalhadas sobre os dados da Evolution API
 */
router.get('/test-diagnostico', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 [TESTE DIAGNÓSTICO] Iniciando teste...');
    console.log('⏰ Timestamp:', new Date().toISOString());

    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId || 'default';
    const config = await getEvolutionConfig(clientId, tenantId);

    if (!config) {
      console.log('❌ [TESTE] Evolution API não configurado');
      return res.status(400).json({
        success: false,
        error: 'Evolution API não configurado',
        diagnostics: {
          configured: false,
          timestamp: new Date().toISOString(),
        }
      });
    }

    console.log('🔧 [TESTE] Configuração Evolution API:');
    console.log('  URL:', config.apiUrl);
    console.log('  Instance:', config.instance);
    console.log('  API Key:', '***' + (config.apiKey ? config.apiKey.slice(-8) : 'N/A'));

    // Testar conexão
    const startTime = Date.now();
    const connectionState = await getInstanceStatus(config);
    const connectionTime = Date.now() - startTime;

    console.log('🔗 [TESTE] Status de Conexão:');
    console.log('  Conectado:', connectionState.state === 'open');
    console.log('  State:', connectionState.state);
    console.log('  Tempo de verificação:', connectionTime, 'ms');

    // Buscar chats
    const chatsStartTime = Date.now();
    const chats = await fetchChats(config);
    const chatsResponseTime = Date.now() - chatsStartTime;

    console.log('📊 [TESTE] Resultado da busca de chats:');
    console.log('  Total de chats:', chats.length);
    console.log('  Tempo de resposta:', chatsResponseTime, 'ms');
    console.log('  Tipo da resposta:', Array.isArray(chats) ? 'Array ✅' : `${typeof chats} ❌`);

    // Análise detalhada dos chats
    const chatAnalysis = {
      total: chats.length,
      withLastMessage: chats.filter((c: any) => c.lastMessage).length,
      withPushName: chats.filter((c: any) => c.pushName).length,
      withUnreadCount: chats.filter((c: any) => c.unreadCount > 0).length,
      groups: chats.filter((c: any) => c.remoteJid?.includes('@g.us')).length,
      individuals: chats.filter((c: any) => c.remoteJid?.includes('@s.whatsapp.net')).length,
    };

    console.log('  Análise:');
    console.log('    - Com última mensagem:', chatAnalysis.withLastMessage);
    console.log('    - Com pushName:', chatAnalysis.withPushName);
    console.log('    - Com mensagens não lidas:', chatAnalysis.withUnreadCount);
    console.log('    - Grupos:', chatAnalysis.groups);
    console.log('    - Individuais:', chatAnalysis.individuals);

    // Primeiros 5 chats detalhados
    const sampleChats = chats.slice(0, 5).map((chat: any) => {
      const lastMsg = chat.lastMessage?.message?.conversation ||
        chat.lastMessage?.message?.extendedTextMessage?.text ||
        '[Mídia ou vazio]';

      return {
        remoteJid: chat.remoteJid,
        pushName: chat.pushName || 'N/A',
        lastMessage: lastMsg.substring(0, 100),
        messageTimestamp: chat.lastMessage?.messageTimestamp || 'N/A',
        unreadCount: chat.unreadCount || 0,
        hasMedia: !!(chat.lastMessage?.message?.imageMessage ||
          chat.lastMessage?.message?.videoMessage ||
          chat.lastMessage?.message?.audioMessage),
      };
    });

    console.log('\n  Primeiros 5 chats (amostra):');
    sampleChats.forEach((chat, index) => {
      console.log(`    ${index + 1}. ${chat.remoteJid}`);
      console.log(`       Nome: ${chat.pushName}`);
      console.log(`       Msg: "${chat.lastMessage}"`);
      console.log(`       Timestamp: ${chat.messageTimestamp}`);
      console.log(`       Não lidas: ${chat.unreadCount}`);
      console.log('');
    });

    console.log('✅ [TESTE] Diagnóstico completo!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      diagnostics: {
        timestamp: new Date().toISOString(),
        configuration: {
          apiUrl: config.apiUrl,
          instance: config.instance,
          hasApiKey: !!config.apiKey,
        },
        connection: {
          connected: connectionState.state === 'open',
          state: connectionState.state,
          responseTime: connectionTime,
        },
        chats: {
          total: chats.length,
          responseTime: chatsResponseTime,
          isArray: Array.isArray(chats),
          analysis: chatAnalysis,
          sample: sampleChats,
        },
      },
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [TESTE] ERRO no diagnóstico:');
    console.error('  Timestamp:', new Date().toISOString());
    console.error('  Erro:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no diagnóstico',
      diagnostics: {
        timestamp: new Date().toISOString(),
        error: String(error),
      },
    });
  }
});

export default router;
