/**
 * Request Batcher - Agrupa múltiplas requisições em uma só
 * 
 * Útil para otimizar chamadas ao banco de dados e APIs externas,
 * reduzindo o número de requests HTTP/queries.
 */

interface QueuedRequest<T, R> {
  request: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export class RequestBatcher<T, R> {
  private queue: QueuedRequest<T, R>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchFn: (requests: T[]) => Promise<R[]>;
  private delay: number;

  constructor(
    batchFn: (requests: T[]) => Promise<R[]>,
    delay: number = 50
  ) {
    this.batchFn = batchFn;
    this.delay = delay;
  }

  /**
   * Adiciona uma request à fila de processamento
   * @param request - Request a ser processado
   * @returns Promise que resolve quando o request for processado
   */
  add(request: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      // Adiciona request à queue
      this.queue.push({ request, resolve, reject });

      // Clear timeout anterior se existir
      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      // Setar novo timeout para chamar flush() após delay
      this.timeout = setTimeout(() => {
        this.flush();
      }, this.delay);
    });
  }

  /**
   * Processa todos os requests pendentes em batch
   */
  private async flush(): Promise<void> {
    // Se queue vazia, return
    if (this.queue.length === 0) {
      return;
    }

    // Splice queue (pegar todos e limpar)
    const batch = this.queue.splice(0, this.queue.length);
    const requests = batch.map(item => item.request);

    // Log detalhado
    console.log(`[BATCH] Processing ${batch.length} requests in 1 call`);

    try {
      // Chamar batchFn com array de requests
      const results = await this.batchFn(requests);

      // Resolver cada promise na ordem correta
      batch.forEach((item, index) => {
        if (results[index] !== undefined) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error(`Result not found for request at index ${index}`));
        }
      });

      console.log(`[BATCH] Successfully processed ${batch.length} requests`);
    } catch (error) {
      // Se batchFn falhar, rejeitar todas as promises
      console.error(`[BATCH] Error processing batch of ${batch.length} requests:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during batch processing';
      batch.forEach(item => {
        item.reject(new Error(errorMessage));
      });
    }
  }

  /**
   * Força o processamento imediato de todos os requests pendentes
   */
  public forceFlush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    return this.flush();
  }

  /**
   * Retorna o número de requests pendentes na fila
   */
  public get queueSize(): number {
    return this.queue.length;
  }
}

/**
 * Factory function para criar instâncias de RequestBatcher
 * 
 * @param batchFn - Função que processa um array de requests
 * @param delay - Tempo de espera para acumular requests (default 50ms)
 * @returns Nova instância de RequestBatcher
 * 
 * @example
 * ```typescript
 * // Criar batcher para buscar projetos
 * const projectBatcher = createBatcher(async (projectIds) => {
 *   const { data } = await supabase
 *     .from('projects')
 *     .select('*')
 *     .in('id', projectIds);
 *   return data;
 * });
 * 
 * // Uso (agrupa automaticamente)
 * const projects = await Promise.all(
 *   ids.map(id => projectBatcher.add(id))
 * );
 * ```
 */
export function createBatcher<T, R>(
  batchFn: (requests: T[]) => Promise<R[]>,
  delay?: number
): RequestBatcher<T, R> {
  return new RequestBatcher<T, R>(batchFn, delay);
}

/**
 * Exemplo de uso com Supabase
 */
export const exampleUsage = {
  // Criar batcher para buscar projetos
  projectBatcher: createBatcher(async (projectIds: string[]) => {
    // Simulação - substitua com sua lógica real
    console.log(`[EXAMPLE] Fetching projects: ${projectIds.join(', ')}`);
    return projectIds.map(id => ({ id, name: `Project ${id}` }));
  }),

  // Função helper para usar o batcher
  async fetchProjects(ids: string[]) {
    const projects = await Promise.all(
      ids.map(id => this.projectBatcher.add(id))
    );
    return projects;
  }
};
