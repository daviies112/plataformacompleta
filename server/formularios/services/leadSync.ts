import { db } from '../db.js';
import { leads, formSubmissions, forms } from "../../../shared/db-schema";
import { eq, and } from 'drizzle-orm';
import { normalizePhone } from '../utils/phoneNormalizer.js';
import { getDynamicSupabaseClient } from '../utils/supabaseClient.js';
import { convertKeysToSnakeCase, convertKeysToCamelCase } from '../utils/caseConverter.js';
import { normalizeCPF, validateCPF } from '../../lib/crypto.js';
import { checkCompliance } from '../../lib/datacorpCompliance.js';
import { isBigdatacorpConfigured } from '../../lib/bigdatacorpClient.js';

/**
 * Serviço de Sincronização entre Form Submissions e Leads
 * 
 * OBJETIVO: Garantir que toda submission de formulário crie/atualize um lead
 * para que o WhatsApp Dashboard mostre o status correto
 * 
 * COMPATIBILIDADE: Funciona tanto com PostgreSQL local quanto Supabase
 * Modo Supabase-only: Pula sincronização local quando tabelas não existem
 * 
 * EXTENSÃO (2024-12): Atualiza automaticamente pipeline_status e campos CPF
 */

let supabaseOnlyMode = false;
let modeChecked = false;

/**
 * Mapeamento de formStatus + qualificationStatus para pipeline_status
 * 
 * Pipeline status mapping:
 * - form_status: "not_sent" → pipeline_status: "contato-inicial"
 * - form_status: "sent" → pipeline_status: "formulario-enviado"
 * - form_status: "opened" → pipeline_status: "formulario-aberto"
 * - form_status: "started" → pipeline_status: "formulario-incompleto"
 * - form_status: "completed" → pipeline_status: "formulario-completo"
 * - qualification_status: "approved" → pipeline_status: "formulario-aprovado"
 * - qualification_status: "rejected" → pipeline_status: "formulario-reprovado"
 */
function getPipelineStatus(formStatus: string, qualificationStatus: string): string {
  // Qualificação tem prioridade sobre status do formulário
  if (qualificationStatus === 'approved') {
    return 'formulario-aprovado';
  }
  if (qualificationStatus === 'rejected') {
    return 'formulario-reprovado';
  }
  
  // Mapeamento baseado no status do formulário
  switch (formStatus) {
    case 'not_sent':
      return 'contato-inicial';
    case 'sent':
      return 'formulario-enviado';
    case 'opened':
      return 'formulario-aberto';
    case 'started':
      return 'formulario-incompleto';
    case 'completed':
      return 'formulario-completo';
    default:
      return 'contato-inicial';
  }
}

/**
 * Dispara consulta CPF automática para verificar compliance do candidato
 * Usa o sistema de cache do Supabase Master para evitar chamadas duplicadas à API BigDataCorp
 * 
 * Fluxo:
 * 1. Verifica se BigDataCorp está configurado (TOKEN_ID nas secrets)
 * 2. Valida o CPF antes de consultar
 * 3. checkCompliance() já verifica cache no Supabase Master antes de chamar a API
 * 4. Se não houver cache, consulta BigDataCorp e salva nos dois Supabase (Master e Cliente)
 * 5. O resultado aparece automaticamente no histórico de compliance
 */
/**
 * Trigger automatic CPF compliance check for a lead.
 * IMPORTANT: The deduplication is handled centrally in checkCompliance() function
 * via submission_id-based check. If a CPF check already exists for this submission_id,
 * checkCompliance() will return the existing check instead of creating a duplicate.
 * 
 * @param cpf - The CPF to check
 * @param leadId - The lead ID
 * @param submissionId - The form submission ID (used for deduplication)
 * @param tenantId - The tenant ID
 * @param personName - The person's name
 * @param personPhone - The person's phone
 */
