// API client for making requests to the Express backend

const API_BASE = "";  // Same origin since Express serves both frontend and API
const USER_ID_WHATSAPP = "default";  // Default user ID for single-user WhatsApp setup

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Verificar se a resposta é JSON antes de parsear
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  if (!response.ok) {
    // Tentar extrair mensagem de erro amigável
    if (isJson) {
      try {
        const data = await response.json();
        if (data && data.error) {
          throw new Error(data.error);
        }
        if (data && data.message) {
          throw new Error(data.message);
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(`Falha na requisição: ${response.statusText}`);
        }
        throw parseError;
      }
    }
    throw new Error(`Falha na requisição: ${response.statusText}`);
  }

  // Retornar dados JSON ou objeto vazio para respostas sem corpo
  if (isJson) {
    return await response.json();
  }
  return {};
}

export { USER_ID_WHATSAPP };
