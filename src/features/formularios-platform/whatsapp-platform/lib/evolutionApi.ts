import { apiRequest, USER_ID_WHATSAPP } from './apiClient';

export interface EvolutionChat {
  id: string;
  remoteJid: string;
  name?: string;
  pushName?: string;
  unreadCount: number;
  lastMessageTimestamp?: number;
  lastMessage?: {
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    pushName?: string;
  };
}

export interface EvolutionContact {
  id: string;
  remoteJid?: string;
  pushName?: string;
  name?: string;
  notify?: string;
  verifiedName?: string;
}

export interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
      base64?: string;
    };
    imageMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
      base64?: string;
    };
    videoMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
      base64?: string;
    };
    documentMessage?: {
      url?: string;
      caption?: string;
      fileName?: string;
      mimetype?: string;
      base64?: string;
    };
    base64?: string;
  };
  messageTimestamp?: number;
  pushName?: string;
}

export const evolutionApi = {
  // Verificar estado da conexão
  checkConnectionState: async (): Promise<{ connected: boolean; state: string }> => {
    try {
      const response = await apiRequest('/api/evolution/proxy', {
        method: 'POST',
        body: JSON.stringify({
          userId: USER_ID_WHATSAPP,
          method: 'GET',
          endpoint: undefined,
        }),
      });

      if (!response?.success) {
        return { connected: false, state: 'error' };
      }

      const state = response.data?.instance?.state || 'unknown';
      return { 
        connected: state === 'open', 
        state 
      };
    } catch (error) {
      console.error('Error checking connection state:', error);
      return { connected: false, state: 'not_configured' };
    }
  },

  // Buscar todos os chats
  fetchChats: async (): Promise<EvolutionChat[]> => {
    console.log('Fetching chats from Evolution API...');

    const response = await apiRequest('/api/evolution/chats', {
      method: 'POST',
      body: JSON.stringify({ userId: USER_ID_WHATSAPP }),
    });

    if (!response?.success) {
      console.error('Failed to fetch chats:', response);
      throw new Error(response?.error || 'Erro ao buscar conversas');
    }

    console.log('Chats fetched successfully:', response.chats);
    return response.chats || [];
  },

  // Buscar mensagens de um chat específico
  fetchMessages: async (chatId: string): Promise<EvolutionMessage[]> => {
    console.log('Fetching messages for chat:', chatId);

    const response = await apiRequest('/api/evolution/messages', {
      method: 'POST',
      body: JSON.stringify({ 
        userId: USER_ID_WHATSAPP,
        chatId: chatId 
      }),
    });

    if (!response?.success) {
      console.error('Failed to fetch messages:', response);
      throw new Error(response?.error || 'Erro ao buscar mensagens');
    }

    console.log('Messages fetched successfully:', response.messages);
    return response.messages || [];
  },

  // Enviar mensagem
  sendMessage: async (number: string, text: string): Promise<boolean> => {
    // Verificar estado da conexão ANTES de enviar
    console.log('Checking connection state before sending...');
    const connectionState = await evolutionApi.checkConnectionState();
    
    if (!connectionState.connected) {
      console.error('❌ Cannot send message - WhatsApp is not connected');
      console.error('Current state:', connectionState.state);
      throw new Error(`WhatsApp não está conectado. Estado atual: ${connectionState.state}`);
    }

    console.log('Sending message to:', number);

    const response = await apiRequest('/api/evolution/send-message', {
      method: 'POST',
      body: JSON.stringify({
        userId: USER_ID_WHATSAPP,
        number,
        text,
      }),
    });

    if (!response?.success) {
      console.error('Failed to send message:', response);
      throw new Error(response?.error || 'Erro ao enviar mensagem');
    }

    console.log('Message sent successfully');
    return true;
  },

  // Buscar contatos
  fetchContacts: async (): Promise<EvolutionContact[]> => {
    console.log('Fetching contacts from Evolution API...');

    const response = await apiRequest('/api/evolution/contacts', {
      method: 'POST',
      body: JSON.stringify({ userId: USER_ID_WHATSAPP }),
    });

    if (!response?.success) {
      console.error('Failed to fetch contacts:', response);
      throw new Error(response?.error || 'Erro ao buscar contatos');
    }

    console.log('Contacts fetched successfully:', response.contacts);
    return response.contacts || [];
  },

  // Enviar mídia (imagem, vídeo, documento)
  sendMedia: async (
    number: string,
    mediatype: 'image' | 'video' | 'document',
    mimetype: string,
    media: string,
    caption?: string,
    fileName?: string
  ): Promise<boolean> => {
    console.log('Sending media to:', number, 'type:', mediatype);

    const response = await apiRequest('/api/evolution/send-media', {
      method: 'POST',
      body: JSON.stringify({
        userId: USER_ID_WHATSAPP,
        number,
        mediatype,
        mimetype,
        media,
        caption,
        fileName,
      }),
    });

    if (!response?.success) {
      console.error('Failed to send media:', response);
      throw new Error(response?.error || 'Erro ao enviar mídia');
    }

    console.log('Media sent successfully');
    return true;
  },

  // Enviar áudio
  sendAudio: async (number: string, audioBase64: string): Promise<boolean> => {
    console.log('Sending audio to:', number);

    const response = await apiRequest('/api/evolution/send-audio', {
      method: 'POST',
      body: JSON.stringify({
        userId: USER_ID_WHATSAPP,
        number,
        audioBase64,
      }),
    });

    if (!response?.success) {
      console.error('Failed to send audio:', response);
      throw new Error(response?.error || 'Erro ao enviar áudio');
    }

    console.log('Audio sent successfully');
    return true;
  },
};
