import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { assinaturaSupabaseService, AssinaturaContract, AssinaturaGlobalConfig } from '../services/assinatura-supabase';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { assinaturaLogger } from '../lib/logger';

const router = Router();

function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

async function findTenantIdFromSubmission(email: string | null, cpf: string | null): Promise<string | null> {
  if (!email && !cpf) return null;
  
  try {
    const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
    if (!await isClienteSupabaseConfigured()) return null;
    
    const supabaseClient = await getClienteSupabase();
    if (!supabaseClient) return null;
    
    const cpfNormalizado = cpf ? cpf.replace(/\D/g, '') : null;
    
    let query = supabaseClient.from('form_submissions').select('tenant_id');
    if (email) {
      query = query.eq('contact_email', email);
    } else if (cpfNormalizado) {
      query = query.eq('contact_cpf', cpfNormalizado);
    }
    
    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    
    console.log(`[NEXUS] Tenant encontrado via form_submission: ${data.tenant_id}`);
    return data.tenant_id;
  } catch (error) {
    console.error('[NEXUS] Erro ao buscar tenant via submission:', error);
    return null;
  }
}

async function createEnvioFromContract(contract: any): Promise<void> {
  try {
    const { envioService } = await import('../services/envioService.js');
    
    // Encontrar tenant_id do contrato
    let adminId = contract.tenant_id || null;
    
    if (!adminId && (contract.client_email || contract.client_cpf)) {
      adminId = await findTenantIdFromSubmission(contract.client_email, contract.client_cpf);
    }
    
    if (!adminId) {
      console.log('[ENVIO] Sem admin_id disponível - pulando criação de envio automático');
      return;
    }

    // Verificar se já existe envio para este contrato
    const existingEnvios = await envioService.getEnvios(adminId);
    const jaTemEnvio = existingEnvios.some((e: any) => e.contract_id === contract.id);
    
    if (jaTemEnvio) {
      console.log(`[ENVIO] Contrato ${contract.id} já tem envio - pulando`);
      return;
    }

    // Criar envio automaticamente
    const envio = await envioService.createEnvio({
      admin_id: adminId,
      contract_id: contract.id,
      destinatario_nome: contract.client_name || 'Cliente',
      destinatario_cpf_cnpj: contract.client_cpf,
      destinatario_telefone: contract.client_phone,
      destinatario_email: contract.client_email,
      destinatario_cep: contract.address_zipcode || '',
      destinatario_logradouro: contract.address_street,
      destinatario_numero: contract.address_number,
      destinatario_complemento: contract.address_complement,
      destinatario_cidade: contract.address_city,
      destinatario_uf: contract.address_state,
      descricao_conteudo: 'Produtos do contrato'
    });

    console.log(`[ENVIO] ✅ Envio criado automaticamente: ${envio.id}, código: ${envio.codigo_rastreio}`);
  } catch (error) {
    console.error('[ENVIO] Erro ao criar envio automático:', error);
  }
}

async function createRevendedoraFromContract(contract: any): Promise<void> {
  const { client_name, client_cpf, client_email, client_phone, tenant_id } = contract;

  if (!client_cpf || !client_email) {
    console.log('[NEXUS] Contrato sem CPF ou email - pulando criação de revendedora');
    return;
  }

  const cpfNormalizado = normalizeCPF(client_cpf);
  if (cpfNormalizado.length !== 11) {
    console.log('[NEXUS] CPF inválido - pulando criação de revendedora');
    return;
  }

  try {
    // Usar Supabase Master com service_role_key para bypassar RLS
    const { getSupabaseMasterForTenant } = await import('../lib/supabaseMaster.js');
    
    // Primeiro, encontrar o tenant_id
    let adminId = tenant_id || process.env.DEFAULT_ADMIN_ID || null;
    
    if (!adminId) {
      console.log('[NEXUS] Tentando encontrar tenant via form_submission...');
      adminId = await findTenantIdFromSubmission(client_email, client_cpf);
    }
    
    if (!adminId) {
      console.log('[NEXUS] Sem admin_id disponível - pulando criação de revendedora');
      return;
    }

    // Obter cliente Supabase Master com service_role_key
    let supabaseMaster;
    try {
      supabaseMaster = await getSupabaseMasterForTenant(adminId);
    } catch (e) {
      console.log('[NEXUS] Supabase Master não disponível - pulando criação de revendedora');
      return;
    }

    // Verificar se já existe
    const { data: existing, error: checkError } = await supabaseMaster
      .from('revendedoras')
      .select('id')
      .or(`cpf.eq.${cpfNormalizado},email.eq.${client_email}`)
      .maybeSingle();

    if (checkError) {
      console.error('[NEXUS] Erro ao verificar revendedora existente:', checkError);
      return;
    }

    if (existing) {
      console.log(`[NEXUS] Revendedora já existe (id: ${existing.id}) - pulando criação`);
      return;
    }

    const senhaHash = crypto.createHash('sha256').update(cpfNormalizado).digest('hex');
    
    const { data: revendedora, error: insertError } = await supabaseMaster
      .from('revendedoras')
      .insert({
        admin_id: adminId,
        nome: client_name || 'Revendedora',
        cpf: cpfNormalizado,
        email: client_email,
        telefone: client_phone || null,
        senha_hash: senhaHash,
        status: 'ativo',
        comissao_padrao: 10.00,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[NEXUS] Erro ao criar revendedora:', insertError);
      return;
    }

    console.log(`[NEXUS] ✅ Revendedora criada automaticamente: ${revendedora.email} (CPF: ${cpfNormalizado})`);
  } catch (error) {
    console.error('[NEXUS] Erro inesperado ao criar revendedora:', error);
  }
}

const CONTRACTS_FILE = path.join(process.cwd(), 'data', 'assinatura_contracts.json');
const GLOBAL_CONFIG_FILE = path.join(process.cwd(), 'data', 'assinatura_global_config.json');

interface LocalContract {
  id: string;
  client_name: string;
  client_cpf: string | null;
  client_email: string | null;
  client_phone?: string | null;
  status?: string | null;
  access_token?: string | null;
  created_at?: string;
  signed_at?: string | null;
  protocol_number?: string | null;
  contract_html?: string | null;
  signed_contract_html?: string | null;
  logo_url?: string | null;
  logo_size?: string | null;
  logo_position?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  company_name?: string | null;
  footer_text?: string | null;
  maleta_card_color?: string | null;
  maleta_button_color?: string | null;
  maleta_text_color?: string | null;
  verification_primary_color?: string | null;
  verification_text_color?: string | null;
  verification_font_family?: string | null;
  verification_font_size?: string | null;
  verification_logo_url?: string | null;
  verification_logo_size?: string | null;
  verification_logo_position?: string | null;
  verification_footer_text?: string | null;
  verification_welcome_text?: string | null;
  verification_instructions?: string | null;
  verification_security_text?: string | null;
  verification_background_color?: string | null;
  verification_header_background_color?: string | null;
  verification_header_company_name?: string | null;
  progress_card_color?: string | null;
  progress_button_color?: string | null;
  progress_text_color?: string | null;
  progress_title?: string | null;
  progress_subtitle?: string | null;
  progress_step1_title?: string | null;
  progress_step1_description?: string | null;
  progress_step2_title?: string | null;
  progress_step2_description?: string | null;
  progress_step3_title?: string | null;
  progress_step3_description?: string | null;
  progress_button_text?: string | null;
  progress_font_family?: string | null;
  app_store_url?: string | null;
  google_play_url?: string | null;
  parabens_title?: string | null;
  parabens_subtitle?: string | null;
  parabens_description?: string | null;
  parabens_card_color?: string | null;
  parabens_background_color?: string | null;
  parabens_button_color?: string | null;
  parabens_text_color?: string | null;
  parabens_font_family?: string | null;
  parabens_form_title?: string | null;
  parabens_button_text?: string | null;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  } | null;
  selfie_photo?: string | null;
  document_photo?: string | null;
  document_back_photo?: string | null;
}

