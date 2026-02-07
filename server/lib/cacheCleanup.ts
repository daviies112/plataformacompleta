import { db } from '../db';
import { 
  forms, formSubmissions, leads, formTenantMapping, 
  reunioes, notificationHistory, supabaseConfig 
} from '../../shared/db-schema';
import { eq, lt, and, inArray, sql } from 'drizzle-orm';
import { getClientSupabaseClient } from './multiTenantSupabase';

const CLEANUP_THRESHOLDS = {
  forms: 7,
  form_submissions: 7,
  leads: 7,
  form_tenant_mapping: 14,
  reunioes: 30,
  notification_history: 14,
};

interface CleanupResult {
  tenant: string;
  table: string;
  candidates: number;
  verified: number;
  deleted: number;
  skipped: number;
  error?: string;
}

let isRunning = false;
let lastRunAt: Date | null = null;

export function getCleanupStatus() {
  return { isRunning, lastRunAt };
}

async function getConfiguredTenants(): Promise<string[]> {
  try {
    const configs = await db.select({ tenantId: supabaseConfig.tenantId }).from(supabaseConfig);
    return configs.map(c => c.tenantId).filter(Boolean);
  } catch {
    return [];
  }
}

async function verifyInSupabase(
  supabase: any,
  tableName: string, 
  ids: string[]
): Promise<Set<string>> {
  const verified = new Set<string>();
  const batchSize = 100;
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .in('id', batch);
      
      if (!error && data) {
        data.forEach((row: any) => verified.add(row.id));
      }
    } catch {
    }
  }
  return verified;
}

