import { hashCPF, encryptCPF, validateCPF, normalizeCPF, tenantIdToUUID, formatCPF } from "./cryptoCompliance.js";
import { 
  consultarCandidatoCompleto, 
  type BigdatacorpProcessesResponse,
  type BigdatacorpBasicDataResponse,
  type BigdatacorpCollectionsResponse,
  type ConsultaCompletaResult 
} from "./bigdatacorpClient.js";
import { storage } from "./complianceStorage.js";
import { getSupabaseMaster, getSupabaseMasterForTenant, isSupabaseMasterConfigured, type DatacorpCheck } from "./supabaseMaster.js";
import { saveComplianceToClienteSupabase, type CPFComplianceResult } from "./clienteSupabase.js";
import type { 
  InsertDatacorpCheck, 
  ComplianceStatus,
  BigdatacorpDecision,
  BigdatacorpPetition,
  BigdatacorpUpdate,
  BigdatacorpParty,
  BigdatacorpDecisionsWrapper,
  BigdatacorpPetitionsWrapper,
  BigdatacorpUpdatesWrapper,
  BigdatacorpPartiesWrapper,
  RawBigdatacorpDecision,
  RawBigdatacorpPetition,
  RawBigdatacorpUpdate,
  RawBigdatacorpParty,
  RawBigdatacorpLawsuit,
  BigdatacorpLawsuit
} from "../../shared/db-schema";
import { log } from "../vite";
import { db } from "../db";
import { datacorpChecks } from "../../shared/db-schema";
import { eq } from "drizzle-orm";

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================
// These functions extract arrays from wrapper objects {Total: X, Items: [...]}
// and map Portuguese field names to English

function normalizeDecision(raw: RawBigdatacorpDecision): BigdatacorpDecision {
  return {
    Date: raw.Data,
    Content: raw.Teor,
    Description: raw.Descricao
  };
}

function normalizePetition(raw: RawBigdatacorpPetition): BigdatacorpPetition {
  return {
    Date: raw.Data,
    Content: raw.Teor,
    Type: raw.Tipo
  };
}

function normalizeUpdate(raw: RawBigdatacorpUpdate): BigdatacorpUpdate {
  return {
    Date: raw.Data,
    Description: raw.Descricao,
    Content: raw.Teor,
    PublicationDate: raw.DataPublicacao,
    CaptureDate: raw.DataCaptura
  };
}

function normalizeParty(raw: RawBigdatacorpParty): BigdatacorpParty {
  return {
    Name: raw.Nome,
    Document: raw.Documento,
    Type: raw.Tipo,
    Polarity: raw.Polaridade,
    OAB: raw.OAB,
    OABState: raw.EstadoOAB
  };
}

function normalizeDecisions(data: any): BigdatacorpDecision[] {
  if (!data) return [];
  
  // If it's a wrapper object with Total and Items
  if (typeof data === 'object' && 'Total' in data) {
    const wrapper = data as BigdatacorpDecisionsWrapper;
    const items = wrapper.Items || [];
    return items.map(normalizeDecision);
  }
  
  // If already an array, check if it needs field name normalization
  if (Array.isArray(data)) {
    // Check if array items have Portuguese field names (needs normalization)
    if (data.length > 0 && data[0] && ('Data' in data[0] || 'Teor' in data[0] || 'Descricao' in data[0])) {
      return data.map(normalizeDecision);
    }
    // Already normalized (has English field names)
    return data as BigdatacorpDecision[];
  }
  
  return [];
}

function normalizePetitions(data: any): BigdatacorpPetition[] {
  if (!data) return [];
  
  if (typeof data === 'object' && 'Total' in data) {
    const wrapper = data as BigdatacorpPetitionsWrapper;
    const items = wrapper.Items || [];
    return items.map(normalizePetition);
  }
  
  if (Array.isArray(data)) {
    // Check if array items have Portuguese field names (needs normalization)
    if (data.length > 0 && data[0] && ('Data' in data[0] || 'Teor' in data[0] || 'Tipo' in data[0])) {
      return data.map(normalizePetition);
    }
    // Already normalized (has English field names)
    return data as BigdatacorpPetition[];
  }
  
  return [];
}

function normalizeUpdates(data: any): BigdatacorpUpdate[] {
  if (!data) return [];
  
  if (typeof data === 'object' && 'Total' in data) {
    const wrapper = data as BigdatacorpUpdatesWrapper;
    // API can return either Items or Rows
    const items = wrapper.Items || wrapper.Rows || [];
    return items.map(normalizeUpdate);
  }
  
  if (Array.isArray(data)) {
    // Check if array items have Portuguese field names (needs normalization)
    if (data.length > 0 && data[0] && ('Data' in data[0] || 'Descricao' in data[0] || 'Teor' in data[0] || 'DataPublicacao' in data[0])) {
      return data.map(normalizeUpdate);
    }
    // Already normalized (has English field names)
    return data as BigdatacorpUpdate[];
  }
  
  return [];
}

function normalizeParties(data: any): BigdatacorpParty[] {
  if (!data) return [];
  
  if (typeof data === 'object' && 'Total' in data) {
    const wrapper = data as BigdatacorpPartiesWrapper;
    const items = wrapper.Items || [];
    return items.map(normalizeParty);
  }
  
  if (Array.isArray(data)) {
    // Check if array items have Portuguese field names (needs normalization)
    if (data.length > 0 && data[0] && ('Nome' in data[0] || 'Documento' in data[0] || 'Tipo' in data[0] || 'Polaridade' in data[0])) {
      return data.map(normalizeParty);
    }
    // Already normalized (has English field names)
    return data as BigdatacorpParty[];
  }
  
  return [];
}

// Normalize a single party from BigDataCorp API format
// Maps PartyType→Type, PartyCategory→Polarity (BigDataCorp API uses different field names)
function normalizePartyFromAPI(raw: any): any {
  return {
    Name: raw.Name || raw.Nome,
    Document: raw.Document || raw.Documento || raw.Doc,
    Type: raw.PartyType || raw.Type || raw.Tipo,
    Polarity: raw.PartyCategory || raw.Polarity || raw.Polaridade,
    OAB: raw.OAB,
    OABState: raw.OABState || raw.EstadoOAB,
  };
}

// Normalize a single movement/update from BigDataCorp API format
// Maps Movements→Updates (BigDataCorp API uses "Movements" not "Updates")
function normalizeMovementFromAPI(raw: any): any {
  return {
    Date: raw.Date || raw.Data,
    Description: raw.Description || raw.Descricao,
    Content: raw.Content || raw.Teor,
    PublicationDate: raw.PublicationDate || raw.DataPublicacao,
    CaptureDate: raw.CaptureDate || raw.DataCaptura,
  };
}

// Normalize a single lawsuit from Portuguese/BigDataCorp API to English field names
function normalizeLawsuit(raw: any): any {
  const normalized: any = {};
  
  // Map Portuguese and BigDataCorp API field names to our standard English names
  const fieldMappings: Record<string, string> = {
    // Portuguese → English
    'Numero': 'Number',
    'NumeroProcesso': 'ProcessNumber',
    'Tribunal': 'Court',
    'NomeTribunal': 'CourtName',
    'TipoTribunal': 'CourtType',
    'NivelTribunal': 'CourtLevel',
    'DistritoTribunal': 'CourtDistrict',
    'SecaoTribunal': 'CourtSection',
    'Estado': 'State',
    'UF': 'State',
    'Situacao': 'Status',
    'StatusProcesso': 'Status',
    'Valor': 'Value',
    'Tipo': 'Type',
    'Classe': 'Class',
    'Area': 'Area',
    'Instancia': 'Instance',
    'Juiz': 'Judge',
    'OrgaoJulgador': 'JudgingBody',
    'DataCaptura': 'CaptureDate',
    'DataEncerramento': 'CloseDate',
    'DataUltimaMovimentacao': 'LastMovementDate',
    'DataUltimaAtualizacao': 'LastUpdate',
    'DataDistribuicao': 'NoticeDate',
    'DataPublicacao': 'PublicationDate',
    'DataRedistribuicao': 'RedistributionDate',
    'DataTransitoJulgado': 'ResJudicataDate',
    'Assunto': 'Subject',
    'AssuntoPrincipal': 'MainSubject',
    'CodigosAssunto': 'SubjectCodes',
    'AssuntoCNJ': 'InferredCNJSubjectName',
    'AssuntoCNJAmplo': 'InferredBroadCNJSubjectName',
    'TipoProcedimentoCNJ': 'InferredCNJProcedureTypeName',
    'IdadeProcesso': 'LawSuitAge',
    'NumeroPartes': 'NumberOfParties',
    'NumeroMovimentacoes': 'NumberOfUpdates',
    'NumeroPaginas': 'NumberOfPages',
    'NumeroVolumes': 'NumberOfVolumes',
    'MediaMovimentacoesMes': 'AverageNumberOfUpdatesPerMonth',
    'Partes': 'Parties',
    'Movimentacoes': 'Updates',
    'Decisoes': 'Decisions',
    'Peticoes': 'Petitions',
    // BigDataCorp API → English (different field names from their API)
    'CnjProcedureType': 'InferredCNJProcedureTypeName',
    'CnjSubject': 'InferredCNJSubjectName',
    'CnjBroadSubject': 'InferredBroadCNJSubjectName',
    'Movements': 'Updates', // BigDataCorp returns "Movements" not "Updates"
  };
  
  // Copy all fields, mapping to English where applicable
  for (const [key, value] of Object.entries(raw)) {
    const englishKey = fieldMappings[key] || key;
    normalized[englishKey] = value;
  }
  
  // Ensure Number field is set (might come from ProcessNumber)
  if (!normalized.Number && normalized.ProcessNumber) {
    normalized.Number = normalized.ProcessNumber;
  }
  
  // Normalize nested arrays (Decisions, Petitions, Updates/Movements, Parties)
  if (normalized.Decisions || raw.Decisoes) {
    normalized.Decisions = normalizeDecisions(normalized.Decisions || raw.Decisoes);
  }
  
  if (normalized.Petitions || raw.Peticoes) {
    normalized.Petitions = normalizePetitions(normalized.Petitions || raw.Peticoes);
  }
  
  // Handle Updates (can be "Updates", "Movements", or "Movimentacoes")
  const rawUpdates = normalized.Updates || raw.Movements || raw.Movimentacoes;
  if (rawUpdates) {
    if (Array.isArray(rawUpdates)) {
      normalized.Updates = rawUpdates.map(normalizeMovementFromAPI);
    } else if (typeof rawUpdates === 'object' && ('Total' in rawUpdates || 'Items' in rawUpdates)) {
      normalized.Updates = normalizeUpdates(rawUpdates);
    } else {
      normalized.Updates = [];
    }
  }
  
  // Handle Parties (can be "Parties" or "Partes")
  const rawParties = normalized.Parties || raw.Partes;
  if (rawParties) {
    if (Array.isArray(rawParties)) {
      // Check if parties need normalization (have BigDataCorp API format)
      if (rawParties.length > 0 && rawParties[0] && ('PartyType' in rawParties[0] || 'PartyCategory' in rawParties[0])) {
        normalized.Parties = rawParties.map(normalizePartyFromAPI);
      } else {
        normalized.Parties = normalizeParties(rawParties);
      }
    } else if (typeof rawParties === 'object' && ('Total' in rawParties || 'Items' in rawParties)) {
      normalized.Parties = normalizeParties(rawParties);
    } else {
      normalized.Parties = [];
    }
  }
  
  return normalized;
}