function ensureDataDir(): void {
  const dataDir = path.dirname(CONTRACTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadLocalContracts(): Map<string, LocalContract> {
  try {
    ensureDataDir();
    if (fs.existsSync(CONTRACTS_FILE)) {
      const data = fs.readFileSync(CONTRACTS_FILE, 'utf-8');
      const contracts = JSON.parse(data);
      console.log(`[Assinatura] ${Object.keys(contracts).length} contratos carregados do arquivo local`);
      return new Map(Object.entries(contracts));
    }
  } catch (error) {
    console.error('[Assinatura] Erro ao carregar contratos locais:', error);
  }
  return new Map();
}

function saveLocalContracts(store: Map<string, LocalContract>): void {
  try {
    ensureDataDir();
    const data = Object.fromEntries(store);
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Assinatura] Erro ao salvar contratos locais:', error);
  }
}

function loadLocalGlobalConfig(): AssinaturaGlobalConfig {
  try {
    ensureDataDir();
    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
      const data = fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Assinatura] Erro ao carregar config global local:', error);
  }
  return getDefaultGlobalConfig();
}

function saveLocalGlobalConfig(config: AssinaturaGlobalConfig): void {
  try {
    ensureDataDir();
    fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('[Assinatura] Erro ao salvar config global local:', error);
  }
}

function getDefaultGlobalConfig(): AssinaturaGlobalConfig {
  return {
    logo_size: 'medium',
    logo_position: 'center',
    primary_color: '#2c3e50',
    text_color: '#333333',
    font_family: 'Arial, sans-serif',
    font_size: '16px',
    company_name: 'Sua Empresa',
    footer_text: 'Documento gerado eletronicamente',
    maleta_card_color: '#dbeafe',
    maleta_button_color: '#22c55e',
    maleta_text_color: '#1e40af',
    verification_primary_color: '#2c3e50',
    verification_text_color: '#000000',
    verification_font_family: 'Arial, sans-serif',
    verification_font_size: '16px',
    verification_logo_size: 'medium',
    verification_logo_position: 'center',
    verification_footer_text: 'Verificação de Identidade Segura',
    verification_welcome_text: 'Verificação de Identidade',
    verification_instructions: 'Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.',
    verification_background_color: '#ffffff',
    verification_header_background_color: '#2c3e50',
    verification_header_company_name: 'Sua Empresa',
    progress_card_color: '#dbeafe',
    progress_button_color: '#22c55e',
    progress_text_color: '#1e40af',
    progress_title: 'Assinatura Digital',
    progress_subtitle: 'Conclua os passos abaixo para finalizar o processo.',
    progress_step1_title: '1. Reconhecimento Facial',
    progress_step1_description: 'Tire uma selfie para validar sua identidade',
    progress_step2_title: '2. Assinar Contrato',
    progress_step2_description: 'Assine digitalmente o contrato',
    progress_step3_title: '3. Confirmação',
    progress_step3_description: 'Confirme seus dados e finalize',
    progress_button_text: 'Complete os passos acima',
    progress_font_family: 'Arial, sans-serif',
    parabens_title: 'Parabéns!',
    parabens_subtitle: 'Processo concluído com sucesso!',
    parabens_description: 'Sua documentação foi processada. Aguarde as próximas instruções.',
    parabens_card_color: '#dbeafe',
    parabens_background_color: '#f0fdf4',
    parabens_button_color: '#22c55e',
    parabens_text_color: '#1e40af',
    parabens_font_family: 'Arial, sans-serif',
    parabens_form_title: 'Endereço para Entrega',
    parabens_button_text: 'Confirmar e Continuar',
  };
}

let localContractsStore = loadLocalContracts();
let localGlobalConfig = loadLocalGlobalConfig();

