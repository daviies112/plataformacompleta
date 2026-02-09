interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    audioMessage?: {
      url: string;
      seconds: number;
      ptt: boolean;
      mimetype: string;
    };
    imageMessage?: {
      url: string;
      caption?: string;
      mimetype: string;
      width?: number;
      height?: number;
    };
    videoMessage?: {
      url: string;
      caption?: string;
      mimetype: string;
      seconds?: number;
    };
    documentMessage?: {
      url: string;
      fileName: string;
      mimetype: string;
      fileLength?: string;
      caption?: string;
    };
  };
  messageTimestamp: number;
  pushName?: string;
}

interface ProcessedMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: "user" | "contact";
  mediaType: "text" | "audio" | "image" | "video" | "document";
  mediaUrl?: string;
  caption?: string;
  duration?: number;
  fileName?: string;
  fileSize?: number;
}

/**
 * Processa uma mensagem recebida da Evolution API
 */
export function processEvolutionMessage(msg: EvolutionMessage): ProcessedMessage {
  const baseMessage: ProcessedMessage = {
    id: msg.key.id,
    timestamp: new Date(msg.messageTimestamp * 1000),
    sender: (msg.key.fromMe ? "user" : "contact") as "user" | "contact",
    content: "",
    mediaType: "text" as const,
  };

  // Processar mensagem de texto
  if (msg.message?.conversation) {
    return {
      ...baseMessage,
      content: msg.message.conversation,
      mediaType: "text" as const,
    };
  }

  // Processar mensagem de texto estendida
  if (msg.message?.extendedTextMessage?.text) {
    return {
      ...baseMessage,
      content: msg.message.extendedTextMessage.text,
      mediaType: "text" as const,
    };
  }

  // Processar áudio
  if (msg.message?.audioMessage) {
    const audio = msg.message.audioMessage;
    return {
      ...baseMessage,
      content: audio.ptt ? "🎤 Mensagem de voz" : "🎵 Áudio",
      mediaType: "audio" as const,
      mediaUrl: audio.url,
      duration: audio.seconds,
    };
  }

  // Processar imagem
  if (msg.message?.imageMessage) {
    const image = msg.message.imageMessage;
    return {
      ...baseMessage,
      content: image.caption || "📷 Imagem",
      mediaType: "image" as const,
      mediaUrl: image.url,
      caption: image.caption,
    };
  }

  // Processar vídeo
  if (msg.message?.videoMessage) {
    const video = msg.message.videoMessage;
    return {
      ...baseMessage,
      content: video.caption || "🎥 Vídeo",
      mediaType: "video" as const,
      mediaUrl: video.url,
      caption: video.caption,
      duration: video.seconds,
    };
  }

  // Processar documento
  if (msg.message?.documentMessage) {
    const doc = msg.message.documentMessage;
    return {
      ...baseMessage,
      content: doc.caption || `📄 ${doc.fileName}`,
      mediaType: "document" as const,
      mediaUrl: doc.url,
      caption: doc.caption,
      fileName: doc.fileName,
      fileSize: doc.fileLength ? parseInt(doc.fileLength) : undefined,
    };
  }

  // Mensagem não suportada
  return {
    ...baseMessage,
    content: "Mensagem não suportada",
    mediaType: "text" as const,
  };
}

/**
 * Processa múltiplas mensagens da Evolution API
 */
export function processEvolutionMessages(messages: EvolutionMessage[]): ProcessedMessage[] {
  return messages.map(processEvolutionMessage);
}

/**
 * Detecta o tipo de mídia de uma mensagem
 */
export function detectMediaType(msg: EvolutionMessage): "text" | "audio" | "image" | "video" | "document" {
  if (msg.message?.audioMessage) return "audio";
  if (msg.message?.imageMessage) return "image";
  if (msg.message?.videoMessage) return "video";
  if (msg.message?.documentMessage) return "document";
  return "text";
}