// Normalize the top-level Processes structure from Portuguese/BigDataCorp API to English
function normalizeProcessesStructure(processes: any): any {
  if (!processes) return processes;
  
  const normalized: any = {};
  
  // Map Portuguese and BigDataCorp API field names to English for the Processes object
  const fieldMappings: Record<string, string> = {
    // Portuguese field names
    'Processos': 'Lawsuits',
    'TotalProcessos': 'TotalLawsuits',
    'TotalProcessosComoAutor': 'TotalLawsuitsAsAuthor',
    'TotalProcessosComoReu': 'TotalLawsuitsAsDefendant',
    'TotalProcessosComoOutro': 'TotalLawsuitsAsOther',
    'PrimeiroProcessoData': 'FirstLawsuitDate',
    'UltimoProcessoData': 'LastLawsuitDate',
    'Ultimos30DiasProcessos': 'Last30DaysLawsuits',
    'Ultimos90DiasProcessos': 'Last90DaysLawsuits',
    'Ultimos180DiasProcessos': 'Last180DaysLawsuits',
    'Ultimos365DiasProcessos': 'Last365DaysLawsuits',
    // BigDataCorp API field names (different from our expected format)
    'ProcessList': 'Lawsuits',
    'TotalProcesses': 'TotalLawsuits',
    'NextPageId': 'NextPageId', // Keep pagination token
  };
  
  for (const [key, value] of Object.entries(processes)) {
    const englishKey = fieldMappings[key] || key;
    normalized[englishKey] = value;
  }
  
  // Ensure we have Lawsuits array (might come from ProcessList)
  if (!normalized.Lawsuits && processes.ProcessList) {
    normalized.Lawsuits = processes.ProcessList;
  }
  
  // Ensure we have TotalLawsuits (might come from TotalProcesses)
  if (normalized.TotalLawsuits === undefined && processes.TotalProcesses !== undefined) {
    normalized.TotalLawsuits = processes.TotalProcesses;
  }
  
  return normalized;
}

export function normalizeBigdatacorpResponse(apiResponse: any): any {
  if (!apiResponse || !apiResponse.Result) {
    return apiResponse;
  }

  const normalized = JSON.parse(JSON.stringify(apiResponse));
  
  normalized.Result.forEach((result: any) => {
    // Handle both "Processes" and "Processos" field names
    const rawProcesses = result.Processes || result.Processos;
    
    if (rawProcesses) {
      // First, normalize the top-level Processes structure
      const normalizedProcesses = normalizeProcessesStructure(rawProcesses);
      
      // Get the lawsuits array (could be "Lawsuits" or "Processos")
      const rawLawsuits = normalizedProcesses.Lawsuits || rawProcesses.Processos || rawProcesses.Lawsuits || [];
      
      // Log for debugging
      console.log(`[normalizeBigdatacorpResponse] Processing ${rawLawsuits.length} lawsuits`);
      
      // Normalize each lawsuit
      normalizedProcesses.Lawsuits = rawLawsuits.map((lawsuit: any) => normalizeLawsuit(lawsuit));
      
      // Ensure all required fields have values
      normalizedProcesses.TotalLawsuits = normalizedProcesses.TotalLawsuits ?? rawLawsuits.length;
      normalizedProcesses.TotalLawsuitsAsAuthor = normalizedProcesses.TotalLawsuitsAsAuthor ?? 0;
      normalizedProcesses.TotalLawsuitsAsDefendant = normalizedProcesses.TotalLawsuitsAsDefendant ?? 0;
      normalizedProcesses.TotalLawsuitsAsOther = normalizedProcesses.TotalLawsuitsAsOther ?? 0;
      
      // Assign the normalized Processes back to result
      result.Processes = normalizedProcesses;
      
      // Remove old Portuguese field if present
      if (result.Processos) {
        delete result.Processos;
      }
    }
  });
  
  return normalized;
}

export interface ComplianceCheckOptions {
  tenantId: string;
  leadId?: string;
  submissionId?: string;
  createdBy?: string;
  personName?: string; // Nome da pessoa (sempre enviado pelo frontend)
  personPhone?: string; // Telefone da pessoa (para sincronização de etiquetas WhatsApp)
  cacheExpirationDays?: number;
  forceNewRecord?: boolean; // Força criação de novo registro mesmo com cache hit (para automação)
  forceRefresh?: boolean; // Força nova consulta à API, ignorando cache completamente (atualiza dados)
}

export interface ComplianceCheckResult {
  checkId: string;
  status: ComplianceStatus;
  riskScore: number;
  fromCache: boolean;
  totalLawsuits: number;
  asAuthor: number;
  asDefendant: number;
  firstLawsuitDate?: string;
  lastLawsuitDate?: string;
  payload: any;
  consultedAt: Date;
  expiresAt: Date;
  basicData?: {
    name?: string;
    taxIdStatus?: string;
    birthDate?: string;
    motherName?: string;
    gender?: string;
    age?: number;
  };
  collections?: {
    totalOccurrences?: number;
    hasActiveCollections?: boolean;
    last12Months?: number;
    firstOccurrenceDate?: string;
    lastOccurrenceDate?: string;
  };
  apiCost?: number;
}

export interface RiskAnalysis {
  status: ComplianceStatus;
  riskScore: number;
  rejectionReason?: string;
}

async function getCachedCheckFromSupabase(
  cpfHash: string, 
  tenantId: string,
  context: {
    leadId?: string;
    submissionId?: string;
    createdBy?: string;
  } = {}
): Promise<DatacorpCheck | null> {
  try {
    const supabase = await getSupabaseMasterForTenant(tenantId);
    const tenantUUID = tenantIdToUUID(tenantId); // Convert to UUID for Supabase Master
    
    // STEP 1: Verificar se o PRÓPRIO tenant já consultou este CPF
    const { data: ownCheck, error: ownError } = await supabase
      .from('datacorp_checks')
      .select('*')
      .eq('cpf_hash', cpfHash)
      .eq('tenant_id', tenantUUID)
      .gt('expires_at', new Date().toISOString())
      .order('consulted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownError && ownError.code !== 'PGRST116') {
      log(`⚠️ Erro ao buscar cache do próprio tenant: ${ownError.message}`);
    }

    if (ownCheck) {
      log(`✅ Cache HIT (próprio tenant) - CPF hash: ${cpfHash.substring(0, 8)}...`);
      return ownCheck;
    }

    // STEP 2: Buscar cache GLOBAL (qualquer tenant que já consultou)
    const { data: globalCheck, error: globalError } = await supabase
      .from('datacorp_checks')
      .select('*')
      .eq('cpf_hash', cpfHash)
      .gt('expires_at', new Date().toISOString())
      .order('consulted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (globalError && globalError.code !== 'PGRST116') {
      log(`⚠️ Erro ao buscar cache global: ${globalError.message}`);
    }

    if (!globalCheck) {
      return null;
    }

    // ECONOMIA GLOBAL! CPF foi consultado por outro tenant
    const originalTenantId = globalCheck.tenant_id.substring(0, 8);
    log(`💰 ECONOMIA GLOBAL! CPF consultado originalmente por tenant ${originalTenantId}... | Hash: ${cpfHash.substring(0, 8)}... | Economia: R$ 0,05-0,07`);
    
    // VERIFICAÇÃO DE DUPLICIDADE (Race Condition Protection): 
    // Não criar se já existir uma entrada idêntica para o mesmo tenant nos últimos 15 segundos
    const { data: recentCheck } = await supabase
      .from('datacorp_checks')
      .select('id')
      .eq('cpf_hash', cpfHash)
      .eq('tenant_id', tenantUUID)
      .gt('consulted_at', new Date(Date.now() - 15000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentCheck) {
      log(`⚠️ Bloqueando criação de registro duplicado (race condition prevenida) | Check ID: ${recentCheck.id}`);
      return recentCheck as any;
    }

    // Criar entrada para o tenant atual (auditoria + aparece no dashboard dele)
    const { data: newTenantCheck, error: createError } = await supabase
      .from('datacorp_checks')
      .insert({
        cpf_hash: globalCheck.cpf_hash,
        cpf_encrypted: globalCheck.cpf_encrypted,
        tenant_id: tenantUUID, // Tenant atual (converted to UUID)
        lead_id: context.leadId || null,
        submission_id: context.submissionId || null,
        person_name: globalCheck.person_name, // Copiar nome
        person_cpf: globalCheck.person_cpf, // Copiar CPF formatado
        origin_check_id: globalCheck.id, // RASTREABILIDADE: aponta para consulta original
        status: globalCheck.status,
        risk_score: globalCheck.risk_score,
        payload: globalCheck.payload,
        consulted_at: new Date().toISOString(),
        expires_at: globalCheck.expires_at, // Mesma expiração do original
        source: `${globalCheck.source}_reused`, // Marca como reuso
        api_cost: 0.00, // ZERO - economia total!
        created_by: context.createdBy ? tenantIdToUUID(context.createdBy) : null, // Convert to UUID
      })
      .select()
      .single();

    if (createError) {
      // Se erro for por duplicação (race condition), tentar buscar entrada existente
      if (createError.code === '23505') { // Unique constraint violation
        log(`⚠️ Race condition detectada - entrada já existe para este tenant. Buscando...`);
        const { data: existingCheck } = await supabase
          .from('datacorp_checks')
          .select('*')
          .eq('cpf_hash', cpfHash)
          .eq('tenant_id', tenantUUID)
          .order('consulted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingCheck) {
          log(`✅ Entrada encontrada após race condition | Check ID: ${existingCheck.id}`);
          return existingCheck;
        }
      }
      
      log(`❌ ERRO ao criar entrada de reuso para tenant: ${createError.message}`);
      // Em caso de erro, retorna null para forçar nova consulta à API (segurança)
      return null;
    }

    log(`📋 Entrada de reuso criada | Tenant: ${tenantId.substring(0, 8)}... | Check ID: ${newTenantCheck.id} | Origin: ${globalCheck.id}`);
    
    // Criar log de auditoria para o reuso
    await createAuditLogInSupabase({
      checkId: newTenantCheck.id,
      tenantId,
      action: "check",
      userId: context.createdBy,
    });
    
    return newTenantCheck;

  } catch (error: any) {
    log(`❌ Exceção ao buscar cache no Supabase MESTRE: ${error.message}`);
    return null;
  }
}

/**
 * DEDUPLICATION: Check if a CPF check already exists for a specific submission_id.
 * This is the centralized guard that prevents duplicate API calls from multiple triggers
 * (LeadSync, CPFPoller, FormsAutomation, etc.)
 * 
 * IMPORTANT: Checks BOTH Supabase Master (datacorp_checks) AND Supabase Client (cpf_compliance_results)
 * to handle cases where Master save fails but Client save succeeds.
 * 
 * @param submissionId - The form submission ID
 * @param tenantId - The tenant ID
 * @returns The existing check if found, null otherwise
 */
async function getExistingCheckForSubmission(
  submissionId: string,
  tenantId: string
): Promise<DatacorpCheck | null> {
  try {
    // STEP 1: Check in Supabase Master (datacorp_checks)
    const supabase = await getSupabaseMasterForTenant(tenantId);
    const tenantUUID = tenantIdToUUID(tenantId);
    
    const { data: existingCheck, error } = await supabase
      .from('datacorp_checks')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantUUID)
      .order('consulted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      log(`⚠️ [DEDUP] Erro ao verificar check no Master para submission ${submissionId}: ${error.message}`);
    }
    
    if (existingCheck) {
      log(`🛡️ [DEDUP] Check já existe no MASTER para submission ${submissionId} - Check ID: ${existingCheck.id} | Status: ${existingCheck.status}`);
      return existingCheck;
    }
    
    // STEP 2: FALLBACK - Check in Supabase Client (cpf_compliance_results)
    // This handles cases where Master save fails but Client save succeeds
    // We check by check_id that matches submission_id format, or by recent CPF check
    try {
      const { getClienteSupabase, isClienteSupabaseConfigured } = await import('./clienteSupabase.js');
      const isConfigured = await isClienteSupabaseConfigured();
      
      if (isConfigured) {
        const clienteSupabase = await getClienteSupabase();
        
        // Check for compliance result with the SAME submission_id
        // This is the reliable deduplication that prevents duplicate API calls for the same form submission
        const { data: existingClienteCheck, error: clienteError } = await clienteSupabase
          .from('cpf_compliance_results')
          .select('*')
          .eq('submission_id', submissionId)
          .order('data_consulta', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (clienteError && clienteError.code !== 'PGRST116') {
          log(`⚠️ [DEDUP] Erro ao verificar check por submission_id no Cliente: ${clienteError.message}`);
        }
        
        if (existingClienteCheck) {
          log(`🛡️ [DEDUP] Check já existe no CLIENTE para submission ${submissionId} - ID: ${existingClienteCheck.id} | Status: ${existingClienteCheck.status}`);
          log(`   💰 ECONOMIA: R$ 0,05-0,07 (evitou consulta duplicada para mesma submission)`);
          // Convert to DatacorpCheck format for compatibility
          return {
            id: existingClienteCheck.id,
            cpf_hash: '',
            cpf_encrypted: '',
            tenant_id: tenantUUID,
            status: existingClienteCheck.status,
            risk_score: parseFloat(existingClienteCheck.risco || '0'),
            payload: null,
            consulted_at: new Date(existingClienteCheck.data_consulta),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            source: 'cliente_fallback_submission',
            api_cost: 0,
            person_name: existingClienteCheck.nome,
            person_cpf: existingClienteCheck.cpf,
            submission_id: submissionId,
            _from_cliente: true,
          } as DatacorpCheck;
        }
      }
    } catch (clienteErr: any) {
      log(`⚠️ [DEDUP] Erro ao verificar no Supabase Cliente: ${clienteErr.message}`);
    }
    
    return null;
  } catch (error: any) {
    log(`❌ [DEDUP] Exceção ao verificar check existente: ${error.message}`);
    return null;
  }
}

async function ensureTenantExistsInMaster(supabase: any, tenantId: string, tenantUUID: string): Promise<void> {
  try {
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantUUID)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      log(`⚠️ [TENANT] Erro ao verificar tenant: ${checkError.message}`);
    }
    
    if (!existingTenant) {
      log(`📋 [TENANT] Criando tenant ${tenantId} (UUID: ${tenantUUID.substring(0, 8)}...) no Supabase Master...`);
      const { error: insertError } = await supabase
        .from('tenants')
        .insert({
          id: tenantUUID,
          name: tenantId,
          slug: tenantId.replace(/_/g, '-'),
          is_active: true,
          created_at: new Date().toISOString()
        });
      
      if (insertError && !insertError.message?.includes('duplicate')) {
        log(`⚠️ [TENANT] Erro ao criar tenant: ${insertError.message}`);
      } else if (!insertError) {
        log(`✅ [TENANT] Tenant criado com sucesso no Supabase Master`);
      }
    }
  } catch (error: any) {
    log(`⚠️ [TENANT] Exceção ao garantir tenant: ${error.message}`);
  }
}

