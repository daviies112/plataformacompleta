import { getClienteSupabase, getSubmissionById, fetchApprovedSubmissions, type FormSubmission } from './clienteSupabase';
import { getSupabaseMaster, isSupabaseMasterConfigured } from './supabaseMaster';
import { getClientSupabaseClient } from './multiTenantSupabase';
import { checkCompliance } from './datacorpCompliance';
import { validateCPF, normalizeCPF } from './crypto';
import { log } from '../production';

export interface ProcessResult {
  success: boolean;
  submissionId: string;
  checkId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  cpfFound?: boolean;
  riskScore?: number;
  complianceStatus?: string;
}

function extractCPFFromSubmission(submission: FormSubmission): string | null {
  // Prioridade 1: Campo contact_cpf direto
  if (submission.contact_cpf) {
    const cpf = normalizeCPF(submission.contact_cpf);
    if (cpf && cpf.length === 11) {
      log(`✅ CPF extraído de contact_cpf: ${cpf.substring(0, 3)}...`);
      return cpf;
    }
  }

  // Prioridade 2: Buscar no campo answers (JSON)
  if (submission.answers) {
    let answers = submission.answers;
    
    // Se answers for string, fazer parse
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (error) {
        log(`⚠️ Não foi possível fazer parse do campo answers como JSON`);
        return null;
      }
    }

    if (typeof answers === 'object' && answers !== null) {
      // Tentar campos comuns de CPF
      const cpfFields = ['cpf', 'CPF', 'contact_cpf', 'contactCpf', 'documento', 'document'];
      
      for (const field of cpfFields) {
        if (answers[field]) {
          const cpf = normalizeCPF(String(answers[field]));
          if (cpf && cpf.length === 11) {
            log(`✅ CPF extraído de answers.${field}: ${cpf.substring(0, 3)}...`);
            return cpf;
          }
        }
      }

      // Buscar automaticamente em qualquer valor que pareça CPF
      const answersArray = Object.values(answers);
      for (const value of answersArray) {
        if (typeof value === 'string') {
          const normalized = normalizeCPF(value);
          if (normalized && normalized.length === 11 && validateCPF(normalized)) {
            log(`✅ CPF detectado automaticamente em answers: ${normalized.substring(0, 3)}...`);
            return normalized;
          }
        }
      }
    }
  }

  log(`⚠️ CPF não encontrado na submission ${submission.id}`);
  return null;
}

async function isSubmissionAlreadyProcessed(submissionId: string, tenantId: string): Promise<boolean> {
  if (!isSupabaseMasterConfigured()) {
    log(`⚠️ Supabase Master não configurado - não é possível verificar tracking`);
    return false;
  }

  try {
    const supabase = getSupabaseMaster();
    
    const { data, error } = await supabase
      .from('form_submissions_compliance_tracking')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      log(`⚠️ Erro ao verificar tracking: ${error.message}`);
      return false;
    }

    if (data) {
      // Permitir reprocessamento se falhou por CPF inválido
      if (data.status === 'failed' && data.error_message && 
          (data.error_message.includes('CPF inválido') || data.error_message.includes('dígito verificador'))) {
        log(`🔄 Submission ${submissionId} falhou anteriormente com erro de CPF - permitindo reprocessamento`);
        return false;
      }
      
      log(`ℹ️ Submission ${submissionId} já foi processada anteriormente (status: ${data.status})`);
      return true;
    }

    return false;
  } catch (error: any) {
    log(`❌ Exceção ao verificar tracking: ${error.message}`);
    return false;
  }
}

