import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============= DATE UTILITIES =============

export function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return diffMins <= 1 ? 'agora' : `há ${diffMins} min`;
  }

  if (diffHours < 24) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (diffDays === 1) {
    return 'ontem';
  }
  
  if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFullDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============= STORAGE UTILITIES =============

interface Message {
  id: string;
  texto: string;
  tipo: "recebida" | "enviada";
  enviadaPor: "cliente" | "ia" | "atendente";
  timestamp: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  numero: string;
  nome: string;
  ultimaMensagem: string;
  timestamp: string;
  naoLidas: number;
}

const STORAGE_KEYS = {
  MESSAGES: 'whatsapp_messages',
  CONVERSATIONS: 'whatsapp_conversations',
  CUSTOM_NAMES: 'whatsapp_custom_names',
};

export const storage = {
  getConversations: (): Conversation[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },

  setConversations: (conversations: Conversation[]) => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  updateConversation: (conversationId: string, updates: Partial<Conversation>) => {
    const conversations = storage.getConversations();
    const index = conversations.findIndex(c => c.id === conversationId);
    if (index !== -1) {
      conversations[index] = { ...conversations[index], ...updates };
      storage.setConversations(conversations);
    }
  },

  getMessages: (conversationId: string): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const allMessages: Message[] = data ? JSON.parse(data) : [];
    return allMessages.filter(m => m.conversationId === conversationId);
  },

  getAllMessages: (): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  addMessage: (message: Message) => {
    const messages = storage.getAllMessages();
    messages.push(message);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  },
};

// ============= CUSTOM NAMES UTILITIES =============

export const customNamesStorage = {
  // Obter nome customizado de um contato
  getCustomName: (contactId: string): string | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_NAMES);
    const customNames: Record<string, string> = data ? JSON.parse(data) : {};
    return customNames[contactId] || null;
  },

  // Salvar nome customizado para um contato
  setCustomName: (contactId: string, name: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_NAMES);
    const customNames: Record<string, string> = data ? JSON.parse(data) : {};
    customNames[contactId] = name;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_NAMES, JSON.stringify(customNames));
  },

  // Remover nome customizado de um contato
  removeCustomName: (contactId: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_NAMES);
    const customNames: Record<string, string> = data ? JSON.parse(data) : {};
    delete customNames[contactId];
    localStorage.setItem(STORAGE_KEYS.CUSTOM_NAMES, JSON.stringify(customNames));
  },

  // Obter todos os nomes customizados
  getAllCustomNames: (): Record<string, string> => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_NAMES);
    return data ? JSON.parse(data) : {};
  },
};

// ============= MOCK DATA =============

export const initialConversations = [
  {
    id: "5531991335259@s.whatsapp.net",
    numero: "+55 31 99133-5259",
    nome: "Clara luisa Costa Viana",
    ultimaMensagem: "Completei o formulário! Quando terei retorno?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    naoLidas: 2,
    formStatus: "completed", // Vai ser atualizado automaticamente pelo sistema
    qualificationStatus: "rejected",
    pontuacao: 5,
  },
  {
    id: "5531999972368@s.whatsapp.net",
    numero: "+55 31 99997-2368",
    nome: "Gabriel Emerick",
    ultimaMensagem: "Já respondi todas as perguntas do formulário",
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    naoLidas: 0,
    formStatus: "completed", // Vai ser atualizado automaticamente pelo sistema
    qualificationStatus: "rejected",
    pontuacao: 0,
  },
  {
    id: "5531992233456@s.whatsapp.net",
    numero: "+55 31 99223-3456",
    nome: "Teste",
    ultimaMensagem: "Formulário enviado com sucesso",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    naoLidas: 1,
    formStatus: "completed", // Vai ser atualizado automaticamente pelo sistema
    qualificationStatus: "rejected",
    pontuacao: 0,
  },
  {
    id: "4",
    numero: "+55 31 96666-6666",
    nome: "Carlos Eduardo",
    ultimaMensagem: "Perfeito, vou aguardar",
    timestamp: new Date(Date.now() - 1000 * 60 * 195).toISOString(),
    naoLidas: 0,
    formStatus: "not_sent", // Não fez formulário - vai mostrar etiqueta vermelha personalizada
  },
  {
    id: "5",
    numero: "+55 31 95555-5555",
    nome: "Ana Beatriz",
    ultimaMensagem: "Gostaria de fazer uma reclamação",
    timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
    naoLidas: 3,
    formStatus: "completed",
    qualificationStatus: "rejected", // Reprovado - vai mostrar etiqueta vermelha escura personalizada
    pontuacao: 35,
  },
];

export const initialMessages = [
  {
    id: "1-1",
    conversationId: "5531991335259@s.whatsapp.net",
    texto: "Completei o formulário! Quando terei retorno?",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "1-2",
    conversationId: "5531991335259@s.whatsapp.net",
    texto: "Olá Clara! Obrigado por completar o formulário. Vamos analisar e retornar em breve!",
    tipo: "enviada" as const,
    enviadaPor: "ia" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
  },
  {
    id: "1-3",
    conversationId: "5531991335259@s.whatsapp.net",
    texto: "Qual foi minha pontuação?",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
  },
  {
    id: "1-4",
    conversationId: "5531991335259@s.whatsapp.net",
    texto: "Você obteve 5 pontos no formulário. Nossa equipe está analisando sua candidatura.",
    tipo: "enviada" as const,
    enviadaPor: "atendente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "2-1",
    conversationId: "5531999972368@s.whatsapp.net",
    texto: "Boa tarde, sou Gabriel",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  {
    id: "2-2",
    conversationId: "5531999972368@s.whatsapp.net",
    texto: "Olá Gabriel! Bem-vindo. Como posso ajudar?",
    tipo: "enviada" as const,
    enviadaPor: "ia" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 77).toISOString(),
  },
  {
    id: "2-3",
    conversationId: "5531999972368@s.whatsapp.net",
    texto: "Já respondi todas as perguntas do formulário",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 76).toISOString(),
  },
  {
    id: "2-4",
    conversationId: "5531999972368@s.whatsapp.net",
    texto: "Muito bem! Formulário recebido com sucesso.",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
  {
    id: "3-1",
    conversationId: "5531992233456@s.whatsapp.net",
    texto: "Formulário enviado com sucesso",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: "4-1",
    conversationId: "4",
    texto: "Preciso atualizar meu cadastro",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 205).toISOString(),
  },
  {
    id: "4-2",
    conversationId: "4",
    texto: "Claro! Vou te ajudar com isso. Qual informação você precisa atualizar?",
    tipo: "enviada" as const,
    enviadaPor: "ia" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 202).toISOString(),
  },
  {
    id: "4-3",
    conversationId: "4",
    texto: "Meu telefone mudou",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 196).toISOString(),
  },
  {
    id: "4-4",
    conversationId: "4",
    texto: "Perfeito, vou aguardar",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 195).toISOString(),
  },
  {
    id: "5-1",
    conversationId: "5",
    texto: "Gostaria de fazer uma reclamação",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 274).toISOString(),
  },
  {
    id: "5-2",
    conversationId: "5",
    texto: "Sinto muito pelo inconveniente. Pode me contar o que aconteceu?",
    tipo: "enviada" as const,
    enviadaPor: "ia" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 271).toISOString(),
  },
  {
    id: "5-3",
    conversationId: "5",
    texto: "O produto veio com defeito",
    tipo: "recebida" as const,
    enviadaPor: "cliente" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
  },
];