async function createCheckInSupabase(checkData: {
  cpfHash: string;
  cpfEncrypted: string;
  tenantId: string;
  leadId?: string;
  submissionId?: string;
  status: ComplianceStatus;
  riskScore: number;
  payload: any;
  expiresAt: Date;
  source: string;
  apiCost: number;
  createdBy?: string;
  personName?: string;
  personCpf?: string;
  originCheckId?: string;
  consultedAt?: Date;
}): Promise<DatacorpCheck> {
  const supabase = await getSupabaseMasterForTenant(checkData.tenantId);
  const tenantUUID = tenantIdToUUID(checkData.tenantId);
  
  await ensureTenantExistsInMaster(supabase, checkData.tenantId, tenantUUID);
  
  const { data, error} = await supabase
    .from('datacorp_checks')
    .insert({
      cpf_hash: checkData.cpfHash,
      cpf_encrypted: checkData.cpfEncrypted,
      tenant_id: tenantUUID,
      lead_id: checkData.leadId || null,
      submission_id: checkData.submissionId || null,
      person_name: checkData.personName,
      person_cpf: checkData.personCpf,
      status: checkData.status,
      risk_score: checkData.riskScore,
      payload: checkData.payload,
      consulted_at: (checkData.consultedAt || new Date()).toISOString(),
      expires_at: checkData.expiresAt.toISOString(),
      source: checkData.source,
      api_cost: checkData.apiCost,
      created_by: checkData.createdBy ? tenantIdToUUID(checkData.createdBy) : null,
      origin_check_id: checkData.originCheckId || null,
    })
    .select()
    .single();

  if (error) {
    log(`Erro ao criar check no Supabase MESTRE: ${error.message}`);
    
    // Se erro é de foreign key ou tabela não existe, fazer fallback para salvar localmente
    if (error.message?.includes('foreign key') || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      log(`⚠️ [FALLBACK] Erro de constraint no Master - gerando UUID v4 e continuando...`);
      
      // Gerar UUID v4 válido para continuar o fluxo
      const fallbackId = crypto.randomUUID();
      
      return {
        id: fallbackId,
        cpf_hash: checkData.cpfHash,
        cpf_encrypted: checkData.cpfEncrypted,
        tenant_id: tenantUUID,
        status: checkData.status,
        risk_score: checkData.riskScore,
        payload: checkData.payload,
        consulted_at: checkData.consultedAt || new Date(),
        expires_at: checkData.expiresAt,
        source: checkData.source,
        api_cost: checkData.apiCost,
        person_name: checkData.personName,
        person_cpf: checkData.personCpf,
        _fallback: true, // Marca que é um fallback
      } as DatacorpCheck;
    }
    
    throw new Error(`Falha ao salvar no Supabase MESTRE: ${error.message}`);
  }

  return data;
}

async function createAuditLogInSupabase(logData: {
  checkId: string;
  tenantId: string;
  action: 'view' | 'check' | 'reprocess' | 'export' | 'delete';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    // Validar se userId é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserId = logData.userId && uuidRegex.test(logData.userId) ? logData.userId : null;
    
    const tenantUUID = tenantIdToUUID(logData.tenantId);
    
    const supabase = await getSupabaseMasterForTenant(logData.tenantId);
    const { error } = await supabase
      .from('compliance_audit_log')
      .insert({
        check_id: logData.checkId,
        tenant_id: tenantUUID,
        action: logData.action,
        user_id: validUserId,
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent,
      });

    if (error) {
      log(`Erro ao criar audit log no Supabase MESTRE: ${error.message}`);
    }
  } catch (error: any) {
    log(`Exceção ao criar audit log no Supabase MESTRE: ${error.message}`);
  }
}

// Extrai o nome da pessoa do payload do Bigdatacorp
function extractPersonName(response: BigdatacorpProcessesResponse): string | null {
  const lawsuits = response.Result?.[0]?.Processes?.Lawsuits || [];
  
  // Tentar extrair o nome das partes dos processos
  for (const lawsuit of lawsuits) {
    if (lawsuit.Parties && lawsuit.Parties.length > 0) {
      for (const party of lawsuit.Parties) {
        if (party.Name && party.Name.length > 3) {
          // Retornar o primeiro nome válido encontrado
          return party.Name.trim();
        }
      }
    }
  }
  
  return null;
}

export function calculateUnifiedRiskScore(
  processData: any,        // from payload.Result[0].Processes
  basicData: any,          // from payload._basic_data.Result[0].BasicData
  collectionsData: any     // from payload._collections.Result[0].Collections
): number {
  // ============================================
  // JUDICIAL PROCESSES (60% weight)
  // ============================================
  let processScore = 0;
  
  if (processData) {
    const lawsuits = processData.Lawsuits || [];
    const totalAsDefendant = processData.TotalLawsuitsAsDefendant || 0;
    const totalLawsuits = processData.TotalLawsuits || 0;
    
    // +2 points per lawsuit as defendant (max 6)
    processScore += Math.min(totalAsDefendant * 2, 6);
    
    // +1 point per active lawsuit (max 4)
    const activeLawsuits = lawsuits.filter((l: any) => 
      l.Status && 
      !l.Status.toLowerCase().includes("arquivado") && 
      !l.Status.toLowerCase().includes("baixado") &&
      !l.Status.toLowerCase().includes("encerrado")
    );
    processScore += Math.min(activeLawsuits.length, 4);
    
    // +1 if any lawsuit in last 12 months
    const last365Days = processData.Last365DaysLawsuits || 0;
    if (last365Days > 0) {
      processScore += 1;
    }
    
    // +3 if any criminal lawsuits
    const criminalLawsuits = lawsuits.filter((l: any) => 
      l.CourtType?.toLowerCase().includes("criminal")
    );
    if (criminalLawsuits.length > 0) {
      processScore += 3;
    }
    
    // +1 if total lawsuits > 5
    if (totalLawsuits > 5) {
      processScore += 1;
    }
  }
  
  // Cap at 10
  processScore = Math.min(processScore, 10);
  
  // ============================================
  // COLLECTIONS/FINANCIAL (30% weight)
  // ============================================
  let collectionsScore = 0;
  
  if (collectionsData) {
    // +4 if HasActiveCollections is true
    if (collectionsData.HasActiveCollections === true) {
      collectionsScore += 4;
    }
    
    // +0.5 per TotalOccurrences (max 3)
    const totalOccurrences = collectionsData.TotalOccurrences || 0;
    collectionsScore += Math.min(totalOccurrences * 0.5, 3);
    
    // +2 if occurrences in last 6 months (approximating from Last3Months or Last12Months)
    const last3Months = collectionsData.Last3Months || 0;
    const last12Months = collectionsData.Last12Months || 0;
    if (last3Months > 0 || (last12Months > 0 && last12Months >= last3Months)) {
      collectionsScore += 2;
    }
    
    // +1 if ConsecutiveMonths > 6
    const consecutiveMonths = collectionsData.ConsecutiveMonths || 0;
    if (consecutiveMonths > 6) {
      collectionsScore += 1;
    }
  }
  
  // Cap at 10
  collectionsScore = Math.min(collectionsScore, 10);
  
  // ============================================
  // BASIC DATA (10% weight)
  // ============================================
  let basicDataScore = 0;
  
  if (basicData) {
    const taxIdStatus = basicData.TaxIdStatus || '';
    
    // +5 if TaxIdStatus !== "Regular"
    if (taxIdStatus && taxIdStatus !== 'Regular') {
      basicDataScore += 5;
      
      // +3 if CPF is blocked/suspended (additional penalty for severe status)
      const blockedStatuses = ['Suspensa', 'Cancelada', 'Nula', 'Pendente de Regularização'];
      if (blockedStatuses.some(s => taxIdStatus.includes(s))) {
        basicDataScore += 3;
      }
    }
    
    // +2 if missing critical data (birthdate, mother name)
    const hasBirthDate = !!basicData.BirthDate;
    const hasMotherName = !!basicData.MotherName;
    if (!hasBirthDate || !hasMotherName) {
      basicDataScore += 2;
    }
  } else {
    // If no basic data available at all, consider it as missing critical data
    basicDataScore += 2;
  }
  
  // Cap at 10
  basicDataScore = Math.min(basicDataScore, 10);
  
  // ============================================
  // WEIGHTED FINAL SCORE
  // ============================================
  const weightedScore = (processScore * 0.6) + (collectionsScore * 0.3) + (basicDataScore * 0.1);
  
  // Clamp to 1-10 range (minimum 1, maximum 10)
  const finalScore = Math.max(1, Math.min(10, weightedScore));
  
  return parseFloat(finalScore.toFixed(2));
}

// ============================================
// BRAZILIAN-FRIENDLY DEBT ANALYSIS - VALUE-BASED TIERS
// ============================================
// REDESIGNED for Brazilian reality where debt is common and recoverable.
// The goal is to find people who might STEAL the briefcase or NOT PAY,
// NOT to reject everyone with small consumer debts.
//
// KEY PRINCIPLES:
// 1. Up to R$4,000 debt is NORMAL for Brazilians - 0 rejection points
// 2. Small debt ALONE does not reject - only small debt + multiple other risky processes
// 3. Theft/fraud = instant rejection (unchanged)
// 4. Divorce, family disputes, simple civil matters = 0 points (normal life events)

// NEW RECALIBRATED THRESHOLDS - Much more lenient for Brazilian context
const DEBT_THRESHOLDS = {
  LOW: 4000,        // R$4,000 - Normal Brazilian consumer debt - 0 REJECTION POINTS
  MEDIUM: 15000,    // R$15,000 - Moderate debts - observation only, does NOT reject alone
  HIGH: 40000,      // R$40,000 - Significant single debt - rejects only if RECENT + multiple processes
  CRITICAL: 60000,  // R$60,000 - Very high cumulative debt - rejects only if active
};

// BENIGN PROCESS KEYWORDS - These are normal life events, NOT risk indicators
// Divorce, family disputes, labor claims as plaintiff, simple civil matters
const BENIGN_PROCESS_KEYWORDS = [
  // Family/Divorce
  'divórcio', 'divorcio', 'separação', 'separacao', 'guarda', 'pensão alimentícia',
  'pensao alimenticia', 'alimentos', 'união estável', 'uniao estavel', 'família',
  'familia', 'casamento', 'patrimônio', 'patrimonio', 'partilha de bens',
  // Labor (as plaintiff - suing employer is GOOD, not bad)
  'reclamação trabalhista', 'reclamacao trabalhista', 'direitos trabalhistas',
  'rescisão', 'rescisao', 'horas extras', 'verbas rescisórias', 'verbas rescisorias',
  'fgts', 'inss', 'aviso prévio', 'aviso previo',
  // Simple Civil
  'consumidor', 'dano moral', 'indenização', 'indenizacao', 'acidente de trânsito',
  'acidente de transito', 'plano de saúde', 'plano de saude', 'telefonia',
  'cartão de crédito', 'cartao de credito', 'cobrança indevida', 'cobranca indevida',
  'negativação indevida', 'negativacao indevida', 'serviços', 'servicos',
  // Inventory/Succession
  'inventário', 'inventario', 'herança', 'heranca', 'sucessão', 'sucessao',
  'espólio', 'espolio', 'testamento', 'herdeiro',
];

