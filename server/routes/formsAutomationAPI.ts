import { Router } from 'express';
import { 
  processApprovedSubmission, 
  processAllPendingSubmissions,
  getSubmissionTrackingStatus,
  getAllSubmissionsWithTracking
} from '../lib/formsAutomation';
import { 
  getAutomationStatus, 
  getAutomationConfig,
  updateAutomationConfig,
  startAutomation as startWorker,
  stopAutomation as stopWorker
} from '../lib/formsAutomationWorker';
import { isClienteSupabaseConfigured } from '../lib/clienteSupabase';
import { isSupabaseMasterConfigured } from '../lib/supabaseMaster';
import { log } from '../production';

const router = Router();

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000099";

router.get('/api/automation/status', async (req, res) => {
  try {
    const status = getAutomationStatus();
    const clienteConfigured = await isClienteSupabaseConfigured();
    const masterConfigured = isSupabaseMasterConfigured();
    
    res.json({
      success: true,
      automation: status,
      configuration: {
        clienteSupabaseConfigured: clienteConfigured,
        masterSupabaseConfigured: masterConfigured,
        fullyConfigured: clienteConfigured && masterConfigured
      }
    });
  } catch (error: any) {
    log(`❌ Erro ao buscar status da automação: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/automation/run-now', async (req, res) => {
  try {
    const { tenantId, userId, limit } = req.body;
    
    const result = await processAllPendingSubmissions(
      tenantId || DEFAULT_TENANT_ID,
      userId || DEFAULT_USER_ID,
      limit || 10
    );
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    log(`❌ Erro ao executar processamento manual: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/automation/config', async (req, res) => {
  try {
    const { enabled, pollingIntervalMinutes, tenantId, userId, limit } = req.body;
    
    const newConfig: any = {};
    if (typeof enabled === 'boolean') newConfig.enabled = enabled;
    if (typeof pollingIntervalMinutes === 'number') newConfig.pollingIntervalMinutes = pollingIntervalMinutes;
    if (tenantId) newConfig.tenantId = tenantId;
    if (userId) newConfig.userId = userId;
    if (typeof limit === 'number') newConfig.limit = limit;
    
    updateAutomationConfig(newConfig);
    
    const currentConfig = getAutomationConfig();
    
    res.json({
      success: true,
      config: currentConfig,
      message: 'Configuração atualizada com sucesso'
    });
  } catch (error: any) {
    log(`❌ Erro ao atualizar configuração: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/automation/config', async (req, res) => {
  try {
    const config = getAutomationConfig();
    
    res.json({
      success: true,
      config
    });
  } catch (error: any) {
    log(`❌ Erro ao buscar configuração: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/automation/process-submission', async (req, res) => {
  try {
    const { submissionId, tenantId, userId } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId é obrigatório'
      });
    }
    
    const result = await processApprovedSubmission(
      submissionId,
      tenantId || DEFAULT_TENANT_ID,
      userId || DEFAULT_USER_ID
    );
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    log(`❌ Erro ao processar submission: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/automation/submission/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.query;
    
    const tracking = await getSubmissionTrackingStatus(
      id,
      (tenantId as string) || DEFAULT_TENANT_ID
    );
    
    res.json({
      success: true,
      tracking
    });
  } catch (error: any) {
    log(`❌ Erro ao buscar tracking: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/automation/submissions', async (req, res) => {
  try {
    const { tenantId, limit } = req.query;
    
    const submissions = await getAllSubmissionsWithTracking(
      (tenantId as string) || DEFAULT_TENANT_ID,
      limit ? parseInt(limit as string) : 100
    );
    
    res.json({
      success: true,
      submissions,
      total: submissions.length
    });
  } catch (error: any) {
    log(`❌ Erro ao buscar submissions com tracking: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/automation/start', async (req, res) => {
  try {
    startWorker();
    
    res.json({
      success: true,
      message: 'Worker de automação iniciado'
    });
  } catch (error: any) {
    log(`❌ Erro ao iniciar worker: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/automation/stop', async (req, res) => {
  try {
    stopWorker();
    
    res.json({
      success: true,
      message: 'Worker de automação parado'
    });
  } catch (error: any) {
    log(`❌ Erro ao parar worker: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
