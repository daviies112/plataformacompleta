import { useState, useEffect } from "react";
import { ConversationList } from "../components/ConversationList";
import { ChatArea } from "../components/ChatArea";
import { Header } from "../components/Header";
import { storage, initialConversations, initialMessages } from "../lib/utils";
import { evolutionApi, EvolutionChat, EvolutionMessage } from "../lib/evolutionApi";
import { configManager } from "../lib/config";
import { toast } from "sonner";

interface Message {
  id: string;
  texto: string;
  tipo: "recebida" | "enviada";
  enviadaPor: "cliente" | "ia" | "atendente";
  timestamp: string;
  conversationId: string;
  mediaType?: "audio" | "image" | "video" | "document";
  mediaUrl?: string;
  mediaBase64?: string; // Base64 da mídia (quando disponível)
  caption?: string;
  messageKey?: any; // Key completa da mensagem para baixar mídia
}

interface Conversation {
  id: string;
  numero: string;
  nome: string;
  ultimaMensagem: string;
  timestamp: string;
  naoLidas: number;
  tags?: string[]; // IDs das tags personalizadas
  formStatus?: string; // Status do formulário
  qualificationStatus?: string; // Status de qualificação
  pontuacao?: number; // Pontuação do lead
}

const CACHE_KEY = 'whatsapp_conversations_cache';
const CACHE_TIMESTAMP_KEY = 'whatsapp_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [useRealData, setUseRealData] = useState(false);
  const [connectionState, setConnectionState] = useState<{ connected: boolean; state: string } | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, { name?: string; pushName?: string; notify?: string; verifiedName?: string }>>({});
  const [leadsMap, setLeadsMap] = useState<Record<string, { formStatus?: string; qualificationStatus?: string; pontuacao?: number }>>({});
  const [lastFullUpdate, setLastFullUpdate] = useState<number>(0);

  // Carregar tags salvas para cada conversa
  useEffect(() => {
    const allConversationTags = configManager.getAllConversationTags();
    setConversations(prevConversations => 
      prevConversations.map(conv => ({
        ...conv,
        tags: allConversationTags[conv.id] || conv.tags || []
      }))
    );
  }, []);

  // 🔄 POLLING: Atualizar leads a cada 10 segundos para sincronização em tempo real
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const response = await fetch('/api/leads/whatsapp-status');
        if (response.ok) {
          const leads = await response.json();
          
          // Criar mapa telefone -> lead para busca rápida
          const leadsObj: Record<string, { formStatus?: string; qualificationStatus?: string; pontuacao?: number }> = {};
          leads.forEach((lead: any) => {
            const normalizedPhone = lead.telefoneNormalizado;
            if (normalizedPhone) {
              leadsObj[normalizedPhone] = {
                formStatus: lead.formStatus,
                qualificationStatus: lead.qualificationStatus,
                pontuacao: lead.pontuacao,
              };
            }
          });
          
          setLeadsMap(leadsObj);
          console.log('🔄 [Polling] Leads atualizados:', Object.keys(leadsObj).length, 'leads');
        }
      } catch (error) {
        console.error('❌ [Polling] Erro ao atualizar leads:', error);
      }
    };

    // Carregar leads imediatamente
    loadLeads();
    
    // Configurar polling a cada 10 segundos
    const intervalId = setInterval(loadLeads, 10000);
    
    // Limpar intervalo quando componente desmontar
    return () => clearInterval(intervalId);
  }, []);

  // 🔄 ATUALIZAR CONVERSAS quando leadsMap muda (tempo real)
  useEffect(() => {
    if (Object.keys(leadsMap).length > 0 && conversations.length > 0) {
      console.log('🔄 [LeadsMap Changed] Atualizando conversas com novos status de leads...');
      
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          // Extrair número limpo do ID da conversa
          const rawNumber = conv.id.replace('@s.whatsapp.net', '').replace('@g.us', '');
          let normalizedPhone = rawNumber.replace(/\D/g, '');
          
          // Adicionar código do país se necessário (Brasil +55)
          if (normalizedPhone.length === 11 || normalizedPhone.length === 10) {
            normalizedPhone = '55' + normalizedPhone;
          }
          
          // Adicionar "+" no início
          normalizedPhone = '+' + normalizedPhone;
          
          // Buscar lead atualizado
          const lead = leadsMap[normalizedPhone];
          
          // Se encontrou lead com dados novos, atualizar a conversa
          if (lead) {
            const hasChanged = 
              conv.formStatus !== lead.formStatus ||
              conv.qualificationStatus !== lead.qualificationStatus ||
              conv.pontuacao !== lead.pontuacao;
            
            if (hasChanged) {
              console.log(`✅ Atualizando conversa ${conv.nome}:`, {
                old: { formStatus: conv.formStatus, qualificationStatus: conv.qualificationStatus },
                new: { formStatus: lead.formStatus, qualificationStatus: lead.qualificationStatus }
              });
              
              return {
                ...conv,
                formStatus: lead.formStatus,
                qualificationStatus: lead.qualificationStatus,
                pontuacao: lead.pontuacao,
              };
            }
          }
          
          return conv;
        })
      );
    }
  }, [leadsMap]);

  // Handler para mudan\u00e7a de tags
  const handleTagsChange = (conversationId: string, tagIds: string[]) => {
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === conversationId ? { ...conv, tags: tagIds } : conv
      )
    );
  };

  // Converter chat da Evolution para formato do app
  const convertEvolutionChat = (chat: any): Conversation => {
    const rawNumber = chat.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const formattedNumber = formatPhoneNumber(rawNumber);
    
    let displayName = '';
    
    // PRIORIDADE 1: Dados da API de contatos (mais confiável)
    const jidVariations = [
      chat.remoteJid,
      chat.remoteJid.replace('@s.whatsapp.net', ''),
      chat.remoteJid.replace('@g.us', ''),
      rawNumber,
      `${rawNumber}@s.whatsapp.net`,
    ];
    
    let contact: { name?: string; pushName?: string; notify?: string; verifiedName?: string } | null = null;
    for (const jid of jidVariations) {
      if (contactsMap[jid]) {
        contact = contactsMap[jid];
        break;
      }
    }
    
    if (contact) {
      displayName = sanitizeName(contact.name) || 
                   sanitizeName(contact.pushName) || 
                   sanitizeName(contact.verifiedName) ||
                   sanitizeName(contact.notify) ||
                   '';
    }
    
    // PRIORIDADE 2: Nome do contato dentro do chat (se não encontrou na API de contatos)
    if (!displayName && chat.contact?.name) {
      displayName = sanitizeName(chat.contact.name) || '';
    }
    
    // PRIORIDADE 3: pushName (nome que a pessoa definiu no WhatsApp)
    if (!displayName) {
      displayName = sanitizeName(chat.pushName) || 
                   sanitizeName(chat.contact?.pushName) ||
                   sanitizeName(chat.contact?.verifiedName) ||
                   sanitizeName(chat.contact?.notify) ||
                   '';
    }
    
    // PRIORIDADE 4 (ÚLTIMA): Se ainda não tem nome, usar número formatado
    // EVITAMOS chat.name e chat.shortName pois podem conter mensagens!
    if (!displayName) {
      displayName = formattedNumber;
    }
    
    console.log('🔍 Convertendo chat:', {
      jid: chat.remoteJid,
      rawNumber,
      contactFromMap: contact ? 'Sim' : 'Não',
      contactMapName: contact?.name,
      chatContactName: chat.contact?.name,
      chatPushName: chat.pushName,
      finalName: displayName
    });
    
    // Extrair texto da última mensagem
    // Evolution API pode retornar mensagem em várias estruturas diferentes
    let lastMsg = 'Sem mensagens';
    if (chat.lastMessage?.message) {
      const msg = chat.lastMessage.message;
      // Tentar extrair texto de múltiplas estruturas possíveis
      lastMsg = msg.conversation || 
                msg.extendedTextMessage?.text ||
                msg.textMessage?.text ||  // Evolution API também usa textMessage.text
                (chat.lastMessage.messageType === 'audioMessage' ? '🎤 Áudio' : 
                 chat.lastMessage.messageType === 'imageMessage' ? '🖼️ Imagem' :
                 chat.lastMessage.messageType === 'videoMessage' ? '🎥 Vídeo' :
                 chat.lastMessage.messageType === 'documentMessage' ? '📄 Documento' :
                 'Mensagem de mídia');
    } else if (chat.lastMessage?.text) {
      // Às vezes o texto vem direto em lastMessage.text
      lastMsg = chat.lastMessage.text;
    } else if (chat.lastMessageText) {
      // Ou em lastMessageText
      lastMsg = chat.lastMessageText;
    }
    
    // Usar o timestamp da última mensagem ou do chat
    let timestamp = new Date().toISOString();
    if (chat.lastMessage?.messageTimestamp) {
      timestamp = new Date(chat.lastMessage.messageTimestamp * 1000).toISOString();
    } else if (chat.updatedAt) {
      timestamp = chat.updatedAt;
    } else if (chat.lastMessageTimestamp) {
      timestamp = new Date(chat.lastMessageTimestamp * 1000).toISOString();
    }
    
    // Tentar múltiplos campos possíveis para mensagens não lidas
    // Evolution API real usa: chat.unreadMessages ou chat.count.unread
    // Garantir que seja sempre um número
    const unreadCount = Number(
      chat.unreadMessages ?? 
      chat.count?.unread ?? 
      chat.unreadCount ?? 
      chat.unread ?? 
      chat.notViewedMessagesCount ?? 
      0
    );
    
    // LOG COMPLETO do objeto chat para debug - APENAS conversas com mensagens não lidas
    if (unreadCount > 0) {
      console.log('🔍 DEBUG - Estrutura completa do chat com não lidas:', {
        remoteJid: chat.remoteJid,
        nome: displayName,
        allChatKeys: Object.keys(chat),
        unreadMessages: chat.unreadMessages,
        unreadCount: chat.unreadCount,
        unread: chat.unread,
        notViewedMessagesCount: chat.notViewedMessagesCount,
        count: chat.count,
        finalCount: unreadCount,
        completeChat: chat  // Objeto completo para inspeção
      });
    }
    
    // BUSCAR STATUS REAL DO LEAD DO BANCO DE DADOS
    // Normalizar telefone para buscar no mapa de leads
    // IMPORTANTE: Adicionar "+" no início para corresponder ao formato do backend
    let normalizedPhone = rawNumber.replace(/\D/g, '');
    
    // Adicionar código do país se necessário (assumir Brasil +55)
    if (normalizedPhone.length === 11) {
      normalizedPhone = '55' + normalizedPhone;
    } else if (normalizedPhone.length === 10) {
      normalizedPhone = '55' + normalizedPhone;
    }
    
    // Adicionar "+" no início para corresponder ao formato do backend (+5531999999999)
    normalizedPhone = '+' + normalizedPhone;
    
    const lead = leadsMap[normalizedPhone];
    
    // Se encontrou o lead, usar os dados reais dele
    // Se NÃO encontrou, significa que ainda não fez formulário
    const formStatus = lead?.formStatus || 'not_sent';
    const qualificationStatus = lead?.qualificationStatus;
    const pontuacao = lead?.pontuacao;
    
    console.log('🏷️ Status do lead:', {
      rawNumber,
      normalizedPhone,
      nome: displayName,
      leadFound: !!lead,
      formStatus,
      qualificationStatus,
      pontuacao,
      leadKeys: Object.keys(leadsMap).slice(0, 5) // Mostrar exemplos de chaves no mapa
    });
    
    return {
      id: chat.remoteJid,
      numero: formattedNumber,
      nome: displayName, // SEMPRE o nome da outra pessoa
      ultimaMensagem: lastMsg,
      timestamp: timestamp,
      naoLidas: unreadCount, // Sempre um número
      formStatus,
      qualificationStatus,
      pontuacao,
    };
  };

  const formatPhoneNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length >= 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return number;
  };

  const sanitizeName = (name?: string) => {
    if (!name) return undefined;
    
    // Remover espaços em branco extras
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    
    const lowered = trimmed.toLowerCase();
    
    // Filtrar palavras genéricas
    if (['você','voce','you','me','eu'].includes(lowered)) return undefined;
    
    // Filtrar mensagens comuns que aparecem como nomes
    const messagePatterns = [
      'obrigada', 'obrigado', 'olá', 'ola', 'oi', 'ok', 'sim', 'não', 'nao',
      'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'video', 're:', 'fwd:',
      'https://', 'http://', 'www.'
    ];
    
    // Se contém padrões de mensagem, não é um nome
    if (messagePatterns.some(pattern => lowered.includes(pattern))) {
      return undefined;
    }
    
    // Se tem muita pontuação, provavelmente é uma mensagem e não um nome
    const punctuationCount = (trimmed.match(/[.,!?;:]/g) || []).length;
    if (punctuationCount > 1) return undefined;
    
    // Se é muito longo (mais de 40 caracteres), provavelmente é uma mensagem
    if (trimmed.length > 40) return undefined;
    
    // Se tem múltiplos emojis, provavelmente é uma mensagem
    const emojiCount = (trimmed.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 2) return undefined;
    
    return trimmed;
  };

  const convertEvolutionMessage = (msg: any, conversationId: string): Message => {
    // Detectar tipo de mídia
    let mediaType: "audio" | "image" | "video" | "document" | undefined;
    let mediaUrl: string | undefined;
    let caption: string | undefined;
    let mediaBase64: string | undefined;
    let text = '';

    console.log('🎵 Processando mensagem completa:', {
      messageType: msg.messageType,
      hasMessage: !!msg.message,
      hasBase64: !!msg.message?.base64,
      messageKeys: msg.message ? Object.keys(msg.message) : []
    });

    if (msg.message) {
      // Áudio - tentar múltiplas estruturas possíveis
      if (msg.message.audioMessage || msg.messageType === 'audioMessage') {
        mediaType = "audio";
        // PRIORIDADE MÁXIMA: base64 direto no objeto da mensagem
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
          console.log('✅ Base64 de áudio encontrado direto na mensagem!', {
            length: mediaBase64.length
          });
        } else if (msg.message.audioMessage) {
          mediaUrl = msg.message.audioMessage.url || 
                     msg.message.audioMessage.directPath ||
                     msg.message.audioMessage.mediaUrl;
          console.log('ℹ️ Usando URL do áudio:', mediaUrl?.substring(0, 100));
        }
        text = '🎤 Áudio';
      }
      // Imagem
      else if (msg.message.imageMessage || msg.messageType === 'imageMessage') {
        mediaType = "image";
        // PRIORIDADE MÁXIMA: base64 direto no objeto da mensagem
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
          console.log('✅ Base64 de imagem encontrado direto na mensagem!', {
            length: mediaBase64.length
          });
        } else if (msg.message.imageMessage) {
          mediaUrl = msg.message.imageMessage.url || msg.message.imageMessage.directPath;
          console.log('ℹ️ Usando URL da imagem:', mediaUrl?.substring(0, 100));
        }
        caption = msg.message.imageMessage?.caption;
        text = caption || '🖼️ Imagem';
      }
      // Vídeo
      else if (msg.message.videoMessage || msg.messageType === 'videoMessage') {
        mediaType = "video";
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
        } else if (msg.message.videoMessage) {
          mediaUrl = msg.message.videoMessage.url || msg.message.videoMessage.directPath;
        }
        caption = msg.message.videoMessage?.caption;
        text = caption || '🎥 Vídeo';
      }
      // Documento
      else if (msg.message.documentMessage || msg.messageType === 'documentMessage') {
        mediaType = "document";
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
        } else if (msg.message.documentMessage) {
          mediaUrl = msg.message.documentMessage.url || msg.message.documentMessage.directPath;
        }
        caption = msg.message.documentMessage?.caption;
        text = caption || `📄 ${msg.message.documentMessage?.fileName || 'Documento'}`;
      }
      // Texto
      else {
        text = msg.message.conversation || 
               msg.message.extendedTextMessage?.text || 
               '';
      }
    }
    
    const result: Message = {
      id: msg.key.id,
      conversationId: conversationId,
      texto: text,
      tipo: msg.key.fromMe ? "enviada" : "recebida",
      enviadaPor: msg.key.fromMe ? "atendente" : "cliente",
      timestamp: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
      mediaType,
      mediaUrl: mediaBase64 ? undefined : mediaUrl, // Se tem base64, não precisa URL
      mediaBase64, // Novo campo para base64
      caption,
      messageKey: mediaType ? msg.key : undefined, // Incluir key se for mídia
    };

    if (mediaType === 'audio') {
      console.log('✅ Mensagem de áudio FINAL:', {
        hasUrl: !!mediaUrl,
        url: mediaUrl,
        urlType: typeof mediaUrl,
        urlIsString: typeof mediaUrl === 'string',
        urlLength: mediaUrl?.length,
        texto: result.texto,
        fullMessage: JSON.stringify(msg, null, 2).substring(0, 1000)
      });
      
      // DEBUG: Tentar acessar a URL diretamente para verificar CORS
      if (mediaUrl) {
        fetch(mediaUrl, { method: 'HEAD' })
          .then(response => {
            console.log('🎵 Teste de acesso à URL do áudio:', {
              status: response.status,
              headers: Array.from(response.headers.entries()),
              ok: response.ok
            });
          })
          .catch(error => {
            console.error('🎵 ERRO ao acessar URL do áudio:', error);
          });
      }
    }

    return result;
  };

  // Verificar estado da conexão
  const checkConnection = async () => {
    try {
      const state = await evolutionApi.checkConnectionState();
      setConnectionState(state);
      return state;
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionState({ connected: false, state: 'error' });
      return { connected: false, state: 'error' };
    }
  };

  // 💾 Funções de cache
  const saveToCache = (chats: Conversation[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(chats));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Conversas salvas no cache:', chats.length);
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  };

  const loadFromCache = (): Conversation[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cached || !timestamp) return null;
      
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) {
        console.log('⏰ Cache expirado, limpando...');
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        return null;
      }
      
      const chats = JSON.parse(cached);
      console.log('💾 Conversas carregadas do cache:', chats.length);
      return chats;
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      return null;
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('🗑️ Cache limpo');
  };

  // 🔄 Atualizar APENAS etiquetas (rápido)
  const refreshLabelsOnly = async () => {
    console.log('🏷️ Atualizando apenas etiquetas...');
    toast.info('Atualizando etiquetas...', { duration: 1000 });
    
    try {
      const response = await fetch('/api/leads/whatsapp-status');
      if (response.ok) {
        const leads = await response.json();
        
        const leadsObj: Record<string, { formStatus?: string; qualificationStatus?: string; pontuacao?: number }> = {};
        leads.forEach((lead: any) => {
          const normalizedPhone = lead.telefoneNormalizado;
          if (normalizedPhone) {
            leadsObj[normalizedPhone] = {
              formStatus: lead.formStatus,
              qualificationStatus: lead.qualificationStatus,
              pontuacao: lead.pontuacao,
            };
          }
        });
        
        setLeadsMap(leadsObj);
        toast.success('Etiquetas atualizadas!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Erro ao atualizar etiquetas:', error);
      toast.error('Erro ao atualizar etiquetas');
    }
  };

  // 🔄 Carregar conversas da Evolution API (completo)
  const loadRealChats = async (forceReload = false) => {
    // Se for reload forçado, limpar cache SEMPRE
    if (forceReload) {
      clearCache();
      console.log('🗑️ Cache limpo - recarregando com nova lógica de nomes');
      toast.info('Recarregando conversas...', { duration: 2000 });
    }
    
    // Se não for reload forçado e existe cache válido, usar cache
    if (!forceReload) {
      const cachedChats = loadFromCache();
      if (cachedChats && cachedChats.length > 0) {
        console.log('⚡ Usando conversas do cache');
        setConversations(cachedChats);
        setUseRealData(true);
        toast.success(`${cachedChats.length} conversas carregadas do cache`, {
          description: 'Dados atualizados há menos de 5 minutos',
          duration: 3000,
        });
        return;
      }
    }

    setIsLoadingChats(true);
    try {
      
      // Verificar conexão primeiro
      const state = await checkConnection();
      
      console.log('=== INÍCIO DO CARREGAMENTO DE CHATS ===');
      
      // Buscar contatos primeiro para obter nomes salvos
      try {
        const contactsArray = await evolutionApi.fetchContacts();
        
        // Converter array de contatos em mapa indexado por remoteJid
        const contactsObj: Record<string, { name?: string; pushName?: string; notify?: string; verifiedName?: string }> = {};
        
        contactsArray.forEach((contact: any) => {
          // Criar múltiplas chaves para facilitar a busca
          const jid = contact.id || contact.remoteJid;
          if (jid) {
            // Adicionar com o JID completo
            contactsObj[jid] = {
              name: contact.name,
              pushName: contact.pushName,
              notify: contact.notify,
              verifiedName: contact.verifiedName,
            };
            
            // Adicionar também sem o sufixo @s.whatsapp.net
            const cleanJid = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            contactsObj[cleanJid] = contactsObj[jid];
            
            // Adicionar com @s.whatsapp.net se não tiver
            if (!jid.includes('@')) {
              contactsObj[`${jid}@s.whatsapp.net`] = contactsObj[jid];
            }
          }
        });
        
        setContactsMap(contactsObj);
        console.log('✅ Contatos carregados:', contactsArray.length, 'contatos mapeados com', Object.keys(contactsObj).length, 'chaves');
        console.log('📋 Exemplo de contatos:', contactsArray.slice(0, 3).map((c: any) => ({
          id: c.id,
          name: c.name,
          pushName: c.pushName,
          notify: c.notify,
          verifiedName: c.verifiedName
        })));
      } catch (contactError) {
        console.error('❌ Erro ao carregar contatos:', contactError);
        // Continua mesmo se falhar ao carregar contatos
      }
      
      
      // Buscar conversas
      const rawChats = await evolutionApi.fetchChats();
      console.log('📦 Dados brutos da API:', rawChats);
      console.log('📊 Total de chats recebidos:', rawChats?.length || 0);
      
      if (!rawChats || rawChats.length === 0) {
        toast.info("Nenhuma conversa encontrada no WhatsApp", {
          description: "Certifique-se de que sua instância está conectada",
        });
        setConversations([]);
        return;
      }

      // Agrupar por remoteJid para garantir apenas 1 conversa por contato
      const chatsMap = new Map<string, any>();
      
      rawChats.forEach((chat: any) => {
        const jid = chat.remoteJid;
        
        // Debug: mostrar o que está sendo processado
        console.log('📝 Processando chat:', {
          jid,
          isGroup: jid.includes('@g.us'),
          pushName: chat.pushName,
          hasLastMessage: !!chat.lastMessage
        });
        
        // IGNORAR GRUPOS - apenas conversas individuais
        if (jid.includes('@g.us')) {
          console.log('⏭️ Ignorando grupo:', jid);
          return;
        }
        
        // Se já existe esse contato, verificar qual tem mensagem mais recente
        if (chatsMap.has(jid)) {
          const existing = chatsMap.get(jid);
          const existingTime = existing.lastMessage?.messageTimestamp || existing.updatedAt || 0;
          const newTime = chat.lastMessage?.messageTimestamp || chat.updatedAt || 0;
          
          if (newTime > existingTime) {
            console.log('🔄 Atualizando chat mais recente para:', jid);
            chatsMap.set(jid, chat);
          }
        } else {
          console.log('➕ Adicionando novo chat:', jid);
          chatsMap.set(jid, chat);
        }
      });
      
      console.log('📊 Total após remoção de duplicatas:', chatsMap.size);
      
      // Converter Map para Array
      const uniqueChats = Array.from(chatsMap.values());
      console.log('✅ Chats únicos para exibir:', uniqueChats.length);
      
      // Converter para formato da aplicação
      const convertedChats = uniqueChats.map(convertEvolutionChat);
      
      // Ordenar por timestamp da última mensagem (mais recente primeiro)
      convertedChats.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      console.log('🎯 Conversas finais prontas:', convertedChats.length);
      console.log('📋 Preview das primeiras 5:', convertedChats.slice(0, 5).map(c => ({
        nome: c.nome,
        ultimaMensagem: c.ultimaMensagem,
        naoLidas: c.naoLidas,
        formStatus: c.formStatus,
        qualificationStatus: c.qualificationStatus,
        pontuacao: c.pontuacao
      })));
      
      setConversations(convertedChats);
      setUseRealData(true);
      setLastFullUpdate(Date.now());
      
      // 💾 Salvar no cache
      saveToCache(convertedChats);
      
      // Mostrar aviso se não estiver conectado
      if (state && !state.connected) {
        toast.warning(`${convertedChats.length} conversas individuais carregadas`, {
          description: "⚠️ WhatsApp DESCONECTADO - Apenas conversas em cache. Grupos foram filtrados.",
          duration: 8000,
        });
      } else {
        toast.success(`${convertedChats.length} conversas carregadas!`, {
          description: `✅ ${convertedChats.length} conversas individuais (grupos filtrados)`,
        });
      }
      
      console.log('=== FIM DO CARREGAMENTO DE CHATS ===');
    } catch (error) {
      console.error('❌ ERRO ao carregar conversas:', error);
      toast.error("Erro ao carregar conversas", {
        description: error instanceof Error ? error.message : "Verifique se a Evolution API está configurada e conectada",
      });
      setConversations([]);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Inicializar dados - INTELIGENTE (usa cache)
  useEffect(() => {
    const config = configManager.getConfig();
    
    if (config && configManager.isConfigured()) {
      // Limpar dados mockados do localStorage
      storage.clear();
      // Carregar dados reais da Evolution API (com cache inteligente)
      loadRealChats(false); // false = tenta usar cache primeiro
    } else {
      toast.info("Modo demonstração ativado", {
        description: "Configure a Evolution API nas Configurações para usar seus chats reais do WhatsApp",
        duration: 5000,
      });
      // Carregar dados mock para demonstração
      storage.setConversations(initialConversations);
      storage.getAllMessages().length === 0 && 
        initialMessages.forEach(msg => storage.addMessage(msg));
      setConversations(initialConversations);
      setUseRealData(false);
    }
  }, []);

  // Carregar mensagens reais
  const loadRealMessages = async (chatId: string) => {
    try {
      console.log('Loading real messages for chat:', chatId);
      const msgs = await evolutionApi.fetchMessages(chatId);
      
      // Ensure msgs is always an array
      const messagesArray = Array.isArray(msgs) ? msgs : [];
      console.log('Messages received:', messagesArray.length);
      
      const convertedMsgs = messagesArray.map(msg => convertEvolutionMessage(msg, chatId));
      convertedMsgs.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(convertedMsgs);
      
      const updatedConversations = conversations.map(conv => 
        conv.id === chatId ? { ...conv, naoLidas: 0 } : conv
      );
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Erro ao carregar mensagens", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
      setMessages([]);
    }
  };

  // Carregar mensagens quando selecionar conversa
  useEffect(() => {
    if (activeConversationId) {
      if (useRealData) {
        loadRealMessages(activeConversationId);
      } else {
        const conversationMessages = storage.getMessages(activeConversationId);
        setMessages(conversationMessages);
        
        const updatedConversations = conversations.map(conv => 
          conv.id === activeConversationId ? { ...conv, naoLidas: 0 } : conv
        );
        setConversations(updatedConversations);
        storage.setConversations(updatedConversations);
      }
    }
  }, [activeConversationId, useRealData]);

  // Sincronização automática - SEMPRE atualizar conversas da Evolution API
  useEffect(() => {
    if (!useRealData) {
      // Modo de exemplo
      const interval = setInterval(() => {
        const updatedConversations = storage.getConversations();
        setConversations(updatedConversations);
        
        if (activeConversationId) {
          const updatedMessages = storage.getMessages(activeConversationId);
          if (updatedMessages.length !== messages.length) {
            setMessages(updatedMessages);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    // Atualizar conversas da Evolution API a cada 10 segundos
    const interval = setInterval(() => {
      console.log('🔄 Auto-atualizando conversas...');
      loadRealChats();
    }, 10000);

    return () => clearInterval(interval);
  }, [useRealData]);

  const activeConversation = conversations.find(
    (conv) => conv.id === activeConversationId
  );

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleSendMessage = async (messageText: string): Promise<void> => {
    if (!activeConversationId) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    if (useRealData) {
      try {
        const number = activeConversationId.replace('@s.whatsapp.net', '');
        
        // Otimistically add message to UI first
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          conversationId: activeConversationId,
          texto: messageText,
          tipo: "enviada",
          enviadaPor: "atendente",
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Send via API
        await evolutionApi.sendMessage(number, messageText);
        
        const updatedConversations = conversations.map(conv => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              ultimaMensagem: messageText,
              timestamp: new Date().toISOString(),
            };
          }
          return conv;
        });
        
        updatedConversations.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setConversations(updatedConversations);
        
        toast.success("Mensagem enviada!", {
          duration: 2000,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove the temporary message on error
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        
        if (errorMessage.includes('não está conectado') || errorMessage.includes('Connection Closed')) {
          toast.error("WhatsApp desconectado", {
            description: "Conecte sua instância do WhatsApp nas Configurações para enviar mensagens",
            duration: 5000,
          });
        } else {
          toast.error("Erro ao enviar mensagem", {
            description: errorMessage,
          });
        }
        throw error;
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));

      const newMessage: Message = {
        id: `${activeConversationId}-${Date.now()}`,
        conversationId: activeConversationId,
        texto: messageText,
        tipo: "enviada",
        enviadaPor: "atendente",
        timestamp: new Date().toISOString(),
      };

      storage.addMessage(newMessage);
      setMessages(prev => [...prev, newMessage]);

      const updatedConversations = conversations.map(conv => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            ultimaMensagem: messageText,
            timestamp: new Date().toISOString(),
          };
        }
        return conv;
      });

      updatedConversations.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setConversations(updatedConversations);
      storage.setConversations(updatedConversations);
    }
  };

  const handleSendAudio = async (audioBlob: Blob): Promise<void> => {
    if (!activeConversationId) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    if (useRealData) {
      try {
        const number = activeConversationId.replace('@s.whatsapp.net', '');
        
        // Adicionar mensagem otimista na UI
        const tempMessage: Message = {
          id: `temp-audio-${Date.now()}`,
          conversationId: activeConversationId,
          texto: '🎤 Enviando áudio...',
          tipo: "enviada",
          enviadaPor: "atendente",
          timestamp: new Date().toISOString(),
          mediaType: "audio",
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Converter Blob para base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        const audioBase64 = btoa(binaryString);
        
        // Enviar via API
        await evolutionApi.sendAudio(number, audioBase64);
        
        // Atualizar conversa
        const updatedConversations = conversations.map(conv => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              ultimaMensagem: '🎤 Áudio',
              timestamp: new Date().toISOString(),
            };
          }
          return conv;
        });
        
        updatedConversations.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setConversations(updatedConversations);
        
        // Remover mensagem temporária e recarregar mensagens
        setTimeout(() => {
          loadRealMessages(activeConversationId);
        }, 1000);
        
        toast.success("Áudio enviado!", { duration: 2000 });
        
      } catch (error) {
        console.error('Error sending audio:', error);
        
        // Remover mensagem temporária
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-audio-')));
        
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        
        if (errorMessage.includes('não está conectado') || errorMessage.includes('Connection Closed')) {
          toast.error("WhatsApp desconectado", {
            description: "Conecte sua instância do WhatsApp nas Configurações para enviar áudio",
            duration: 5000,
          });
        } else {
          toast.error("Erro ao enviar áudio", {
            description: errorMessage,
          });
        }
        throw error;
      }
    }
  };

  const handleSendMedia = async (mediaData: {
    mediatype: 'image' | 'video' | 'document';
    mimetype: string;
    media: string;
    caption?: string;
    fileName?: string;
  }): Promise<void> => {
    if (!activeConversationId) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    if (useRealData) {
      try {
        const number = activeConversationId.replace('@s.whatsapp.net', '');
        
        // Adicionar mensagem otimista na UI
        const emojiMap = {
          image: '🖼️',
          video: '🎥',
          document: '📄'
        };
        
        const tempMessage: Message = {
          id: `temp-media-${Date.now()}`,
          conversationId: activeConversationId,
          texto: `${emojiMap[mediaData.mediatype]} Enviando ${mediaData.mediatype}...`,
          tipo: "enviada",
          enviadaPor: "atendente",
          timestamp: new Date().toISOString(),
          mediaType: mediaData.mediatype,
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Enviar via API
        await evolutionApi.sendMedia(
          number,
          mediaData.mediatype,
          mediaData.mimetype,
          mediaData.media,
          mediaData.caption,
          mediaData.fileName
        );
        
        // Atualizar conversa
        const lastMessage = mediaData.caption || `${emojiMap[mediaData.mediatype]} ${mediaData.mediatype.charAt(0).toUpperCase() + mediaData.mediatype.slice(1)}`;
        const updatedConversations = conversations.map(conv => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              ultimaMensagem: lastMessage,
              timestamp: new Date().toISOString(),
            };
          }
          return conv;
        });
        
        updatedConversations.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setConversations(updatedConversations);
        
        // Remover mensagem temporária e recarregar mensagens
        setTimeout(() => {
          loadRealMessages(activeConversationId);
        }, 1000);
        
        toast.success(`${mediaData.mediatype.charAt(0).toUpperCase() + mediaData.mediatype.slice(1)} enviado!`, { duration: 2000 });
        
      } catch (error) {
        console.error('Error sending media:', error);
        
        // Remover mensagem temporária
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-media-')));
        
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        
        if (errorMessage.includes('não está conectado') || errorMessage.includes('Connection Closed')) {
          toast.error("WhatsApp desconectado", {
            description: "Conecte sua instância do WhatsApp nas Configurações para enviar mídia",
            duration: 5000,
          });
        } else {
          toast.error("Erro ao enviar mídia", {
            description: errorMessage,
          });
        }
        throw error;
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <Header 
        onRefreshAll={() => loadRealChats(true)}
        onRefreshLabels={refreshLabelsOnly}
        isRefreshing={isLoadingChats}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar SEMPRE visível */}
        <div className="w-[380px] shrink-0 h-full border-r border-border">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Área de chat */}
        <div className="flex-1 h-full">
          <ChatArea
            conversation={
              activeConversation
                ? {
                    id: activeConversation.id,
                    nome: activeConversation.nome,
                    numero: activeConversation.numero,
                    tags: activeConversation.tags,
                  }
                : null
            }
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendAudio={handleSendAudio}
            onSendMedia={handleSendMedia}
            connectionState={useRealData ? connectionState : null}
            onCheckConnection={checkConnection}
            onTagsChange={handleTagsChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