// Time-based decay factors (older debts are MUCH less concerning)
// People can recover financially - give them a second chance
const RECENCY_DECAY = {
  RECENT_MONTHS: 12,      // Last 12 months = full weight (100%)
  MODERATE_MONTHS: 24,    // 12-24 months = 50% weight (reduced from 70%)
  OLD_MONTHS: 36,         // 24-36 months = 25% weight (reduced from 40%)
  VERY_OLD_FACTOR: 0.1,   // >36 months = 10% weight (reduced from 20%)
};

interface DebtAnalysis {
  totalActiveDebt: number;           // Sum of active debt values
  totalResolvedDebt: number;         // Sum of resolved/archived debt values
  activeDebtCount: number;           // Number of active debt cases
  resolvedDebtCount: number;         // Number of resolved cases
  recentActiveDebt: number;          // Active debt from last 12 months
  highestSingleDebt: number;         // Largest individual debt amount
  asDefendantCount: number;          // Times as defendant (being sued for money)
  asPlaintiffCount: number;          // Times as plaintiff (suing for money owed to them)
  oldestActiveDebtMonths: number;    // How old is the oldest active debt
  consecutiveDefaultMonths: number;  // Consecutive months in default
  debtTier: 'low' | 'medium' | 'high' | 'critical';
  weightedScore: number;             // Final weighted score considering all factors
}

/**
 * Calculates months since a date string
 */
function monthsSinceDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 999; // Unknown = treat as old
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    return Math.max(0, months);
  } catch {
    return 999;
  }
}

/**
 * Gets recency decay factor based on months ago
 */
function getRecencyDecay(monthsAgo: number): number {
  if (monthsAgo <= RECENCY_DECAY.RECENT_MONTHS) return 1.0;
  if (monthsAgo <= RECENCY_DECAY.MODERATE_MONTHS) return 0.5;  // 50% for 12-24 months
  if (monthsAgo <= RECENCY_DECAY.OLD_MONTHS) return 0.25;      // 25% for 24-36 months
  return RECENCY_DECAY.VERY_OLD_FACTOR;                        // 10% for >36 months
}

/**
 * Checks if a lawsuit is resolved/archived (no longer active)
 */
function isLawsuitResolved(lawsuit: any): boolean {
  const status = (lawsuit.Status || '').toLowerCase();
  return status.includes('arquivado') || 
         status.includes('baixado') || 
         status.includes('encerrado') || 
         status.includes('extinto') ||
         status.includes('transitado') ||
         status.includes('cumprido');
}

/**
 * Checks if person is defendant (being sued) vs plaintiff (suing)
 */
function isDefendantInLawsuit(lawsuit: any): boolean {
  const parties = lawsuit.Parties || [];
  return parties.some((p: any) => {
    const polarity = (p.Polarity || '').toLowerCase();
    const type = (p.Type || '').toLowerCase();
    return polarity === 'passivo' || 
           polarity === 'réu' || 
           polarity === 'reu' ||
           type.includes('executado') ||
           type.includes('devedor');
  });
}

/**
 * Analyzes debt-related lawsuits with VALUE consideration
 * Returns detailed analysis for flexible risk assessment
 */
function analyzeDebtLawsuits(lawsuits: any[]): DebtAnalysis {
  let totalActiveDebt = 0;
  let totalResolvedDebt = 0;
  let activeDebtCount = 0;
  let resolvedDebtCount = 0;
  let recentActiveDebt = 0;
  let highestSingleDebt = 0;
  let asDefendantCount = 0;
  let asPlaintiffCount = 0;
  let oldestActiveDebtMonths = 0;

  for (const lawsuit of lawsuits) {
    // Check if this is a debt-related lawsuit
    const analysis = analyzeLawsuitContent(lawsuit);
    if (!analysis.hasDebt) continue;

    const value = lawsuit.Value || 0;
    const isResolved = isLawsuitResolved(lawsuit);
    const isDefendant = isDefendantInLawsuit(lawsuit);
    const monthsAgo = monthsSinceDate(lawsuit.LastMovementDate || lawsuit.NoticeDate);
    const decayFactor = getRecencyDecay(monthsAgo);

    // Track plaintiff vs defendant
    if (isDefendant) {
      asDefendantCount++;
    } else {
      asPlaintiffCount++;
    }

    // Only count defendant cases as risk (being sued for money)
    if (!isDefendant) continue;

    if (isResolved) {
      totalResolvedDebt += value * decayFactor;
      resolvedDebtCount++;
    } else {
      totalActiveDebt += value;
      activeDebtCount++;
      if (monthsAgo <= 12) {
        recentActiveDebt += value;
      }
      if (monthsAgo > oldestActiveDebtMonths) {
        oldestActiveDebtMonths = monthsAgo;
      }
    }

    if (value > highestSingleDebt) {
      highestSingleDebt = value;
    }
  }

  // BRAZILIAN-FRIENDLY DEBT TIERS:
  // - Low (≤R$4k): ZERO risk - this is NORMAL for Brazilians
  // - Medium (R$4k-15k): Minimal observation only
  // - High (R$15k-40k): Some concern but doesn't reject alone
  // - Critical (>R$60k): High concern
  let debtTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (totalActiveDebt >= DEBT_THRESHOLDS.CRITICAL) {
    debtTier = 'critical';
  } else if (totalActiveDebt >= DEBT_THRESHOLDS.HIGH) {
    debtTier = 'high';
  } else if (totalActiveDebt >= DEBT_THRESHOLDS.MEDIUM) {
    debtTier = 'medium';
  }
  // Note: ≤R$4k stays as 'low' tier with ZERO contribution

  // BRAZILIAN-FRIENDLY weighted score (0-10 scale)
  // Designed to NOT penalize normal consumer debt levels
  let weightedScore = 0;

  // Score based on debt tier - MUCH MORE LENIENT
  switch (debtTier) {
    case 'critical': weightedScore += 3; break;   // Reduced from 4
    case 'high': weightedScore += 1.5; break;     // Reduced from 2.5
    case 'medium': weightedScore += 0.5; break;   // Reduced from 1.5
    case 'low': weightedScore += 0; break;        // ZERO for ≤R$4k
  }

  // Only add points for excessive defendant cases (5+, not 1)
  if (asDefendantCount >= 5) {
    weightedScore += Math.min((asDefendantCount - 4) * 0.3, 2);
  }

  // Only penalize VERY recent VERY high active debt
  // NOT normal consumer debt levels
  if (recentActiveDebt >= DEBT_THRESHOLDS.HIGH) {
    weightedScore += 1.5;
  } else if (recentActiveDebt >= DEBT_THRESHOLDS.MEDIUM) {
    weightedScore += 0.5;
  }
  // Note: recentActiveDebt < R$15k = ZERO additional points

  // BONUS: Resolved debts show responsibility - bigger reduction
  if (resolvedDebtCount > activeDebtCount && activeDebtCount <= 3) {
    weightedScore *= 0.5; // 50% reduction for improving financial behavior
  }

  // Cap at 10
  weightedScore = Math.min(weightedScore, 10);

  return {
    totalActiveDebt,
    totalResolvedDebt,
    activeDebtCount,
    resolvedDebtCount,
    recentActiveDebt,
    highestSingleDebt,
    asDefendantCount,
    asPlaintiffCount,
    oldestActiveDebtMonths,
    consecutiveDefaultMonths: 0, // Will be filled from collections data
    debtTier,
    weightedScore: parseFloat(weightedScore.toFixed(2)),
  };
}

/**
 * BRAZILIAN-FRIENDLY Collections Analysis
 * 
 * REDESIGNED: Much more lenient thresholds
 * - Up to R$4k debt = ZERO risk contribution (normal for Brazilians)
 * - R$4k-15k = minimal observation only
 * - Only HIGH RISK if: >R$60k debt AND prolonged (>24 months consecutive)
 */
function analyzeCollectionsFlexible(collectionsData: any): {
  totalValue: number;
  isHighRisk: boolean;
  isMediumRisk: boolean;
  scoreContribution: number;
  details: string;
} {
  if (!collectionsData) {
    return { totalValue: 0, isHighRisk: false, isMediumRisk: false, scoreContribution: 0, details: 'Sem dados de cobrança' };
  }

  const hasActive = collectionsData.HasActiveCollections === true;
  const totalOccurrences = collectionsData.TotalOccurrences || 0;
  const consecutiveMonths = collectionsData.ConsecutiveMonths || 0;
  const last12Months = collectionsData.Last12Months || 0;
  
  // Try to get total value from collection details if available
  let totalValue = 0;
  if (collectionsData.CollectionDetails && Array.isArray(collectionsData.CollectionDetails)) {
    totalValue = collectionsData.CollectionDetails.reduce((sum: number, c: any) => sum + (c.Value || 0), 0);
  }

  let scoreContribution = 0;
  let details: string[] = [];

  // BRAZILIAN-FRIENDLY THRESHOLDS:
  // - Up to R$4k = ZERO contribution (normal consumer debt)
  // - R$4k-15k = 0.5 points (observation only)
  // - R$15k-40k = 1 point 
  // - R$40k-60k = 2 points
  // - HIGH RISK only if: >R$60k AND prolonged (>24 months)

  // HIGH RISK: Only for VERY high value (>R$60k) AND VERY prolonged (>24 months)
  // This is a pattern of severe financial irresponsibility
  const isHighRisk = hasActive && totalValue >= 60000 && consecutiveMonths > 24;
  
  // MEDIUM RISK: High value (>R$40k) OR many occurrences (8+ in 12 months)
  // NOT triggered by normal consumer debt levels
  const isMediumRisk = hasActive && (totalValue >= 40000 || (last12Months >= 8 && totalOccurrences >= 10));

  if (isHighRisk) {
    scoreContribution = 3;
    details.push(`Dívidas muito elevadas: R$ ${totalValue.toLocaleString('pt-BR')} por ${consecutiveMonths} meses`);
  } else if (isMediumRisk) {
    scoreContribution = 1.5;
    details.push(`Cobranças de valor moderado: R$ ${totalValue.toLocaleString('pt-BR')}`);
  } else if (hasActive && totalValue > DEBT_THRESHOLDS.MEDIUM) {
    // R$15k-40k: low concern
    scoreContribution = 1;
    details.push(`Cobranças ativas: R$ ${totalValue.toLocaleString('pt-BR')}`);
  } else if (hasActive && totalValue > DEBT_THRESHOLDS.LOW) {
    // R$4k-15k: minimal observation
    scoreContribution = 0.5;
    details.push(`Cobranças ativas de baixo valor`);
  } else if (hasActive && totalValue <= DEBT_THRESHOLDS.LOW) {
    // Up to R$4k: ZERO contribution - this is NORMAL for Brazilians
    scoreContribution = 0;
    details.push(`Cobranças de valor normal (≤R$4k)`);
  } else if (totalOccurrences > 0) {
    // Resolved collections = ZERO risk (person paid off debts!)
    scoreContribution = 0;
    details.push(`Histórico de cobranças resolvidas - positivo`);
  }

  return {
    totalValue,
    isHighRisk,
    isMediumRisk,
    scoreContribution: parseFloat(scoreContribution.toFixed(2)),
    details: details.join('; ') || 'Sem cobranças significativas',
  };
}

// ============================================
// RESELLER VETTING - KEYWORD DETECTION
// ============================================
// These keywords indicate HIGH RISK for jewelry reseller candidates
// who will be trusted with valuable inventory (maletas de semijoias)

const THEFT_KEYWORDS = [
  'furto', 'roubo', 'apropriação indébita', 'apropriacao indebita',
  'receptação', 'receptacao', 'latrocínio', 'latrocinio',
  'subtração', 'subtracao', 'desvio de mercadoria', 'desvio de bens',
  'peculato', 'apoderamento', 'assalto'
];

