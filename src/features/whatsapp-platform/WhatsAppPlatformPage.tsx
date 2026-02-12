import { useState, useEffect, useRef, useCallback } from "react";
import { ConversationList } from "./components/ConversationList";
import { ChatArea } from "./components/ChatArea";
import { Header } from "./components/Header";
import { storage } from "./lib/utils";
import { evolutionApi, EvolutionChat, EvolutionMessage } from "./lib/evolutionApi";
import { configManager } from "./lib/config";
import { toast } from "sonner";
import { QrCode, RefreshCw, X, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  mediaDataUrl?: string; // Data URL completo com mimeType (prioridade máxima)
  caption?: string;
  messageKey?: any; // Key completa da mensagem para baixar mídia
}

interface CPFComplianceData {
  status: string;
  riskScore: number;
  hasCheck: boolean;
  consultedAt?: string;
  totalLawsuits?: number;
  hasActiveCollections?: boolean;
  taxIdStatus?: string;
  personName?: string;
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
  cpfCompliance?: CPFComplianceData; // Status de compliance do CPF
}

const CACHE_KEY = 'whatsapp_conversations_cache';
const CACHE_TIMESTAMP_KEY = 'whatsapp_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // ✅ CORREÇÃO: 5 MINUTOS - conversas ficam visíveis por mais tempo

