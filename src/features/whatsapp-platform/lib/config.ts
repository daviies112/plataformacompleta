import { apiRequest, USER_ID_WHATSAPP } from './apiClient';

export interface EvolutionConfigWhatsapp {
  apiUrlWhatsapp: string;
  apiKeyWhatsapp: string;
  instanceWhatsapp: string;
}

export interface WhatsAppTag {
  id: string;
  name: string;
  color: string;
}

const CONFIG_KEY_WHATSAPP = 'evolution_config_whatsapp';
const TAGS_KEY_WHATSAPP = 'whatsapp_tags';
const CONVERSATION_TAGS_KEY = 'whatsapp_conversation_tags';
const LEGACY_CONFIG_KEY = 'evolution_config';  // For migration

const DEFAULT_TAGS: WhatsAppTag[] = [
  { id: '1', name: 'Não fez formulário', color: 'hsl(0, 70%, 50%)' },
  { id: '2', name: 'Aguardando resposta', color: 'hsl(45, 90%, 55%)' },
  { id: '3', name: 'Aprovado', color: 'hsl(142, 71%, 45%)' },
  { id: '4', name: 'Reprovado', color: 'hsl(0, 84%, 60%)' },
  { id: '5', name: 'Em análise', color: 'hsl(210, 100%, 50%)' },
];

// Migrate legacy config to new format
function migrateLegacyConfig(): void {
  const legacyData = localStorage.getItem(LEGACY_CONFIG_KEY);
  if (legacyData && !localStorage.getItem(CONFIG_KEY_WHATSAPP)) {
    try {
      const legacy = JSON.parse(legacyData);
      const migrated: EvolutionConfigWhatsapp = {
        apiUrlWhatsapp: legacy.apiUrl || legacy.apiUrlWhatsapp || '',
        apiKeyWhatsapp: legacy.apiKey || legacy.apiKeyWhatsapp || '',
        instanceWhatsapp: legacy.instance || legacy.instanceWhatsapp || '',
      };
      localStorage.setItem(CONFIG_KEY_WHATSAPP, JSON.stringify(migrated));
      console.log('✅ Migrated legacy WhatsApp config to new format');
    } catch (error) {
      console.error('Failed to migrate legacy config:', error);
    }
  }
}

