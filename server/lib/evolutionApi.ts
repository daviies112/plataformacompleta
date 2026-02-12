/**
 * Evolution API Service
 * Serviço para interagir com a Evolution API (WhatsApp Automation)
 */

import { getClientCredentials, credentialsStorage } from './credentialsManager';

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instance: string;
}

/**
 * Normalize API URL by removing trailing slash
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

interface QRCodeResponse {
  qrcode: {
    base64: string;
    code: string;
  };
  instance: string;
}

interface InstanceInfo {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  webhook: string;
  websocket: {
    enabled: boolean;
    events: string[];
  };
}

/**
 * Get instance connection status
 * 
 * IMPORTANT: Evolution API v2 has a known bug where /instance/connectionState
 * returns "close" or "connecting" even when WhatsApp is connected.
 * We use /instance/fetchInstances instead which returns reliable status.
 * GitHub Issues: #1286, #1512, #756
 */
export async function getInstanceStatus(config: EvolutionConfig): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const url = `${baseUrl}/instance/fetchInstances`;

    const response = await fetch(url, {
      headers: {
        'apiKey': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ [Evolution API] Erro HTTP:', response.status, response.statusText);
      throw new Error(`Evolution API error: ${response.statusText}`);
    }

    const instances = await response.json();

    // Find our specific instance
    const instanceData = Array.isArray(instances)
      ? instances.find((i: any) => i.name === config.instance)
      : instances;

    if (!instanceData) {
      console.warn('⚠️ [Evolution API] Instância não encontrada:', config.instance);
      return {
        instance: {
          instanceName: config.instance,
          state: 'close'
        }
      };
    }

    // Determine real connection state using connectionStatus field
    // connectionStatus can be: "open", "close", "connecting"
    // Also check ownerJid for extra confirmation
    const connectionStatus = instanceData.connectionStatus || 'close';
    const isConnected = connectionStatus === 'open' && !!instanceData.ownerJid;
    const realState = isConnected ? 'open' : connectionStatus;

    console.log('✅ [Evolution API] Status:', {
      instance: config.instance,
      state: realState,
      profile: instanceData.profileName || 'N/A'
    });

    return {
      instance: {
        instanceName: config.instance,
        state: realState,
        owner: instanceData.ownerJid,
        profilePictureUrl: instanceData.profilePicUrl,
        profileName: instanceData.profileName
      }
    };
  } catch (error) {
    console.error('❌ Erro ao obter status da instância:', error);
    throw error;
  }
}

/**
 * Get QR code for WhatsApp connection
 */
export async function getQRCode(config: EvolutionConfig): Promise<QRCodeResponse> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);

    // First check if instance exists and its status
    const statusResponse = await fetch(
      `${baseUrl}/instance/connectionState/${encodedInstance}`,
      {
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!statusResponse.ok) {
      // If instance doesn't exist, create it
      console.log('🔧 Criando instância da Evolution API...');
      await createInstance(config);
    }

    // Request QR code
    const qrResponse = await fetch(
      `${baseUrl}/instance/connect/${encodedInstance}`,
      {
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!qrResponse.ok) {
      throw new Error(`Erro ao obter QR code: ${qrResponse.statusText}`);
    }

    const data = await qrResponse.json();
    console.log('✅ QR code obtido com sucesso');

    // Normalize response structure (Evolution API v2 can return diverse formats)
    // Format 1: { qrcode: { base64: "...", code: "..." }, instance: "..." }
    // Format 2: { base64: "...", code: "...", instance: "..." }
    // Format 3: { qrcode: "base64string", ... }

    let normalizedQRCode: any = {};

    if (data.qrcode && typeof data.qrcode === 'object' && data.qrcode.base64) {
      normalizedQRCode = data.qrcode;
    } else if (data.base64) {
      normalizedQRCode = {
        base64: data.base64,
        code: data.code || data.pairingCode
      };
    } else if (typeof data.qrcode === 'string') {
      normalizedQRCode = {
        base64: data.qrcode,
        code: data.code
      };
    }

    return {
      ...data,
      qrcode: normalizedQRCode
    };
  } catch (error) {
    console.error('❌ Erro ao obter QR code:', error);
    throw error;
  }
}