// ⏱️ 🎯 OTIMIZAÇÃO: Configurações de Auto-Atualização (Polling) DESABILITADAS
// IMPORTANTE: Polling desabilitado para evitar que conversas sumam
// Usuário deve clicar em "Atualizar" manualmente para ver novas mensagens
const POLLING_CONFIG = {
  CONVERSATION_REFRESH: 0, // 🎯 DESABILITADO - não atualiza automaticamente
  MESSAGE_REFRESH: 0, // 🎯 DESABILITADO - não atualiza automaticamente  
  LEADS_REFRESH: 30000, // 🎯 30s - atualização de status de leads/etiquetas (não afeta conversas)
};

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [useRealData, setUseRealData] = useState(false);
  const [connectionState, setConnectionState] = useState<{ connected: boolean; state: string } | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, { name?: string; pushName?: string; notify?: string; verifiedName?: string }>>({});
  const [leadsMap, setLeadsMap] = useState<Record<string, { formStatus?: string; qualificationStatus?: string; pontuacao?: number }>>({});
  const [cpfComplianceMap, setCpfComplianceMap] = useState<Record<string, CPFComplianceData>>({});
  const [lastFullUpdate, setLastFullUpdate] = useState<number>(0);

  // ✅ CORREÇÃO 5: Refs para prevenir race conditions
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageAbortControllerRef = useRef<AbortController | null>(null);
  const messageLoadingRef = useRef(false);

  // 🏷️ QR Code State
  const [qrCode, setQrCode] = useState<{ base64: string; code: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

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

  // 🎯 OTIMIZAÇÃO: Polling de leads consolidado no useEffect principal abaixo (linha ~1122)

  // 🔄 ATUALIZAR CONVERSAS quando leadsMap muda (tempo real)
  useEffect(() => {
    if (Object.keys(leadsMap).length > 0 && conversations.length > 0) {
      console.log('🔄 [LeadsMap Changed] Atualizando conversas com novos status de leads...');

      setConversations(prevConversations =>
        prevConversations.map(conv => {
          // Extrair número limpo e normalizar
          const rawNumber = conv.id.replace('@s.whatsapp.net', '').replace('@g.us', '');
          const normalizedPhone = normalizePhoneForDatabase(rawNumber);
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

  // 🔄 ATUALIZAR CONVERSAS quando cpfComplianceMap muda (tempo real)
  useEffect(() => {
    if (Object.keys(cpfComplianceMap).length > 0 && conversations.length > 0) {
      console.log('🔄 [CPF Compliance Changed] Atualizando conversas com status de compliance...');

      setConversations(prevConversations =>
        prevConversations.map(conv => {
          const rawNumber = conv.id.replace('@s.whatsapp.net', '').replace('@g.us', '');
          const normalizedPhone = normalizePhoneForDatabase(rawNumber);
          const compliance = cpfComplianceMap[normalizedPhone];

          if (compliance && compliance.hasCheck) {
            const hasChanged = JSON.stringify(conv.cpfCompliance) !== JSON.stringify(compliance);

            if (hasChanged) {
              console.log(`✅ Atualizando compliance CPF para ${conv.nome}:`, compliance.status);
              return { ...conv, cpfCompliance: compliance };
            }
          }
          return conv;
        })
      );
    }
  }, [cpfComplianceMap]);

  // 🔍 BUSCAR CPF COMPLIANCE do Supabase Master
  const fetchCpfCompliance = useCallback(async () => {
    if (conversations.length === 0) return;

    try {
      const phoneNumbers = conversations.map(conv => {
        const rawNumber = conv.id.replace('@s.whatsapp.net', '').replace('@g.us', '');
        return normalizePhoneForDatabase(rawNumber);
      }).filter(Boolean);

      if (phoneNumbers.length === 0) return;

      console.log('🔍 [CPF Compliance] Buscando status de compliance para', phoneNumbers.length, 'números...');

      const response = await fetch('/api/whatsapp-complete/leads/cpf-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers }),
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('⚠️ [CPF Compliance] Resposta não-OK:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && data.complianceMap) {
        console.log('✅ [CPF Compliance] Recebidos', Object.keys(data.complianceMap).length, 'registros de compliance');
        setCpfComplianceMap(data.complianceMap);
      }
    } catch (error) {
      console.error('❌ [CPF Compliance] Erro ao buscar compliance:', error);
    }
  }, [conversations]);

  // Buscar CPF compliance quando conversas são carregadas
  useEffect(() => {
    if (conversations.length > 0 && useRealData) {
      fetchCpfCompliance();
    }
  }, [conversations.length, useRealData, fetchCpfCompliance]);

  // 🎯 OTIMIZAÇÃO: Verificar status de conexão apenas ao carregar (removido polling contínuo)
  useEffect(() => {
    const checkInitialConnection = async () => {
      console.log('🔄 [Component Mount] Verificando status de conexão inicial...');
      try {
        const state = await evolutionApi.checkConnectionState();
        setConnectionState(state);
        console.log('✅ [Component Mount] Status de conexão:', state);

        // 🔥 CORREÇÃO: Ativar dados reais automaticamente quando Evolution API estiver conectado
        if (state.connected) {
          console.log('🔄 Evolution API conectado - ativando dados reais automaticamente');
          setUseRealData(true);
        }
      } catch (error) {
        console.error('❌ [Component Mount] Erro ao verificar conexão:', error);
        setConnectionState({ connected: false, state: 'error' });
      }
    };

    // Verificar apenas ao montar (sem polling contínuo)
    checkInitialConnection();
  }, []); // Executar apenas uma vez ao montar

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
    const normalizedPhone = normalizePhoneForDatabase(rawNumber);
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

  const normalizePhoneForDatabase = (rawNumber: string): string => {
    let phone = rawNumber.replace(/\D/g, '');

    // 13 dígitos = número brasileiro completo (55 + DDD + 9 + 8 dígitos)
    // Exemplo: 5531998784136 → +5531998784136
    if (phone.length === 13 && phone.startsWith('55')) {
      return '+' + phone;
    }

    // 12 dígitos com 55 = número sem o 9 do celular
    // Exemplo: 553198784136 → +5531998784136
    if (phone.length === 12 && phone.startsWith('55')) {
      const ddd = phone.substring(2, 4);
      const resto = phone.substring(4);
      phone = '55' + ddd + '9' + resto;
      return '+' + phone;
    }

    // 11 dígitos = número local com DDD e 9
    // Exemplo: 31998784136 → +5531998784136
    // CUIDADO: Se já começa com 55, é um número incompleto - não duplicar!
    if (phone.length === 11) {
      if (!phone.startsWith('55')) {
        phone = '55' + phone;
      }
      // Se já começa com 55 e tem 11 dígitos, pode ser: 55 + DDD(2) + 7 dígitos (antigo)
      // Neste caso, adicionar o 9: 55319878413 → 5531998784136
      else {
        const ddd = phone.substring(2, 4);
        const resto = phone.substring(4);
        phone = '55' + ddd + '9' + resto;
      }
      return '+' + phone;
    }

    // 10 dígitos = número local sem 9
    // Exemplo: 3198784136 → +5531998784136
    // CUIDADO: Se já começa com 55, é um número incompleto
    if (phone.length === 10) {
      if (!phone.startsWith('55')) {
        // Número local: DDD(2) + 8 dígitos → adiciona 55 e 9
        const ddd = phone.substring(0, 2);
        const resto = phone.substring(2);
        phone = '55' + ddd + '9' + resto;
      }
      // Se já começa com 55 e tem 10 dígitos: 55 + DDD(2) + 6 dígitos (inválido/incompleto)
      // Mantém como está
      return '+' + phone;
    }

    // Qualquer outro tamanho: retorna com + apenas
    return '+' + phone;
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
    if (['você', 'voce', 'you', 'me', 'eu'].includes(lowered)) return undefined;

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
    let mediaDataUrl: string | undefined; // Data URL completo normalizado
    let text = '';

    console.log('🎵 Processando mensagem completa:', {
      messageType: msg.messageType,
      hasMessage: !!msg.message,
      hasBase64: !!msg.message?.base64,
      hasMediaDataUrl: !!msg.message?.mediaDataUrl,
      messageKeys: msg.message ? Object.keys(msg.message) : []
    });

    if (msg.message) {
      // PRIORIDADE 1: Verificar se backend já processou e criou mediaDataUrl completo
      if (msg.message.mediaDataUrl) {
        mediaDataUrl = msg.message.mediaDataUrl;
        console.log('✅ mediaDataUrl completo do backend encontrado!');
      }

      // Áudio - tentar múltiplas estruturas possíveis
      if (msg.message.audioMessage || msg.messageType === 'audioMessage') {
        mediaType = "audio";
        // PRIORIDADE 2: base64 direto no objeto da mensagem
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
          console.log('✅ Base64 de áudio encontrado direto na mensagem!', {
            length: mediaBase64.length
          });
          // Criar dataURL normalizado se ainda não existir
          if (!mediaDataUrl) {
            const mimeType = msg.message.audioMessage?.mimetype || 'audio/ogg; codecs=opus';
            mediaDataUrl = `data:${mimeType};base64,${mediaBase64}`;
            console.log('🔧 mediaDataUrl criado para áudio:', mimeType);
          }
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
        // PRIORIDADE 2: base64 direto no objeto da mensagem
        if (msg.message.base64) {
          mediaBase64 = msg.message.base64;
          console.log('✅ Base64 de imagem encontrado direto na mensagem!', {
            length: mediaBase64.length
          });
          // Criar dataURL normalizado se ainda não existir
          if (!mediaDataUrl) {
            const mimeType = msg.message.imageMessage?.mimetype || 'image/jpeg';
            mediaDataUrl = `data:${mimeType};base64,${mediaBase64}`;
            console.log('🔧 mediaDataUrl criado para imagem:', mimeType);
          }
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
          // Criar dataURL normalizado se ainda não existir
          if (!mediaDataUrl) {
            const mimeType = msg.message.videoMessage?.mimetype || 'video/mp4';
            mediaDataUrl = `data:${mimeType};base64,${mediaBase64}`;
            console.log('🔧 mediaDataUrl criado para vídeo:', mimeType);
          }
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
          // Criar dataURL normalizado se ainda não existir
          if (!mediaDataUrl) {
            const mimeType = msg.message.documentMessage?.mimetype || 'application/octet-stream';
            mediaDataUrl = `data:${mimeType};base64,${mediaBase64}`;
            console.log('🔧 mediaDataUrl criado para documento:', mimeType);
          }
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
      mediaUrl: mediaBase64 || mediaDataUrl ? undefined : mediaUrl, // Se tem base64 ou dataUrl, não precisa URL
      mediaBase64, // Campo para base64
      mediaDataUrl, // Campo para data URL completo (PRIORIDADE MÁXIMA)
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

  // 💾 Funções de cache de mensagens
  const MESSAGE_CACHE_PREFIX = 'whatsapp_messages_';
  const MESSAGE_CACHE_DURATION = 5000; // 5 segundos

  const saveMessagesToCache = (conversationId: string, messages: Message[]) => {
    try {
      localStorage.setItem(
        `${MESSAGE_CACHE_PREFIX}${conversationId}`,
        JSON.stringify({ messages, timestamp: Date.now() })
      );
      console.log('💾 Mensagens salvas no cache para:', conversationId);
    } catch (error) {
      console.error('Erro ao salvar mensagens no cache:', error);
    }
  };

  const loadMessagesFromCache = (conversationId: string): Message[] | null => {
    try {
      const cached = localStorage.getItem(`${MESSAGE_CACHE_PREFIX}${conversationId}`);
      if (!cached) return null;

      const { messages, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > MESSAGE_CACHE_DURATION) {
        console.log('⏰ Cache de mensagens expirado para:', conversationId);
        localStorage.removeItem(`${MESSAGE_CACHE_PREFIX}${conversationId}`);
        return null;
      }

      console.log('💾 Mensagens carregadas do cache para:', conversationId, '(idade:', age, 'ms)');
      return messages;
    } catch (error) {
      console.error('Erro ao carregar mensagens do cache:', error);
      return null;
    }
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

  // 🏷️ Carregar status dos leads para as conversas (usando batch endpoint)
  const loadLeadStatuses = async (chats: Conversation[]) => {
    if (chats.length === 0) return;

    try {
      const telefones = chats.map(chat => {
        const rawNumber = chat.id.replace('@s.whatsapp.net', '').replace('@g.us', '');
        return normalizePhoneForDatabase(rawNumber);
      }).filter(Boolean);

      if (telefones.length === 0) return;

      console.log(`🏷️ [loadLeadStatuses] Buscando status para ${telefones.length} telefones...`);

      const response = await fetch('/api/leads/status/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telefones }),
      });

      if (!response.ok) {
        console.warn('⚠️ [loadLeadStatuses] Resposta não-OK:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.results)) {
        const leadsObj: Record<string, { formStatus?: string; qualificationStatus?: string; pontuacao?: number }> = {};

        data.results.forEach((result: any) => {
          if (result.exists && result.lead) {
            const leadData = {
              formStatus: result.lead.formStatus,
              qualificationStatus: result.lead.qualificationStatus,
              pontuacao: result.lead.pontuacao,
            };

            // PRIORIDADE 1: Usar o telefone normalizado que já vem do backend (formato correto: +5531998784136)
            const leadTelefone = result.lead.telefone;
            if (leadTelefone) {
              leadsObj[leadTelefone] = leadData;
            }

            // PRIORIDADE 2: Usar o telefone original da requisição como fallback
            leadsObj[result.telefone] = leadData;

            // PRIORIDADE 3: Normalizar o telefone original para garantir match
            const normalizedKey = normalizePhoneForDatabase(result.telefone);
            leadsObj[normalizedKey] = leadData;

            console.log(`🏷️ [loadLeadStatuses] Chaves adicionadas:`, {
              leadTelefone,
              resultTelefone: result.telefone,
              normalized: normalizedKey
            });
          }
        });

        console.log(`✅ [loadLeadStatuses] ${Object.keys(leadsObj).length} leads encontrados de ${telefones.length} telefones`);
        setLeadsMap(leadsObj);
      }
    } catch (error) {
      console.error('❌ [loadLeadStatuses] Erro ao carregar status dos leads:', error);
    }
  };

  // 🔄 Carregar conversas da Evolution API (completo)
  const loadRealChats = async (forceReload = false, silent = false) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 [FRONTEND loadRealChats] Iniciando busca de conversas');
    console.log('⏰ Timestamp:', new Date().toISOString());

    // ✅ CORREÇÃO 5: Prevenir requisições simultâneas
    if (loadingRef.current) {
      console.log('⏸️ [FRONTEND] Requisição em andamento, aguardando...');
      return;
    }

    // ✅ CORREÇÃO 5: Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      console.log('🛑 [FRONTEND] Cancelando requisição anterior');
      abortControllerRef.current.abort();
    }

    loadingRef.current = true;
    abortControllerRef.current = new AbortController();

    // 🔥 CORREÇÃO: NÃO limpar cache em modo silent (polling automático)
    // Isso evita que as conversas sumam durante atualizações automáticas
    // Cache só é limpo quando usuário clica explicitamente em "Atualizar"
    if (silent) {
      console.log('🔄 [Polling] Modo automático - mantendo conversas visíveis (cache preservado)');
      // NÃO forçar reload em modo silent
      // NÃO limpar cache em modo silent
    } else if (forceReload) {
      // Apenas limpar cache quando usuário clica explicitamente em "Atualizar"
      clearCache();
      console.log('🗑️ Cache limpo - buscando dados frescos da Evolution API');
      toast.info('Recarregando conversas...', { duration: 2000 });
    }

    // Verificar conexão PRIMEIRO
    const state = await checkConnection();

    // ✅ CORREÇÃO 5: Verificar se não foi cancelado após async operation
    if (abortControllerRef.current?.signal.aborted) {
      console.log('⏭️ [FRONTEND] Requisição cancelada durante checkConnection');
      loadingRef.current = false;
      return;
    }

    // ✅ CORREÇÃO: Não forçar reload quando conectado em modo silent
    // Isso permite que o cache funcione e as conversas não sumam
    if (state.connected && state.state === 'open' && !silent) {
      forceReload = true; // Força reload apenas quando NÃO for silent
      clearCache(); // Limpa cache apenas quando NÃO for silent

      localStorage.setItem('last_cache_clear', new Date().toISOString());

      console.log('✅ WhatsApp conectado - cache limpo + dados frescos');
      toast.info('WhatsApp conectado - carregando conversas atualizadas...', { duration: 2000 });
    }

    // ✅ CORREÇÃO: Usar cache SEMPRE em modo silent (polling)
    // Apenas buscar da API quando usuário clica explicitamente em "Atualizar"
    if (!silent && !forceReload) {
      // Apenas em casos MUITO específicos usa cache (5 minutos)
      const cachedChats = loadFromCache();
      const cached = cachedChats ? {
        data: cachedChats,
        timestamp: parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY) || '0')
      } : null;

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Usando cache (última atualização há', Date.now() - cached.timestamp, 'ms)');
        setConversations(cached.data);
        setUseRealData(true);
        loadingRef.current = false;
        return;
      }
    } else if (silent) {
      // Em modo silent, SEMPRE usar cache se existir
      const cachedChats = loadFromCache();
      if (cachedChats && cachedChats.length > 0) {
        console.log('📦 [Polling] Usando cache existente - conversas preservadas:', cachedChats.length);
        setConversations(cachedChats);
        setUseRealData(true);
        loadingRef.current = false;
        return;
      }
    }

    if (!silent) {
      setIsLoadingChats(true);
    }
    try {

      console.log('=== INÍCIO DO CARREGAMENTO DE CHATS ===');

      // 🎯 OTIMIZAÇÃO: Buscar contatos APENAS se for forceReload ou se não tiver contatos ainda
      // Isso reduz drasticamente o peso da requisição em polling
      if (forceReload || Object.keys(contactsMap).length === 0) {
        try {
          console.log('👥 [loadRealChats] Buscando contatos da API...');
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
        } catch (contactError) {
          console.error('❌ Erro ao carregar contatos:', contactError);
          // Continua mesmo se falhar ao carregar contatos
        }
      } else {
        console.log('⏭️ [loadRealChats] Usando contatos em cache (polling)');
      }

      // ✅ CORREÇÃO 5: Verificar se não foi cancelado após async operation
      if (abortControllerRef.current?.signal.aborted) {
        console.log('⏭️ [FRONTEND] Requisição cancelada após carregar contatos');
        loadingRef.current = false;
        return;
      }

      // Buscar conversas
      // console.log('🔧 Parâmetros:', { forceReload, silent, connected: state?.connected });

      const fetchStartTime = Date.now();
      const rawChats = await evolutionApi.fetchChats();
      const fetchDuration = Date.now() - fetchStartTime;

      // ✅ CORREÇÃO 5: Verificar se não foi cancelado após async operation
      if (abortControllerRef.current?.signal.aborted) {
        console.log('⏭️ [FRONTEND] Requisição cancelada após fetchChats');
        loadingRef.current = false;
        return;
      }

      console.log('✅ [FRONTEND] Resposta recebida do backend:');
      console.log(`  Tempo de resposta: ${fetchDuration}ms`);
      console.log('  Total de chats brutos:', rawChats?.length || 0);

      if (rawChats && rawChats.length > 0) {
        console.log('  Primeiros 5 chats brutos:');
        rawChats.slice(0, 5).forEach((chat: any, index: number) => {
          console.log(`    ${index + 1}. ${chat.remoteJid || chat.id}`);
          console.log(`       Nome/Push: ${chat.pushName || chat.name || 'N/A'}`);
          console.log(`       Não lidas: ${chat.unreadCount || 0}`);
          console.log(`       Timestamp: ${chat.lastMessageTimestamp || chat.lastMessage?.messageTimestamp || 'N/A'}`);
          console.log(`       É grupo? ${chat.remoteJid?.includes('@g.us') ? 'SIM' : 'NÃO'}`);
        });
      }

      if (!rawChats || rawChats.length === 0) {
        console.log('⚠️ [FRONTEND] NENHUMA CONVERSA RECEBIDA!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        if (!silent) {
          toast.info("Nenhuma conversa encontrada no WhatsApp", {
            description: "Se você tem conversas no celular, tente enviar uma mensagem para forçar a sincronização.",
            duration: 5000,
          });
        } else {
          console.log('🔄 [Polling] Nenhuma conversa encontrada (resposta vazia da API)');
        }

        // 🔥 CORREÇÃO: Não limpar conversas se já existirem (para não piscar a tela)
        if (conversations.length === 0) {
          setConversations([]);
        }
        return;
      }

      const normalizeTimestamp = (timestamp: any): number => {
        if (!timestamp) return 0;

        if (typeof timestamp === 'number') {
          return timestamp > 9999999999 ? timestamp : timestamp * 1000;
        }

        if (typeof timestamp === 'string') {
          const date = new Date(timestamp);
          return date.getTime();
        }

        return 0;
      };

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

        const newTimestamp = normalizeTimestamp(chat.lastMessage?.messageTimestamp);

        // Se já existe esse contato, verificar qual tem mensagem mais recente
        if (chatsMap.has(jid)) {
          const existing = chatsMap.get(jid)!;
          const existingTimestamp = normalizeTimestamp(existing.lastMessage?.messageTimestamp);

          console.log(`🔄 Comparando ${jid}:`, {
            novo: newTimestamp,
            existente: existingTimestamp,
            diferenca: newTimestamp - existingTimestamp,
          });

          if (newTimestamp > existingTimestamp) {
            console.log(`✅ Atualizando conversa ${jid} (timestamp mais recente)`);
            chatsMap.set(jid, chat);
          } else {
            console.log(`⏭️ Mantendo conversa existente ${jid} (timestamp mais antigo ou igual)`);
          }
        } else {
          console.log(`➕ Nova conversa: ${jid}`);
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

      console.log('🎯 [FRONTEND] Conversas finais após conversão:', convertedChats.length);
      console.log('  Preview das primeiras 5 conversas convertidas:');
      convertedChats.slice(0, 5).forEach((conv, index) => {
        console.log(`    ${index + 1}. ${conv.nome} (${conv.numero})`);
        console.log(`       Última msg: "${conv.ultimaMensagem.substring(0, 40)}..."`);
        console.log(`       Timestamp: ${conv.timestamp}`);
        console.log(`       Não lidas: ${conv.naoLidas}`);
        console.log(`       Status form: ${conv.formStatus || 'N/A'}`);
        console.log(`       Status qualif: ${conv.qualificationStatus || 'N/A'}`);
      });

      console.log('📊 [FRONTEND] Atualizando state React com', convertedChats.length, 'conversas');

      // ✅ CORREÇÃO DEFINITIVA: Comparação inteligente em vez de JSON.stringify
      // Função helper para detectar mudanças reais nas conversas
      const conversationsChanged = (prev: Conversation[], next: Conversation[]): boolean => {
        // 1. Tamanho diferente = mudança garantida
        if (prev.length !== next.length) {
          console.log('🔄 Tamanho mudou:', prev.length, '→', next.length);
          return true;
        }

        // 2. Sem conversas = sem mudança
        if (prev.length === 0 && next.length === 0) {
          return false;
        }

        // 3. Criar maps por ID para comparação eficiente
        const prevMap = new Map(prev.map(c => [c.id, c]));
        const nextMap = new Map(next.map(c => [c.id, c]));

        // 4. Verificar se há IDs novos ou removidos
        for (const id of nextMap.keys()) {
          if (!prevMap.has(id)) {
            console.log('🔄 Nova conversa detectada:', id);
            return true;
          }
        }

        // 5. Comparar campos importantes de cada conversa
        for (const [id, nextConv] of nextMap.entries()) {
          const prevConv = prevMap.get(id);
          if (!prevConv) continue; // Já verificado acima

          // Comparar campos que indicam atividade nova
          if (
            prevConv.ultimaMensagem !== nextConv.ultimaMensagem ||
            prevConv.timestamp !== nextConv.timestamp ||
            prevConv.naoLidas !== nextConv.naoLidas ||
            prevConv.formStatus !== nextConv.formStatus ||
            prevConv.qualificationStatus !== nextConv.qualificationStatus ||
            prevConv.pontuacao !== nextConv.pontuacao ||
            JSON.stringify(prevConv.tags || []) !== JSON.stringify(nextConv.tags || [])
          ) {
            console.log('🔄 Conversa modificada:', {
              id,
              nome: nextConv.nome,
              campo_mudado: {
                ultimaMensagem: prevConv.ultimaMensagem !== nextConv.ultimaMensagem,
                timestamp: prevConv.timestamp !== nextConv.timestamp,
                naoLidas: prevConv.naoLidas !== nextConv.naoLidas,
                formStatus: prevConv.formStatus !== nextConv.formStatus,
                qualificationStatus: prevConv.qualificationStatus !== nextConv.qualificationStatus,
                pontuacao: prevConv.pontuacao !== nextConv.pontuacao,
                tags: JSON.stringify(prevConv.tags || []) !== JSON.stringify(nextConv.tags || []),
              }
            });
            return true;
          }
        }

        console.log('⏭️ Nenhuma mudança real detectada (conversas idênticas)');
        return false;
      };

      // ✅ CORREÇÃO 5: Usar callback funcional para prevenir race conditions
      setConversations(prev => {
        console.log('🔄 [FRONTEND] State anterior:', prev.length, 'conversas');
        console.log('🔄 [FRONTEND] Novo state:', convertedChats.length, 'conversas');

        // Verifica se realmente mudou usando comparação inteligente
        if (!conversationsChanged(prev, convertedChats)) {
          console.log('⏭️ [FRONTEND] State idêntico, pulando update (comparação inteligente)');
          return prev;
        }

        console.log('✅ [FRONTEND] State atualizado com sucesso! (mudanças detectadas)');
        return convertedChats;
      });

      setUseRealData(true);
      setLastFullUpdate(Date.now());

      // 💾 Salvar no cache
      saveToCache(convertedChats);

      // 🏷️ Carregar status dos leads para exibição correta das etiquetas
      loadLeadStatuses(convertedChats);

      // Mostrar aviso se não estiver conectado (apenas se não for silencioso)
      if (!silent) {
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
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
      // ✅ CORREÇÃO 5: Verificar se erro foi por abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏭️ [FRONTEND] Requisição cancelada');
      } else {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ [FRONTEND] ERRO ao carregar conversas:');
        console.error('  Timestamp:', new Date().toISOString());
        console.error('  Erro:', error);
        console.error('  Stack:', error instanceof Error ? error.stack : 'N/A');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        if (!silent) {
          toast.error("Erro ao carregar conversas", {
            description: error instanceof Error ? error.message : "Verifique se a Evolution API está configurada e conectada",
          });
        }
        // 🔥 CORREÇÃO: Não limpar conversas se já existirem (para não piscar a tela)
        if (conversations.length === 0) {
          setConversations([]);
        }
      }
    } finally {
      // ✅ CORREÇÃO 5: Liberar flag de loading no finally
      loadingRef.current = false;
      abortControllerRef.current = null;

      if (!silent) {
        setIsLoadingChats(false);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  };

  // Inicializar dados - SOMENTE DADOS REAIS
  useEffect(() => {
    const config = configManager.getConfig();

    if (config && configManager.isConfigured()) {
      // Limpar dados mockados do localStorage
      storage.clear();
      // Carregar dados reais da Evolution API (com cache inteligente)
      loadRealChats(false); // false = tenta usar cache primeiro
      setUseRealData(true);
    } else {
      // Não carregar dados mock - deixar vazio até o usuário configurar
      toast.info("Configure a Evolution API", {
        description: "Clique em Configurações e configure a Evolution API para ver suas conversas reais do WhatsApp",
        duration: 5000,
      });
      setConversations([]);
      setUseRealData(false);
    }
  }, []);

  // Carregar mensagens reais
  // 🎯 OTIMIZAÇÃO: Adicionado parâmetro limit para carregar apenas últimas N mensagens
  // ✅ FIX RACE CONDITION: Retorna mensagens em vez de setar estado diretamente
  const loadRealMessages = async (chatId: string, silent = false, limit = 50): Promise<Message[]> => {
    try {
      if (silent) {
        console.log(`💬 [Polling] Carregando mensagens silenciosamente para: ${chatId} (limit: ${limit})`);
      } else {
        console.log(`Loading real messages for chat: ${chatId} (limit: ${limit})`);
      }
      const msgs = await evolutionApi.fetchMessages(chatId, limit);

      // Ensure msgs is always an array
      const messagesArray = Array.isArray(msgs) ? msgs : [];
      console.log('Messages received:', messagesArray.length);

      const convertedMsgs = messagesArray.map(msg => convertEvolutionMessage(msg, chatId));
      convertedMsgs.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // 💾 Salvar mensagens no cache
      saveMessagesToCache(chatId, convertedMsgs);

      // Update conversation unread count
      const updatedConversations = conversations.map(conv =>
        conv.id === chatId ? { ...conv, naoLidas: 0 } : conv
      );
      setConversations(updatedConversations);

      // ✅ RETURN messages instead of setting state
      return convertedMsgs;
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        toast.error("Erro ao carregar mensagens", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
      return []; // Return empty array on error
    }
  };

  // Carregar mensagens quando selecionar conversa
  useEffect(() => {
    if (!activeConversationId || !useRealData) {
      setMessages([]);
      return;
    }

    // IMMEDIATE: Clear messages to prevent showing wrong conversation
    console.log('🔄 Conversation changed to:', activeConversationId);
    setMessages([]);

    // Cancel previous request if exists
    if (messageAbortControllerRef.current) {
      console.log('🛑 Aborting previous message request');
      messageAbortControllerRef.current.abort();
    }

    // Try cache first for instant display
    const cachedMessages = loadMessagesFromCache(activeConversationId);
    if (cachedMessages) {
      console.log('💾 Displaying cached messages for instant UX');
      setMessages(cachedMessages);
    }

    // Create new abort controller for this request
    messageAbortControllerRef.current = new AbortController();
    const currentConversationId = activeConversationId;

    // ✅ FIX RACE CONDITION: Load fresh data in background and validate before setting state
    loadRealMessages(activeConversationId, false, 50)
      .then((freshMessages) => {
        // VALIDATE: Only update if conversation hasn't changed
        if (currentConversationId === activeConversationId) {
          console.log('✅ Messages loaded for correct conversation:', currentConversationId);
          setMessages(freshMessages);
        } else {
          console.log('⏭️ Ignoring stale response for old conversation');
        }
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('Error loading messages:', error);
        }
      });

    return () => {
      if (messageAbortControllerRef.current) {
        messageAbortControllerRef.current.abort();
      }
    };
  }, [activeConversationId, useRealData]);

  // 🎯 OTIMIZAÇÃO: POLLING CONSOLIDADO COM INTERVALOS REDUZIDOS
  useEffect(() => {
    if (!useRealData) return;

    let conversationTimer: NodeJS.Timeout | null = null;
    let messageTimer: NodeJS.Timeout | null = null;
    let leadsTimer: NodeJS.Timeout | null = null;

    const isPageVisible = () => !document.hidden;

    // 🔄 Função para carregar leads (30s)
    const loadLeads = async () => {
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
          console.log('🏷️ [Polling] Leads atualizados:', Object.keys(leadsObj).length, 'leads');
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar leads:', error);
      }
    };

    // 🔥 CORREÇÃO: Carregar conversas IMEDIATAMENTE do cache (se existir) para UX instantânea
    const cachedChats = loadFromCache();
    if (cachedChats && cachedChats.length > 0) {
      console.log('🚀 [Initial Load] Cache encontrado! Exibindo', cachedChats.length, 'conversas imediatamente.');
      setConversations(cachedChats);
      setUseRealData(true);
    }

    console.log('🔄 [Initial Load] Buscando dados atualizados da API...');
    loadRealChats(false, false).catch(err => {
      console.error('❌ [Initial Load] Erro ao carregar conversas:', err);
    });

    // 🔄 Conversas - 180s (3 minutos) - Reduzido para evitar sobrecarga
    // O usuário pode clicar em "Atualizar" se precisar de instantaneidade
    conversationTimer = setInterval(() => {
      if (isPageVisible()) {
        console.log('🔄 [Polling] Verificando conversas (180s)...');
        loadRealChats(true, true).catch(err => {
          console.error('❌ [Polling] Erro ao atualizar conversas:', err);
        });
      }
    }, 180000); // 3 minutos

    // 💬 Mensagens do chat ativo - 15s
    // Aumentado para evitar ERR_INSUFFICIENT_RESOURCES
    if (activeConversationId) {
      messageTimer = setInterval(() => {
        if (isPageVisible() && activeConversationId) {
          // console.log('💬 [Polling] Atualizando mensagens (15s)');
          // ✅ FIX RACE CONDITION: Capture current chat ID and validate before setting state
          const currentChatId = activeConversationId;
          loadRealMessages(currentChatId, true, 50)
            .then((freshMessages) => {
              if (currentChatId === activeConversationId) {
                // Only update if there are new messages or changes to avoid re-renders
                setMessages(prev => {
                  if (prev.length !== freshMessages.length) return freshMessages;
                  // Simple check for last message change
                  const lastPrev = prev[prev.length - 1];
                  const lastFresh = freshMessages[freshMessages.length - 1];
                  if (lastPrev?.id !== lastFresh?.id) return freshMessages;
                  return prev;
                });
              }
            })
            .catch(err => {
              console.error('❌ [Polling] Erro ao atualizar mensagens:', err);
            });
        }
      }, 15000); // 15 segundos
    }

    // 🏷️ Leads - 60s
    loadLeads(); // Carregar imediatamente
    leadsTimer = setInterval(() => {
      if (isPageVisible()) {
        // console.log('🏷️ [Polling] Atualizando leads (60s)');
        loadLeads();
      }
    }, 60000); // 60 segundos

    // 👁️ Detectar quando a aba fica visível/oculta
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Aba oculta - pausando polling');
      } else {
        console.log('👁️ Aba visível - retomando polling e atualizando dados...');
        loadRealChats(true, true).catch(err => console.error('Erro ao atualizar conversas:', err));
        if (activeConversationId) {
          // ✅ FIX RACE CONDITION: Validate conversation ID before setting state
          const currentChatId = activeConversationId;
          loadRealMessages(currentChatId, true, 50)
            .then((freshMessages) => {
              if (currentChatId === activeConversationId) {
                setMessages(freshMessages);
              } else {
                console.log('⏭️ [Visibility] Ignoring stale message response');
              }
            })
            .catch(err => console.error('Erro ao atualizar mensagens:', err));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (conversationTimer) clearInterval(conversationTimer);
      if (messageTimer) clearInterval(messageTimer);
      if (leadsTimer) clearInterval(leadsTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('🧹 [Polling] Limpeza concluída');
    };
  }, [useRealData, activeConversationId]);

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
          // ✅ FIX RACE CONDITION: Validate conversation ID before setting state
          const currentChatId = activeConversationId;
          loadRealMessages(currentChatId, false, 50)
            .then((freshMessages) => {
              if (currentChatId === activeConversationId) {
                setMessages(freshMessages);
              }
            })
            .catch(err => console.error('Erro ao recarregar mensagens:', err));
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
          // ✅ FIX RACE CONDITION: Validate conversation ID before setting state
          const currentChatId = activeConversationId;
          loadRealMessages(currentChatId, false, 50)
            .then((freshMessages) => {
              if (currentChatId === activeConversationId) {
                setMessages(freshMessages);
              }
            })
            .catch(err => console.error('Erro ao recarregar mensagens:', err));
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

  const handleLogout = async () => {
    try {
      console.log('🚪 Logout solicitado pelo usuário');
      toast.loading('Desconectando WhatsApp...', { id: 'logout-toast' });

      await evolutionApi.logout();

      toast.dismiss('logout-toast');
      toast.success('WhatsApp desconectado com sucesso!');

      // Limpar estados locais
      setConversations([]);
      setMessages([]);
      setContactsMap({});
      setUseRealData(false);
      setConnectionState({ connected: false, state: 'close' });

      // Forçar atualização do QR Code
      setQrCode(null);
      fetchQRCode();

    } catch (error) {
      console.error('❌ Erro ao desconectar:', error);
      toast.dismiss('logout-toast');
      toast.error('Erro ao desconectar WhatsApp');
    }
  };

  const fetchQRCode = async () => {
    setLoadingQr(true);
    setQrCode(null);

    try {
      // Usar endpoint do backend que já tem a correção de normalização
      const response = await fetch('/api/evolution/qrcode');
      const data = await response.json();

      if (data.success) {
        if (data.alreadyConnected) {
          // toast.success("WhatsApp já está conectado!"); // Removido para mostrar overlay
          checkConnection(); // Atualizar status
          // Se já estiver conectado, manter o overlay aberto para opção de desconectar
        } else {
          setQrCode(data.qrcode);
          // toast.success("QR Code gerado com sucesso!");
        }
      } else {
        toast.error(data.error || 'Erro ao obter QR code');
      }
    } catch (err) {
      toast.error('Erro ao conectar com a API');
    } finally {
      setLoadingQr(false);
    }
  };

  const [showQrCodeOverlay, setShowQrCodeOverlay] = useState(false);

  // ... (previous code)

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <Header
        onRefreshAll={() => loadRealChats(true)}
        onRefreshLabels={refreshLabelsOnly}
        onConnect={() => {
          setShowQrCodeOverlay(true);
          fetchQRCode(); // Já busca o QR Code ao abrir
        }}
        isRefreshing={isLoadingChats}
        connectionState={connectionState}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay de Desconexão / QR Code */}
        {/* 🔥 CORREÇÃO: Só mostrar overlay se NÃO tiver conversas carregadas OU se for manual */}
        {useRealData && ((connectionState && !connectionState.connected && conversations.length === 0) || showQrCodeOverlay) && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white p-6">
            {/* Botão Fechar Overlay (Apenas se for manual ou se estiver conectado mas quiser ver) */}
            {showQrCodeOverlay && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/10"
                onClick={() => setShowQrCodeOverlay(false)}
              >
                <X className="w-6 h-6" />
              </Button>
            )}

            <div className="max-w-md w-full flex flex-col items-center gap-8 animate-fade-in">
              {/* ÁREA CENTRAL DO OVERLAY - MUDA CONFORME STATUS */}
              {connectionState?.connected ? (
                // 🟢 MODELO DE CONECTADO (COM OPÇÃO DE LOGOUT)
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="p-6 rounded-full bg-green-500/10 border border-green-500/20 shadow-xl shadow-green-900/20">
                    <div className="p-4 bg-green-500 rounded-full animate-pulse-slow">
                      <Check className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-white">WhatsApp Conectado</h2>
                    <p className="text-zinc-400 text-lg">
                      Sua instância <span className="text-green-400 font-mono font-bold">{(configManager.getConfig() as any)?.instance || '...'}</span> está ativa e sincronizando mensagens.
                    </p>
                  </div>

                  <div className="flex gap-4 mt-4 w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white h-12"
                      onClick={() => setShowQrCodeOverlay(false)}
                    >
                      Fechar
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 h-12"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                </div>
              ) : (
                // ⚫ MODELO DE DESCONECTADO (QR CODE)
                <>
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto border border-green-500/20">
                      <QrCode className="w-12 h-12 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Conecte seu WhatsApp</h2>
                      <p className="text-zinc-400 text-lg mt-2">
                        Escaneie o código abaixo para acessar suas conversas
                      </p>
                    </div>
                  </div>

                  <div className="relative group">
                    {qrCode ? (
                      <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-green-500/20 transition-all duration-300 hover:scale-[1.02]">
                        <img
                          src={qrCode.base64}
                          alt="QR Code WhatsApp"
                          className="w-72 h-72 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-80 h-80 rounded-3xl bg-zinc-900 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-4">
                        {loadingQr ? (
                          <RefreshCw className="w-10 h-10 text-green-500 animate-spin" />
                        ) : (
                          <div className="text-center p-6">
                            <QrCode className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm">QR Code não gerado</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bordas decorativas do scanner */}
                    <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-xl opacity-50" />
                    <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-xl opacity-50" />
                    <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-xl opacity-50" />
                    <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-xl opacity-50" />
                  </div>

                  <div className="flex flex-col gap-4 w-full max-w-xs">
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-12 rounded-xl text-lg shadow-lg shadow-green-900/20"
                      onClick={fetchQRCode}
                      disabled={loadingQr}
                    >
                      {loadingQr ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-5 h-5 mr-2" />
                          Gerar QR Code
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-3 justify-center text-sm text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Instância: <span className="text-zinc-300 font-mono">{(configManager.getConfig() as any)?.instance || '...'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center max-w-sm">
                    <p className="text-zinc-500 text-sm">
                      1. Abra o WhatsApp no seu celular<br />
                      2. Toque em Menu (⋮) ou Configurações<br />
                      3. Selecione <b>Aparelhos Conectados</b><br />
                      4. Toque em <b>Conectar um aparelho</b>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
