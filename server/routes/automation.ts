import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { getAutomationStatus, getIdempotencyStats, AUTOMATION_CONFIG } from '../lib/automationManager';

const router = express.Router();

// Endpoint para obter status da automação (somente leitura)
router.get('/status', authenticateToken, (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const status = getAutomationStatus();
    const idempotencyStats = getIdempotencyStats();
    
    // Filtrar informações específicas do cliente
    const clientExecutions = Object.entries(status.lastExecutions)
      .filter(([key, execution]) => execution.clientId === clientId)
      .reduce((acc, [key, execution]) => {
        acc[key] = execution;
        return acc;
      }, {} as any);
    
    const response = {
      success: true,
      automation: {
        isRunning: status.isRunning,
        startedAt: status.startedAt,
        globalStats: status.globalStats,
        settings: status.settings,
        clientExecutions: clientExecutions,
        idempotencyStats: idempotencyStats,
        config: {
          detectionIntervalMinutes: AUTOMATION_CONFIG.DETECTION_INTERVAL_MINUTES,
          processingEnabled: AUTOMATION_CONFIG.PROCESSING_ENABLED,
          persistState: AUTOMATION_CONFIG.PERSIST_STATE,
          maxRetries: AUTOMATION_CONFIG.MAX_RETRIES,
          retryDelaySeconds: AUTOMATION_CONFIG.RETRY_DELAY_SECONDS,
        },
        lastUpdated: new Date().toISOString()
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erro ao obter status da automação:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao obter status da automação',
      details: error.message
    });
  }
});

// Endpoint para obter estatísticas globais da automação (somente para admins)
router.get('/global-stats', authenticateToken, (req, res) => {
  try {
    const clientId = req.user!.clientId;
    
    // Apenas cliente 1 (admin) pode ver estatísticas globais
    if (clientId !== '1') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado - apenas administradores podem ver estatísticas globais'
      });
    }
    
    const status = getAutomationStatus();
    const idempotencyStats = getIdempotencyStats();
    
    const response = {
      success: true,
      globalStats: {
        automation: status,
        idempotency: idempotencyStats,
        systemInfo: {
          nodeEnv: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erro ao obter estatísticas globais:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao obter estatísticas globais',
      details: error.message
    });
  }
});

// Endpoint para obter logs recentes da automação (para debugging)
router.get('/logs', authenticateToken, (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const { limit = 50 } = req.query;
    
    // Por enquanto, retornar informações do estado atual
    // Em uma implementação mais avançada, poderia ler logs de arquivo
    const status = getAutomationStatus();
    
    const clientExecutions = Object.entries(status.lastExecutions)
      .filter(([key, execution]) => execution.clientId === clientId)
      .sort((a, b) => new Date(b[1].lastRun).getTime() - new Date(a[1].lastRun).getTime())
      .slice(0, parseInt(limit.toString()));
    
    const response = {
      success: true,
      logs: {
        recentExecutions: clientExecutions.map(([key, execution]) => ({
          key,
          clientId: execution.clientId,
          tenantId: execution.tenantId,
          lastRun: execution.lastRun,
          lastSuccess: execution.lastSuccess,
          lastError: execution.lastError,
          status: execution.status,
          totalExecutions: execution.totalExecutions,
          totalNewClientsDetected: execution.totalNewClientsDetected,
          totalEventsCreated: execution.totalEventsCreated,
          consecutiveErrors: execution.consecutiveErrors
        })),
        isRunning: status.isRunning,
        startedAt: status.startedAt,
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erro ao obter logs da automação:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao obter logs da automação',
      details: error.message
    });
  }
});

export const automationRoutes = router;