/**
 * Create Evolution API instance
 */
export async function createInstance(config: EvolutionConfig): Promise<InstanceInfo> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const response = await fetch(
      `${baseUrl}/instance/create`,
      {
        method: 'POST',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: config.instance,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro ao criar instância: ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Instância criada com sucesso:', config.instance);

    return data;
  } catch (error) {
    console.error('❌ Erro ao criar instância:', error);
    throw error;
  }
}

/**
 * Logout from WhatsApp
 */
export async function logoutInstance(config: EvolutionConfig): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);
    const response = await fetch(
      `${baseUrl}/instance/logout/${encodedInstance}`,
      {
        method: 'DELETE',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao fazer logout: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Logout realizado com sucesso');

    return data;
  } catch (error) {
    console.error('❌ Erro ao fazer logout:', error);
    throw error;
  }
}

/**
 * Delete instance
 */
export async function deleteInstance(config: EvolutionConfig): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);
    const response = await fetch(
      `${baseUrl}/instance/delete/${encodedInstance}`,
      {
        method: 'DELETE',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao deletar instância: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Instância deletada com sucesso');

    return data;
  } catch (error) {
    console.error('❌ Erro ao deletar instância:', error);
    throw error;
  }
}

/**
 * Get Evolution API configuration from credentials manager, database, or environment
 * 🔧 FIX: Now queries database when memory is empty (fixes issue after server restart)
 */
export async function getEvolutionConfig(
  clientId: string = '1',
  tenantId?: string
): Promise<EvolutionConfig | null> {
  // PRIORIDADE 1: Buscar credenciais do cliente no credentialsManager (memória)
  try {
    const credentials = getClientCredentials(clientId, 'evolution_api');

    if (credentials && credentials.api_url && credentials.api_key && credentials.instance) {
      console.log('✅ Credenciais da Evolution API carregadas da memória');
      return {
        apiUrl: credentials.api_url,
        apiKey: credentials.api_key,
        instance: credentials.instance,
      };
    }
  } catch (error) {
    console.error('Erro ao buscar credenciais da memória:', error);
  }

  // PRIORIDADE 2: Buscar do banco de dados (NOVO - corrige problema após restart)
  if (tenantId) {
    try {
      const { getEvolutionApiCredentials } = await import('./credentialsDb');
      const { decrypt } = await import('./credentialsManager');

      const dbCredentials = await getEvolutionApiCredentials(tenantId);

      if (dbCredentials && dbCredentials.apiUrl && dbCredentials.apiKey && dbCredentials.instance) {
        console.log(`✅ Credenciais da Evolution API carregadas do banco de dados (tenant: ${tenantId})`);

        // Decrypt credentials from database
        const apiUrl = decrypt(dbCredentials.apiUrl);
        const apiKey = decrypt(dbCredentials.apiKey);

        return {
          apiUrl,
          apiKey,
          instance: dbCredentials.instance,
        };
      }
    } catch (error) {
      console.error('Erro ao buscar credenciais do banco de dados:', error);
    }
  }

  // PRIORIDADE 3: Fallback para variáveis de ambiente (suporta múltiplos formatos)
  // Aceita ambos URL_EVOLUTION e EVOLUTION_API_URL (novo formato e legado)
  const apiUrl = process.env.URL_EVOLUTION || process.env.EVOLUTION_API_URL;
  const apiKey = process.env.API_KEY_EVOLUTION || process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_API;
  const instance = process.env.NOME_DA_INSTANCIA || process.env.EVOLUTION_INSTANCE;

  if (!apiKey || !apiUrl || !instance) {
    // Não logar erro se as credenciais do cliente existem
    const clientCredentials = credentialsStorage.get(clientId);
    if (clientCredentials && clientCredentials.has('evolution_api')) {
      // Credenciais existem mas não conseguimos descriptografar - não é erro de configuração
      console.log('⚠️ Credenciais da Evolution API encontradas mas não puderam ser lidas');
      return null;
    }

    console.log('⚠️ Evolution API não configurado completamente');
    console.log(`  URL: ${apiUrl ? '✅' : '❌'}`);
    console.log(`  API Key: ${apiKey ? '✅' : '❌'}`);
    console.log(`  Instance: ${instance ? '✅' : '❌'}`);
    return null;
  }

  // Determinar qual formato de variável foi usado (para logging)
  const usingNewFormat = !!(process.env.URL_EVOLUTION || process.env.API_KEY_EVOLUTION || process.env.NOME_DA_INSTANCIA);
  console.log(`✅ Usando credenciais da Evolution API das variáveis de ambiente (formato: ${usingNewFormat ? 'novo' : 'legado'})`);
  console.log(`  URL: ${apiUrl}`);
  console.log(`  Instance: ${instance}`);

  return {
    apiUrl,
    apiKey,
    instance,
  };
}