export const configManager = {
  // Obter configuração do localStorage (para exibição)
  getConfig: (): EvolutionConfigWhatsapp | null => {
    // Try migration first
    migrateLegacyConfig();
    
    const data = localStorage.getItem(CONFIG_KEY_WHATSAPP);
    return data ? JSON.parse(data) : null;
  },

  // Salvar configuração (localStorage + backend)
  setConfig: async (config: EvolutionConfigWhatsapp): Promise<void> => {
    // Salvar no localStorage para que a UI possa exibir
    localStorage.setItem(CONFIG_KEY_WHATSAPP, JSON.stringify(config));
    
    // Salvar no backend (onde as credenciais serão realmente usadas)
    try {
      await apiRequest('/api/config', {
        method: 'POST',
        body: JSON.stringify({
          userIdWhatsapp: USER_ID_WHATSAPP,
          apiUrlWhatsapp: config.apiUrlWhatsapp,
          apiKeyWhatsapp: config.apiKeyWhatsapp,
          instanceWhatsapp: config.instanceWhatsapp,
        }),
      });
    } catch (error) {
      console.error('Error saving config to backend:', error);
      // Continuar mesmo se o backend falhar, pois o localStorage já está salvo
    }
  },

  // Verificar se está configurado
  isConfigured: (): boolean => {
    const config = configManager.getConfig();
    return !!(config?.apiUrlWhatsapp && config?.apiKeyWhatsapp && config?.instanceWhatsapp);
  },

  // Limpar configuração
  clearConfig: (): void => {
    localStorage.removeItem(CONFIG_KEY_WHATSAPP);
    localStorage.removeItem(LEGACY_CONFIG_KEY);  // Also remove legacy
  },

  // === TAG MANAGEMENT ===
  
  // Obter etiquetas (retorna padrão se não existir)
  getTags: (): WhatsAppTag[] => {
    const data = localStorage.getItem(TAGS_KEY_WHATSAPP);
    if (!data) {
      // Inicializar com tags padrão (retorna cópia para evitar mutação)
      const defaultCopy = JSON.parse(JSON.stringify(DEFAULT_TAGS));
      localStorage.setItem(TAGS_KEY_WHATSAPP, JSON.stringify(defaultCopy));
      return defaultCopy;
    }
    return JSON.parse(data);
  },

  // Salvar todas as etiquetas
  setTags: (tags: WhatsAppTag[]): void => {
    localStorage.setItem(TAGS_KEY_WHATSAPP, JSON.stringify(tags));
  },

  // Adicionar nova etiqueta
  addTag: (name: string, color: string): WhatsAppTag => {
    const tags = configManager.getTags();
    const newTag: WhatsAppTag = {
      id: Date.now().toString(),
      name,
      color,
    };
    tags.push(newTag);
    configManager.setTags(tags);
    return newTag;
  },

  // Atualizar etiqueta existente
  updateTag: (id: string, name: string, color: string): void => {
    const tags = configManager.getTags();
    const index = tags.findIndex(tag => tag.id === id);
    if (index !== -1) {
      tags[index] = { id, name, color };
      configManager.setTags(tags);
    }
  },

  // Deletar etiqueta
  deleteTag: (id: string): void => {
    const tags = configManager.getTags();
    const filtered = tags.filter(tag => tag.id !== id);
    configManager.setTags(filtered);
  },

  // Resetar para etiquetas padrão
  resetTags: (): void => {
    // Cria uma cópia profunda para evitar mutação do DEFAULT_TAGS
    const defaultCopy = JSON.parse(JSON.stringify(DEFAULT_TAGS));
    configManager.setTags(defaultCopy);
  },

  // === CONVERSATION TAGS MANAGEMENT ===
  
  // Obter tags de uma conversa específica
  getConversationTags: (conversationId: string): string[] => {
    const data = localStorage.getItem(CONVERSATION_TAGS_KEY);
    if (!data) return [];
    
    try {
      const allTags = JSON.parse(data);
      return allTags[conversationId] || [];
    } catch {
      return [];
    }
  },

  // Salvar tags de uma conversa
  setConversationTags: (conversationId: string, tagIds: string[]): void => {
    const data = localStorage.getItem(CONVERSATION_TAGS_KEY);
    let allTags: Record<string, string[]> = {};
    
    if (data) {
      try {
        allTags = JSON.parse(data);
      } catch {
        allTags = {};
      }
    }
    
    allTags[conversationId] = tagIds;
    localStorage.setItem(CONVERSATION_TAGS_KEY, JSON.stringify(allTags));
  },

  // Limpar tags de uma conversa
  clearConversationTags: (conversationId: string): void => {
    const data = localStorage.getItem(CONVERSATION_TAGS_KEY);
    if (!data) return;
    
    try {
      const allTags = JSON.parse(data);
      delete allTags[conversationId];
      localStorage.setItem(CONVERSATION_TAGS_KEY, JSON.stringify(allTags));
    } catch {
      // Ignore errors
    }
  },

  // Obter todas as tags de todas as conversas
  getAllConversationTags: (): Record<string, string[]> => {
    const data = localStorage.getItem(CONVERSATION_TAGS_KEY);
    if (!data) return {};
    
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  },

  // Testar conexão com a Evolution API
  testConnection: async (config: EvolutionConfigWhatsapp): Promise<{ 
    success: boolean; 
    connected: boolean; 
    state: string; 
    message: string 
  }> => {
    try {
      console.log('Testing connection with config:', {
        apiUrl: config.apiUrlWhatsapp,
        instance: config.instanceWhatsapp,
        hasApiKey: !!config.apiKeyWhatsapp
      });

      // Salvar a configuração no backend primeiro
      await configManager.setConfig(config);

      // Testar a conexão via backend
      const response = await apiRequest('/api/evolution/proxy', {
        method: 'POST',
        body: JSON.stringify({
          userId: USER_ID_WHATSAPP,
          method: 'GET',
          endpoint: undefined,
        }),
      });

      console.log('Evolution proxy response:', response);

      if (!response || !response.success) {
        console.error('Connection test failed:', {
          status: response?.status,
          data: response?.data,
        });
        
        // Erro 401 = API Key incorreta
        if (response?.status === 401) {
          console.error('❌ API KEY INCORRETA - A chave de autenticação não é válida');
          return {
            success: false,
            connected: false,
            state: 'unauthorized',
            message: '❌ API Key incorreta - Verifique suas credenciais'
          };
        }
        
        return {
          success: false,
          connected: false,
          state: 'error',
          message: 'Erro ao verificar conexão'
        };
      }

      // Verificar o estado da instância do WhatsApp
      const instanceState = response.data?.instance?.state || 'unknown';
      const isConnected = instanceState === 'open';

      console.log('✅ API accessible. WhatsApp state:', instanceState);
      
      if (isConnected) {
        return {
          success: true,
          connected: true,
          state: instanceState,
          message: '✅ Conexão estabelecida! WhatsApp conectado e pronto para enviar mensagens.'
        };
      } else {
        return {
          success: true,
          connected: false,
          state: instanceState,
          message: `⚠️ API configurada corretamente, mas WhatsApp está ${instanceState === 'close' ? 'DESCONECTADO' : instanceState}. Conecte no Evolution API Manager para enviar mensagens.`
        };
      }
    } catch (error) {
      console.error('Connection test error:', error);
      
      // A mensagem de erro já vem formatada pelo apiRequest
      const friendlyMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao testar conexão';
      
      return {
        success: false,
        connected: false,
        state: 'error',
        message: friendlyMessage
      };
    }
  },
};
