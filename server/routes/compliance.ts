import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { checkCompliance, reprocessCheck } from "../lib/datacorpCompliance.js";
import { validateCPF, normalizeCPF, decryptCPF, formatCPF, tenantIdToUUID } from "../lib/cryptoCompliance.js";
import { isBigdatacorpConfigured } from "../lib/bigdatacorpClient.js";
import { z } from "zod";
import { db } from "../db.js";
import { datacorpChecks, users } from "../../shared/db-schema.js";
import { eq, desc, or, inArray } from "drizzle-orm";
import { walletService } from "../services/walletService.js";
import { isPagarmeConfigured } from "../middleware/checkBalance.js";

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const checkCpfSchema = z.object({
  cpf: z.string().min(11).max(14),
  personName: z.string().min(3).optional(),
  personPhone: z.string().optional(), // Telefone para sincronização de etiquetas WhatsApp
  tenantId: z.string().optional(),
  leadId: z.string().optional(),
  submissionId: z.string().optional(),
  userId: z.string().optional(),
  forceRefresh: z.boolean().optional(), // Força nova consulta às 3 APIs, ignorando cache
});

function convertSupabaseCheckToCamelCase(check: any) {
  let formattedCpf = check.person_cpf || check.cpf || null;
  
  if (!formattedCpf) {
    if (check.cpf_encrypted) {
      try {
        const decryptedCpf = decryptCPF(check.cpf_encrypted);
        formattedCpf = formatCPF(decryptedCpf);
      } catch (error) {
        // Silent fail
      }
    }
    
    if (!formattedCpf && check.payload) {
      try {
        const payload = check.payload;
        if (payload?.Result?.[0]?.BasicData?.CPF) {
          const cpfFromPayload = payload.Result[0].BasicData.CPF.replace(/\D/g, '');
          if (cpfFromPayload && cpfFromPayload.length === 11) {
            formattedCpf = formatCPF(cpfFromPayload);
          }
        }
      } catch (payloadError) {
        // Silent fail
      }
    }
  }

  // Extrair processos e risco do payload BigDataCorp de forma automática
  let processCount = 0;
  try {
    const payload = check.payload || {};
    // Prioridade 1: Buscar TotalLawsuits diretamente (campo numérico)
    const processData = payload?.Result?.[0]?.Processes;
    if (processData?.TotalLawsuits !== undefined) {
      processCount = processData.TotalLawsuits;
    } else if (processData?.Lawsuits && Array.isArray(processData.Lawsuits)) {
      // Prioridade 2: Contar array de Lawsuits
      processCount = processData.Lawsuits.length;
    }
  } catch (e) {
    // Silent fail
  }
  
  const riskScore = check.risk_score || check.risco || 0;
  
  return {
    id: check.id,
    cpfHash: check.cpf_hash,
    cpfEncrypted: check.cpf_encrypted,
    personName: check.person_name || check.nome || check.name || null,
    personCpf: formattedCpf,
    personPhone: check.person_phone || check.telefone || null,
    tenantId: check.tenant_id,
    leadId: check.lead_id,
    submissionId: check.submission_id,
    status: check.status,
    riskScore: riskScore,
    processCount: processCount, // Novo campo automático
    payload: check.payload || {},
    consultedAt: check.consulted_at || check.data_consulta || check.created_at,
    expiresAt: check.expires_at || check.data_consulta || check.created_at,
    source: check.source,
    apiCost: check.api_cost || (check.source === 'supabase_master' ? "0.17" : "0.00"),
    createdBy: check.created_by,
    createdAt: check.created_at,
    updatedAt: check.updated_at,
  };
}

