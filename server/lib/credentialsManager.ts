import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Arquivo para persistir credenciais
const CREDENTIALS_FILE = path.join(process.cwd(), 'data', 'credentials.json');

// Armazenamento em memória para credenciais com persistência em arquivo
// Estrutura: { clientId: { integrationType: encryptedCredentials } }
export const credentialsStorage = new Map<string, Map<string, string>>();

// Função para garantir que o diretório data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(CREDENTIALS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Função para carregar credenciais do arquivo
function loadCredentialsFromFile() {
  try {
    ensureDataDirectory();
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Recarregar os dados no Map
      credentialsStorage.clear();
      for (const [clientId, integrations] of Object.entries(jsonData)) {
        const clientMap = new Map<string, string>();
        for (const [integrationType, encryptedData] of Object.entries(integrations as Record<string, string>)) {
          clientMap.set(integrationType, encryptedData);
        }
        credentialsStorage.set(clientId, clientMap);
      }
      console.log('Credenciais carregadas do arquivo com sucesso');
    }
  } catch (error) {
    console.error('Erro ao carregar credenciais do arquivo:', error);
  }
}

// Função para salvar credenciais no arquivo
export function saveCredentialsToFile(): boolean {
  try {
    ensureDataDirectory();
    
    // Converter Map para objeto JSON
    const jsonData: Record<string, Record<string, string>> = {};
    for (const [clientId, integrations] of credentialsStorage.entries()) {
      jsonData[clientId] = {};
      for (const [integrationType, encryptedData] of integrations.entries()) {
        jsonData[clientId][integrationType] = encryptedData;
      }
    }
    
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('Credenciais salvas no arquivo com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao salvar credenciais no arquivo:', error);
    return false;
  }
}

// Lazy load credentials - only load when needed to avoid circular dependency issues
let credentialsLoaded = false;
let isLoading = false; // Prevent re-entry

// Auto-load on first access to ensure backward compatibility
function autoLoadCredentials() {
  if (!credentialsLoaded && !isLoading) {
    isLoading = true;
    loadCredentialsFromFile();
    credentialsLoaded = true;
    isLoading = false;
  }
}

// Export for explicit initialization (e.g., in server startup)
export function ensureCredentialsLoaded() {
  autoLoadCredentials();
}

// Wrap storage access to auto-load on first use
const originalGet = credentialsStorage.get.bind(credentialsStorage);
const originalSet = credentialsStorage.set.bind(credentialsStorage);
const originalHas = credentialsStorage.has.bind(credentialsStorage);

credentialsStorage.get = function(key: string) {
  if (!credentialsLoaded && !isLoading) {
    autoLoadCredentials();
  }
  return originalGet(key);
};

credentialsStorage.set = function(key: string, value: Map<string, string>) {
  if (!credentialsLoaded && !isLoading) {
    autoLoadCredentials();
  }
  return originalSet(key, value);
};

credentialsStorage.has = function(key: string) {
  if (!credentialsLoaded && !isLoading) {
    autoLoadCredentials();
  }
  return originalHas(key);
};

// Chave de criptografia - deve ser 32 bytes
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.CREDENTIALS_ENCRYPTION_KEY_BASE64;
  
  if (!keyBase64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY_BASE64 é obrigatória em produção. Gere uma chave com: openssl rand -base64 32');
    }
    // Apenas para desenvolvimento
    console.warn('AVISO: Usando chave padrão para desenvolvimento. NÃO USE EM PRODUÇÃO!');
    return Buffer.from('dev-key-only-32-bytes-long-12345', 'utf8').subarray(0, 32);
  }
  
  try {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error(`Chave de criptografia deve ter 32 bytes, mas tem ${key.length}. Gere uma nova com: openssl rand -base64 32`);
    }
    return key;
  } catch (error) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY_BASE64 deve ser uma chave base64 válida de 32 bytes. Gere com: openssl rand -base64 32');
  }
}

const ENCRYPTION_KEY = getEncryptionKey();

// Funções de criptografia segura com AES-256-GCM
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Retorna: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de dados criptografados inválido');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Função para obter credenciais de um cliente
export function getClientCredentials(clientId: string, integrationType: string): any | null {
  try {
    const clientCredentials = credentialsStorage.get(clientId);
    if (!clientCredentials || !clientCredentials.has(integrationType)) {
      return null;
    }

    const encryptedCredentials = clientCredentials.get(integrationType)!;
    const decryptedCredentials = JSON.parse(decrypt(encryptedCredentials));
    return decryptedCredentials;
  } catch (error) {
    console.error(`Erro ao recuperar credenciais ${integrationType} para cliente ${clientId}:`, error);
    return null;
  }
}

// Função para obter credenciais do Supabase de um cliente
export function getSupabaseCredentials(clientId: string): { url: string; anonKey: string } | null {
  const credentials = getClientCredentials(clientId, 'supabase');
  if (credentials && credentials.url && credentials.anon_key) {
    return {
      url: credentials.url,
      anonKey: credentials.anon_key
    };
  }
  return null;
}

// Função para obter credenciais do WhatsApp de um cliente
export function getWhatsAppCredentials(clientId: string): { phoneNumber: string; apiKey: string; instanceId: string } | null {
  const credentials = getClientCredentials(clientId, 'whatsapp');
  if (credentials && credentials.phone_number && credentials.api_key) {
    return {
      phoneNumber: credentials.phone_number,
      apiKey: credentials.api_key,
      instanceId: credentials.instance_id || ''
    };
  }
  return null;
}

// Função para obter credenciais do Pluggy de um cliente
export function getPluggyCredentials(clientId: string): { clientId: string; clientSecret: string } | null {
  const credentials = getClientCredentials(clientId, 'pluggy');
  if (credentials && credentials.client_id && credentials.client_secret) {
    return {
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret
    };
  }
  return null;
}

// Função para salvar credenciais de um cliente
export function saveClientCredentials(clientId: string, integrationType: string, credentials: any): boolean {
  try {
    // Verifica se clientId já tem um Map, senão cria um novo
    let clientCredentials = credentialsStorage.get(clientId);
    if (!clientCredentials) {
      clientCredentials = new Map<string, string>();
      credentialsStorage.set(clientId, clientCredentials);
    }

    // Criptografa e salva as credenciais
    const encryptedCredentials = encrypt(JSON.stringify(credentials));
    clientCredentials.set(integrationType, encryptedCredentials);

    // Persiste no arquivo
    const saved = saveCredentialsToFile();
    
    if (saved) {
      console.log(`✅ Credenciais ${integrationType} salvas para cliente ${clientId}`);
    } else {
      console.error(`❌ Erro ao persistir credenciais ${integrationType} para cliente ${clientId}`);
    }
    
    return saved;
  } catch (error) {
    console.error(`❌ Erro ao salvar credenciais ${integrationType} para cliente ${clientId}:`, error);
    return false;
  }
}

// Função para verificar se um cliente tem determinadas credenciais configuradas
export function hasCredentials(clientId: string, integrationType: string): boolean {
  const clientCredentials = credentialsStorage.get(clientId);
  return clientCredentials?.has(integrationType) || false;
}