/**
 * Fetch all chats from Evolution API
 * ✅ CORREÇÃO: Headers anti-cache + timestamp + validação robusta
 * ✅ WORKAROUND: Fallback para contatos se findChats retornar 500 (bug Evolution API v2.2.3)
 */
export async function fetchChats(config: EvolutionConfig): Promise<any[]> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);

    const timestamp = Date.now();

    // Tentar primeiro o endpoint principal /chat/findChats
    try {
      const response = await fetch(
        `${baseUrl}/chat/findChats/${encodedInstance}?t=${timestamp}`,
        {
          method: 'POST',
          headers: {
            'apiKey': config.apiKey,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          body: JSON.stringify({
            refresh: true,
            limit: 9999,
            includeMessageFromMe: true,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data)) {
          console.log('✅ Conversas obtidas com sucesso via findChats:', data.length);
          return data;
        }
      }

      // Se retornou 500, é o bug conhecido - fazer fallback
      if (response.status === 500) {
        console.warn('⚠️ Bug conhecido da Evolution API v2.2.3 detectado (findChats retorna 500)');
        console.log('🔄 Usando fallback: buscando conversas via findContacts...');
        throw new Error('Using fallback');
      }

      console.error('❌ Evolution API error:', response.status, response.statusText);
      throw new Error(`Evolution API error: ${response.status}`);

    } catch (fallbackError: any) {
      // Se foi o erro 500 ou outro erro de rede, tentar fallback via contatos
      if (fallbackError.message === 'Using fallback' || fallbackError.code === 'ECONNRESET') {
        console.log('📞 FALLBACK: Construindo conversas a partir dos contatos...');

        // Buscar contatos e transformá-los em formato de chats
        const contacts = await fetchContacts(config);

        if (!Array.isArray(contacts) || contacts.length === 0) {
          console.warn('⚠️ Nenhum contato encontrado no fallback');
          return [];
        }

        // Transformar contatos em formato de chat
        const chats = contacts
          .filter((contact: any) => {
            // Filtrar apenas contatos válidos (não grupos, com número válido)
            return contact.remoteJid &&
              !contact.remoteJid.includes('@g.us') &&
              contact.remoteJid.includes('@s.whatsapp.net');
          })
          .map((contact: any) => ({
            id: contact.remoteJid,
            remoteJid: contact.remoteJid,
            name: contact.pushName || contact.verifiedName || null,
            profilePicUrl: contact.profilePicUrl || null,
            unreadCount: 0,
            conversationTimestamp: contact.updatedAt ? new Date(contact.updatedAt).getTime() : Date.now(),
            archived: false,
            pinned: false,
            muteExpiration: 0,
            // Informações adicionais do contato
            isGroup: false,
            isSaved: contact.isSaved || false,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
          }));

        console.log(`✅ ${chats.length} conversas construídas a partir de ${contacts.length} contatos (fallback)`);
        return chats;
      }

      // Se não foi erro de fallback, relanc ar
      throw fallbackError;
    }

  } catch (error) {
    console.error('❌ Erro ao buscar conversas (mesmo após fallback):', error);
    throw error;
  }
}

/**
 * Fetch all contacts from Evolution API
 */
export async function fetchContacts(config: EvolutionConfig): Promise<any[]> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);
    const response = await fetch(
      `${baseUrl}/chat/findContacts/${encodedInstance}`,
      {
        method: 'POST',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Contatos obtidos com sucesso:', data.length || 0);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Erro ao buscar contatos:', error);
    throw error;
  }
}

/**
 * Get base64 from media message
 * Helper function to download media as base64
 */