async function createTrackingRecord(
  submissionId: string,
  tenantId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  checkId?: string,
  errorMessage?: string
): Promise<void> {
  if (!isSupabaseMasterConfigured()) {
    log(`⚠️ Supabase Master não configurado - tracking não será salvo`);
    return;
  }

  try {
    const supabase = getSupabaseMaster();
    
    const record: any = {
      submission_id: submissionId,
      tenant_id: tenantId,
      status,
      last_attempt_at: new Date().toISOString(),
    };

    if (checkId) {
      record.check_id = checkId;
    }

    if (errorMessage) {
      record.error_message = errorMessage;
    }

    if (status === 'completed' || status === 'failed') {
      record.processed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('form_submissions_compliance_tracking')
      .upsert(record, {
        onConflict: 'submission_id',
      });

    if (error) {
      log(`❌ Erro ao criar/atualizar tracking record: ${error.message}`);
    } else {
      log(`✅ Tracking record criado/atualizado: ${submissionId} - ${status}`);
    }
  } catch (error: any) {
    log(`❌ Exceção ao criar tracking record: ${error.message}`);
  }
}

export async function processApprovedSubmission(
  submissionId: string,
  tenantId: string,
  userId?: string
): Promise<ProcessResult> {
  log(`🔄 Iniciando processamento da submission: ${submissionId} para tenant: ${tenantId}`);

  try {
    // Verificar se já foi processada
    const alreadyProcessed = await isSubmissionAlreadyProcessed(submissionId, tenantId);
    if (alreadyProcessed) {
      return {
        success: false,
        submissionId,
        status: 'failed',
        errorMessage: 'Submission já foi processada anteriormente',
      };
    }

    // Marcar como processando
    await createTrackingRecord(submissionId, tenantId, 'processing');

    // Buscar submission do Supabase do cliente
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      await createTrackingRecord(submissionId, tenantId, 'failed', undefined, 'Submission não encontrada no banco do cliente');
      return {
        success: false,
        submissionId,
        status: 'failed',
        errorMessage: 'Submission não encontrada',
      };
    }

    // Extrair CPF
    const cpf = extractCPFFromSubmission(submission);
    if (!cpf) {
      await createTrackingRecord(submissionId, tenantId, 'failed', undefined, 'CPF não encontrado na submission');
      return {
        success: false,
        submissionId,
        status: 'failed',
        errorMessage: 'CPF não encontrado na submission',
        cpfFound: false,
      };
    }

    // Validar CPF
    if (!validateCPF(cpf)) {
      log(`❌ CPF inválido detectado: ${cpf.substring(0, 3)}...${cpf.substring(cpf.length - 2)} (falhou na validação do dígito verificador)`);
      await createTrackingRecord(submissionId, tenantId, 'failed', undefined, `CPF inválido (dígito verificador incorreto): ${cpf.substring(0, 3)}...${cpf.substring(cpf.length - 2)}`);
      return {
        success: false,
        submissionId,
        status: 'failed',
        errorMessage: 'CPF inválido (dígito verificador incorreto)',
        cpfFound: true,
      };
    }

    // Consultar DataCorp
    // IMPORTANT: checkCompliance() now has centralized submission_id deduplication
    // If a check already exists for this submission_id, it will return the existing check
    const timestamp = new Date().toISOString();
    log(`🔔 [FormsAutomation] ${timestamp} - TRIGGER recebido`);
    log(`   📋 Submission ID: ${submissionId}`);
    log(`   🏢 Tenant: ${tenantId.substring(0, 8)}...`);
    log(`✅ CPF válido encontrado, iniciando consulta de compliance...`);
    const personName = submission.contact_name || 'N/A';
    const personPhone = submission.contact_phone || undefined;
    
    log(`🔍 [FormsAutomation] Chamando checkCompliance() para submission ${submissionId}...`);
    const complianceResult = await checkCompliance(cpf, {
      tenantId,
      submissionId,
      createdBy: userId || 'system-formsautomation',
      personName,
      personPhone,
      forceNewRecord: true,
    });

    const cacheStatus = complianceResult.fromCache ? 'DEDUP/CACHE HIT (economia de API)' : 'API CALL (nova consulta)';
    log(`✅ [FormsAutomation] Consulta concluída para submission ${submissionId}:`);
    log(`   📊 Status: ${complianceResult.status}`);
    log(`   📈 Risk Score: ${complianceResult.riskScore}`);
    log(`   💾 Resultado: ${cacheStatus}`);
    log(`   🏷️ Check ID: ${complianceResult.checkId}`);

    // Salvar tracking de sucesso (Master Supabase)
    await createTrackingRecord(
      submissionId,
      tenantId,
      'completed',
      complianceResult.checkId
    );

    // Also update TENANT Supabase's form_submissions_compliance_tracking
    try {
      const tenantSupabase = await getClientSupabaseClient(tenantId);
      if (tenantSupabase) {
        const now = new Date().toISOString();
        const tenantTrackingUpdate: any = {
          status: 'completed',
          check_id: complianceResult.checkId,
          processed_at: now,
          updated_at: now,
          nome: submission.contact_name || null,
        };

        // Try matching by submission id
        await tenantSupabase
          .from('form_submissions_compliance_tracking')
          .update(tenantTrackingUpdate)
          .eq('submission_id', submissionId);

        // Also try matching by phone number variants
        if (submission.contact_phone) {
          const phoneClean = submission.contact_phone.replace(/\D/g, '');
          if (phoneClean) {
            const whatsappId = `${phoneClean}@s.whatsapp.net`;
            await tenantSupabase
              .from('form_submissions_compliance_tracking')
              .update(tenantTrackingUpdate)
              .eq('submission_id', whatsappId);

            await tenantSupabase
              .from('form_submissions_compliance_tracking')
              .update(tenantTrackingUpdate)
              .eq('submission_id', phoneClean);
          }
        }

        log(`✅ Tenant tracking also updated for submission ${submissionId}`);
      }
    } catch (tenantTrackingErr: any) {
      log(`⚠️ Non-critical: Could not update tenant tracking: ${tenantTrackingErr.message}`);
    }

    log(`✅ Submission processada com sucesso: ${submissionId} - Status: ${complianceResult.status}`);
    return {
      success: true,
      submissionId,
      checkId: complianceResult.checkId,
      status: 'completed',
      cpfFound: true,
      riskScore: complianceResult.riskScore,
      complianceStatus: complianceResult.status,
    };

  } catch (error: any) {
    log(`❌ Erro ao processar submission ${submissionId}: ${error.message}`);
    await createTrackingRecord(submissionId, tenantId, 'failed', undefined, error.message);
    
    return {
      success: false,
      submissionId,
      status: 'failed',
      errorMessage: error.message,
    };
  }
}