const FRAUD_KEYWORDS = [
  'estelionato', 'fraude', 'falsificação', 'falsificacao', 'golpe',
  'falsidade ideológica', 'falsidade ideologica', 'adulteração', 'adulteracao',
  'documento falso', 'cheque sem fundo', 'cheque sem fundos',
  'calote', 'piramide financeira', 'pirâmide financeira', 'esquema ponzi',
  'sonegação', 'sonegacao', 'lavagem de dinheiro', 'crime financeiro',
  'apropriação de valores', 'apropriacao de valores', 'desvio de dinheiro',
  'falsidade documental', 'uso de documento falso', 'crimes contra a fé pública',
  'crimes contra a fe publica', 'falsificação de documento', 'contrafação'
];

const DEBT_KEYWORDS = [
  'inadimplência', 'inadimplencia', 'execução fiscal', 'execucao fiscal',
  'dívida ativa', 'divida ativa', 'cobrança', 'cobranca',
  'título executivo', 'titulo executivo', 'protesto', 'negativação',
  'negativacao', 'spc', 'serasa', 'credor', 'devedor',
  'execução de título', 'execucao de titulo', 'penhora', 'insolvência',
  'insolvencia', 'falência', 'falencia', 'recuperação judicial'
];

const VIOLENT_CRIME_KEYWORDS = [
  'homicídio', 'homicidio', 'lesão corporal grave', 'lesao corporal grave',
  'sequestro', 'cárcere privado', 'carcere privado', 'tortura',
  'extorsão', 'extorsao', 'ameaça', 'ameaca'
];

const DRUG_KEYWORDS = [
  'tráfico', 'trafico', 'entorpecentes', 'drogas', 'narcotráfico',
  'narcotrafico', 'associação para o tráfico', 'associacao para o trafico'
];

/**
 * Checks if any text contains keywords from a list (case-insensitive)
 */
function containsKeywords(text: string | null | undefined, keywords: string[]): string | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

/**
 * Analyzes a lawsuit for high-risk indicators relevant to reseller vetting
 * Returns an object with detected risk categories and matched keywords
 * 
 * UPDATED: Now includes 'benign' category for normal life events
 * that should NOT count against candidates (divorce, labor claims, etc.)
 */
function analyzeLawsuitContent(lawsuit: any): {
  hasTheft: boolean;
  hasFraud: boolean;
  hasDebt: boolean;
  hasViolentCrime: boolean;
  hasDrugCrime: boolean;
  isBenign: boolean;
  matchedKeywords: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'benign';
} {
  const textsToAnalyze: string[] = [];
  
  // Collect all text content from the lawsuit
  if (lawsuit.Subject) textsToAnalyze.push(lawsuit.Subject);
  if (lawsuit.MainSubject) textsToAnalyze.push(lawsuit.MainSubject);
  if (lawsuit.Type) textsToAnalyze.push(lawsuit.Type);
  if (lawsuit.Class) textsToAnalyze.push(lawsuit.Class);
  if (lawsuit.Area) textsToAnalyze.push(lawsuit.Area);
  if (lawsuit.InferredCNJSubjectName) textsToAnalyze.push(lawsuit.InferredCNJSubjectName);
  if (lawsuit.InferredBroadCNJSubjectName) textsToAnalyze.push(lawsuit.InferredBroadCNJSubjectName);
  
  // Analyze Updates content
  if (lawsuit.Updates && Array.isArray(lawsuit.Updates)) {
    lawsuit.Updates.forEach((update: any) => {
      if (update.Description) textsToAnalyze.push(update.Description);
      if (update.Content) textsToAnalyze.push(update.Content);
    });
  }
  
  // Analyze Decisions content
  if (lawsuit.Decisions && Array.isArray(lawsuit.Decisions)) {
    lawsuit.Decisions.forEach((decision: any) => {
      if (decision.Description) textsToAnalyze.push(decision.Description);
      if (decision.Content) textsToAnalyze.push(decision.Content);
    });
  }
  
  // Analyze Petitions content
  if (lawsuit.Petitions && Array.isArray(lawsuit.Petitions)) {
    lawsuit.Petitions.forEach((petition: any) => {
      if (petition.Content) textsToAnalyze.push(petition.Content);
      if (petition.Type) textsToAnalyze.push(petition.Type);
    });
  }
  
  const combinedText = textsToAnalyze.join(' ');
  const matchedKeywords: string[] = [];
  
  // Check each category
  const theftMatch = containsKeywords(combinedText, THEFT_KEYWORDS);
  const fraudMatch = containsKeywords(combinedText, FRAUD_KEYWORDS);
  const debtMatch = containsKeywords(combinedText, DEBT_KEYWORDS);
  const violentMatch = containsKeywords(combinedText, VIOLENT_CRIME_KEYWORDS);
  const drugMatch = containsKeywords(combinedText, DRUG_KEYWORDS);
  const benignMatch = containsKeywords(combinedText, BENIGN_PROCESS_KEYWORDS);
  
  if (theftMatch) matchedKeywords.push(`furto/roubo: ${theftMatch}`);
  if (fraudMatch) matchedKeywords.push(`fraude: ${fraudMatch}`);
  if (debtMatch) matchedKeywords.push(`dívida: ${debtMatch}`);
  if (violentMatch) matchedKeywords.push(`violência: ${violentMatch}`);
  if (drugMatch) matchedKeywords.push(`drogas: ${drugMatch}`);
  if (benignMatch) matchedKeywords.push(`benigno: ${benignMatch}`);
  
  // Determine risk level based on detected categories
  let riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'benign' = 'low';
  
  // CRITICAL: Theft or fraud - direct rejection for resellers
  if (theftMatch || fraudMatch) {
    riskLevel = 'critical';
  }
  // HIGH: Violent crimes or drug crimes
  else if (violentMatch || drugMatch) {
    riskLevel = 'high';
  }
  // BENIGN: Normal life events (divorce, labor claims as plaintiff, civil matters)
  // These should NOT count against the candidate AT ALL
  else if (benignMatch && !debtMatch) {
    riskLevel = 'benign';
  }
  // MEDIUM: Debt issues (but NOT if it's a benign debt like consumer complaint)
  else if (debtMatch && !benignMatch) {
    riskLevel = 'medium';
  }
  // LOW: If has debt keywords but also benign keywords, it's likely consumer/civil matter
  else if (debtMatch && benignMatch) {
    riskLevel = 'low';
  }
  
  // Check if this is a BENIGN process overall
  const isBenign = riskLevel === 'benign' || (!!benignMatch && !theftMatch && !fraudMatch && !violentMatch && !drugMatch);
  
  return {
    hasTheft: !!theftMatch,
    hasFraud: !!fraudMatch,
    hasDebt: !!debtMatch,
    hasViolentCrime: !!violentMatch,
    hasDrugCrime: !!drugMatch,
    isBenign,
    matchedKeywords,
    riskLevel
  };
}

/**
 * BRAZILIAN-FRIENDLY RESELLER VETTING - PRIORITIZES APPROVALS
 * 
 * REDESIGNED for Brazilian reality where:
 * - Debt up to R$4,000 is NORMAL and easily reversible - 0 points
 * - Divorce, family disputes, labor claims = normal life events - 0 points
 * - Small debt ALONE does NOT reject - only small debt + multiple other risky processes
 * - Theft/fraud = INSTANT rejection (unchanged - always strict)
 * 
 * GOAL: Find people who might STEAL the briefcase or NOT PAY
 * NOT: Reject everyone with small consumer debts
 * 
 * POINT SYSTEM (lower = better):
 * - 0-20 points: APPROVED
 * - 21-35 points: APPROVED with observations
 * - 36-55 points: Needs closer review (still leans approval)
 * - 56+ points OR theft/fraud: REJECTED
 */