async function cleanupFormsForTenant(tenantId: string, supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'forms', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.forms);
    
    const candidates = await db.select({ id: forms.id })
      .from(forms)
      .where(and(
        eq(forms.tenantId, tenantId),
        lt(forms.updatedAt, threshold)
      ));
    
    result.candidates = candidates.length;
    if (candidates.length === 0) return result;
    
    const ids = candidates.map(c => c.id);
    const verifiedIds = await verifyInSupabase(supabase, 'forms', ids);
    result.verified = verifiedIds.size;
    
    const toDelete = ids.filter(id => verifiedIds.has(id));
    if (toDelete.length > 0) {
      await db.delete(forms).where(and(
        eq(forms.tenantId, tenantId),
        inArray(forms.id, toDelete)
      ));
      result.deleted = toDelete.length;
    }
    result.skipped = ids.length - toDelete.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function cleanupSubmissionsForTenant(tenantId: string, supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'form_submissions', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.form_submissions);
    
    const candidates = await db.select({ id: formSubmissions.id })
      .from(formSubmissions)
      .where(and(
        eq(formSubmissions.tenantId, tenantId),
        lt(formSubmissions.updatedAt, threshold)
      ));
    
    result.candidates = candidates.length;
    if (candidates.length === 0) return result;
    
    const ids = candidates.map(c => c.id);
    const verifiedIds = await verifyInSupabase(supabase, 'form_submissions', ids);
    result.verified = verifiedIds.size;
    
    const toDelete = ids.filter(id => verifiedIds.has(id));
    if (toDelete.length > 0) {
      await db.delete(formSubmissions).where(and(
        eq(formSubmissions.tenantId, tenantId),
        inArray(formSubmissions.id, toDelete)
      ));
      result.deleted = toDelete.length;
    }
    result.skipped = ids.length - toDelete.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function cleanupLeadsForTenant(tenantId: string, supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'leads', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.leads);
    
    const candidates = await db.select({ id: leads.id, telefoneNormalizado: leads.telefoneNormalizado })
      .from(leads)
      .where(and(
        eq(leads.tenantId, tenantId),
        lt(leads.updatedAt, threshold)
      ));
    
    result.candidates = candidates.length;
    if (candidates.length === 0) return result;
    
    const phones = candidates.map(c => c.telefoneNormalizado).filter(Boolean);
    const verifiedPhones = new Set<string>();
    const batchSize = 100;
    
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      try {
        const { data } = await supabase
          .from('form_submissions')
          .select('contact_phone')
          .in('contact_phone', batch);
        if (data) {
          data.forEach((row: any) => {
            if (row.contact_phone) verifiedPhones.add(row.contact_phone);
          });
        }
      } catch {}
    }
    result.verified = verifiedPhones.size;
    
    const toDelete = candidates
      .filter(c => c.telefoneNormalizado && verifiedPhones.has(c.telefoneNormalizado))
      .map(c => c.id);
    
    if (toDelete.length > 0) {
      await db.delete(leads).where(and(
        eq(leads.tenantId, tenantId),
        inArray(leads.id, toDelete)
      ));
      result.deleted = toDelete.length;
    }
    result.skipped = candidates.length - toDelete.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function cleanupReuniaoForTenant(tenantId: string, supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'reunioes', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.reunioes);
    
    const candidates = await db.select({ id: reunioes.id })
      .from(reunioes)
      .where(and(
        eq(reunioes.tenantId, tenantId),
        lt(reunioes.createdAt, threshold)
      ));
    
    result.candidates = candidates.length;
    if (candidates.length === 0) return result;
    
    const ids = candidates.map(c => c.id);
    const verifiedIds = await verifyInSupabase(supabase, 'reunioes', ids);
    result.verified = verifiedIds.size;
    
    const toDelete = ids.filter(id => verifiedIds.has(id));
    if (toDelete.length > 0) {
      await db.delete(reunioes).where(and(
        eq(reunioes.tenantId, tenantId),
        inArray(reunioes.id, toDelete)
      ));
      result.deleted = toDelete.length;
    }
    result.skipped = ids.length - toDelete.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function cleanupNotificationsForTenant(tenantId: string): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'notification_history', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.notification_history);
    
    const deleted = await db.delete(notificationHistory)
      .where(and(
        eq(notificationHistory.tenantId, tenantId),
        lt(notificationHistory.sentAt, threshold)
      ))
      .returning({ id: notificationHistory.id });
    
    result.deleted = deleted.length;
    result.candidates = deleted.length;
    result.verified = deleted.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function cleanupFormTenantMappingForTenant(tenantId: string): Promise<CleanupResult> {
  const result: CleanupResult = { tenant: tenantId, table: 'form_tenant_mapping', candidates: 0, verified: 0, deleted: 0, skipped: 0 };
  
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLDS.form_tenant_mapping);
    
    const candidates = await db.select({ id: formTenantMapping.id, formId: formTenantMapping.formId })
      .from(formTenantMapping)
      .where(and(
        eq(formTenantMapping.tenantId, tenantId),
        lt(formTenantMapping.createdAt, threshold)
      ));
    
    result.candidates = candidates.length;
    if (candidates.length === 0) return result;
    
    const existingFormIds = await db.select({ id: forms.id })
      .from(forms)
      .where(eq(forms.tenantId, tenantId));
    const existingFormIdSet = new Set(existingFormIds.map(f => f.id));
    
    const orphanIds = candidates
      .filter(c => !existingFormIdSet.has(c.formId))
      .map(c => c.id);
    
    if (orphanIds.length > 0) {
      await db.delete(formTenantMapping).where(
        inArray(formTenantMapping.id, orphanIds)
      );
      result.deleted = orphanIds.length;
    }
    result.skipped = candidates.length - orphanIds.length;
  } catch (err: any) {
    result.error = err.message;
  }
  return result;
}

async function syncToSupabaseBeforeCleanup(tenantId: string, supabase: any): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  
  try {
    const localMeetings = await db.select().from(reunioes)
      .where(eq(reunioes.tenantId, tenantId));
    
    for (const meeting of localMeetings) {
      try {
        const { error } = await supabase.from('reunioes').upsert({
          id: meeting.id,
          tenant_id: meeting.tenantId,
          usuario_id: meeting.usuarioId,
          nome: meeting.nome,
          email: meeting.email,
          telefone: meeting.telefone,
          titulo: meeting.titulo,
          descricao: meeting.descricao,
          data_inicio: meeting.dataInicio,
          data_fim: meeting.dataFim,
          duracao: meeting.duracao,
          room_id_100ms: meeting.roomId100ms,
          room_code_100ms: meeting.roomCode100ms,
          link_reuniao: meeting.linkReuniao,
          link_publico: meeting.linkPublico,
          status: meeting.status,
          participantes: meeting.participantes,
          gravacao_url: meeting.gravacaoUrl,
          metadata: meeting.metadata,
          compareceu: meeting.compareceu,
          participant_id: meeting.participantId,
          form_submission_id: meeting.formSubmissionId,
          tipo_reuniao: meeting.tipoReuniao,
          created_at: meeting.createdAt,
          updated_at: meeting.updatedAt,
        }, { onConflict: 'id' });
        
        if (!error) synced++;
        else errors++;
      } catch {
        errors++;
      }
    }
  } catch {
  }
  
  return { synced, errors };
}