async function triggerAutoCPFCheck(
  cpf: string,
  leadId: string,
  submissionId: string,
  tenantId: string,
  personName: string | null,
  personPhone: string | null
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`🔔 [LeadSync:AutoCPF] ${timestamp} - TRIGGER recebido`);
    console.log(`   📋 Submission ID: ${submissionId}`);
    console.log(`   🆔 Lead ID: ${leadId}`);
    console.log(`   🏢 Tenant: ${tenantId.substring(0, 8)}...`);
    
    if (!(await isBigdatacorpConfigured(tenantId))) {
      console.log(`⚠️ [LeadSync:AutoCPF] BigDataCorp não configurado - pulando consulta CPF para lead ${leadId}`);
      return;
    }

    if (!validateCPF(cpf)) {
      console.log(`⚠️ [LeadSync:AutoCPF] CPF inválido (${cpf.substring(0, 3)}...) - pulando consulta para lead ${leadId}`);
      return;
    }

    console.log(`🔍 [LeadSync:AutoCPF] Chamando checkCompliance() para submission ${submissionId}...`);
    console.log(`   📋 CPF: ${cpf.substring(0, 3)}...${cpf.substring(cpf.length - 2)}`);
    console.log(`   👤 Nome: ${personName || 'Não informado'}`);
    console.log(`   📱 Telefone: ${personPhone || 'Não informado'}`);

    const result = await checkCompliance(cpf, {
      tenantId,
      leadId,
      submissionId,
      createdBy: 'system-leadsync-auto',
      personName: personName || undefined,
      personPhone: personPhone || undefined,
      forceNewRecord: true,
    });

    const cacheStatus = result.fromCache ? 'DEDUP/CACHE HIT (economia de API)' : 'API CALL (nova consulta)';
    console.log(`✅ [LeadSync:AutoCPF] Consulta concluída para submission ${submissionId}:`);
    console.log(`   📊 Status: ${result.status}`);
    console.log(`   📈 Risk Score: ${result.riskScore}`);
    console.log(`   💾 Resultado: ${cacheStatus}`);
    console.log(`   🏷️ Check ID: ${result.checkId}`);
  } catch (error) {
    console.error(`❌ [LeadSync:AutoCPF] Erro na consulta automática para submission ${submissionId}:`, error);
  }
}