// GlobalConfig cache with TTL for performance optimization
let globalConfigCache: { data: AssinaturaGlobalConfig; expiresAt: number } | null = null;
const GLOBAL_CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getGlobalConfigCached(): AssinaturaGlobalConfig {
  const now = Date.now();
  if (globalConfigCache && globalConfigCache.expiresAt > now) {
    return globalConfigCache.data;
  }
  const config = loadLocalGlobalConfig();
  globalConfigCache = { data: config, expiresAt: now + GLOBAL_CONFIG_CACHE_TTL };
  return config;
}

function invalidateGlobalConfigCache(): void {
  globalConfigCache = null;
}

router.get('/global-config', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=3600');
    
    if (assinaturaSupabaseService.isConnected()) {
      const config = await assinaturaSupabaseService.getGlobalConfig();
      if (config) {
        return res.json(config);
      }
    }
    
    res.json(getGlobalConfigCached());
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar config global:', error);
    res.json(getGlobalConfigCached());
  }
});

router.put('/global-config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    if (assinaturaSupabaseService.isConnected()) {
      const result = await assinaturaSupabaseService.saveGlobalConfig(updates);
      if (result) {
        localGlobalConfig = { ...localGlobalConfig, ...updates };
        saveLocalGlobalConfig(localGlobalConfig);
        return res.json(result);
      }
    }
    
    localGlobalConfig = { ...localGlobalConfig, ...updates };
    saveLocalGlobalConfig(localGlobalConfig);
    invalidateGlobalConfigCache();
    res.json(localGlobalConfig);
  } catch (error) {
    console.error('[Assinatura] Erro ao salvar config global:', error);
    res.status(500).json({ error: 'Falha ao salvar configurações' });
  }
});

router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const allContracts: any[] = [];
    const seenTokens = new Set<string>();
    
    if (assinaturaSupabaseService.isConnected()) {
      const supabaseContracts = await assinaturaSupabaseService.getAllContracts();
      console.log(`[Assinatura] Supabase retornou ${supabaseContracts.length} contratos`);
      
      for (const contract of supabaseContracts) {
        if (contract.access_token) {
          seenTokens.add(contract.access_token);
        }
        allContracts.push(contract);
      }
    }
    
    const localContracts = Array.from(localContractsStore.values());
    console.log(`[Assinatura] Local storage tem ${localContracts.length} contratos`);
    
    for (const localContract of localContracts) {
      if (localContract.access_token && !seenTokens.has(localContract.access_token)) {
        allContracts.push(localContract);
        seenTokens.add(localContract.access_token);
      } else if (!localContract.access_token) {
        allContracts.push(localContract);
      }
    }
    
    allContracts.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    console.log(`[Assinatura] Retornando ${allContracts.length} contratos (Supabase + Local merged)`);
    res.json(allContracts);
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar contratos:', error);
    res.status(500).json({ error: 'Falha ao buscar contratos' });
  }
});

router.get('/contracts/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    console.log(`[Assinatura] Buscando contrato por token/id: ${token}`);
    
    if (assinaturaSupabaseService.isConnected()) {
      let contract = await assinaturaSupabaseService.getContractByToken(token);
      if (contract) {
        console.log(`[Assinatura] Contrato encontrado no Supabase por access_token`);
        res.set('Cache-Control', 'private, max-age=300');
        return res.json(contract);
      }
      
      contract = await assinaturaSupabaseService.getContractById(token);
      if (contract) {
        console.log(`[Assinatura] Contrato encontrado no Supabase por ID`);
        res.set('Cache-Control', 'private, max-age=300');
        return res.json(contract);
      }
    }
    
    let contract = Array.from(localContractsStore.values()).find(
      (c) => c.access_token === token
    );
    
    if (!contract) {
      contract = localContractsStore.get(token);
    }

    if (!contract) {
      console.log(`[Assinatura] Contrato não encontrado: ${token}`);
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    console.log(`[Assinatura] Contrato encontrado no local storage`);
    res.set('Cache-Control', 'private, max-age=300');
    res.json(contract);
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar contrato:', error);
    res.status(500).json({ error: 'Falha ao buscar contrato' });
  }
});