export async function runCacheCleanup(): Promise<CleanupResult[]> {
  if (isRunning) {
    console.log('[CacheCleanup] Limpeza já em execução, pulando...');
    return [];
  }
  
  isRunning = true;
  const allResults: CleanupResult[] = [];
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧹 LIMPEZA DE CACHE LOCAL - INICIANDO                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`📊 Limites: forms=${CLEANUP_THRESHOLDS.forms}d, submissions=${CLEANUP_THRESHOLDS.form_submissions}d, leads=${CLEANUP_THRESHOLDS.leads}d, reunioes=${CLEANUP_THRESHOLDS.reunioes}d, notifications=${CLEANUP_THRESHOLDS.notification_history}d`);
  
  try {
    const tenants = await getConfiguredTenants();
    console.log(`🏢 Encontrados ${tenants.length} tenant(s) configurados`);
    
    for (const tenantId of tenants) {
      console.log(`\n🔄 [CacheCleanup] Processando tenant: ${tenantId}`);
      
      const supabase = await getClientSupabaseClient(tenantId);
      
      if (!supabase) {
        console.log(`⚠️ [CacheCleanup] Supabase não configurado para ${tenantId}, pulando...`);
        continue;
      }
      
      const syncResult = await syncToSupabaseBeforeCleanup(tenantId, supabase);
      console.log(`📤 [CacheCleanup] Sync pré-limpeza: ${syncResult.synced} reuniões sincronizadas, ${syncResult.errors} erros`);
      
      const results = await Promise.all([
        cleanupFormsForTenant(tenantId, supabase),
        cleanupSubmissionsForTenant(tenantId, supabase),
        cleanupLeadsForTenant(tenantId, supabase),
        cleanupReuniaoForTenant(tenantId, supabase),
        cleanupNotificationsForTenant(tenantId),
        cleanupFormTenantMappingForTenant(tenantId),
      ]);
      
      for (const r of results) {
        if (r.deleted > 0 || r.error) {
          console.log(`  📋 ${r.table}: ${r.deleted} deletados, ${r.skipped} mantidos${r.error ? ` (erro: ${r.error})` : ''}`);
        }
      }
      
      allResults.push(...results);
    }
    
    const totalDeleted = allResults.reduce((sum, r) => sum + r.deleted, 0);
    const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = allResults.filter(r => r.error).length;
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🧹 LIMPEZA CONCLUÍDA                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Total: ${totalDeleted} registros limpos, ${totalSkipped} mantidos, ${totalErrors} erros`);
    
  } catch (err: any) {
    console.error('[CacheCleanup] Erro geral:', err.message);
  } finally {
    isRunning = false;
    lastRunAt = new Date();
  }
  
  return allResults;
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startCacheCleanupScheduler(intervalHours: number = 24) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`🧹 [CacheCleanup] Scheduler iniciado - limpeza a cada ${intervalHours}h`);
  
  setTimeout(() => {
    runCacheCleanup().catch(err => {
      console.error('[CacheCleanup] Erro na primeira execução:', err);
    });
  }, 5 * 60 * 1000);
  
  cleanupInterval = setInterval(() => {
    runCacheCleanup().catch(err => {
      console.error('[CacheCleanup] Erro na execução agendada:', err);
    });
  }, intervalMs);
}

export function stopCacheCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🧹 [CacheCleanup] Scheduler parado');
  }
}