export function analyzeRisk(response: BigdatacorpProcessesResponse): RiskAnalysis {
  const processData = response.Result?.[0]?.Processes;
  
  if (!processData) {
    throw new Error("Dados de processos não encontrados na resposta da API");
  }
  
  const { TotalLawsuits, TotalLawsuitsAsDefendant, TotalLawsuitsAsAuthor } = processData;
  const lawsuits = processData.Lawsuits || [];

  // No lawsuits = APPROVED with score 0
  if (TotalLawsuits === 0) {
    log('✅ [CPF-COMPLIANCE] Nenhum processo encontrado - APROVADO (0 pontos)');
    return {
      status: "approved",
      riskScore: 0,
    };
  }

  // ============================================
  // CATEGORIZE ALL LAWSUITS
  // ============================================
  let criticalIssues: string[] = [];      // Theft/fraud - instant rejection
  let highRiskIssues: string[] = [];      // Violent/drug crimes
  let debtIssues: string[] = [];          // Debt-related
  let benignProcessCount = 0;             // Divorce, labor claims, etc - 0 points
  let theftOrFraudCount = 0;
  let debtLawsuitCount = 0;
  let criminalLawsuitCount = 0;
  let activeLawsuitCount = 0;
  let activeNonBenignCount = 0;           // Active lawsuits that are NOT benign

  for (const lawsuit of lawsuits) {
    const analysis = analyzeLawsuitContent(lawsuit);
    
    // Check if lawsuit is active
    const isActive = lawsuit.Status && 
      !lawsuit.Status.toLowerCase().includes("arquivado") && 
      !lawsuit.Status.toLowerCase().includes("baixado") &&
      !lawsuit.Status.toLowerCase().includes("encerrado") &&
      !lawsuit.Status.toLowerCase().includes("extinto") &&
      !lawsuit.Status.toLowerCase().includes("transitado");
    
    if (isActive) activeLawsuitCount++;
    
    // Count BENIGN processes (divorce, labor, simple civil) - these don't count against candidate
    if (analysis.isBenign) {
      benignProcessCount++;
      continue; // Skip adding points for benign processes
    }
    
    if (isActive) activeNonBenignCount++;
    
    // Check if criminal court type
    const isCriminal = lawsuit.CourtType?.toLowerCase().includes("criminal");
    if (isCriminal) criminalLawsuitCount++;
    
    // Aggregate critical issues (theft/fraud) - ALWAYS REJECT
    if (analysis.hasTheft || analysis.hasFraud) {
      theftOrFraudCount++;
      const issueType = analysis.hasTheft ? 'FURTO/ROUBO' : 'FRAUDE/GOLPE';
      criticalIssues.push(`${issueType} - Processo ${lawsuit.Number || 'N/A'}: ${analysis.matchedKeywords.join(', ')}`);
    }
    
    // Aggregate high risk issues (violent/drug crimes)
    if (analysis.hasViolentCrime || analysis.hasDrugCrime) {
      const issueType = analysis.hasViolentCrime ? 'CRIME VIOLENTO' : 'DROGAS';
      highRiskIssues.push(`${issueType} - Processo ${lawsuit.Number || 'N/A'}: ${analysis.matchedKeywords.join(', ')}`);
    }
    
    // Aggregate debt issues (but NOT benign debt like consumer complaints)
    if (analysis.hasDebt && !analysis.isBenign) {
      debtLawsuitCount++;
      debtIssues.push(`DÍVIDA - Processo ${lawsuit.Number || 'N/A'}: R$ ${(lawsuit.Value || 0).toLocaleString('pt-BR')}`);
    }
  }

  // ============================================
  // BRAZILIAN-FRIENDLY DEBT ANALYSIS
  // ============================================
  const debtAnalysis = analyzeDebtLawsuits(lawsuits);
  
  log(`📊 [CPF-COMPLIANCE] Análise: ${TotalLawsuits} processos (${benignProcessCount} benignos), Dívida Ativa=R$${debtAnalysis.totalActiveDebt.toLocaleString('pt-BR')}, Tier=${debtAnalysis.debtTier}`);

  // ============================================
  // NEW POINT-BASED SCORING SYSTEM
  // ============================================
  // Designed to FAVOR approvals for typical Brazilian profiles
  
  let riskPoints = 0;
  let pointBreakdown: string[] = [];
  
  // THEFT/FRAUD: Instant 100 points (auto-reject)
  if (theftOrFraudCount > 0) {
    riskPoints += 100;
    pointBreakdown.push(`+100 (furto/fraude detectado)`);
  }
  
  // VIOLENT/DRUG CRIMES: +50 points each
  riskPoints += highRiskIssues.length * 50;
  if (highRiskIssues.length > 0) {
    pointBreakdown.push(`+${highRiskIssues.length * 50} (crimes graves: ${highRiskIssues.length})`);
  }
  
  // CRIMINAL COURT PROCESSES: +15 points each (only if 2+)
  if (criminalLawsuitCount >= 2) {
    const criminalPoints = (criminalLawsuitCount - 1) * 15; // First one is free
    riskPoints += criminalPoints;
    pointBreakdown.push(`+${criminalPoints} (processos criminais: ${criminalLawsuitCount})`);
  }
  
  // DEBT-BASED SCORING (BRAZILIAN-FRIENDLY THRESHOLDS)
  // Up to R$4,000 = 0 points (NORMAL for Brazilians)
  // R$4k-15k = +5 points (observation only)
  // R$15k-40k = +12 points (concern but not rejection alone)
  // >R$40k = +20 points (significant concern)
  // >R$60k = +35 points (very high concern)
  
  if (debtAnalysis.totalActiveDebt <= DEBT_THRESHOLDS.LOW) {
    // R$0-4,000: ZERO points - this is NORMAL for Brazilians
    // Example: Maria with R$350 debt, Lorena with small debt = 0 points here
    pointBreakdown.push(`+0 (dívida ≤R$4k: normal brasileiro)`);
  } else if (debtAnalysis.totalActiveDebt <= DEBT_THRESHOLDS.MEDIUM) {
    // R$4k-15k: Only 5 points - observation, not rejection
    riskPoints += 5;
    pointBreakdown.push(`+5 (dívida R$4k-15k)`);
  } else if (debtAnalysis.totalActiveDebt <= DEBT_THRESHOLDS.HIGH) {
    // R$15k-40k: 12 points - concern but alone doesn't reject
    riskPoints += 12;
    pointBreakdown.push(`+12 (dívida R$15k-40k)`);
  } else if (debtAnalysis.totalActiveDebt <= DEBT_THRESHOLDS.CRITICAL) {
    // R$40k-60k: 20 points
    riskPoints += 20;
    pointBreakdown.push(`+20 (dívida R$40k-60k)`);
  } else {
    // >R$60k: 35 points - very high but still can be approved if no other issues
    riskPoints += 35;
    pointBreakdown.push(`+35 (dívida >R$60k)`);
  }
  
  // PROCESS MIX PENALTY: Small debt + multiple OTHER risky processes = rejection
  // This is the KEY user requirement: "se tiver mais processos aí é reprovado"
  // Example: R$350 debt ALONE = approved, but R$350 debt + 4 other processes = REJECTED
  // 
  // PROGRESSIVE PENALTY (fixed to actually reject when there are "mais processos"):
  // - 3 risky processes = +40 points (approved with attention)
  // - 4 risky processes = +56 points (REJECTED - meets threshold)
  // - 5+ risky processes = +70 points (definitely REJECTED)
  const riskyNonDebtProcesses = activeNonBenignCount - debtLawsuitCount;
  if (debtAnalysis.totalActiveDebt > 0 && debtAnalysis.totalActiveDebt <= DEBT_THRESHOLDS.LOW && riskyNonDebtProcesses >= 3) {
    let processMixPenalty: number;
    if (riskyNonDebtProcesses >= 5) {
      processMixPenalty = 70; // Definitely rejected - many risky processes
      pointBreakdown.push(`+70 (dívida pequena + ${riskyNonDebtProcesses} processos de risco = REJEIÇÃO)`);
    } else if (riskyNonDebtProcesses >= 4) {
      processMixPenalty = 56; // Rejected - threshold met
      pointBreakdown.push(`+56 (dívida pequena + ${riskyNonDebtProcesses} processos de risco = REJEIÇÃO)`);
    } else {
      processMixPenalty = 40; // 3 processes - approved with attention
      pointBreakdown.push(`+40 (dívida pequena + ${riskyNonDebtProcesses} processos de risco = atenção)`);
    }
    riskPoints += processMixPenalty;
  }
  
  // EXCESSIVE ACTIVE PROCESSES (not benign): +3 points per process above 4
  if (activeNonBenignCount > 4) {
    const excessPoints = (activeNonBenignCount - 4) * 3;
    riskPoints += excessPoints;
    pointBreakdown.push(`+${excessPoints} (${activeNonBenignCount} processos ativos não-benignos)`);
  }
  
  // BONUS: Person pays debts (resolved > active) = -10 points
  if (debtAnalysis.resolvedDebtCount > debtAnalysis.activeDebtCount && debtAnalysis.activeDebtCount <= 2) {
    riskPoints = Math.max(0, riskPoints - 10);
    pointBreakdown.push(`-10 (histórico de pagamento de dívidas)`);
  }
  
  // BONUS: Mostly plaintiff (suing others, not being sued) = -5 points
  if (TotalLawsuitsAsAuthor > TotalLawsuitsAsDefendant * 2) {
    riskPoints = Math.max(0, riskPoints - 5);
    pointBreakdown.push(`-5 (maioria como autor, não réu)`);
  }

  log(`📊 [CPF-COMPLIANCE] Pontuação: ${riskPoints} pontos | ${pointBreakdown.join(', ')}`);

  // ============================================
  // DECISION RULES - PRIORITIZE APPROVALS
  // ============================================
  
  let status: ComplianceStatus = "approved";
  let rejectionReason: string | undefined;
  
  // Convert points to 0-10 scale for riskScore (for compatibility)
  const riskScore = Math.min(10, riskPoints / 10);

  // RULE 1: ANY theft or fraud = IMMEDIATE REJECTION (UNCHANGED - always strict)
  if (theftOrFraudCount > 0) {
    status = "rejected";
    rejectionReason = `REPROVADO: Histórico de furto/fraude detectado. ${criticalIssues[0]}`;
    log(`❌ [CPF-COMPLIANCE] REPROVADO por furto/fraude: ${criticalIssues.join('; ')}`);
  }
  
  // RULE 2: Violent crimes or drug trafficking = REJECTION
  else if (highRiskIssues.length > 0) {
    status = "rejected";
    rejectionReason = `REPROVADO: Crimes graves detectados. ${highRiskIssues[0]}`;
    log(`❌ [CPF-COMPLIANCE] REPROVADO por crimes graves: ${highRiskIssues.join('; ')}`);
  }
  
  // RULE 3: 56+ points = REJECTION (but this is HARD to reach without theft/fraud)
  else if (riskPoints >= 56) {
    status = "rejected";
    rejectionReason = `REPROVADO: Perfil de alto risco (${riskPoints} pontos). ${pointBreakdown.slice(0, 3).join('; ')}`;
    log(`❌ [CPF-COMPLIANCE] REPROVADO por pontuação alta: ${riskPoints} pontos`);
  }
  
  // RULE 4: 36-55 points = APPROVED with strong observation
  else if (riskPoints >= 36) {
    status = "approved";
    rejectionReason = `Aprovado com atenção: Perfil requer acompanhamento (${riskPoints} pontos).`;
    log(`⚠️ [CPF-COMPLIANCE] APROVADO com atenção: ${riskPoints} pontos`);
  }
  
  // RULE 5: 21-35 points = APPROVED with light observation
  else if (riskPoints >= 21) {
    status = "approved";
    rejectionReason = `Aprovado com observações: ${debtIssues.slice(0, 2).join('; ') || 'Alguns processos identificados'}`;
    log(`✅ [CPF-COMPLIANCE] APROVADO com observações: ${riskPoints} pontos`);
  }
  
  // RULE 6: 0-20 points = CLEAN APPROVAL
  else {
    status = "approved";
    log(`✅ [CPF-COMPLIANCE] APROVADO (${riskPoints} pontos) - perfil saudável`);
  }

  return {
    status,
    riskScore: parseFloat(riskScore.toFixed(2)),
    rejectionReason,
  };
}

/**
 * ENHANCED RESELLER COMPLIANCE - Uses ALL data sources
 * 
 * This function enhances the analyzeRisk result by also considering:
 * - Basic data (CPF status, age, documentation)
 * - Collections data (active debts, financial history)
 * 
 * NEVER returns "manual_review" - always makes a definitive decision.
 */
export function analyzeResellerCompliance(
  processResponse: BigdatacorpProcessesResponse,
  basicData: any | null,
  collectionsData: any | null
): RiskAnalysis {
  // Get base analysis from processes
  const baseAnalysis = analyzeRisk(processResponse);
  
  // If already rejected, no need to continue
  if (baseAnalysis.status === 'rejected') {
    return baseAnalysis;
  }
  
  let additionalScore = 0;
  let additionalReasons: string[] = [];
  
  // ============================================
  // BASIC DATA ANALYSIS
  // ============================================
  if (basicData) {
    const taxIdStatus = basicData.TaxIdStatus || '';
    
    // CRITICAL: CPF with irregular status = REJECTION
    const blockedStatuses = ['Suspensa', 'Cancelada', 'Nula', 'Pendente de Regularização'];
    if (blockedStatuses.some(s => taxIdStatus.includes(s))) {
      log(`❌ [CPF-COMPLIANCE] REPROVADO por CPF irregular: ${taxIdStatus}`);
      return {
        status: 'rejected',
        riskScore: 10,
        rejectionReason: `REPROVADO: CPF com status irregular (${taxIdStatus}). Não é possível cadastrar como revendedor.`
      };
    }
    
    // CPF not "Regular" adds to risk
    if (taxIdStatus && taxIdStatus !== 'Regular') {
      additionalScore += 2;
      additionalReasons.push(`CPF com status ${taxIdStatus}`);
    }
    
    // Check age if available (too young might be risky for high-value inventory)
    const age = basicData.Age;
    if (age && age < 18) {
      log(`❌ [CPF-COMPLIANCE] REPROVADO por menor de idade: ${age} anos`);
      return {
        status: 'rejected',
        riskScore: 10,
        rejectionReason: `REPROVADO: Candidato menor de idade (${age} anos). Não é possível cadastrar como revendedor.`
      };
    }
  }
  
  // ============================================
  // COLLECTIONS/FINANCIAL DATA ANALYSIS (FLEXIBLE)
  // ============================================
  // NEW: Uses VALUE-BASED analysis instead of just counting occurrences
  const collectionsAnalysis = analyzeCollectionsFlexible(collectionsData);
  
  log(`📊 [CPF-COMPLIANCE] Análise de cobranças: Valor=R$${collectionsAnalysis.totalValue.toLocaleString('pt-BR')}, HighRisk=${collectionsAnalysis.isHighRisk}, Score=${collectionsAnalysis.scoreContribution}`);
  
  // REJECTION: Only for HIGH RISK collections (high value + prolonged)
  // Small debts (R$3k) NO LONGER trigger rejection
  if (collectionsAnalysis.isHighRisk) {
    log(`❌ [CPF-COMPLIANCE] REPROVADO por cobranças de alto valor: ${collectionsAnalysis.details}`);
    return {
      status: 'rejected',
      riskScore: 8.5,
      rejectionReason: `REPROVADO: ${collectionsAnalysis.details}`
    };
  }
  
  // Add to risk score for moderate collections (does NOT reject)
  additionalScore += collectionsAnalysis.scoreContribution;
  if (collectionsAnalysis.isMediumRisk) {
    additionalReasons.push(collectionsAnalysis.details);
  }
  
  // ============================================
  // FINAL DECISION (MORE LENIENT)
  // ============================================
  const finalScore = Math.min(baseAnalysis.riskScore + additionalScore, 10);
  
  // Only reject if score is VERY high (9.0+) AND there are serious additional concerns
  // CHANGED from 8.5 to 9.0 - more lenient
  if (finalScore >= 9.0 && additionalReasons.length > 0) {
    log(`❌ [CPF-COMPLIANCE] REPROVADO por score combinado alto: ${finalScore.toFixed(2)}`);
    return {
      status: 'rejected',
      riskScore: finalScore,
      rejectionReason: `REPROVADO: Score de risco combinado muito alto (${finalScore.toFixed(1)}). ${additionalReasons.join('; ')}`
    };
  }
  
  // Otherwise, enhance the existing result
  let enhancedReason = baseAnalysis.rejectionReason;
  if (additionalReasons.length > 0 && baseAnalysis.status === 'approved') {
    enhancedReason = enhancedReason 
      ? `${enhancedReason}. Obs: ${additionalReasons.join('; ')}`
      : `Obs: ${additionalReasons.join('; ')}`;
  }
  
  log(`✅ [CPF-COMPLIANCE] Análise completa finalizada - Status: ${baseAnalysis.status}, Score: ${finalScore.toFixed(2)}`);
  
  return {
    status: baseAnalysis.status,
    riskScore: parseFloat(finalScore.toFixed(2)),
    rejectionReason: enhancedReason
  };
}

