import { cache } from './cache';
import { fetchChats } from './evolutionApi';
import type { EvolutionConfig } from './credentialsManager';

interface ChatCacheMetadata {
  lastSync: string;
  version: number;
  refreshStatus: 'idle' | 'refreshing';
  chatCount: number;
  ttl: number;
}

interface CachedChatData {
  chats: any[];
  metadata: ChatCacheMetadata;
}

const CHAT_CACHE_TTL = 5 * 60; // 5 minutos (agressivo)
const LOCK_TTL = 30; // 30 segundos para lock

export class ChatCacheManager {
  private getCacheKey(clientId: string, tenantId: string): string {
    return `wa:chats:${clientId}:${tenantId}`;
  }

  private getMetaKey(clientId: string, tenantId: string): string {
    return `wa:chats:meta:${clientId}:${tenantId}`;
  }

  private getLockKey(clientId: string, tenantId: string): string {
    return `wa:chats:lock:${clientId}:${tenantId}`;
  }

  /**
   * Tenta adquirir lock para refresh (evita múltiplas atualizações simultâneas)
   */
  private async acquireLock(clientId: string, tenantId: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(clientId, tenantId);
      const acquired = await cache.trySetNx(lockKey, '1', LOCK_TTL);
      return acquired;
    } catch (error) {
      console.warn('⚠️ [ChatCache] Erro ao adquirir lock:', error);
      return false;
    }
  }

  /**
   * Libera lock de refresh
   */
  private async releaseLock(clientId: string, tenantId: string): Promise<void> {
    try {
      const lockKey = this.getLockKey(clientId, tenantId);
      await cache.del(lockKey);
    } catch (error) {
      console.warn('⚠️ [ChatCache] Erro ao liberar lock:', error);
    }
  }

  /**
   * Retorna chats do cache (se existir e não estiver expirado)
   * Retorna null se cache não existir ou estiver expirado
   */
  async getCachedChats(clientId: string, tenantId: string): Promise<CachedChatData | null> {
    try {
      const cacheKey = this.getCacheKey(clientId, tenantId);
      const metaKey = this.getMetaKey(clientId, tenantId);

      const [chatsData, metaData] = await Promise.all([
        cache.get(cacheKey),
        cache.get(metaKey),
      ]);

      if (!chatsData || !metaData) {
        console.log(`📭 [ChatCache] Cache vazio para cliente ${clientId} tenant ${tenantId}`);
        return null;
      }

      const chats = JSON.parse(chatsData);
      const metadata: ChatCacheMetadata = JSON.parse(metaData);

      console.log(`✅ [ChatCache] Cache hit! ${metadata.chatCount} chats para ${clientId}:${tenantId} (última sync: ${metadata.lastSync})`);

      return { chats, metadata };
    } catch (error) {
      console.warn(`⚠️ [ChatCache] Erro ao ler cache para ${clientId}:${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Salva chats no cache com metadata
   */
  private async saveChatCache(
    clientId: string,
    tenantId: string,
    chats: any[],
    previousVersion: number = 0
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(clientId, tenantId);
      const metaKey = this.getMetaKey(clientId, tenantId);

      const metadata: ChatCacheMetadata = {
        lastSync: new Date().toISOString(),
        version: previousVersion + 1,
        refreshStatus: 'idle',
        chatCount: chats.length,
        ttl: CHAT_CACHE_TTL,
      };

      await Promise.all([
        cache.set(cacheKey, JSON.stringify(chats), CHAT_CACHE_TTL),
        cache.set(metaKey, JSON.stringify(metadata), CHAT_CACHE_TTL),
      ]);

      console.log(`💾 [ChatCache] Salvos ${chats.length} chats para ${clientId}:${tenantId} (versão ${metadata.version}, TTL: ${CHAT_CACHE_TTL}s)`);
    } catch (error) {
      console.error(`❌ [ChatCache] Erro ao salvar cache para ${clientId}:${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se cache precisa de refresh (expirado ou quase expirando)
   */
  async needsRefresh(clientId: string, tenantId: string): Promise<boolean> {
    try {
      const cached = await this.getCachedChats(clientId, tenantId);
      
      if (!cached) {
        console.log(`🔄 [ChatCache] Cache vazio para ${clientId}:${tenantId} - precisa refresh`);
        return true;
      }

      const { metadata } = cached;
      const ageSeconds = (Date.now() - new Date(metadata.lastSync).getTime()) / 1000;
      
      // Refresh se tiver mais de 80% do TTL (4 minutos de 5)
      const needsRefresh = ageSeconds > (CHAT_CACHE_TTL * 0.8);
      
      if (needsRefresh) {
        console.log(`🔄 [ChatCache] Cache ${clientId}:${tenantId} com ${Math.round(ageSeconds)}s - precisa refresh`);
      }

      return needsRefresh;
    } catch (error) {
      console.warn(`⚠️ [ChatCache] Erro ao verificar refresh para ${clientId}:${tenantId}:`, error);
      return true;
    }
  }

  /**
   * Atualiza chats em BACKGROUND (não bloqueia)
   * Usa lock para evitar múltiplas atualizações simultâneas
   */
  async refreshChatsInBackground(
    clientId: string,
    tenantId: string,
    config: EvolutionConfig,
    enrichFn?: (chats: any[]) => Promise<any[]>
  ): Promise<void> {
    // Executa em background (sem await)
    this.doRefresh(clientId, tenantId, config, enrichFn).catch((error) => {
      console.error(`❌ [ChatCache] Erro no refresh em background para ${clientId}:${tenantId}:`, error);
    });
  }

  /**
   * Executa refresh (privado, chamado pelo refreshChatsInBackground)
   */
  private async doRefresh(
    clientId: string,
    tenantId: string,
    config: EvolutionConfig,
    enrichFn?: (chats: any[]) => Promise<any[]>
  ): Promise<void> {
    console.log(`🔄 [ChatCache] Iniciando refresh em background para ${clientId}:${tenantId}...`);

    // Tenta adquirir lock
    const lockAcquired = await this.acquireLock(clientId, tenantId);
    if (!lockAcquired) {
      console.log(`⏭️ [ChatCache] Refresh já em andamento (lock ativo) para ${clientId}:${tenantId}, ignorando`);
      return;
    }

    try {
      const startTime = Date.now();

      // Busca chats da Evolution API
      console.log(`📡 [ChatCache] Buscando chats da Evolution API para ${clientId}:${tenantId}...`);
      let chats = await fetchChats(config);
      const fetchTime = Date.now() - startTime;

      console.log(`✅ [ChatCache] ${chats.length} chats obtidos em ${fetchTime}ms`);

      // Enriquece com nomes de contatos e etiquetas (se função fornecida)
      if (enrichFn) {
        console.log('🎨 [ChatCache] Enriquecendo chats com contatos e etiquetas...');
        const enrichStartTime = Date.now();
        chats = await enrichFn(chats);
        const enrichTime = Date.now() - enrichStartTime;
        console.log(`✅ [ChatCache] Chats enriquecidos em ${enrichTime}ms`);
      }

      // Salva no cache
      const cached = await this.getCachedChats(clientId, tenantId);
      const previousVersion = cached?.metadata.version || 0;
      await this.saveChatCache(clientId, tenantId, chats, previousVersion);

      const totalTime = Date.now() - startTime;
      console.log(`✅ [ChatCache] Refresh completo para ${clientId}:${tenantId} em ${totalTime}ms`);
    } catch (error) {
      console.error(`❌ [ChatCache] Erro no refresh para ${clientId}:${tenantId}:`, error);
      throw error;
    } finally {
      // Sempre libera lock
      await this.releaseLock(clientId, tenantId);
    }
  }

  /**
   * Força refresh SÍNCRONO (bloqueia até completar)
   * Usar apenas quando usuário pedir explicitamente
   */
  async forceRefreshSync(
    clientId: string,
    tenantId: string,
    config: EvolutionConfig,
    enrichFn?: (chats: any[]) => Promise<any[]>
  ): Promise<CachedChatData> {
    console.log(`🔥 [ChatCache] FORCE REFRESH SÍNCRONO (bloqueante) para ${clientId}:${tenantId}`);
    
    // Executa refresh e espera
    await this.doRefresh(clientId, tenantId, config, enrichFn);
    
    // Retorna cache atualizado
    const cached = await this.getCachedChats(clientId, tenantId);
    if (!cached) {
      throw new Error(`Falha ao atualizar cache para ${clientId}:${tenantId}`);
    }
    
    return cached;
  }

  /**
   * Invalida cache (força novo fetch na próxima chamada)
   */
  async invalidateCache(clientId: string, tenantId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(clientId, tenantId);
      const metaKey = this.getMetaKey(clientId, tenantId);

      await Promise.all([
        cache.del(cacheKey),
        cache.del(metaKey),
      ]);

      console.log(`🗑️ [ChatCache] Cache invalidado para cliente ${clientId}:${tenantId}`);
    } catch (error) {
      console.error(`❌ [ChatCache] Erro ao invalidar cache para ${clientId}:${tenantId}:`, error);
    }
  }
}

export const chatCacheManager = new ChatCacheManager();