export class LeadSyncService {
  /**
   * Sincroniza uma submission com a tabela de leads
   * Cria um novo lead ou atualiza um existente baseado no telefone
   * 
   * EXTENSÃO (2024-12): Agora suporta:
   * - formStatus passado explicitamente (opened, started, completed)
   * - formularioAberto e formularioIniciado como flags
   * - contactCpf para normalização e armazenamento
   * - pipeline_status automático baseado no mapeamento
   * 
   * @param submissionData - Dados da submission (pode vir do PostgreSQL ou Supabase)
   * @param options - Opções de configuração (opcional)
   * @param options.supabaseClient - Cliente Supabase já configurado (opcional)
   */
  async syncSubmissionToLead(
    submissionData: {
      id: string;
      formId: string;
      tenantId?: string | null;
      contactPhone?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactCpf?: string | null;
      instagramHandle?: string | null;
      birthDate?: string | null;
      addressCep?: string | null;
      addressStreet?: string | null;
      addressNumber?: string | null;
      addressComplement?: string | null;
      addressNeighborhood?: string | null;
      addressCity?: string | null;
      addressState?: string | null;
      agendouReuniao?: boolean | null;
      dataAgendamento?: string | null;
      answers?: any | null;
      totalScore: number;
      passed: boolean;
      formStatus?: string;
      formularioAberto?: boolean;
      formularioIniciado?: boolean;
    },
    options?: {
      supabaseClient?: any;
    }
  ): Promise<{success: boolean; leadId?: string; message: string; pipelineStatus?: string}> {
    try {
      console.log(`🔄 [LeadSync] Sincronizando submission ${submissionData.id}...`);

      // 1. Verificar se tem telefone
      if (!submissionData.contactPhone) {
        console.warn(`⚠️ [LeadSync] Submission ${submissionData.id} não tem telefone`);
        return { success: false, message: 'Submission sem telefone' };
      }

      // 2. Normalizar telefone (usando MESMA função que a busca)
      const telefoneNormalizado = normalizePhone(submissionData.contactPhone);
      console.log(`📞 [LeadSync] Telefone normalizado: ${submissionData.contactPhone} → ${telefoneNormalizado}`);

      // 3. Determinar status do formulário e qualificação
      // EXTENSÃO: formStatus pode vir explicitamente ou default para 'completed'
      const formStatus = submissionData.formStatus || 'completed';
      const qualificationStatus = submissionData.passed ? 'approved' : 'rejected';
      const statusQualificacao = submissionData.passed ? 'aprovado' : 'reprovado';
      
      // 4. Calcular pipeline_status baseado no mapeamento
      const pipelineStatus = getPipelineStatus(formStatus, qualificationStatus);

      console.log(`📊 [LeadSync] Status determinado: formStatus=${formStatus}, qualificationStatus=${qualificationStatus}, pipelineStatus=${pipelineStatus}, pontuacao=${submissionData.totalScore}`);

      // 5. Normalizar CPF se presente
      let cpfNormalizado: string | null = null;
      if (submissionData.contactCpf) {
        cpfNormalizado = normalizeCPF(submissionData.contactCpf);
        console.log(`🆔 [LeadSync] CPF normalizado: ${submissionData.contactCpf} → ${cpfNormalizado}`);
      }

      // 6. Verificar se deve usar Supabase (usa client fornecido ou busca um novo)
      const supabase = options?.supabaseClient || await getDynamicSupabaseClient();
      
      // ==== SINCRONIZAÇÃO SEMPRE NO POSTGRESQL LOCAL ====
      // IMPORTANTE: Leads são armazenados SOMENTE no PostgreSQL local
      // O Supabase contém apenas form_submissions, não leads
      console.log(`🗄️ [LeadSync] Sincronizando lead no PostgreSQL local`);
      
      // 🔥 MULTI-TENANT SECURITY: tenant_id DEVE estar definido (verificado no routes.ts)
      if (!submissionData.tenantId) {
        console.error(`❌ [LeadSync] Submission ${submissionData.id} sem tenant_id - isso não deveria acontecer!`);
        return {
          success: false,
          message: 'Submission sem tenant_id - violação de segurança multi-tenant'
        };
      }
      
      const tenantId = submissionData.tenantId;
      console.log(`🏢 [LeadSync] Tenant ID: ${tenantId}`);
      
      // Preparar dados estendidos para armazenar no campo tags (JSONB)
      const extendedFormData = {
        instagramHandle: submissionData.instagramHandle || null,
        birthDate: submissionData.birthDate || null,
        address: {
          cep: submissionData.addressCep || null,
          street: submissionData.addressStreet || null,
          number: submissionData.addressNumber || null,
          complement: submissionData.addressComplement || null,
          neighborhood: submissionData.addressNeighborhood || null,
          city: submissionData.addressCity || null,
          state: submissionData.addressState || null,
        },
        agendouReuniao: submissionData.agendouReuniao ?? null,
        dataAgendamento: submissionData.dataAgendamento || null,
        answers: submissionData.answers || null,
        submissionId: submissionData.id,
        formId: submissionData.formId,
      };

      return await this.syncToPostgreSQL(
        submissionData, 
        telefoneNormalizado, 
        formStatus, 
        qualificationStatus, 
        statusQualificacao, 
        tenantId,
        pipelineStatus,
        cpfNormalizado,
        extendedFormData
      );

    } catch (error: any) {
      console.error(`❌ [LeadSync] Erro ao sincronizar submission:`, error);
      return {
        success: false,
        message: error.message || 'Erro ao sincronizar'
      };
    }
  }

