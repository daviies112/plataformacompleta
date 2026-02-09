export async function fetchWithPluggyAuth(url: string, options: RequestInit = {}, timeoutMs: number = 60000) {
  console.log(`🌐 fetchWithPluggyAuth: Iniciando requisição para ${url}`);
  
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`❌ TIMEOUT de ${timeoutMs}ms excedido para ${url}`);
    controller.abort();
  }, timeoutMs);

  try {
    console.log(`🔄 fetchWithPluggyAuth: Chamando fetch() para ${url}...`);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log(`✅ fetchWithPluggyAuth: Resposta recebida de ${url} - Status: ${response.status}, OK: ${response.ok}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`❌ fetchWithPluggyAuth: Erro para ${url}:`, error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout ao buscar ${url}`);
    }
    throw error;
  }
}
