import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { testDynamicSupabaseConnection } from '../lib/multiTenantSupabase';
import { 
  hasCredentials,
  getSupabaseCredentials,
  getWhatsAppCredentials,
  getPluggyCredentials
} from '../lib/credentialsManager';
import { 
  getPluggyCredentials as getPluggyCredsDb, 
  getEvolutionApiCredentials
} from '../lib/credentialsDb';

const router = express.Router();

interface ConnectionStatus {
  status: 'connected' | 'partial' | 'error' | 'unknown';
  message: string;
  hasCredentials: boolean;
  details?: any;
}

async function testSupabaseConnection(clientId: string): Promise<ConnectionStatus> {
  const hasSupabaseCreds = hasCredentials(clientId, 'supabase');
  
  if (!hasSupabaseCreds) {
    return {
      status: 'error',
      message: 'Credenciais do Supabase não configuradas',
      hasCredentials: false
    };
  }

  const credentials = getSupabaseCredentials(clientId);
  if (!credentials || !credentials.url || !credentials.anonKey) {
    return {
      status: 'error',
      message: 'Credenciais do Supabase incompletas',
      hasCredentials: false
    };
  }

  try {
    const isConnected = await testDynamicSupabaseConnection(clientId);
    
    if (isConnected) {
      return {
        status: 'connected',
        message: 'Conectado ao Supabase com sucesso',
        hasCredentials: true,
        details: { url: credentials.url }
      };
    } else {
      return {
        status: 'error',
        message: 'Falha ao conectar ao Supabase - verifique as credenciais',
        hasCredentials: true
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Erro ao testar conexão: ${error.message}`,
      hasCredentials: true
    };
  }
}

async function testWhatsAppConnection(clientId: string, tenantId: string): Promise<ConnectionStatus> {
  // Verifica credenciais na memória primeiro
  const hasWhatsAppCreds = hasCredentials(clientId, 'whatsapp');
  
  if (!hasWhatsAppCreds) {
    // Se não tem na memória, verifica no banco de dados (Evolution API)
    try {
      const evolutionCreds = await getEvolutionApiCredentials(tenantId); // 🔐 CORREÇÃO: Passar tenantId para isolamento
      if (evolutionCreds && evolutionCreds.apiUrl && evolutionCreds.apiKey) {
        return {
          status: 'connected',
          message: 'Credenciais da Evolution API configuradas',
          hasCredentials: true,
          details: { apiUrl: evolutionCreds.apiUrl.substring(0, 30) + '...' }
        };
      }
    } catch (error) {
      console.error('Erro ao verificar credenciais Evolution API do banco:', error);
    }
    
    return {
      status: 'error',
      message: 'Credenciais do WhatsApp não configuradas',
      hasCredentials: false
    };
  }

  const credentials = getWhatsAppCredentials(clientId);
  if (!credentials || !credentials.apiKey || !credentials.phoneNumber) {
    return {
      status: 'error',
      message: 'Credenciais do WhatsApp incompletas',
      hasCredentials: false
    };
  }

  return {
    status: 'connected',
    message: 'Credenciais do WhatsApp configuradas',
    hasCredentials: true,
    details: { phoneNumber: credentials.phoneNumber }
  };
}

async function testPluggyConnection(clientId: string): Promise<ConnectionStatus> {
  const hasPluggyCreds = hasCredentials(clientId, 'pluggy');
  
  if (!hasPluggyCreds) {
    try {
      const dbCreds = await getPluggyCredsDb();
      if (dbCreds && dbCreds.clientId && dbCreds.clientSecret) {
        return {
          status: 'connected',
          message: 'Usando credenciais globais do Pluggy',
          hasCredentials: true,
          details: { source: 'database' }
        };
      }
    } catch (error) {
      console.warn('Erro ao buscar credenciais globais do Pluggy:', error);
    }

    return {
      status: 'error',
      message: 'Credenciais do Pluggy não configuradas',
      hasCredentials: false
    };
  }

  const credentials = getPluggyCredentials(clientId);
  if (!credentials || !credentials.clientId || !credentials.clientSecret) {
    return {
      status: 'error',
      message: 'Credenciais do Pluggy incompletas',
      hasCredentials: false
    };
  }

  return {
    status: 'connected',
    message: 'Credenciais do Pluggy configuradas',
    hasCredentials: true,
    details: { source: 'client_config' }
  };
}

router.get('/test-connections', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId; // 🔐 CORREÇÃO: Obter tenantId da sessão

    const [supabase, whatsapp, pluggy] = await Promise.all([
      testSupabaseConnection(clientId),
      testWhatsAppConnection(clientId, tenantId), // 🔐 CORREÇÃO: Passar tenantId
      testPluggyConnection(clientId)
    ]);

    const connectedCount = [supabase, whatsapp, pluggy].filter(
      conn => conn.status === 'connected'
    ).length;
    const partialCount = [supabase, whatsapp, pluggy].filter(
      conn => conn.status === 'partial'
    ).length;
    const errorCount = [supabase, whatsapp, pluggy].filter(
      conn => conn.status === 'error'
    ).length;

    let overall_status: 'connected' | 'partial' | 'error' | 'unknown';
    if (connectedCount === 3) {
      overall_status = 'connected';
    } else if (connectedCount > 0 || partialCount > 0) {
      overall_status = 'partial';
    } else if (errorCount > 0) {
      overall_status = 'error';
    } else {
      overall_status = 'unknown';
    }

    const response = {
      success: true,
      connections: {
        supabase,
        whatsapp,
        pluggy,
        overall_status,
        timestamp: new Date().toISOString(),
        summary: {
          total: 3,
          connected: connectedCount,
          partial: partialCount,
          error: errorCount
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Erro ao testar conexões:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao testar conexões',
      details: error.message
    });
  }
});

export const connectionsRoutes = router;