  /**
   * Sincroniza lead no PostgreSQL local
   * INCLUI: Atribuição automática de etiquetas WhatsApp baseada em formStatus e qualificationStatus
   * 
   * EXTENSÃO (2024-12): Agora suporta pipeline_status e CPF
   * EXTENSÃO (2025-01): Suporte a modo Supabase-only (pula sync local quando tabelas não existem)
   */
  private async syncToPostgreSQL(
    submissionData: {
      id: string;
      formId: string;
      contactPhone?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactCpf?: string | null;
      totalScore: number;
      passed: boolean;
      formularioAberto?: boolean;
      formularioIniciado?: boolean;
    },
    telefoneNormalizado: string,
    formStatus: string,
    qualificationStatus: string,
    statusQualificacao: string,
    tenantId: string,
    pipelineStatus: string,
    cpfNormalizado: string | null,
    extendedFormData?: {
      instagramHandle: string | null;
      birthDate: string | null;
      address: {
        cep: string | null;
        street: string | null;
        number: string | null;
        complement: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
      };
      agendouReuniao: boolean | null;
      dataAgendamento: string | null;
      answers: any | null;
      submissionId: string;
      formId: string;
    }
  ): Promise<{success: boolean; leadId?: string; message: string; pipelineStatus?: string}> {
    
    if (!modeChecked) {
      try {
        await db.select().from(leads).limit(1);
        supabaseOnlyMode = false;
        console.log('ℹ️ [LeadSync] Modo PostgreSQL local detectado');
      } catch (err: any) {
        if (err?.cause?.code === '42P01') {
          supabaseOnlyMode = true;
          console.log('ℹ️ [LeadSync] Modo Supabase-only detectado - sync local desativado');
        }
      }
      modeChecked = true;
    }
    
    if (supabaseOnlyMode) {
      console.log(`✅ [LeadSync] Modo Supabase-only - submission ${submissionData.id} sincronizada (pipeline: ${pipelineStatus})`);
      return {
        success: true,
        message: 'Supabase-only mode - sync local ignorado',
        pipelineStatus
      };
    }
    
    // PASSO 1: Buscar etiqueta WhatsApp correspondente (3-tier matching)
    // CRÍTICO: Isso garante que toda submission tenha uma etiqueta automaticamente
    const { whatsappLabels } = await import('../../../shared/db-schema.js');
    const { isNull } = await import('drizzle-orm');
    
    let matchingLabelId: string | null = null;
    
    try {
      // NÍVEL 1: Match EXATO (formStatus + qualificationStatus)
      const exactMatch = await db.select()
        .from(whatsappLabels)
        .where(and(
          eq(whatsappLabels.formStatus, formStatus),
          eq(whatsappLabels.qualificationStatus, qualificationStatus),
          eq(whatsappLabels.ativo, true)
        ))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (exactMatch) {
        matchingLabelId = exactMatch.id;
        console.log(`🏷️ [LeadSync] Etiqueta (match exato): "${exactMatch.nome}" (${formStatus} + ${qualificationStatus})`);
      } else {
        // NÍVEL 2: Match PARCIAL (apenas formStatus, qualificationStatus = null)
        const partialMatch = await db.select()
          .from(whatsappLabels)
          .where(and(
            eq(whatsappLabels.formStatus, formStatus),
            isNull(whatsappLabels.qualificationStatus),
            eq(whatsappLabels.ativo, true)
          ))
          .limit(1)
          .then(rows => rows[0] || null);
        
        if (partialMatch) {
          matchingLabelId = partialMatch.id;
          console.log(`🏷️ [LeadSync] Etiqueta (match parcial): "${partialMatch.nome}" (${formStatus})`);
        } else {
          // NÍVEL 3: Fallback PADRÃO ("not_sent" = Contato inicial)
          const defaultLabel = await db.select()
            .from(whatsappLabels)
            .where(and(
              eq(whatsappLabels.formStatus, 'not_sent'),
              eq(whatsappLabels.ativo, true)
            ))
            .limit(1)
            .then(rows => rows[0] || null);
          
          if (defaultLabel) {
            matchingLabelId = defaultLabel.id;
            console.log(`🏷️ [LeadSync] Etiqueta (fallback): "${defaultLabel.nome}"`);
          } else {
            console.warn(`⚠️ [LeadSync] Nenhuma etiqueta encontrada - lead será criado sem etiqueta`);
          }
        }
      }
    } catch (labelError: any) {
      console.error(`❌ [LeadSync] Erro ao buscar etiqueta:`, labelError);
      // Continua sem etiqueta se houver erro
    }

    // PASSO 2: Buscar ou criar lead
    let lead = await db.select()
      .from(leads)
      .where(eq(leads.telefoneNormalizado, telefoneNormalizado))
      .limit(1)
      .then(rows => rows[0] || null);

    const agora = new Date();

    if (lead) {
      // ATUALIZAR lead existente
      console.log(`🔄 [LeadSync] Atualizando lead existente: ${lead.id}`);
      
      // Determinar se o formulário foi concluído baseado no formStatus
      const formularioConcluido = formStatus === 'completed';
      
      // Preparar dados de atualização
      const updateData: any = {
        // Atualizar informações de contato se não existirem
        nome: lead.nome || submissionData.contactName || null,
        email: lead.email || submissionData.contactEmail || null,
        
        // Status do formulário
        formStatus: formStatus,
        statusQualificacao: statusQualificacao,
        qualificationStatus: qualificationStatus,
        pontuacao: submissionData.totalScore,
        
        // ✅ EXTENSÃO: Pipeline status automático baseado no mapeamento
        pipelineStatus: pipelineStatus,
        
        // ✅ CRÍTICO: Atribuir etiqueta WhatsApp automaticamente
        whatsappLabelId: matchingLabelId,
        
        // ✅ EXTENSÃO: Armazenar todos os dados estendidos da submission no campo tags
        // Inclui: instagram, endereço, data de nascimento, respostas do formulário, agendamento
        tags: extendedFormData ? {
          ...(typeof lead.tags === 'object' && lead.tags !== null ? lead.tags : {}),
          formData: extendedFormData
        } : lead.tags,
        
        updatedAt: agora,
      };
      
      // Atualizar flags de formulário baseado no status
      if (submissionData.formularioAberto !== undefined) {
        updateData.formularioAberto = submissionData.formularioAberto;
        if (submissionData.formularioAberto && !lead.formularioAbertoEm) {
          updateData.formularioAbertoEm = agora;
        }
      }
      
      if (submissionData.formularioIniciado !== undefined) {
        updateData.formularioIniciado = submissionData.formularioIniciado;
        if (submissionData.formularioIniciado && !lead.formularioIniciadoEm) {
          updateData.formularioIniciadoEm = agora;
        }
      }
      
      // Marcar como concluído se formStatus for 'completed'
      if (formularioConcluido) {
        updateData.formularioConcluido = true;
        updateData.formularioConcluidoEm = lead.formularioConcluidoEm || agora;
      }
      
      // ✅ EXTENSÃO: Atualizar CPF se presente na submission
      if (submissionData.contactCpf && cpfNormalizado) {
        updateData.cpf = submissionData.contactCpf;
        updateData.cpfNormalizado = cpfNormalizado;
        console.log(`🆔 [LeadSync] CPF atualizado no lead: ${cpfNormalizado}`);
      }
      
      const [updatedLead] = await db.update(leads)
        .set(updateData)
        .where(eq(leads.id, lead.id))
        .returning();

      console.log(`✅ [LeadSync] Lead ${updatedLead.id} atualizado com sucesso! (pipeline: ${pipelineStatus})`);
      
      // ✅ EXTENSÃO (2024-12): Dispara consulta CPF automática quando formulário é APROVADO
      // Condições para disparar:
      // 1. CPF normalizado existe na submission
      // 2. qualificationStatus é 'approved' (formulário aprovado no Kanban)
      // 3. CPF ainda não foi consultado (cpfStatus não definido E cpfCheckedAt não definido)
      const cpfJaConsultado = lead.cpfStatus || lead.cpfCheckedAt;
      const deveConsultarCPF = cpfNormalizado && qualificationStatus === 'approved' && !cpfJaConsultado;
      
      if (deveConsultarCPF) {
        console.log(`🔍 [LeadSync] Disparando consulta CPF automática para lead APROVADO ${updatedLead.id}...`);
        console.log(`   📋 qualificationStatus=${qualificationStatus}, cpfStatus=${lead.cpfStatus || 'N/A'}, cpfCheckedAt=${lead.cpfCheckedAt || 'N/A'}`);
        
        // 🛡️ Prevenir duplicidade: Adicionar pequeno delay para permitir que o frontend ou outros processos terminem
        // Isso evita race conditions quando múltiplos gatilhos ocorrem simultaneamente
        setTimeout(() => {
          triggerAutoCPFCheck(
            cpfNormalizado,
            updatedLead.id,
            submissionData.id,
            tenantId,
            submissionData.contactName || lead.nome || null,
            telefoneNormalizado
          ).catch(err => {
            console.error(`❌ [LeadSync] Erro ao disparar consulta CPF automática:`, err);
          });
        }, 1500); 
      } else if (cpfNormalizado && qualificationStatus === 'approved' && cpfJaConsultado) {
        console.log(`⏭️ [LeadSync] CPF já foi consultado anteriormente para lead ${updatedLead.id} (cpfStatus=${lead.cpfStatus}) - pulando consulta duplicada`);
      }
      
      return {
        success: true,
        leadId: updatedLead.id,
        message: 'Lead atualizado com sucesso',
        pipelineStatus: pipelineStatus
      };

    } else {
      // CRIAR novo lead
      console.log(`➕ [LeadSync] Criando novo lead para ${telefoneNormalizado}`);
      
      // Determinar se o formulário foi concluído baseado no formStatus
      const formularioConcluido = formStatus === 'completed';
      
      // Preparar dados do novo lead
      const newLeadData: any = {
        // 🔥 MULTI-TENANT SECURITY: Sempre incluir tenant_id
        tenantId: tenantId,
        
        telefone: submissionData.contactPhone,
        telefoneNormalizado: telefoneNormalizado,
        nome: submissionData.contactName || null,
        email: submissionData.contactEmail || null,
        origem: 'formulario',
        
        // Status do formulário
        formStatus: formStatus,
        statusQualificacao: statusQualificacao,
        qualificationStatus: qualificationStatus,
        pontuacao: submissionData.totalScore,
        
        // ✅ EXTENSÃO: Pipeline status automático baseado no mapeamento
        pipelineStatus: pipelineStatus,
        
        // ✅ CRÍTICO: Atribuir etiqueta WhatsApp automaticamente
        whatsappLabelId: matchingLabelId,
        
        // ✅ EXTENSÃO: Armazenar todos os dados estendidos da submission no campo tags
        // Inclui: instagram, endereço, data de nascimento, respostas do formulário, agendamento
        tags: extendedFormData ? { formData: extendedFormData } : [],
      };
      
      // Flags de formulário
      if (submissionData.formularioAberto) {
        newLeadData.formularioAberto = true;
        newLeadData.formularioAbertoEm = agora;
      }
      
      if (submissionData.formularioIniciado) {
        newLeadData.formularioIniciado = true;
        newLeadData.formularioIniciadoEm = agora;
      }
      
      if (formularioConcluido) {
        newLeadData.formularioConcluido = true;
        newLeadData.formularioConcluidoEm = agora;
      }
      
      // ✅ EXTENSÃO: Adicionar CPF se presente na submission
      if (submissionData.contactCpf && cpfNormalizado) {
        newLeadData.cpf = submissionData.contactCpf;
        newLeadData.cpfNormalizado = cpfNormalizado;
        console.log(`🆔 [LeadSync] CPF definido no novo lead: ${cpfNormalizado}`);
      }
      
      const [newLead] = await db.insert(leads).values(newLeadData).returning();

      console.log(`✅ [LeadSync] Novo lead ${newLead.id} criado com sucesso! (pipeline: ${pipelineStatus})`);
      
      // ✅ EXTENSÃO (2024-12): Dispara consulta CPF automática quando formulário é APROVADO
      // Para novos leads, não precisa verificar cpfStatus pois acabou de ser criado
      // Condições para disparar:
      // 1. CPF normalizado existe na submission
      // 2. qualificationStatus é 'approved' (formulário aprovado no Kanban)
      if (cpfNormalizado && qualificationStatus === 'approved') {
        console.log(`🔍 [LeadSync] Disparando consulta CPF automática para novo lead APROVADO ${newLead.id}...`);
        console.log(`   📋 qualificationStatus=${qualificationStatus}, CPF=${cpfNormalizado.substring(0, 3)}...`);
        
        // 🛡️ Prevenir duplicidade com pequeno delay
        setTimeout(() => {
          triggerAutoCPFCheck(
            cpfNormalizado,
            newLead.id,
            submissionData.id,
            tenantId,
            submissionData.contactName || null,
            telefoneNormalizado
          ).catch(err => {
            console.error(`❌ [LeadSync] Erro ao disparar consulta CPF automática:`, err);
          });
        }, 1500);
      }
      
      return {
        success: true,
        leadId: newLead.id,
        message: 'Lead criado com sucesso',
        pipelineStatus: pipelineStatus
      };
    }
  }