export async function checkCompliance(
  cpf: string,
  options: ComplianceCheckOptions
): Promise<ComplianceCheckResult> {
  const normalizedCPF = normalizeCPF(cpf);
  
  if (!validateCPF(normalizedCPF)) {
    throw new Error("CPF inválido. Verifique os dígitos verificadores.");
  }

  const cpfHash = hashCPF(normalizedCPF);
  const cpfEncrypted = encryptCPF(normalizedCPF);
  const { tenantId, leadId, submissionId, createdBy, personName: userProvidedName, personPhone, cacheExpirationDays = 60, forceNewRecord = false, forceRefresh = false } = options;

  const useSupabaseMaster = await isSupabaseMasterConfigured(tenantId);
  
  if (useSupabaseMaster) {
    log('🎯 Usando Supabase MESTRE para cache de compliance');
  } else {
    log('⚠️  Usando PostgreSQL Replit local (desenvolvimento apenas)');
  }

  // ===================================================================
  // SUBMISSION_ID-BASED DEDUPLICATION - CRITICAL FIX FOR DUPLICATE CHECKS
  // ===================================================================
  // If a submission_id is provided, check if a CPF check already exists for this
  // specific submission. This prevents multiple triggers (LeadSync, CPFPoller,
  // FormsAutomation) from creating duplicate checks for the same form submission.
  // This is the centralized guard that catches ALL duplicate triggers.
  if (submissionId && useSupabaseMaster && !forceRefresh) {
    log(`🔍 [DEDUP] Verificando se já existe check para submission_id: ${submissionId}`);
    
    // Check both Master and Client databases for existing check by submission_id
    const existingSubmissionCheck = await getExistingCheckForSubmission(submissionId, tenantId);
    
    if (existingSubmissionCheck) {
      // Found existing check for this submission - return it instead of creating a duplicate
      const existingPayload = normalizeBigdatacorpResponse(existingSubmissionCheck.payload);
      const existingProcessData = existingPayload?.Result?.[0]?.Processes || {};
      const riskScoreValue = existingSubmissionCheck.risk_score ?? 0;
      
      log(`🛡️ [DEDUP] DUPLICAÇÃO PREVENIDA! Retornando check existente para submission ${submissionId}`);
      log(`   📋 Check ID: ${existingSubmissionCheck.id}`);
      log(`   📊 Status: ${existingSubmissionCheck.status}`);
      log(`   📈 Risk Score: ${riskScoreValue}`);
      log(`   💰 ECONOMIA: R$ 0,05-0,07 (evitou consulta duplicada)`);
      
      return {
        id: existingSubmissionCheck.id,
        checkId: existingSubmissionCheck.id,
        personName: existingSubmissionCheck.person_name || existingPayload?._basic_data?.Result?.[0]?.BasicData?.Name || null,
        personCpf: existingSubmissionCheck.person_cpf || formatCPF(normalizedCPF),
        status: existingSubmissionCheck.status as ComplianceStatus,
        riskScore: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
        fromCache: true,
        totalLawsuits: existingProcessData.TotalLawsuits || 0,
        asAuthor: existingProcessData.TotalLawsuitsAsAuthor || 0,
        asDefendant: existingProcessData.TotalLawsuitsAsDefendant || 0,
        firstLawsuitDate: existingProcessData.FirstLawsuitDate,
        lastLawsuitDate: existingProcessData.LastLawsuitDate,
        payload: existingPayload,
        consultedAt: new Date(existingSubmissionCheck.consulted_at),
        expiresAt: new Date(existingSubmissionCheck.expires_at),
      };
    }
    
    log(`✅ [DEDUP] Nenhum check existente para submission ${submissionId} - prosseguindo com verificação`);
  }

  // Se forceRefresh=true, pular busca no cache e ir direto para consulta à API
  let cachedCheck: any = null;
  if (!forceRefresh) {
    cachedCheck = useSupabaseMaster 
      ? await getCachedCheckFromSupabase(cpfHash, tenantId, {
          leadId,
          submissionId,
          createdBy,
        })
      : await storage.getCachedCheck(cpfHash, tenantId);
  } else {
    log(`🔄 Force Refresh ativado - ignorando cache, fazendo nova consulta às 3 APIs DataCorp`);
  }

  if (cachedCheck) {
    // CRITICAL: Normalize cached payload to ensure old cached data works with frontend
    const normalizedCachedPayload = normalizeBigdatacorpResponse(cachedCheck.payload);
    const cachedProcessData = normalizedCachedPayload?.Result?.[0]?.Processes || {};
    
    log(`✅ Cache HIT - CPF hash: ${cpfHash.substring(0, 8)}... | Tenant: ${tenantId.substring(0, 8)}... | Economia: R$ 0,05-0,07`);
    
    // Se forceNewRecord=true (automação), criar novo registro no histórico
    if (forceNewRecord && useSupabaseMaster) {
      log(`📝 Criando novo registro no histórico (automação)...`);
      
      const personCpf = formatCPF(normalizedCPF);
      const cachedCheckData = cachedCheck as any;
      const personName = userProvidedName || cachedCheckData.person_name || cachedCheckData.personName;
      const riskScoreValue = cachedCheckData.risk_score ?? cachedCheckData.riskScore ?? 0;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cacheExpirationDays);
      
      const newHistoryCheck = await createCheckInSupabase({
        cpfHash,
        cpfEncrypted,
        tenantId,
        leadId,
        submissionId,
        status: cachedCheck.status as ComplianceStatus,
        riskScore: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
        payload: normalizedCachedPayload,
        personName,
        personCpf,
        consultedAt: new Date(),
        expiresAt,
        source: 'reused_from_cache',
        apiCost: 0,
        createdBy,
      });
      
      log(`✅ Novo registro criado no histórico: ${newHistoryCheck.id}`);
      
      // NOVO: Salvar também no Supabase do Cliente (informações resumidas) - automação
      const clienteComplianceDataAuto: CPFComplianceResult = {
        nome: personName || null,
        cpf: personCpf,
        telefone: personPhone || null,
        status: cachedCheck.status as string,
        dados: true,
        risco: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
        processos: cachedProcessData.TotalLawsuits || 0,
        aprovado: cachedCheck.status === 'approved',
        data_consulta: new Date().toISOString(),
        check_id: newHistoryCheck.id,
        submission_id: submissionId || undefined, // For deduplication
      };
      
      saveComplianceToClienteSupabase(clienteComplianceDataAuto, tenantId).catch(err => {
        log(`⚠️ Erro ao salvar no Supabase do Cliente (não crítico): ${err.message}`);
      });
      
      return {
        id: newHistoryCheck.id,
        checkId: newHistoryCheck.id,
        personName: personName || normalizedCachedPayload?._basic_data?.Result?.[0]?.BasicData?.Name || null,
        personCpf: personCpf,
        status: cachedCheck.status as ComplianceStatus,
        riskScore: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
        fromCache: true,
        totalLawsuits: cachedProcessData.TotalLawsuits || 0,
        asAuthor: cachedProcessData.TotalLawsuitsAsAuthor || 0,
        asDefendant: cachedProcessData.TotalLawsuitsAsDefendant || 0,
        firstLawsuitDate: cachedProcessData.FirstLawsuitDate,
        lastLawsuitDate: cachedProcessData.LastLawsuitDate,
        payload: normalizedCachedPayload,
        consultedAt: new Date(),
        expiresAt,
      };
    }
    
    // Comportamento normal para consultas manuais - AGORA CRIA NOVO REGISTRO NO HISTÓRICO
    const cachedPersonName = (cachedCheck as any).person_name || (cachedCheck as any).personName;
    const cachedCheckData = cachedCheck as any;
    const riskScoreValue = cachedCheckData.risk_score ?? cachedCheckData.riskScore ?? 0;
    const cachedPersonCpf = formatCPF(normalizedCPF);
    const cachedPersonNameFinal = userProvidedName || cachedCheckData.person_name || cachedCheckData.personName || normalizedCachedPayload?._basic_data?.Result?.[0]?.BasicData?.Name;
    
    // Atualizar nome no cache original se necessário
    if (userProvidedName && userProvidedName !== cachedPersonName) {
      if (useSupabaseMaster) {
        const supabase = await getSupabaseMasterForTenant(tenantId);
        await supabase
          .from('datacorp_checks')
          .update({ person_name: userProvidedName })
          .eq('id', cachedCheck.id);
        
        log(`📝 Nome atualizado no cache: ${userProvidedName}`);
      } else {
        await db.update(datacorpChecks)
          .set({ personName: userProvidedName })
          .where(eq(datacorpChecks.id, cachedCheck.id));
        
        log(`📝 Nome atualizado no cache local: ${userProvidedName}`);
      }
    }
    
    // NOVO: Criar novo registro no datacorp_checks para aparecer no histórico (consulta manual)
    let newCheckId = cachedCheck.id;
    if (useSupabaseMaster) {
      try {
        log(`📝 Criando registro de cache-hit no histórico (consulta manual)...`);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + cacheExpirationDays);
        
        const newHistoryCheck = await createCheckInSupabase({
          cpfHash,
          cpfEncrypted,
          tenantId,
          leadId,
          submissionId,
          status: cachedCheck.status as ComplianceStatus,
          riskScore: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
          payload: normalizedCachedPayload,
          personName: cachedPersonNameFinal,
          personCpf: cachedPersonCpf,
          consultedAt: new Date(),
          expiresAt,
          source: 'cache_hit_manual',
          apiCost: 0,
          createdBy,
          originCheckId: cachedCheck.id, // Referência ao registro original
        });
        
        newCheckId = newHistoryCheck.id;
        log(`✅ Registro de cache-hit criado no histórico: ${newCheckId}`);
      } catch (historyErr: any) {
        log(`⚠️ Erro ao criar registro de cache-hit (não crítico): ${historyErr.message}`);
        // Continua usando o ID do cache original
      }
    }
    
    if (useSupabaseMaster) {
      await createAuditLogInSupabase({
        checkId: newCheckId,
        tenantId,
        action: "view",
        userId: createdBy,
      });
    } else {
      await storage.createAuditLog({
        checkId: cachedCheck.id,
        tenantId,
        action: "view",
        userId: createdBy,
      });
    }
    
    const consultedAtValue = cachedCheckData.consulted_at || cachedCheckData.consultedAt;
    const expiresAtValue = cachedCheckData.expires_at || cachedCheckData.expiresAt;
    
    // Salvar também no Supabase do Cliente (informações resumidas) - consulta manual com cache
    const clienteComplianceDataManual: CPFComplianceResult = {
      nome: cachedPersonNameFinal || null,
      cpf: cachedPersonCpf,
      telefone: personPhone || null,
      status: cachedCheck.status as string,
      dados: true,
      risco: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
      processos: cachedProcessData.TotalLawsuits || 0,
      aprovado: cachedCheck.status === 'approved',
      data_consulta: new Date().toISOString(),
      check_id: newCheckId,
      submission_id: submissionId || undefined, // For deduplication
    };
    
    saveComplianceToClienteSupabase(clienteComplianceDataManual, tenantId).catch(err => {
      log(`⚠️ Erro ao salvar no Supabase do Cliente (não crítico): ${err.message}`);
    });
    
    return {
      id: newCheckId,
      checkId: newCheckId,
      personName: cachedPersonNameFinal || null,
      personCpf: cachedPersonCpf,
      status: cachedCheck.status as ComplianceStatus,
      riskScore: typeof riskScoreValue === 'number' ? riskScoreValue : parseFloat(riskScoreValue.toString()),
      fromCache: true,
      totalLawsuits: cachedProcessData.TotalLawsuits || 0,
      asAuthor: cachedProcessData.TotalLawsuitsAsAuthor || 0,
      asDefendant: cachedProcessData.TotalLawsuitsAsDefendant || 0,
      firstLawsuitDate: cachedProcessData.FirstLawsuitDate,
      lastLawsuitDate: cachedProcessData.LastLawsuitDate,
      payload: normalizedCachedPayload,
      consultedAt: new Date(),
      expiresAt: expiresAtValue instanceof Date ? expiresAtValue : new Date(expiresAtValue),
    };
  }

  log(`🔄 Cache MISS - Consultando API Bigdatacorp (3 consultas em paralelo) | CPF hash: ${cpfHash.substring(0, 8)}... | Tenant: ${tenantId || 'none'}`);
  
  // NOVA IMPLEMENTAÇÃO: Consulta completa com 3 APIs em paralelo
  // IMPORTANTE: Passar tenantId para buscar credenciais do banco de dados
  const consultaCompleta = await consultarCandidatoCompleto(normalizedCPF, userProvidedName, undefined, tenantId);
  
  // Verificar se processosJudiciais retornou dados válidos
  if (!consultaCompleta.processosJudiciais.success || !consultaCompleta.processosJudiciais.data) {
    const errorMsg = consultaCompleta.processosJudiciais.error || "Erro desconhecido na consulta de processos";
    log(`❌ Erro na consulta de processos judiciais: ${errorMsg}`);
    throw new Error(`Falha na consulta de processos judiciais: ${errorMsg}`);
  }
  
  const apiResponse = consultaCompleta.processosJudiciais.data;

  // CRITICAL: Normalize the API response BEFORE storing in database
  // This converts {Total: X, Items: [...]} to [...] and maps Portuguese field names to English
  const normalizedResponse = normalizeBigdatacorpResponse(apiResponse);

  // Extrair dados cadastrais se disponíveis
  const basicDataResult = consultaCompleta.dadosCadastrais;
  const basicData = basicDataResult.success && basicDataResult.data?.Result?.[0]?.BasicData 
    ? basicDataResult.data.Result[0].BasicData 
    : null;
  
  // Extrair dados de cobrança se disponíveis
  const collectionsResult = consultaCompleta.presencaCobranca;
  const collectionsData = collectionsResult.success && collectionsResult.data?.Result?.[0]?.Collections
    ? collectionsResult.data.Result[0].Collections
    : null;

  // Calculate unified risk score using all 3 datasets
  const processDataForRisk = normalizedResponse.Result?.[0]?.Processes;
  const unifiedRiskScore = calculateUnifiedRiskScore(processDataForRisk, basicData, collectionsData);
  
  // ENHANCED: Use comprehensive reseller vetting with all data sources
  // This NEVER returns "manual_review" - only "approved" or "rejected"
  const riskAnalysis = analyzeResellerCompliance(normalizedResponse, basicData, collectionsData);
  
  // Use the higher of the two scores (unified calculation vs reseller analysis)
  // This ensures we catch all risks from both analysis methods
  riskAnalysis.riskScore = Math.max(unifiedRiskScore, riskAnalysis.riskScore);
  
  log(`📊 Reseller Compliance Analysis: Status=${riskAnalysis.status}, Score=${riskAnalysis.riskScore.toFixed(2)}`);
  log(`📊 Unified Risk Score: ${unifiedRiskScore} (Processes: 60%, Collections: 30%, BasicData: 10%)`);
  
  // Calcular nome da pessoa: prioridade = usuário > dados cadastrais > processos
  const extractedName = basicData?.Name || extractPersonName(normalizedResponse);
  const personName = userProvidedName || extractedName;
  
  // Formatar CPF para exibição
  const personCpf = formatCPF(normalizedCPF);
  
  // Calcular custo total das 3 APIs
  const custoTotal = parseFloat(consultaCompleta.metadata.custoTotal);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + cacheExpirationDays);
  
  // Montar payload completo com todos os dados
  const payloadCompleto = {
    ...normalizedResponse,
    _datacorp_complete: true,
    _basic_data: basicDataResult.success ? basicDataResult.data : null,
    _collections: collectionsResult.success ? collectionsResult.data : null,
    _metadata: {
      ...consultaCompleta.metadata,
      basicDataSuccess: basicDataResult.success,
      collectionsSuccess: collectionsResult.success,
      processesSuccess: consultaCompleta.processosJudiciais.success,
    }
  };

  let newCheck: any;

  if (useSupabaseMaster) {
    newCheck = await createCheckInSupabase({
      cpfHash,
      cpfEncrypted,
      tenantId,
      leadId,
      submissionId,
      personName: personName || undefined,
      personCpf,
      status: riskAnalysis.status,
      riskScore: riskAnalysis.riskScore,
      payload: payloadCompleto,
      expiresAt,
      source: "bigdatacorp_v3_complete", // Nova versão com 3 APIs
      apiCost: custoTotal,
      createdBy: createdBy,
    });

    await createAuditLogInSupabase({
      checkId: newCheck.id,
      tenantId,
      action: "check",
      userId: createdBy,
    });
    
    log(`💾 Salvo no Supabase MESTRE | Check ID: ${newCheck.id} | Status: ${riskAnalysis.status} | Custo Total: R$ ${custoTotal.toFixed(3)}`);
  } else {
    const checkData: InsertDatacorpCheck = {
      cpfHash,
      cpfEncrypted,
      tenantId,
      leadId,
      submissionId,
      personName: personName || undefined,
      personCpf,
      status: riskAnalysis.status,
      riskScore: riskAnalysis.riskScore.toString(),
      payload: payloadCompleto as any,
      expiresAt,
      source: "bigdatacorp_v3_complete",
      apiCost: custoTotal.toFixed(3),
      createdBy,
    };

    newCheck = await storage.createCheck(checkData);

    await storage.createAuditLog({
      checkId: newCheck.id,
      tenantId,
      action: "check",
      userId: createdBy,
    });
    
    log(`💾 Salvo no PostgreSQL Replit local | Check ID: ${newCheck.id} | Custo Total: R$ ${custoTotal.toFixed(3)}`);
  }

  const processData = normalizedResponse.Result[0].Processes;
  
  const newCheckData = newCheck as any;
  const consultedAtValue = newCheckData.consulted_at || newCheckData.consultedAt;
  const expiresAtValue = newCheckData.expires_at || newCheckData.expiresAt;
  
  // NOVO: Salvar também no Supabase do Cliente (informações resumidas)
  const clienteComplianceData: CPFComplianceResult = {
    nome: personName || null,
    cpf: personCpf,
    telefone: personPhone || null,
    status: riskAnalysis.status,
    dados: true, // Indica que tem dados disponíveis
    risco: riskAnalysis.riskScore,
    processos: processData.TotalLawsuits || 0,
    aprovado: riskAnalysis.status === 'approved',
    data_consulta: new Date().toISOString(),
    check_id: newCheck.id,
    submission_id: submissionId || undefined, // For deduplication
  };
  
  // Salvar no Supabase do Cliente (não bloqueia o fluxo principal)
  saveComplianceToClienteSupabase(clienteComplianceData, tenantId).catch(err => {
    log(`⚠️ Erro ao salvar no Supabase do Cliente (não crítico): ${err.message}`);
  });
  
  return {
    id: newCheck.id,
    checkId: newCheck.id,
    personName: personName || basicData?.Name || null,
    personCpf: personCpf,
    status: riskAnalysis.status,
    riskScore: riskAnalysis.riskScore,
    fromCache: false,
    totalLawsuits: processData.TotalLawsuits,
    asAuthor: processData.TotalLawsuitsAsAuthor,
    asDefendant: processData.TotalLawsuitsAsDefendant,
    firstLawsuitDate: processData.FirstLawsuitDate,
    lastLawsuitDate: processData.LastLawsuitDate,
    payload: payloadCompleto,
    consultedAt: consultedAtValue instanceof Date ? consultedAtValue : new Date(consultedAtValue),
    expiresAt: expiresAtValue instanceof Date ? expiresAtValue : new Date(expiresAtValue),
    basicData: basicData ? {
      name: basicData.Name,
      taxIdStatus: basicData.TaxIdStatus,
      birthDate: basicData.BirthDate,
      motherName: basicData.MotherName,
      gender: basicData.Gender,
      age: basicData.Age,
    } : undefined,
    collections: collectionsData ? {
      totalOccurrences: collectionsData.TotalOccurrences,
      hasActiveCollections: collectionsData.HasActiveCollections,
      last12Months: collectionsData.Last12Months,
      firstOccurrenceDate: collectionsData.FirstOccurrenceDate,
      lastOccurrenceDate: collectionsData.LastOccurrenceDate,
    } : undefined,
    apiCost: custoTotal,
  };
}