export function setupComplianceRoutes(): Router {
  const router = createRouter();

  // POST /api/compliance/check - Check CPF compliance
  // Rota pública que aceita tanto usuários autenticados quanto anônimos
  router.post("/api/compliance/check", async (req: Request, res: Response) => {
    try {
      const { cpf, personName, personPhone, tenantId, leadId, submissionId, userId, forceRefresh } = checkCpfSchema.parse(req.body);

      const normalizedCpf = normalizeCPF(cpf);
      
      if (!validateCPF(normalizedCpf)) {
        return res.status(400).json({
          error: "CPF inválido. Verifique os dígitos verificadores.",
        });
      }

      // Determinar tenantId e userId baseado na sessão ou valores fornecidos
      const isAuthenticated = !!req.session?.userId;
      const finalUserId = isAuthenticated ? req.session.userId : (userId || "anonymous");
      
      // SEGURANÇA: SEMPRE usar session.tenantId para autenticados
      // IGNORAR tenantId de req.body para prevenir acesso a dados de outros tenants
      const finalTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)  // Usar tenantId da sessão ou fallback para userId
        : DEMO_TENANT_ID;      // DEMO apenas para anônimos
      
      // WALLET: Verificar saldo APENAS se Pagar.me estiver configurado E usuário autenticado
      const CPF_SERVICE_PRICE = 2.00; // R$ 2,00 por consulta
      const walletSystemEnabled = isPagarmeConfigured();
      
      if (walletSystemEnabled && isAuthenticated) {
        const balanceCheck = await walletService.checkBalance(finalTenantId, CPF_SERVICE_PRICE);
        if (!balanceCheck.sufficient) {
          return res.status(402).json({
            error: 'Saldo insuficiente para consulta CPF',
            requiredAmount: CPF_SERVICE_PRICE,
            currentBalance: balanceCheck.currentBalance,
            rechargeRequired: true
          });
        }
      }
      
      // Verificar configuração APÓS determinar tenantId (busca no banco de dados do tenant)
      if (!(await isBigdatacorpConfigured(finalTenantId))) {
        return res.status(503).json({
          error: "API Bigdatacorp não configurada. Configure TOKEN_ID e CHAVE_TOKEN nas Configurações.",
        });
      }
      
      console.log(`[CPF Check] Autenticado: ${isAuthenticated}, User: ${finalUserId}, Tenant: ${finalTenantId}, ForceRefresh: ${!!forceRefresh}`);

      const result = await checkCompliance(normalizedCpf, {
        tenantId: finalTenantId,
        leadId,
        submissionId,
        createdBy: finalUserId,
        personName: personName || undefined,
        personPhone: personPhone || undefined, // Telefone para sincronização de etiquetas WhatsApp
        forceRefresh: forceRefresh || false, // Passa o parâmetro forceRefresh
      });

      // WALLET: Debitar saldo APÓS consulta bem-sucedida (apenas se Pagar.me configurado E autenticado)
      if (walletSystemEnabled && isAuthenticated && result && !result.error) {
        const debitResult = await walletService.debitFunds(
          finalTenantId,
          CPF_SERVICE_PRICE,
          `Consulta CPF - ${formatCPF(normalizedCpf)}`,
          result.checkId || undefined,
          'CPF_CONSULTA',
          { cpf: formatCPF(normalizedCpf), personName }
        );
        
        if (!debitResult.success) {
          console.warn(`[CPF Check] Falha ao debitar saldo: ${debitResult.error}`);
        } else {
          console.log(`[CPF Check] Débito de R$ ${CPF_SERVICE_PRICE.toFixed(2)} realizado para tenant ${finalTenantId}`);
        }
      }

      return res.json(result);
    } catch (error) {
      console.error("Erro ao consultar CPF:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao processar consulta",
      });
    }
  });

  // GET /api/compliance/stats - Get compliance statistics
  // Rota pública que aceita tanto usuários autenticados quanto anônimos
  router.get("/api/compliance/stats", async (req: Request, res: Response) => {
    try {
      // SEGURANÇA: SEMPRE usar session.tenantId para autenticados
      // IGNORAR tenantId de req.query para prevenir acesso a dados de outros tenants
      const isAuthenticated = !!req.session?.userId;
      const sessionTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)  // Usar tenantId da sessão ou fallback para userId
        : DEMO_TENANT_ID;      // DEMO apenas para anônimos
      
      // Convert tenantId to UUID for PostgreSQL query
      const tenantId = tenantIdToUUID(sessionTenantId);
      
      const checks = await db.select()
        .from(datacorpChecks)
        .where(eq(datacorpChecks.tenantId, tenantId));
      
      const totalChecks = checks?.length || 0;
      const approved = checks?.filter((c: any) => c.status === 'approved').length || 0;
      const rejected = checks?.filter((c: any) => c.status === 'rejected').length || 0;
      const manualReview = checks?.filter((c: any) => c.status === 'manual_review').length || 0;
      const errorCount = checks?.filter((c: any) => c.status === 'error').length || 0;
      const cacheSavings = totalChecks * 0.05;
      
      const stats = {
        totalChecks,
        cacheSavings,
        avgResponseTime: 250,
        statusDistribution: {
          approved,
          rejected,
          manual_review: manualReview,
          error: errorCount,
        },
      };
      
      return res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return res.status(500).json({
        error: "Erro ao buscar estatísticas",
      });
    }
  });

  // GET /api/compliance/recent - Get recent checks
  // Rota pública que aceita tanto usuários autenticados quanto anônimos
  router.get("/api/compliance/recent", async (req: Request, res: Response) => {
    try {
      // SEGURANÇA: SEMPRE usar session.tenantId para autenticados
      // IGNORAR tenantId de req.query para prevenir acesso a dados de outros tenants
      const isAuthenticated = !!req.session?.userId;
      const sessionTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)  // Usar tenantId da sessão ou fallback para userId
        : DEMO_TENANT_ID;      // DEMO apenas para anônimos
      const finalUserId = isAuthenticated ? req.session.userId! : "anonymous";
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Convert tenantId and userId to UUID for all database queries
      const tenantUUID = tenantIdToUUID(sessionTenantId);
      const userUUID = tenantIdToUUID(finalUserId);
      
      console.log('[CPF Recent] Buscando por tenant_id:', tenantUUID, 'OU created_by:', userUUID);
      
      let checks: any[] = [];
      
      // Buscar do Supabase Master se configurado, senão do PostgreSQL local
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      if (await isSupabaseMasterConfigured(sessionTenantId)) {
        const supabase = await getSupabaseMasterForTenant(sessionTenantId);
        // Buscar por tenant_id OU created_by para incluir registros do usuário em qualquer tenant
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('datacorp_checks')
          .select('*')
          .or(`tenant_id.eq.${tenantUUID},created_by.eq.${userUUID}`)
          .order('consulted_at', { ascending: false })
          .limit(limit);
        
        if (supabaseError) {
          console.error('Erro ao buscar do Supabase Master:', supabaseError);
          // Fallback para PostgreSQL local
          const data = await db.select()
            .from(datacorpChecks)
            .where(or(eq(datacorpChecks.tenantId, tenantUUID), eq(datacorpChecks.createdBy, userUUID)))
            .orderBy(desc(datacorpChecks.consultedAt))
            .limit(limit);
          checks = data || [];
        } else {
          checks = supabaseData || [];
        }
      } else {
        // Usar PostgreSQL local
        const data = await db.select()
          .from(datacorpChecks)
          .where(or(eq(datacorpChecks.tenantId, tenantUUID), eq(datacorpChecks.createdBy, userUUID)))
          .orderBy(desc(datacorpChecks.consultedAt))
          .limit(limit);
        checks = data || [];
      }
      
      const formattedChecks = checks.map(convertSupabaseCheckToCamelCase);
      
      return res.json(formattedChecks);
    } catch (error) {
      console.error("Erro ao buscar consultas recentes:", error);
      return res.status(500).json({
        error: "Erro ao buscar consultas recentes",
      });
    }
  });

  // GET /api/compliance/history - Get compliance history
  // Rota pública que aceita tanto usuários autenticados quanto anônimos
  // CORREÇÃO 2025-12: Sistema single-admin - buscar TODOS os registros do Supabase Master
  // O email do administrador é constante entre exportações, mas tenant_id e created_by mudam
  // Portanto, para garantir que consultas automáticas (via formulário) apareçam no histórico,
  // buscamos TODOS os registros quando o Supabase Master está configurado
  router.get("/api/compliance/history", async (req: Request, res: Response) => {
    try {
      // SEGURANÇA: SEMPRE usar session.tenantId para autenticados
      const isAuthenticated = !!req.session?.userId;
      
      const finalTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)
        : DEMO_TENANT_ID;
      
      const finalUserId = isAuthenticated ? req.session.userId! : "anonymous";
      const userEmail = req.session?.userEmail || null;
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Convert tenantId and userId to UUID for all database queries
      const tenantUUID = tenantIdToUUID(finalTenantId);
      const userUUID = tenantIdToUUID(finalUserId);
      
      console.log('[CPF History] isAuthenticated:', isAuthenticated);
      console.log('[CPF History] session.userEmail:', userEmail);
      console.log('[CPF History] tenantUUID:', tenantUUID);
      console.log('[CPF History] userUUID (created_by):', userUUID);
      
      let checks: any[] = [];
      
      // Buscar do Supabase Master se configurado, senão do PostgreSQL local
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      if (await isSupabaseMasterConfigured(finalTenantId)) {
        const supabase = await getSupabaseMasterForTenant(finalTenantId);
        
        // CORREÇÃO 2025-12: Sistema single-admin
        // Buscar TODOS os registros do Supabase Master sem filtro por tenant_id ou created_by
        // Isso garante que consultas automáticas (via formulário) apareçam no histórico
        // mesmo após exportação/reimportação da plataforma (quando os UUIDs mudam)
        console.log('[CPF History] Sistema single-admin: Buscando TODOS os registros do Supabase Master');
        
        try {
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('datacorp_checks')
            .select('*')
            .order('consulted_at', { ascending: false })
            .limit(limit);
          
          if (supabaseError) {
            console.error('[CPF History] Erro ao buscar do Supabase Master:', supabaseError);
            throw supabaseError;
          }

          checks = supabaseData || [];
          console.log('[CPF History] Registros encontrados no Supabase Master:', checks.length);
          
          // BUSCA COMPLEMENTAR: Sempre buscar também do Supabase Cliente para garantir dados de hoje
          try {
            const { getClienteSupabase } = await import('../lib/clienteSupabase.js');
            const clienteSupabase = await getClienteSupabase();
            
            const { data: clienteData, error: clienteError } = await clienteSupabase
              .from('cpf_compliance_results')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (!clienteError && clienteData && clienteData.length > 0) {
              // CORREÇÃO: cpf_compliance_results são registros RESUMIDOS sem payload completo
              // Só incluir se NÃO houver um registro correspondente em datacorp_checks
              // O campo check_id em cpf_compliance_results referencia o id em datacorp_checks
              const existingIds = new Set(checks.map(c => c.id));
              const existingCheckIds = new Set(checks.map(c => c.id)); // datacorp_checks IDs
              
              // Filtrar apenas registros cujo check_id NÃO existe em datacorp_checks
              const orphanRecords = clienteData.filter((item: any) => {
                // Se tem check_id e esse check_id já existe, pular
                if (item.check_id && existingCheckIds.has(item.check_id)) {
                  return false;
                }
                // Se o próprio id já existe, pular
                if (existingIds.has(item.id)) {
                  return false;
                }
                return true;
              });
              
              if (orphanRecords.length > 0) {
                const clienteChecksMapped = orphanRecords.map((item: any) => ({
                  id: item.id,
                  cpf_hash: item.cpf_hash || '',
                  cpf_encrypted: item.cpf_encrypted || item.cpf || '',
                  tenant_id: tenantUUID,
                  status: item.status || 'pending',
                  risk_score: item.risco || item.risk_score || item.score || 0,
                  consulted_at: item.data_consulta || item.created_at || item.consulted_at,
                  response_data: {},
                  payload: {}, // cpf_compliance_results não tem payload completo
                  name: item.nome || item.name || item.person_name || '',
                  person_name: item.nome || item.person_name || item.name || '',
                  person_cpf: item.cpf || item.person_cpf || '',
                  created_by: item.created_by || userUUID,
                  lead_id: item.lead_id,
                  submission_id: item.submission_id,
                  created_at: item.created_at,
                  updated_at: item.updated_at || item.created_at,
                  source: 'supabase_cliente',
                  _is_summary_only: true, // Flag para indicar que é registro resumido
                }));
                
                checks = [...checks, ...clienteChecksMapped];
                console.log('[CPF History] Registros órfãos do Cliente (sem payload completo):', orphanRecords.length);
              }
            }
          } catch (clienteErr: any) {
            console.log('[CPF History] Erro na busca complementar do Cliente:', clienteErr.message);
          }

          // RE-ORDENAÇÃO GLOBAL: Garante que os mais recentes (inclusive do Cliente) fiquem no topo
          checks.sort((a, b) => {
            const dateA = new Date(a.consulted_at || a.created_at).getTime();
            const dateB = new Date(b.consulted_at || b.created_at).getTime();
            return dateB - dateA;
          });

          // Limita ao solicitado
          checks = checks.slice(0, limit);
        } catch (err: any) {
          console.log('[CPF History] Fallback para Supabase Cliente...', err.message);
          
          // Fallback 1: Tentar Supabase CLIENTE (onde os dados do CPFPoller ficam)
          try {
            const { getClienteSupabase } = await import('../lib/clienteSupabase.js');
            const clienteSupabase = await getClienteSupabase();
            
            const { data: clienteData, error: clienteError } = await clienteSupabase
              .from('cpf_compliance_results')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (!clienteError && clienteData && clienteData.length > 0) {
              // Mapear campos do Supabase Cliente para o formato esperado (compatível com datacorp_checks)
              // NOTA: cpf_compliance_results são registros RESUMIDOS sem payload completo
              checks = clienteData.map((item: any) => ({
                id: item.id,
                cpf_hash: item.cpf_hash || '',
                cpf_encrypted: item.cpf_encrypted || item.cpf || '',
                tenant_id: tenantUUID,
                status: item.status || 'pending',
                risk_score: item.risco || item.risk_score || item.score || 0,
                consulted_at: item.data_consulta || item.created_at || item.consulted_at,
                response_data: {},
                payload: {}, // cpf_compliance_results não tem payload completo
                name: item.nome || item.name || item.person_name || '',
                person_name: item.nome || item.person_name || item.name || '',
                person_cpf: item.cpf || item.person_cpf || '',
                created_by: item.created_by || userUUID,
                lead_id: item.lead_id,
                submission_id: item.submission_id,
                created_at: item.created_at,
                updated_at: item.updated_at || item.created_at,
                source: 'supabase_cliente',
                _is_summary_only: true, // Flag para indicar que é registro resumido
              }));
              console.log('[CPF History] Registros do Supabase Cliente (resumidos, sem payload completo):', checks.length);
            } else {
              throw new Error(clienteError?.message || 'Nenhum dado no Supabase Cliente');
            }
          } catch (clienteErr: any) {
            console.log('[CPF History] Falha no Supabase Cliente, tentando PostgreSQL local...', clienteErr.message);
            // Fallback 2: PostgreSQL local
            const data = await db.select()
              .from(datacorpChecks)
              .where(or(eq(datacorpChecks.tenantId, tenantUUID), eq(datacorpChecks.createdBy, userUUID)))
              .orderBy(desc(datacorpChecks.consultedAt))
              .limit(limit);
            checks = data || [];
            console.log('[CPF History] Registros encontrados no PostgreSQL local:', checks.length);
          }
        }
      } else {
        console.log('[CPF History] Supabase Master não configurado, usando PostgreSQL local');
        
        // PostgreSQL local - buscar por tenant_id ou created_by
        const data = await db.select()
          .from(datacorpChecks)
          .where(or(eq(datacorpChecks.tenantId, tenantUUID), eq(datacorpChecks.createdBy, userUUID)))
          .orderBy(desc(datacorpChecks.consultedAt))
          .limit(limit);
        checks = data || [];
        console.log('[CPF History] Registros encontrados no PostgreSQL local:', checks.length);
      }
      
      const formattedChecks = checks.map(convertSupabaseCheckToCamelCase);
      console.log('[CPF History] Retornando', formattedChecks.length, 'registros formatados');
      
      return res.json(formattedChecks);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      return res.status(500).json({
        error: "Erro ao buscar histórico",
      });
    }
  });

  // GET /api/compliance/check/:id - Get specific check by ID
  router.get("/api/compliance/check/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const data = await db.select()
        .from(datacorpChecks)
        .where(eq(datacorpChecks.id, id))
        .limit(1);
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      
      const check = convertSupabaseCheckToCamelCase(data[0]);
      return res.json(check);
    } catch (error) {
      console.error("Erro ao buscar consulta:", error);
      return res.status(500).json({
        error: "Erro ao buscar consulta",
      });
    }
  });

  // POST /api/compliance/reprocess/:id - Reprocess a check
  router.post("/api/compliance/reprocess/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // SEGURANÇA: SEMPRE usar session.userId como tenantId para autenticados
      // IGNORAR tenantId de req.body para prevenir acesso a dados de outros tenants
      const isAuthenticated = !!req.session?.userId;
      const tenantId = isAuthenticated 
        ? req.session.userId!  // SEMPRE usar session userId para autenticados
        : DEMO_TENANT_ID;      // DEMO apenas para anônimos
      
      const result = await reprocessCheck(id, tenantId);
      return res.json(result);
    } catch (error) {
      console.error("Erro ao reprocessar consulta:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao reprocessar consulta",
      });
    }
  });

  // GET /api/compliance/download-pdf/:id - Download single check as PDF
  router.get("/api/compliance/download-pdf/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // SEGURANÇA: Verificar autenticação e tenant
      const isAuthenticated = !!req.session?.userId;
      if (!isAuthenticated) {
        return res.status(401).json({ error: "Não autorizado" });
      }
      
      const sessionTenantId = req.session.tenantId || req.session.userId!;
      const normalizedTenantId = tenantIdToUUID(sessionTenantId);
      
      const { generateCompliancePDF } = await import('../lib/pdfGenerator.js');
      
      // Primeiro tentar buscar do Supabase Master (fonte primária)
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      let checkRecord: any = null;
      
      if (await isSupabaseMasterConfigured(sessionTenantId)) {
        const supabase = await getSupabaseMasterForTenant(sessionTenantId);
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('datacorp_checks')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!supabaseError && supabaseData) {
          checkRecord = supabaseData;
        }
      }
      
      // Fallback para PostgreSQL local se não encontrou no Supabase
      if (!checkRecord) {
        const data = await db.select()
          .from(datacorpChecks)
          .where(eq(datacorpChecks.id, id))
          .limit(1);
        
        if (data && data.length > 0) {
          checkRecord = data[0];
        }
      }
      
      if (!checkRecord) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      
      // SEGURANÇA: Verificar se o check pertence ao tenant do usuário
      // Normalizar ambos para UUID antes de comparar
      const checkTenantId = checkRecord.tenantId || checkRecord.tenant_id;
      const normalizedCheckTenantId = tenantIdToUUID(checkTenantId);
      
      if (normalizedCheckTenantId !== normalizedTenantId) {
        console.warn(`[SECURITY] Tentativa de acesso não autorizado ao PDF. User tenant: ${normalizedTenantId}, Check tenant: ${normalizedCheckTenantId}`);
        return res.status(403).json({ error: "Acesso negado a este registro" });
      }
      
      const check = convertSupabaseCheckToCamelCase(checkRecord);
      const checkAny = check as any;
      const cpf = (checkAny.personCpf || 'sem-cpf').replace(/\D/g, '');
      const date = new Date(check.consultedAt).toISOString().split('T')[0];
      const filename = `relatorio-cpf-${cpf}-${date}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const doc = generateCompliancePDF(check as any);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      return res.status(500).json({
        error: "Erro ao gerar PDF",
      });
    }
  });

  // POST /api/compliance/download-pdf-bulk - Download multiple checks as PDF
  router.post("/api/compliance/download-pdf-bulk", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body as { ids?: string[] };
      
      // SEGURANÇA: Verificar autenticação
      const isAuthenticated = !!req.session?.userId;
      if (!isAuthenticated) {
        return res.status(401).json({ error: "Não autorizado" });
      }
      
      const sessionTenantId = req.session.tenantId || req.session.userId!;
      const normalizedTenantId = tenantIdToUUID(sessionTenantId);
      
      const { generateBulkCompliancePDF } = await import('../lib/pdfGenerator.js');
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      let checks: any[] = [];
      
      if (ids && ids.length > 0) {
        // Download specific IDs - VERIFICAR CADA UM PERTENCE AO TENANT
        for (const id of ids) {
          let checkRecord: any = null;
          
          // Primeiro buscar do Supabase Master
          if (await isSupabaseMasterConfigured(sessionTenantId)) {
            const supabase = await getSupabaseMasterForTenant(sessionTenantId);
            const { data: supabaseData, error: supabaseError } = await supabase
              .from('datacorp_checks')
              .select('*')
              .eq('id', id)
              .single();
            
            if (!supabaseError && supabaseData) {
              checkRecord = supabaseData;
            }
          }
          
          // Fallback para PostgreSQL local
          if (!checkRecord) {
            const data = await db.select()
              .from(datacorpChecks)
              .where(eq(datacorpChecks.id, id))
              .limit(1);
            if (data && data.length > 0) {
              checkRecord = data[0];
            }
          }
          
          if (checkRecord) {
            // SEGURANÇA: Verificar se pertence ao tenant (normalizar para UUID)
            const checkTenantId = checkRecord.tenantId || checkRecord.tenant_id;
            const normalizedCheckTenantId = tenantIdToUUID(checkTenantId);
            
            if (normalizedCheckTenantId === normalizedTenantId) {
              checks.push(convertSupabaseCheckToCamelCase(checkRecord));
            } else {
              console.warn(`[SECURITY] Tentativa de acesso não autorizado ao PDF bulk. User tenant: ${normalizedTenantId}, Check tenant: ${normalizedCheckTenantId}, ID: ${id}`);
            }
          }
        }
      } else {
        // Download all for tenant (up to 100) - já filtrado por tenant
        if (await isSupabaseMasterConfigured(sessionTenantId)) {
          const supabase = await getSupabaseMasterForTenant(sessionTenantId);
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('datacorp_checks')
            .select('*')
            .eq('tenant_id', normalizedTenantId)
            .order('consulted_at', { ascending: false })
            .limit(100);
          
          if (!supabaseError && supabaseData) {
            checks = supabaseData.map(convertSupabaseCheckToCamelCase);
          }
        }
        
        if (checks.length === 0) {
          const data = await db.select()
            .from(datacorpChecks)
            .where(eq(datacorpChecks.tenantId, normalizedTenantId))
            .orderBy(desc(datacorpChecks.consultedAt))
            .limit(100);
          checks = (data || []).map(convertSupabaseCheckToCamelCase);
        }
      }
      
      if (checks.length === 0) {
        return res.status(404).json({ error: "Nenhuma consulta encontrada" });
      }
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `historico-compliance-${date}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const doc = generateBulkCompliancePDF(checks as any);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Erro ao gerar PDF em lote:", error);
      return res.status(500).json({
        error: "Erro ao gerar PDF em lote",
      });
    }
  });

  // POST /api/compliance/sync-to-cliente - Sincroniza consultas do Master para o Cliente
  router.post("/api/compliance/sync-to-cliente", async (req: Request, res: Response) => {
    try {
      const { syncMasterToCliente } = await import("../lib/cpfCompliancePoller.js");
      const result = await syncMasterToCliente();
      
      return res.json({
        success: result.success,
        synced: result.synced,
        errors: result.errors,
        message: result.message
      });
    } catch (error) {
      console.error("Erro ao sincronizar consultas:", error);
      return res.status(500).json({
        error: "Erro ao sincronizar consultas",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // GET /api/compliance/master-checks - Lista consultas do Supabase Master
  // Inclui diagnóstico de tenant_id para depuração
  router.get("/api/compliance/master-checks", async (req: Request, res: Response) => {
    try {
      const { fetchAllMasterChecks } = await import("../lib/cpfCompliancePoller.js");
      const result = await fetchAllMasterChecks();
      
      if (!result.success) {
        return res.status(500).json({
          error: result.message
        });
      }
      
      // Converter para formato camelCase
      const formattedChecks = result.checks.map(convertSupabaseCheckToCamelCase);
      
      // Add diagnostic info: get session tenant for comparison
      const isAuthenticated = !!req.session?.userId;
      const sessionTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)
        : DEMO_TENANT_ID;
      const sessionTenantUUID = tenantIdToUUID(sessionTenantId);
      
      // Count tenant distribution for diagnostic
      const tenantDistribution: Record<string, number> = {};
      for (const check of formattedChecks) {
        const tid = check.tenantId || 'null';
        tenantDistribution[tid] = (tenantDistribution[tid] || 0) + 1;
      }
      
      // Find records that should be visible to current user
      const matchingTenantCount = formattedChecks.filter(c => c.tenantId === sessionTenantUUID).length;
      
      return res.json({
        success: true,
        count: formattedChecks.length,
        diagnostic: {
          sessionTenantId,
          sessionTenantUUID,
          matchingTenantCount,
          tenantDistribution,
          note: matchingTenantCount < formattedChecks.length 
            ? `⚠️ ${formattedChecks.length - matchingTenantCount} registros têm tenant_id diferente e não aparecem no histórico filtrado`
            : '✅ Todos os registros pertencem ao tenant atual'
        },
        checks: formattedChecks
      });
    } catch (error) {
      console.error("Erro ao buscar consultas do Master:", error);
      return res.status(500).json({
        error: "Erro ao buscar consultas do Master",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // POST /api/compliance/migrate-tenant - Migra registros de um tenantId para outro
  // Migra de: "system", DEMO_TENANT_ID, ou sourceTenantId específico
  router.post("/api/compliance/migrate-tenant", async (req: Request, res: Response) => {
    try {
      const isAuthenticated = !!req.session?.userId;
      if (!isAuthenticated) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      
      const { sourceTenantId: customSourceTenantId } = req.body;
      const sessionTenantId = req.session.tenantId || req.session.userId!;
      const targetTenantId = tenantIdToUUID(sessionTenantId);
      const systemTenantId = tenantIdToUUID("system");
      const demoTenantId = DEMO_TENANT_ID;
      
      // Source tenants to migrate from (in priority order)
      const sourceTenants = customSourceTenantId 
        ? [tenantIdToUUID(customSourceTenantId)]
        : [systemTenantId, demoTenantId];
      
      console.log(`[Migration] Migrando registros para ${targetTenantId}`);
      console.log(`[Migration] Fontes: ${sourceTenants.join(', ')}`);
      
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      if (!await isSupabaseMasterConfigured(sessionTenantId)) {
        return res.status(500).json({ error: "Supabase Master não configurado" });
      }
      
      const supabase = await getSupabaseMasterForTenant(sessionTenantId);
      
      let totalMigrated = 0;
      const migratedRecords: string[] = [];
      const errors: string[] = [];
      
      for (const sourceTenant of sourceTenants) {
        // Skip if source is same as target
        if (sourceTenant === targetTenantId) continue;
        
        // Buscar registros do tenant fonte
        const { data: sourceChecks, error: fetchError } = await supabase
          .from('datacorp_checks')
          .select('id, person_name, tenant_id')
          .eq('tenant_id', sourceTenant);
        
        if (fetchError) {
          console.error(`[Migration] Erro ao buscar registros de ${sourceTenant}:`, fetchError);
          errors.push(`Erro ao buscar de ${sourceTenant}: ${fetchError.message}`);
          continue;
        }
        
        if (!sourceChecks || sourceChecks.length === 0) {
          console.log(`[Migration] Nenhum registro em ${sourceTenant}`);
          continue;
        }
        
        console.log(`[Migration] Encontrados ${sourceChecks.length} registros em ${sourceTenant}`);
        
        // Atualizar registros para o novo tenantId
        const { data: updateResult, error: updateError } = await supabase
          .from('datacorp_checks')
          .update({ tenant_id: targetTenantId })
          .eq('tenant_id', sourceTenant)
          .select('id');
        
        if (updateError) {
          console.error(`[Migration] Erro ao atualizar registros de ${sourceTenant}:`, updateError);
          errors.push(`Erro ao migrar de ${sourceTenant}: ${updateError.message}`);
          continue;
        }
        
        const count = updateResult?.length || 0;
        totalMigrated += count;
        migratedRecords.push(...sourceChecks.map(c => c.person_name || 'Sem nome'));
        console.log(`[Migration] ✅ ${count} registros migrados de ${sourceTenant}`);
      }
      
      return res.json({
        success: true,
        message: `${totalMigrated} registros migrados para ${targetTenantId}`,
        migrated: totalMigrated,
        records: migratedRecords,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("[Migration] Erro ao migrar registros:", error);
      return res.status(500).json({
        error: "Erro ao migrar registros",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // GET /api/compliance/search - Busca registros por nome ou CPF (sem filtro de tenant para diagnóstico)
  router.get("/api/compliance/search", async (req: Request, res: Response) => {
    try {
      const { q, name, cpf } = req.query;
      const searchTerm = (q || name || '') as string;
      const searchCpf = (cpf || '') as string;
      
      if (!searchTerm && !searchCpf) {
        return res.status(400).json({ error: "Parâmetro 'q', 'name' ou 'cpf' é obrigatório" });
      }
      
      const isAuthenticated = !!req.session?.userId;
      const sessionTenantId = isAuthenticated 
        ? (req.session.tenantId || req.session.userId!)
        : DEMO_TENANT_ID;
      
      const { isSupabaseMasterConfigured, getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
      
      if (!await isSupabaseMasterConfigured(sessionTenantId)) {
        return res.status(500).json({ error: "Supabase Master não configurado" });
      }
      
      const supabase = await getSupabaseMasterForTenant(sessionTenantId);
      
      let query = supabase
        .from('datacorp_checks')
        .select('*')
        .order('consulted_at', { ascending: false })
        .limit(50);
      
      if (searchTerm) {
        query = query.ilike('person_name', `%${searchTerm}%`);
      }
      
      const { data: checks, error } = await query;
      
      if (error) {
        console.error('[Search] Erro ao buscar:', error);
        return res.status(500).json({ error: "Erro ao buscar registros" });
      }
      
      // If searching by CPF, also try to match via payload
      let results = checks || [];
      if (searchCpf && results.length === 0) {
        const normalizedSearchCpf = searchCpf.replace(/\D/g, '');
        const { data: allChecks } = await supabase
          .from('datacorp_checks')
          .select('*')
          .order('consulted_at', { ascending: false })
          .limit(500);
        
        results = (allChecks || []).filter(check => {
          try {
            const payload = check.payload as any;
            const cpfFromPayload = payload?.Result?.[0]?.BasicData?.CPF?.replace(/\D/g, '');
            return cpfFromPayload === normalizedSearchCpf;
          } catch {
            return false;
          }
        });
      }
      
      const sessionTenantUUID = tenantIdToUUID(sessionTenantId);
      const formattedChecks = results.map(convertSupabaseCheckToCamelCase);
      
      return res.json({
        success: true,
        count: formattedChecks.length,
        searchTerm,
        searchCpf,
        diagnostic: {
          sessionTenantUUID,
          matchingTenant: formattedChecks.filter(c => c.tenantId === sessionTenantUUID).length,
          otherTenants: formattedChecks.filter(c => c.tenantId !== sessionTenantUUID).length
        },
        checks: formattedChecks
      });
    } catch (error) {
      console.error("[Search] Erro:", error);
      return res.status(500).json({
        error: "Erro ao buscar registros",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // PATCH /api/compliance/whatsapp-n8n/:id - Update processado_whatsapp_n8n status
  // Used by N8N to mark records as processed after sending WhatsApp notification
  // N8N queries WHERE processado_whatsapp_n8n=FALSE, then marks TRUE after sending
  router.patch("/api/compliance/whatsapp-n8n/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { processado_whatsapp_n8n } = req.body;
      
      if (typeof processado_whatsapp_n8n !== 'boolean') {
        return res.status(400).json({ error: "processado_whatsapp_n8n must be a boolean" });
      }
      
      console.log(`[WhatsApp N8N] Atualizando registro ${id} para processado_whatsapp_n8n=${processado_whatsapp_n8n}`);
      
      // Update in Supabase Cliente
      const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
      
      if (!(await isClienteSupabaseConfigured())) {
        return res.status(503).json({ error: "Supabase do Cliente não configurado" });
      }
      
      const supabase = await getClienteSupabase();
      
      const { data, error } = await supabase
        .from('cpf_compliance_results')
        .update({ processado_whatsapp_n8n })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('[WhatsApp N8N] Erro:', error);
        return res.status(500).json({ error: error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }
      
      console.log(`[WhatsApp N8N] Registro ${id} atualizado com sucesso`);
      return res.json({ success: true, data: data[0] });
    } catch (error: any) {
      console.error('[WhatsApp N8N] Erro:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}