async function getBase64FromMedia(config: EvolutionConfig, messageKey: any): Promise<{ base64?: string; mimetype?: string } | null> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);
    const url = `${baseUrl}/chat/getBase64FromMediaMessage/${encodedInstance}`;

    // Clean messageKey - remove extra fields that can cause errors
    const cleanedMessageKey = {
      id: messageKey.id,
      remoteJid: messageKey.remoteJid,
      fromMe: messageKey.fromMe || false
    };

    const payload = {
      message: {
        key: cleanedMessageKey
      },
      convertToMp4: false
    };

    console.log('📥 Baixando base64 da mídia:', cleanedMessageKey.id);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apiKey': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('❌ Erro ao baixar mídia:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.base64) {
      console.log('✅ Base64 baixado:', data.base64.substring(0, 50) + '...', 'mimetype:', data.mimetype);
      return {
        base64: data.base64,
        mimetype: data.mimetype
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao baixar base64:', error);
    return null;
  }
}

/**
 * Fetch messages from a specific chat
 * Automatically downloads base64 for all media messages
 */
export async function fetchMessages(config: EvolutionConfig, chatId: string): Promise<any[]> {
  try {
    console.log('🚀 ==== FETCH MESSAGES INICIADO ====');
    console.log('🔍 ChatId:', chatId);

    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);
    const url = `${baseUrl}/chat/findMessages/${encodedInstance}`;

    const payload = {
      where: {
        key: {
          remoteJid: chatId
        }
      },
      limit: 100
    };

    console.log('🔍 Fetching messages:');
    console.log('  URL:', url);
    console.log('  ChatId:', chatId);
    console.log('  Instance:', config.instance);
    console.log('  Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apiKey': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('  Response Status:', response.status);
    console.log('  Response Body (primeiros 500 chars):', responseText.substring(0, 500));

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.statusText} - ${responseText}`);
    }

    const data = JSON.parse(responseText);

    // A Evolution API v2 retorna mensagens em um formato paginado:
    // { messages: { total, pages, currentPage, records: [...] } }
    let messages = [];

    if (data.messages && Array.isArray(data.messages.records)) {
      messages = data.messages.records;
      console.log('✅ Mensagens obtidas com sucesso:', messages.length);
      console.log('  Total no servidor:', data.messages.total);
      console.log('  Página:', data.messages.currentPage, 'de', data.messages.pages);
    } else if (Array.isArray(data)) {
      // Fallback: se retornar array direto
      messages = data;
      console.log('✅ Mensagens obtidas (formato array):', messages.length);
    } else {
      console.log('  ⚠️ Formato de resposta não reconhecido');
      console.log('  Response:', JSON.stringify(data).substring(0, 200));
    }

    // 📥 BAIXAR BASE64 PARA MENSAGENS DE MÍDIA AUTOMATICAMENTE
    console.log('📥 Processando mensagens de mídia...');

    for (const msg of messages) {
      if (!msg.message) continue;

      // Detectar tipo de mídia
      const isAudio = msg.message.audioMessage || msg.messageType === 'audioMessage';
      const isImage = msg.message.imageMessage || msg.messageType === 'imageMessage';
      const isVideo = msg.message.videoMessage || msg.messageType === 'videoMessage';
      const isDocument = msg.message.documentMessage || msg.messageType === 'documentMessage';

      const hasMedia = isAudio || isImage || isVideo || isDocument;

      if (hasMedia && msg.key) {
        console.log(`📸 Mensagem de mídia detectada: ${msg.messageType || 'unknown'}`);

        // Baixar base64 se não tiver
        if (!msg.message.base64) {
          const mediaData = await getBase64FromMedia(config, msg.key);

          if (mediaData?.base64) {
            // Adicionar base64 diretamente no objeto da mensagem
            msg.message.base64 = mediaData.base64;
            console.log(`✅ Base64 adicionado à mensagem ${msg.key.id}`);
          } else {
            console.log(`⚠️ Não foi possível baixar base64 para mensagem ${msg.key.id}`);
          }
        } else {
          console.log(`✅ Mensagem ${msg.key.id} já tem base64`);
        }

        // 🔧 CRIAR DATA URL COMPLETO PARA O FRONTEND
        if (msg.message.base64) {
          let mimeType = 'application/octet-stream'; // default

          if (isAudio) {
            mimeType = msg.message.audioMessage?.mimetype || 'audio/ogg; codecs=opus';
          } else if (isImage) {
            mimeType = msg.message.imageMessage?.mimetype || 'image/jpeg';
          } else if (isVideo) {
            mimeType = msg.message.videoMessage?.mimetype || 'video/mp4';
          } else if (isDocument) {
            mimeType = msg.message.documentMessage?.mimetype || 'application/pdf';
          }

          // Criar data URL completo
          msg.message.mediaDataUrl = `data:${mimeType};base64,${msg.message.base64}`;
          console.log(`✅ mediaDataUrl criado para ${msg.key.id} (${mimeType})`);
        }
      }
    }

    if (messages.length > 0) {
      console.log('  Primeira mensagem (preview):', JSON.stringify(messages[0], null, 2).substring(0, 400));
    } else {
      console.log('  ⚠️ Nenhuma mensagem encontrada para chatId:', chatId);
    }

    return messages;
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    throw error;
  }
}

/**
 * Send text message via Evolution API
 */
export async function sendMessage(
  config: EvolutionConfig,
  number: string,
  text: string
): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);

    // Formatar número se necessário
    let formattedNumber = number;
    if (!formattedNumber.includes('@')) {
      formattedNumber = `${number}@s.whatsapp.net`;
    }

    const response = await fetch(
      `${baseUrl}/message/sendText/${encodedInstance}`,
      {
        method: 'POST',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: text,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao enviar mensagem: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Mensagem enviada com sucesso');

    return data;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
  }
}

/**
 * Send media (image, video, document) via Evolution API
 */
export async function sendMedia(
  config: EvolutionConfig,
  number: string,
  mediatype: 'image' | 'video' | 'document',
  mimetype: string,
  media: string,
  caption?: string,
  fileName?: string
): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);

    // Formatar número se necessário
    let formattedNumber = number;
    if (!formattedNumber.includes('@')) {
      formattedNumber = `${number}@s.whatsapp.net`;
    }

    // Garantir que media tem o prefixo data URL
    let formattedMedia = media;
    if (!media.startsWith('data:')) {
      formattedMedia = `data:${mimetype};base64,${media}`;
    }

    const requestBody: any = {
      number: formattedNumber,
      mediatype: mediatype,
      mimetype: mimetype,
      media: formattedMedia,
    };

    if (caption) {
      requestBody.caption = caption;
    }

    if (fileName) {
      requestBody.fileName = fileName;
    }

    const response = await fetch(
      `${baseUrl}/message/sendMedia/${encodedInstance}`,
      {
        method: 'POST',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao enviar mídia: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Mídia enviada com sucesso');

    return data;
  } catch (error) {
    console.error('❌ Erro ao enviar mídia:', error);
    throw error;
  }
}

/**
 * Send audio via Evolution API
 * Now accepts mimeType to properly format the data URL
 */
export async function sendAudio(
  config: EvolutionConfig,
  number: string,
  audioBase64: string,
  mimeType: string = 'audio/ogg; codecs=opus'
): Promise<any> {
  try {
    const baseUrl = normalizeUrl(config.apiUrl);
    const encodedInstance = encodeURIComponent(config.instance);

    // Formatar número se necessário
    let formattedNumber = number;
    if (!formattedNumber.includes('@')) {
      formattedNumber = `${number}@s.whatsapp.net`;
    }

    // Remover prefixo data: se existir e pegar apenas base64 puro
    let pureBase64 = audioBase64;
    if (audioBase64.startsWith('data:')) {
      pureBase64 = audioBase64.split(',')[1] || audioBase64;
    }

    const response = await fetch(
      `${baseUrl}/message/sendWhatsAppAudio/${encodedInstance}`,
      {
        method: 'POST',
        headers: {
          'apiKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: formattedNumber,
          audio: pureBase64,
          encoding: true
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao enviar áudio: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Áudio enviado com sucesso');

    return data;
  } catch (error) {
    console.error('❌ Erro ao enviar áudio:', error);
    throw error;
  }
}