  /**
   * Sincroniza lead no Supabase
   */
  private async syncToSupabase(
    supabase: any,
    submissionData: {
      id: string;
      formId: string;
      contactPhone?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      totalScore: number;
      passed: boolean;
    },
    telefoneNormalizado: string,
    formStatus: string,
    qualificationStatus: string,
    statusQualificacao: string
  ): Promise<{success: boolean; leadId?: string; message: string}> {
    // Buscar lead existente pelo telefone normalizado
    const { data: existingLeads, error: searchError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone_normalizado', telefoneNormalizado)
      .limit(1);

    if (searchError) {
      console.error(`❌ [LeadSync/Supabase] Erro ao buscar lead:`, searchError);
      throw searchError;
    }

    const agora = new Date().toISOString();
    const leadData = {
      telefone: submissionData.contactPhone,
      telefone_normalizado: telefoneNormalizado,
      nome: submissionData.contactName || null,
      email: submissionData.contactEmail || null,
      origem: 'formulario',
      formulario_concluido: true,
      formulario_concluido_em: agora,
      form_status: formStatus,
      status_qualificacao: statusQualificacao,
      qualification_status: qualificationStatus,
      pontuacao: submissionData.totalScore,
      formulario_id: submissionData.formId,
      submission_id: submissionData.id,
      updated_at: agora,
    };

    if (existingLeads && existingLeads.length > 0) {
      // ATUALIZAR lead existente
      const existingLead = existingLeads[0];
      console.log(`🔄 [LeadSync/Supabase] Atualizando lead existente: ${existingLead.id}`);

      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData,
          nome: existingLead.nome || submissionData.contactName || null,
          email: existingLead.email || submissionData.contactEmail || null,
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (error) {
        console.error(`❌ [LeadSync/Supabase] Erro ao atualizar lead:`, error);
        throw error;
      }

      console.log(`✅ [LeadSync/Supabase] Lead ${data.id} atualizado com sucesso!`);
      return {
        success: true,
        leadId: data.id,
        message: 'Lead atualizado com sucesso'
      };

    } else {
      // CRIAR novo lead
      console.log(`➕ [LeadSync/Supabase] Criando novo lead para ${telefoneNormalizado}`);

      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (error) {
        console.error(`❌ [LeadSync/Supabase] Erro ao criar lead:`, error);
        throw error;
      }

      console.log(`✅ [LeadSync/Supabase] Novo lead ${data.id} criado com sucesso!`);
      return {
        success: true,
        leadId: data.id,
        message: 'Lead criado com sucesso'
      };
    }
  }

  /**
   * Sincroniza TODAS as submissions existentes com leads (apenas PostgreSQL local)
   * Útil para migração de dados ou correção de inconsistências
   */
  async syncAllSubmissionsToLeads(): Promise<{success: boolean; synced: number; errors: number; details: any[]}> {
    try {
      console.log(`🔄 [LeadSync] Iniciando sincronização em massa...`);

      // Buscar todas as submissions do PostgreSQL local
      const allSubmissions = await db.select().from(formSubmissions);
      console.log(`📊 [LeadSync] Total de submissions encontradas: ${allSubmissions.length}`);

      const results = {
        success: true,
        synced: 0,
        errors: 0,
        details: [] as any[]
      };

      // Sincronizar cada uma
      for (const submission of allSubmissions) {
        const result = await this.syncSubmissionToLead({
          id: submission.id,
          formId: submission.formId,
          contactPhone: submission.contactPhone,
          contactName: submission.contactName,
          contactEmail: submission.contactEmail,
          totalScore: submission.totalScore,
          passed: submission.passed,
        });
        
        if (result.success) {
          results.synced++;
        } else {
          results.errors++;
        }

        results.details.push({
          submissionId: submission.id,
          telefone: submission.contactPhone,
          ...result
        });
      }

      console.log(`✅ [LeadSync] Sincronização concluída: ${results.synced} sucesso, ${results.errors} erros`);
      
      return results;

    } catch (error: any) {
      console.error(`❌ [LeadSync] Erro na sincronização em massa:`, error);
      return {
        success: false,
        synced: 0,
        errors: 0,
        details: [{ error: error.message }]
      };
    }
  }
}

export const leadSyncService = new LeadSyncService();