// OPTIMIZED: Get contract + participant data in single request for faster loading
router.get('/contracts/:token/full', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    console.log(`[Assinatura/Full] Buscando contrato + participant data: ${token}`);

    // Get contract (reuse existing logic)
    let contract: LocalContract | null = null;
    if (assinaturaSupabaseService.isConnected()) {
      let c = await assinaturaSupabaseService.getContractByToken(token);
      if (!c) {
        c = await assinaturaSupabaseService.getContractById(token);
      }
      if (c) {
        contract = c as unknown as LocalContract;
      }
    }
    if (!contract) {
      contract = Array.from(localContractsStore.values()).find(
        (c) => c.access_token === token
      ) || null;
      if (!contract) {
        contract = localContractsStore.get(token) || null;
      }
    }

    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Get participant data (simplified version)
    let participantData: any = null;
    try {
      const contractPhone = contract.client_phone;
      const contractCpf = contract.client_cpf;
      
      if (contractPhone || contractCpf) {
        const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
        if (await isClienteSupabaseConfigured()) {
          const supabaseClient = await getClienteSupabase();
          if (supabaseClient) {
            let query = supabaseClient.from('form_submissions').select('*');
            const phoneNormalizado = contractPhone ? contractPhone.replace(/\D/g, '') : null;
            const cpfNormalizado = contractCpf ? contractCpf.replace(/\D/g, '') : null;

            if (phoneNormalizado) {
              query = query.ilike('contact_phone', `%${phoneNormalizado.slice(-9)}%`);
            } else if (cpfNormalizado) {
              query = query.eq('contact_cpf', cpfNormalizado);
            }

            const { data: submissions } = await query.limit(1);
            if (submissions && submissions.length > 0) {
              const submission = submissions[0];
              participantData = {
                found: true,
                formSubmissionId: submission.id,
                participantData: {
                  nome: submission.contact_name || contract.client_name,
                  email: submission.contact_email || contract.client_email,
                  telefone: submission.contact_phone || contract.client_phone,
                  cpf: submission.contact_cpf || contract.client_cpf,
                  endereco: {
                    cep: submission.address_cep || submission.addressCep,
                    rua: submission.address_street || submission.addressStreet,
                    numero: submission.address_number || submission.addressNumber,
                    complemento: submission.address_complement || submission.addressComplement,
                    bairro: submission.address_neighborhood || submission.addressNeighborhood,
                    cidade: submission.address_city || submission.addressCity,
                    estado: submission.address_state || submission.addressState
                  }
                }
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Assinatura/Full] Participant data lookup failed:', err);
    }

    res.set('Cache-Control', 'private, max-age=300');
    return res.json({
      contract,
      participantData
    });
  } catch (error: any) {
    console.error('[Assinatura/Full] Error:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/contracts', async (req: Request, res: Response) => {
  try {
    const {
      client_name,
      client_cpf,
      client_email,
      client_phone,
      client_address,
      contract_html,
      protocol_number,
      status,
      ...customizations
    } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'Campo obrigatório ausente: client_name' });
    }

    const id = nanoid();
    // Usar UUID para access_token (compatível com Supabase que espera UUID)
    const access_token = crypto.randomUUID();
    const protocolNum = protocol_number || `CONT-${Date.now()}-${nanoid(9).toUpperCase()}`;
    
    // Gerar URL completa para o fluxo de assinatura (para envio via WhatsApp/N8N)
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocolScheme = domain.includes('localhost') ? 'http' : 'https';
    const signature_url = `${protocolScheme}://${domain}/assinar/${access_token}`;

    console.log(`[Assinatura] Criando novo contrato para ${client_name}, telefone: ${client_phone}, email: ${client_email}, cpf: ${client_cpf ? 'presente' : 'ausente'}, endereço: ${client_address ? 'presente' : 'ausente'}, access_token: ${access_token}`);
    
    // Se o client_address não foi recebido do frontend, buscar automaticamente do form_submissions
    let finalAddress = client_address;
    if (!finalAddress && (client_phone || client_email)) {
      console.log(`[Assinatura] Endereço não recebido do frontend - buscando automaticamente do form_submissions...`);
      try {
        const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
        if (await isClienteSupabaseConfigured()) {
          const supabaseClient = await getClienteSupabase();
          if (supabaseClient) {
            let submission = null;
            
            // Primeiro tentar por telefone (mais confiável)
            if (client_phone) {
              const phoneDigits = client_phone.replace(/\D/g, '');
              const lastDigits = phoneDigits.slice(-9);
              if (lastDigits.length >= 8) {
                // Criar padrão flexível para busca
                const flexPattern = '%' + lastDigits.split('').join('%') + '%';
                console.log(`[Assinatura] Buscando form_submission por telefone: ${flexPattern}`);
                const { data, error } = await supabaseClient
                  .from('form_submissions')
                  .select('address_street, address_number, address_complement, address_city, address_state, address_cep')
                  .ilike('contact_phone', flexPattern)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (!error && data && data.length > 0) {
                  submission = data[0];
                  console.log(`[Assinatura] Form_submission encontrado por telefone`);
                }
              }
            }
            
            // Fallback para email
            if (!submission && client_email) {
              console.log(`[Assinatura] Buscando form_submission por email: ${client_email}`);
              const { data, error } = await supabaseClient
                .from('form_submissions')
                .select('address_street, address_number, address_complement, address_city, address_state, address_cep')
                .ilike('contact_email', client_email)
                .order('created_at', { ascending: false })
                .limit(1);
              if (!error && data && data.length > 0) {
                submission = data[0];
                console.log(`[Assinatura] Form_submission encontrado por email`);
              }
            }
            
            // Se encontrou, mapear os campos
            if (submission) {
              finalAddress = {
                street: submission.address_street || '',
                number: submission.address_number || '',
                complement: submission.address_complement || '',
                city: submission.address_city || '',
                state: submission.address_state || '',
                zipcode: submission.address_cep || ''
              };
              console.log(`[Assinatura] ✅ Endereço obtido do form_submission: rua=${finalAddress.street}, num=${finalAddress.number}, cidade=${finalAddress.city}, cep=${finalAddress.zipcode}`);
            } else {
              console.log(`[Assinatura] ⚠️ Nenhum form_submission encontrado com endereço`);
            }
          }
        }
      } catch (err) {
        console.error('[Assinatura] Erro ao buscar endereço do form_submission:', err);
      }
    } else if (finalAddress) {
      console.log(`[Assinatura] Dados do endereço recebidos do frontend: rua=${finalAddress.street}, num=${finalAddress.number}, cidade=${finalAddress.city}, cep=${finalAddress.zipcode}`);
    } else {
      console.log(`[Assinatura] ⚠️ Sem telefone/email para buscar endereço automaticamente`);
    }

    const globalConfig = localGlobalConfig;
    const localContract: LocalContract = {
      id,
      client_name,
      client_cpf: client_cpf || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      contract_html: contract_html || null,
      protocol_number: protocolNum,
      status: status || 'pending',
      access_token,
      created_at: new Date().toISOString(),
      signed_at: null,
      logo_url: customizations.logo_url ?? globalConfig.logo_url,
      logo_size: customizations.logo_size ?? globalConfig.logo_size,
      logo_position: customizations.logo_position ?? globalConfig.logo_position,
      primary_color: customizations.primary_color ?? globalConfig.primary_color,
      text_color: customizations.text_color ?? globalConfig.text_color,
      font_family: customizations.font_family ?? globalConfig.font_family,
      font_size: customizations.font_size ?? globalConfig.font_size,
      company_name: customizations.company_name ?? globalConfig.company_name,
      footer_text: customizations.footer_text ?? globalConfig.footer_text,
      maleta_card_color: customizations.maleta_card_color ?? globalConfig.maleta_card_color,
      maleta_button_color: customizations.maleta_button_color ?? globalConfig.maleta_button_color,
      maleta_text_color: customizations.maleta_text_color ?? globalConfig.maleta_text_color,
      verification_primary_color: customizations.verification_primary_color ?? globalConfig.verification_primary_color,
      verification_text_color: customizations.verification_text_color ?? globalConfig.verification_text_color,
      verification_font_family: customizations.verification_font_family ?? globalConfig.verification_font_family,
      verification_font_size: customizations.verification_font_size ?? globalConfig.verification_font_size,
      verification_logo_url: customizations.verification_logo_url ?? globalConfig.verification_logo_url,
      verification_logo_size: customizations.verification_logo_size ?? globalConfig.verification_logo_size,
      verification_logo_position: customizations.verification_logo_position ?? globalConfig.verification_logo_position,
      verification_footer_text: customizations.verification_footer_text ?? globalConfig.verification_footer_text,
      verification_welcome_text: customizations.verification_welcome_text ?? globalConfig.verification_welcome_text,
      verification_instructions: customizations.verification_instructions ?? globalConfig.verification_instructions,
      verification_security_text: customizations.verification_security_text ?? globalConfig.verification_security_text,
      verification_background_color: customizations.verification_background_color ?? globalConfig.verification_background_color,
      verification_header_background_color: customizations.verification_header_background_color ?? globalConfig.verification_header_background_color,
      verification_header_company_name: customizations.verification_header_company_name ?? globalConfig.verification_header_company_name,
      progress_card_color: customizations.progress_card_color ?? globalConfig.progress_card_color,
      progress_button_color: customizations.progress_button_color ?? globalConfig.progress_button_color,
      progress_text_color: customizations.progress_text_color ?? globalConfig.progress_text_color,
      progress_title: customizations.progress_title ?? globalConfig.progress_title,
      progress_subtitle: customizations.progress_subtitle ?? globalConfig.progress_subtitle,
      progress_step1_title: customizations.progress_step1_title ?? globalConfig.progress_step1_title,
      progress_step1_description: customizations.progress_step1_description ?? globalConfig.progress_step1_description,
      progress_step2_title: customizations.progress_step2_title ?? globalConfig.progress_step2_title,
      progress_step2_description: customizations.progress_step2_description ?? globalConfig.progress_step2_description,
      progress_step3_title: customizations.progress_step3_title ?? globalConfig.progress_step3_title,
      progress_step3_description: customizations.progress_step3_description ?? globalConfig.progress_step3_description,
      progress_button_text: customizations.progress_button_text ?? globalConfig.progress_button_text,
      progress_font_family: customizations.progress_font_family ?? globalConfig.progress_font_family,
      parabens_title: customizations.parabens_title ?? globalConfig.parabens_title,
      parabens_subtitle: customizations.parabens_subtitle ?? globalConfig.parabens_subtitle,
      parabens_description: customizations.parabens_description ?? globalConfig.parabens_description,
      parabens_card_color: customizations.parabens_card_color ?? globalConfig.parabens_card_color,
      parabens_background_color: customizations.parabens_background_color ?? globalConfig.parabens_background_color,
      parabens_button_color: customizations.parabens_button_color ?? globalConfig.parabens_button_color,
      parabens_text_color: customizations.parabens_text_color ?? globalConfig.parabens_text_color,
      parabens_font_family: customizations.parabens_font_family ?? globalConfig.parabens_font_family,
      parabens_form_title: customizations.parabens_form_title ?? globalConfig.parabens_form_title,
      parabens_button_text: customizations.parabens_button_text ?? globalConfig.parabens_button_text,
      app_store_url: customizations.app_store_url ?? globalConfig.app_store_url,
      google_play_url: customizations.google_play_url ?? globalConfig.google_play_url,
      address: finalAddress ? {
        street: finalAddress.street || undefined,
        number: finalAddress.number || undefined,
        complement: finalAddress.complement || undefined,
        city: finalAddress.city || undefined,
        state: finalAddress.state || undefined,
        zipcode: finalAddress.zipcode || undefined,
      } : null,
    };

    localContractsStore.set(id, localContract);
    saveLocalContracts(localContractsStore);

    // Preparar dados de endereço para salvar (usando colunas que existem na tabela contracts do Supabase)
    const addressData = finalAddress ? {
      address_street: finalAddress.street || null,
      address_number: finalAddress.number || null,
      address_complement: finalAddress.complement || null,
      address_city: finalAddress.city || null,
      address_state: finalAddress.state || null,
      address_zipcode: finalAddress.zipcode || null,
    } : {};

    if (assinaturaSupabaseService.isConnected()) {
      const supabaseContract = await assinaturaSupabaseService.createContract({
        client_name,
        client_cpf: client_cpf || null,
        client_email: client_email || null,
        client_phone: client_phone || null,
        ...addressData,
        contract_html: contract_html || null,
        protocol_number: protocolNum,
        status: status || 'pending',
        access_token,
        signature_url, // URL completa para envio via WhatsApp/N8N
        ...customizations
      });
      
      if (supabaseContract) {
        console.log(`[Assinatura] Contrato também salvo no Supabase com ID: ${supabaseContract.id}`);
        return res.status(201).json({
          ...localContract,
          supabase_id: supabaseContract.id
        });
      } else {
        console.log(`[Assinatura] Falha ao salvar no Supabase, usando apenas local`);
      }
    }

    res.status(201).json(localContract);
  } catch (error) {
    console.error('[Assinatura] Erro ao criar contrato:', error);
    res.status(500).json({ error: 'Falha ao criar contrato' });
  }
});

router.patch('/contracts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`[Assinatura] PATCH contrato: ${id}`);

    const localContract = localContractsStore.get(id);
    const accessToken = localContract?.access_token || id;

    if (assinaturaSupabaseService.isConnected()) {
      const contract = await assinaturaSupabaseService.updateContractByToken(accessToken, updates);
      if (contract) {
        console.log(`[Assinatura] Contrato atualizado no Supabase`);
      }
    }

    if (localContract) {
      const updatedContract = { ...localContract, ...updates };
      localContractsStore.set(id, updatedContract);
      saveLocalContracts(localContractsStore);
      return res.json(updatedContract);
    }

    const tokenContract = Array.from(localContractsStore.values()).find(c => c.access_token === id);
    if (tokenContract) {
      const updatedContract = { ...tokenContract, ...updates };
      localContractsStore.set(tokenContract.id, updatedContract);
      saveLocalContracts(localContractsStore);
      return res.json(updatedContract);
    }

    return res.status(404).json({ error: 'Contrato não encontrado' });
  } catch (error) {
    console.error('[Assinatura] Erro ao atualizar contrato:', error);
    res.status(500).json({ error: 'Falha ao atualizar contrato' });
  }
});