export async function processAllPendingSubmissions(
  tenantId: string,
  userId?: string,
  limit = 10
): Promise<{
  total: number;
  processed: number;
  failed: number;
  results: ProcessResult[];
}> {
  log(`🔄 Iniciando processamento em lote para tenant: ${tenantId} (limite: ${limit})`);

  try {
    const approvedSubmissions = await fetchApprovedSubmissions(limit);
    const results: ProcessResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const submission of approvedSubmissions) {
      const result = await processApprovedSubmission(submission.id, tenantId, userId);
      results.push(result);
      
      if (result.success) {
        processed++;
      } else {
        failed++;
      }

      // Pequeno delay entre processamentos para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    log(`✅ Processamento em lote concluído: ${processed} sucesso, ${failed} falhas de ${approvedSubmissions.length} total`);

    return {
      total: approvedSubmissions.length,
      processed,
      failed,
      results,
    };
  } catch (error: any) {
    log(`❌ Erro no processamento em lote: ${error.message}`);
    throw error;
  }
}

export async function getSubmissionTrackingStatus(submissionId: string, tenantId: string): Promise<any> {
  if (!isSupabaseMasterConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseMaster();
    
    const { data, error } = await supabase
      .from('form_submissions_compliance_tracking')
      .select(`
        *,
        datacorp_checks (
          id,
          status,
          risk_score,
          payload,
          consulted_at
        )
      `)
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      log(`⚠️ Erro ao buscar status de tracking: ${error.message}`);
      return null;
    }

    return data;
  } catch (error: any) {
    log(`❌ Exceção ao buscar status de tracking: ${error.message}`);
    return null;
  }
}

export async function getAllSubmissionsWithTracking(tenantId: string, limit = 100): Promise<any[]> {
  try {
    const { getAllSubmissions } = await import('./clienteSupabase');
    const submissions = await getAllSubmissions(limit);
    
    log(`📊 Buscando tracking para ${submissions.length} submissions totais`);
    
    if (!isSupabaseMasterConfigured()) {
      return submissions.map(s => ({
        ...s,
        tracking: null,
      }));
    }

    const supabase = getSupabaseMaster();
    const submissionIds = submissions.map(s => s.id);

    if (submissionIds.length === 0) {
      return [];
    }

    const { data: trackingData, error } = await supabase
      .from('form_submissions_compliance_tracking')
      .select(`
        *,
        datacorp_checks (
          id,
          status,
          risk_score,
          consulted_at
        )
      `)
      .eq('tenant_id', tenantId)
      .in('submission_id', submissionIds);

    if (error) {
      log(`⚠️ Erro ao buscar tracking data: ${error.message}`);
    }

    const trackingMap = new Map();
    if (trackingData) {
      trackingData.forEach(t => trackingMap.set(t.submission_id, t));
    }

    const result = submissions.map(s => ({
      ...s,
      tracking: trackingMap.get(s.id) || null,
    }));
    
    log(`✅ Retornando ${result.length} submissions com tracking`);
    return result;
  } catch (error: any) {
    log(`❌ Erro ao buscar submissions com tracking: ${error.message}`);
    throw error;
  }
}