export async function reprocessCheck(checkId: string, tenantId: string, userId?: string): Promise<ComplianceCheckResult> {
  const useSupabaseMaster = await isSupabaseMasterConfigured(tenantId);
  const tenantUUID = tenantIdToUUID(tenantId);
  
  let existingCheck: any;
  let riskAnalysis: ReturnType<typeof analyzeRisk>;
  
  if (useSupabaseMaster) {
    const supabase = await getSupabaseMasterForTenant(tenantId);
    
    const { data: checkData, error: fetchError } = await supabase
      .from('datacorp_checks')
      .select('*')
      .eq('id', checkId)
      .eq('tenant_id', tenantUUID)
      .single();
    
    if (fetchError || !checkData) {
      throw new Error("Check não encontrado");
    }
    
    riskAnalysis = analyzeRisk(checkData.payload as BigdatacorpProcessesResponse);
    
    const { data: updatedCheck, error: rpcError } = await supabase.rpc('reprocess_datacorp_check', {
      p_check_id: checkId,
      p_tenant_id: tenantUUID,
      p_new_status: riskAnalysis.status,
      p_new_risk_score: riskAnalysis.riskScore,
      p_user_id: userId || null,
    });
    
    if (rpcError) {
      log(`❌ Erro ao reprocessar check no Supabase MESTRE: ${rpcError.message}`);
      throw new Error(`Falha ao persistir reprocessamento: ${rpcError.message}`);
    }
    
    if (!updatedCheck || updatedCheck.length === 0) {
      throw new Error("Nenhum dado retornado após reprocessamento");
    }
    
    existingCheck = updatedCheck[0];
    log(`✅ Reprocessamento salvo no Supabase MESTRE (RPC transacional) | Check ID: ${checkId} | Novo status: ${riskAnalysis.status}`);
  } else {
    existingCheck = await storage.getCheckById(checkId);
    
    if (!existingCheck) {
      throw new Error("Check não encontrado");
    }

    if (existingCheck.tenantId !== tenantId) {
      throw new Error("Acesso negado: Check pertence a outro tenant");
    }
    
    riskAnalysis = analyzeRisk(existingCheck.payload as BigdatacorpProcessesResponse);
    
    await db
      .update(datacorpChecks)
      .set({
        status: riskAnalysis.status,
        riskScore: riskAnalysis.riskScore.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(datacorpChecks.id, checkId));
    
    await storage.createAuditLog({
      checkId,
      tenantId,
      action: "reprocess",
      userId,
    });
    
    log(`✅ Reprocessamento salvo no PostgreSQL Replit local | Check ID: ${checkId} | Novo status: ${riskAnalysis.status}`);
  }

  const reprocessProcessData = (existingCheck.payload as any)?.Result?.[0]?.Processes || {};
  const existingCheckData = existingCheck as any;
  
  const consultedAtValue = existingCheckData.consulted_at || existingCheckData.consultedAt;
  const expiresAtValue = existingCheckData.expires_at || existingCheckData.expiresAt;
  
  return {
    id: existingCheck.id,
    checkId: existingCheck.id,
    personName: existingCheckData.person_name || existingCheckData.personName || (existingCheck.payload as any)?._basic_data?.Result?.[0]?.BasicData?.Name || null,
    personCpf: existingCheckData.person_cpf || existingCheckData.personCpf || null,
    status: riskAnalysis.status,
    riskScore: riskAnalysis.riskScore,
    fromCache: true,
    totalLawsuits: reprocessProcessData.TotalLawsuits || 0,
    asAuthor: reprocessProcessData.TotalLawsuitsAsAuthor || 0,
    asDefendant: reprocessProcessData.TotalLawsuitsAsDefendant || 0,
    firstLawsuitDate: reprocessProcessData.FirstLawsuitDate,
    lastLawsuitDate: reprocessProcessData.LastLawsuitDate,
    payload: existingCheck.payload,
    consultedAt: consultedAtValue instanceof Date ? consultedAtValue : new Date(consultedAtValue),
    expiresAt: expiresAtValue instanceof Date ? expiresAtValue : new Date(expiresAtValue),
  };
}