router.post('/contracts/:id/finalize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address, selfie_photo, document_photo, document_back_photo, signed_contract_html, status } = req.body;

    console.log(`[Assinatura] Finalizando contrato: ${id}`);
    console.log(`[Assinatura] Dados recebidos:`, {
      has_address: !!address,
      has_selfie: !!selfie_photo,
      selfie_length: selfie_photo?.length,
      has_doc: !!document_photo,
      doc_length: document_photo?.length,
      has_doc_back: !!document_back_photo,
      has_signed_html: !!signed_contract_html,
      signed_html_length: signed_contract_html?.length,
      status
    });

    let localContract = localContractsStore.get(id);
    
    if (!localContract) {
      localContract = Array.from(localContractsStore.values()).find(c => c.access_token === id) || undefined;
    }

    const addressData = address ? {
      address_street: address.street,
      address_number: address.number,
      address_complement: address.complement,
      address_city: address.city,
      address_state: address.state,
      address_zipcode: address.zipcode,
    } : {};

    if (assinaturaSupabaseService.isConnected()) {
      // First, try to get the contract from Supabase to find the correct access_token
      let supabaseContract = await assinaturaSupabaseService.getContractByToken(id);
      if (!supabaseContract) {
        supabaseContract = await assinaturaSupabaseService.getContractById(id);
      }
      
      const updateData = {
        ...addressData,
        selfie_photo,
        document_photo,
        document_back_photo,
        signed_contract_html,
        status: status || 'signed'
      };
      
      let supabaseResult = null;
      
      // Try by access_token first if we found the contract
      if (supabaseContract?.access_token) {
        console.log(`[Assinatura] Tentando finalizar por access_token: ${supabaseContract.access_token}`);
        supabaseResult = await assinaturaSupabaseService.finalizeContractByToken(supabaseContract.access_token, updateData);
      }
      
      // If that failed, try by ID
      if (!supabaseResult && supabaseContract?.id) {
        console.log(`[Assinatura] Tentando finalizar por ID: ${supabaseContract.id}`);
        supabaseResult = await assinaturaSupabaseService.finalizeContract(supabaseContract.id, updateData);
      }
      
      // Last resort: try with the original id parameter
      if (!supabaseResult) {
        console.log(`[Assinatura] Tentando finalizar diretamente por param ID: ${id}`);
        supabaseResult = await assinaturaSupabaseService.finalizeContract(id, updateData);
      }
      
      if (supabaseResult) {
        console.log(`[Assinatura] Contrato finalizado no Supabase com sucesso:`, supabaseResult.id);
        
        // NEXUS: Criar revendedora automaticamente quando contrato é assinado
        createRevendedoraFromContract(supabaseResult).catch(err => {
          console.error('[NEXUS] Erro ao criar revendedora (fire-and-forget):', err);
        });
        
        // ENVIO: Criar envio automaticamente com código de rastreio
        createEnvioFromContract(supabaseResult).catch(err => {
          console.error('[ENVIO] Erro ao criar envio (fire-and-forget):', err);
        });
        
        // Update local store too if it exists
        if (localContract) {
          const updatedContract: LocalContract = {
            ...localContract,
            status: status || 'signed',
            signed_at: new Date().toISOString(),
            address: address || localContract.address || null,
            signed_contract_html: signed_contract_html || localContract.signed_contract_html,
            contract_html: signed_contract_html || localContract.contract_html,
            selfie_photo: selfie_photo || localContract.selfie_photo,
            document_photo: document_photo || localContract.document_photo,
            document_back_photo: document_back_photo || localContract.document_back_photo
          };
          localContractsStore.set(localContract.id, updatedContract);
          saveLocalContracts(localContractsStore);
        }
        
        return res.json(supabaseResult);
      } else {
        console.log(`[Assinatura] Falha ao finalizar no Supabase`);
      }
    }

    if (localContract) {
      const updatedContract: LocalContract = {
        ...localContract,
        status: status || 'signed',
        signed_at: new Date().toISOString(),
        address: address || localContract.address || null,
        signed_contract_html: signed_contract_html || localContract.signed_contract_html,
        contract_html: signed_contract_html || localContract.contract_html,
        selfie_photo: selfie_photo || localContract.selfie_photo,
        document_photo: document_photo || localContract.document_photo,
        document_back_photo: document_back_photo || localContract.document_back_photo
      };

      localContractsStore.set(localContract.id, updatedContract);
      saveLocalContracts(localContractsStore);
      
      // NEXUS: Criar revendedora automaticamente quando contrato é assinado localmente
      createRevendedoraFromContract(updatedContract).catch(err => {
        console.error('[NEXUS] Erro ao criar revendedora (fire-and-forget):', err);
      });
      
      // ENVIO: Criar envio automaticamente com código de rastreio
      createEnvioFromContract(updatedContract).catch(err => {
        console.error('[ENVIO] Erro ao criar envio (fire-and-forget):', err);
      });

      console.log(`[Assinatura] Contrato ${localContract.id} finalizado com sucesso localmente`);
      return res.json(updatedContract);
    }

    return res.status(404).json({ error: 'Contrato não encontrado' });
  } catch (error) {
    console.error('[Assinatura] Erro ao finalizar contrato:', error);
    res.status(500).json({ error: 'Falha ao finalizar contrato' });
  }
});

router.get('/contracts/:token/participant-data', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    console.log(`[Assinatura] Buscando participant-data para token ${token}`);
    
    let contract: LocalContract | null = null;
    
    if (assinaturaSupabaseService.isConnected()) {
      let c = await assinaturaSupabaseService.getContractByToken(token);
      if (!c) {
        c = await assinaturaSupabaseService.getContractById(token);
      }
      if (c) {
        contract = c as unknown as LocalContract;
      }
    }
    
    if (!contract) {
      contract = Array.from(localContractsStore.values()).find(
        (c) => c.access_token === token
      ) || null;
    }
    
    if (!contract) {
      contract = localContractsStore.get(token) || null;
    }

    if (!contract) {
      console.log(`[Assinatura] Contrato não encontrado para token: ${token}`);
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }
    
    const contractPhone = contract.client_phone;
    const contractEmail = contract.client_email;
    
    console.log(`[Assinatura] Contrato encontrado: ${contract.id}, telefone: ${contractPhone}, email: ${contractEmail}`);
    
    let submission: any = null;
    let supabaseClient: any = null;
    
    try {
      const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
      if (await isClienteSupabaseConfigured()) {
        supabaseClient = await getClienteSupabase();
        console.log('[Assinatura] Supabase do cliente configurado para busca de dados');
      }
    } catch (e) {
      console.log('[Assinatura] Supabase do cliente não disponível');
    }
    
    const normalizePhone = (p: string | null | undefined) => p?.replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '') || '';
    const searchPhone = normalizePhone(contractPhone);
    const searchEmail = (contractEmail || '').toLowerCase();
    
    if (supabaseClient) {
      if (searchPhone && !submission) {
        console.log(`[Assinatura] Supabase: buscando por telefone: ${searchPhone}`);
        const { data: subs, error } = await supabaseClient
          .from('form_submissions')
          .select('*')
          .or(`contact_phone.ilike.%${searchPhone}%,contact_phone.ilike.%${searchPhone.slice(-9)}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && subs && subs.length > 0) {
          submission = subs[0];
          console.log(`[Assinatura] Supabase: encontrado por telefone: ${submission.id}`);
        }
      }
      
      if (!submission && searchEmail) {
        console.log(`[Assinatura] Supabase: buscando por email: ${searchEmail}`);
        const { data: subs, error } = await supabaseClient
          .from('form_submissions')
          .select('*')
          .ilike('contact_email', searchEmail)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && subs && subs.length > 0) {
          submission = subs[0];
          console.log(`[Assinatura] Supabase: encontrado por email: ${submission.id}`);
        }
      }
    }
    
    if (!submission) {
      try {
        const { db } = await import('../db.js');
        const { formSubmissions } = await import('../../shared/db-schema.js');
        const { desc, sql } = await import('drizzle-orm');
        
        if (searchPhone) {
          console.log(`[Assinatura] Local DB: buscando por telefone: ${searchPhone}`);
          const [sub] = await db.select().from(formSubmissions)
            .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${searchPhone} || '%'`)
            .orderBy(desc(formSubmissions.createdAt))
            .limit(1);
          if (sub) submission = sub;
        }

        if (!submission && searchEmail) {
          console.log(`[Assinatura] Local DB: buscando por email: ${searchEmail}`);
          const [sub] = await db.select().from(formSubmissions)
            .where(sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${searchEmail})`)
            .orderBy(desc(formSubmissions.createdAt))
            .limit(1);
          if (sub) submission = sub;
        }
      } catch (dbError) {
        console.log('[Assinatura] Erro ao buscar no DB local:', dbError);
      }
    }

    if (!submission) {
      console.log(`[Assinatura] Nenhum form_submission encontrado para contrato ${contract.id}`);
      return res.json({ 
        found: false,
        message: 'Nenhum formulário encontrado para este participante',
        contractData: {
          nome: contract.client_name,
          email: contract.client_email,
          telefone: contract.client_phone,
          cpf: contract.client_cpf
        }
      });
    }

    const contactName = submission.contact_name || submission.contactName;
    const contactEmail = submission.contact_email || submission.contactEmail;
    const contactPhone = submission.contact_phone || submission.contactPhone;
    const contactCpf = submission.contact_cpf || submission.contactCpf;
    const instagramHandle = submission.instagram_handle || submission.instagramHandle;
    const birthDate = submission.birth_date || submission.birthDate;
    const addressCep = submission.address_cep || submission.addressCep;
    const addressStreet = submission.address_street || submission.addressStreet;
    const addressNumber = submission.address_number || submission.addressNumber;
    const addressComplement = submission.address_complement || submission.addressComplement;
    const addressNeighborhood = submission.address_neighborhood || submission.addressNeighborhood;
    const addressCity = submission.address_city || submission.addressCity;
    const addressState = submission.address_state || submission.addressState;

    console.log(`[Assinatura] Form submission encontrado: ${submission.id}, endereco: rua=${addressStreet}, cidade=${addressCity}`);

    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      found: true,
      formSubmissionId: submission.id,
      participantData: {
        nome: contactName || contract.client_name,
        email: contactEmail || contract.client_email,
        telefone: contactPhone || contract.client_phone,
        cpf: contactCpf || contract.client_cpf,
        instagram: instagramHandle,
        dataNascimento: birthDate,
        endereco: {
          cep: addressCep,
          rua: addressStreet,
          numero: addressNumber,
          complemento: addressComplement,
          bairro: addressNeighborhood,
          cidade: addressCity,
          estado: addressState
        }
      },
      contractData: {
        id: contract.id,
        nome: contract.client_name,
        source: supabaseClient ? 'supabase' : 'local'
      }
    });
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar participant-data:', error);
    res.status(500).json({ error: 'Falha ao buscar dados do participante' });
  }
});

// App Promotion Configs - Global config for app store URLs
const APP_PROMOTION_CONFIG_FILE = path.join(process.cwd(), 'data', 'app_promotion_config.json');
const GLOBAL_CONTRACT_ID = '550e8400-e29b-41d4-a716-446655440000';

interface AppPromotionConfig {
  id?: string;
  contract_id: string;
  app_store_url: string;
  google_play_url: string;
  created_at?: string;
  updated_at?: string;
}

function loadLocalAppPromotionConfig(): AppPromotionConfig | null {
  try {
    ensureDataDir();
    if (fs.existsSync(APP_PROMOTION_CONFIG_FILE)) {
      const data = fs.readFileSync(APP_PROMOTION_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Assinatura] Erro ao carregar app promotion config local:', error);
  }
  return null;
}

function saveLocalAppPromotionConfig(config: AppPromotionConfig): void {
  try {
    ensureDataDir();
    fs.writeFileSync(APP_PROMOTION_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('[Assinatura] Erro ao salvar app promotion config local:', error);
  }
}

// GET /api/assinatura/app-promotion - Load app promotion URLs (public endpoint)
router.get('/app-promotion', async (req: Request, res: Response) => {
  try {
    console.log('[Assinatura] Buscando app promotion config');
    
    // Try Supabase first
    if (assinaturaSupabaseService.isConnected()) {
      try {
        const supabase = (assinaturaSupabaseService as any).supabase;
        if (supabase) {
          const { data, error } = await supabase
            .from('app_promotion_configs')
            .select('*')
            .eq('contract_id', GLOBAL_CONTRACT_ID)
            .single();
          
          if (!error && data) {
            console.log('[Assinatura] App promotion config encontrado no Supabase');
            return res.json({
              app_store_url: data.app_store_url || '',
              google_play_url: data.google_play_url || ''
            });
          }
        }
      } catch (supaError) {
        console.log('[Assinatura] Erro ao buscar do Supabase:', supaError);
      }
    }
    
    // Fallback to local storage
    const localConfig = loadLocalAppPromotionConfig();
    if (localConfig) {
      console.log('[Assinatura] App promotion config carregado do local');
      return res.json({
        app_store_url: localConfig.app_store_url || '',
        google_play_url: localConfig.google_play_url || ''
      });
    }
    
    // Return empty defaults
    console.log('[Assinatura] Sem app promotion config, retornando defaults');
    res.json({
      app_store_url: '',
      google_play_url: ''
    });
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar app promotion config:', error);
    res.json({
      app_store_url: '',
      google_play_url: ''
    });
  }
});

// PUT /api/assinatura/app-promotion - Save app promotion URLs (UPSERT)
router.put('/app-promotion', async (req: Request, res: Response) => {
  try {
    const { app_store_url, google_play_url } = req.body;
    
    console.log('[Assinatura] Salvando app promotion config:', { app_store_url, google_play_url });
    
    const now = new Date().toISOString();
    const config: AppPromotionConfig = {
      contract_id: GLOBAL_CONTRACT_ID,
      app_store_url: app_store_url || '',
      google_play_url: google_play_url || '',
      updated_at: now
    };
    
    // Save to Supabase
    if (assinaturaSupabaseService.isConnected()) {
      try {
        const supabase = (assinaturaSupabaseService as any).supabase;
        if (supabase) {
          // Try upsert
          const { data, error } = await supabase
            .from('app_promotion_configs')
            .upsert({
              contract_id: GLOBAL_CONTRACT_ID,
              app_store_url: config.app_store_url,
              google_play_url: config.google_play_url,
              updated_at: now
            }, { onConflict: 'contract_id' })
            .select()
            .single();
          
          if (!error && data) {
            console.log('[Assinatura] App promotion config salvo no Supabase');
            // Also save locally as backup
            saveLocalAppPromotionConfig({ ...config, id: data.id });
            return res.json({
              success: true,
              app_store_url: data.app_store_url,
              google_play_url: data.google_play_url
            });
          } else if (error) {
            console.log('[Assinatura] Erro no upsert Supabase:', error.message);
            // If upsert fails, try insert
            const { data: insertData, error: insertError } = await supabase
              .from('app_promotion_configs')
              .insert({
                contract_id: GLOBAL_CONTRACT_ID,
                app_store_url: config.app_store_url,
                google_play_url: config.google_play_url,
                created_at: now,
                updated_at: now
              })
              .select()
              .single();
            
            if (!insertError && insertData) {
              console.log('[Assinatura] App promotion config inserido no Supabase');
              saveLocalAppPromotionConfig({ ...config, id: insertData.id });
              return res.json({
                success: true,
                app_store_url: insertData.app_store_url,
                google_play_url: insertData.google_play_url
              });
            }
          }
        }
      } catch (supaError) {
        console.log('[Assinatura] Erro ao salvar no Supabase:', supaError);
      }
    }
    
    // Fallback: save locally
    saveLocalAppPromotionConfig(config);
    console.log('[Assinatura] App promotion config salvo localmente');
    
    res.json({
      success: true,
      app_store_url: config.app_store_url,
      google_play_url: config.google_play_url
    });
  } catch (error) {
    console.error('[Assinatura] Erro ao salvar app promotion config:', error);
    res.status(500).json({ error: 'Falha ao salvar configurações de apps' });
  }
});

router.delete('/contracts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`[Assinatura] Deletando contrato: ${id}`);

    const localContract = localContractsStore.get(id);
    const accessToken = localContract?.access_token || id;

    if (assinaturaSupabaseService.isConnected()) {
      const deleted = await assinaturaSupabaseService.deleteContractByToken(accessToken);
      if (deleted) {
        console.log(`[Assinatura] Contrato deletado do Supabase`);
      }
    }

    if (localContractsStore.has(id)) {
      localContractsStore.delete(id);
      saveLocalContracts(localContractsStore);
      return res.status(204).send();
    }

    const tokenContract = Array.from(localContractsStore.values()).find(c => c.access_token === id);
    if (tokenContract) {
      localContractsStore.delete(tokenContract.id);
      saveLocalContracts(localContractsStore);
      return res.status(204).send();
    }

    return res.status(404).json({ error: 'Contrato não encontrado' });
  } catch (error) {
    console.error('[Assinatura] Erro ao deletar contrato:', error);
    res.status(500).json({ error: 'Falha ao deletar contrato' });
  }
});

export default router;
