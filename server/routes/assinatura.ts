import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';
import { assinaturaSupabaseService, AssinaturaContract, AssinaturaGlobalConfig } from '../services/assinatura-supabase';

const router = Router();

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

router.get('/global-config', async (req: Request, res: Response) => {
  try {
    if (assinaturaSupabaseService.isConnected()) {
      const config = await assinaturaSupabaseService.getGlobalConfig();
      if (config) {
        return res.json(config);
      }
    }
    
    res.json(localGlobalConfig);
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar config global:', error);
    res.json(localGlobalConfig);
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
        return res.json(contract);
      }
      
      contract = await assinaturaSupabaseService.getContractById(token);
      if (contract) {
        console.log(`[Assinatura] Contrato encontrado no Supabase por ID`);
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
    res.json(contract);
  } catch (error) {
    console.error('[Assinatura] Erro ao buscar contrato:', error);
    res.status(500).json({ error: 'Falha ao buscar contrato' });
  }
});

router.post('/contracts', async (req: Request, res: Response) => {
  try {
    const {
      client_name,
      client_cpf,
      client_email,
      client_phone,
      contract_html,
      protocol_number,
      status,
      ...customizations
    } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'Campo obrigatório ausente: client_name' });
    }

    const id = nanoid();
    const access_token = nanoid(32);
    const protocolNum = protocol_number || `CONT-${Date.now()}-${nanoid(9).toUpperCase()}`;

    console.log(`[Assinatura] Criando novo contrato para ${client_name}, access_token: ${access_token}`);

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
    };

    localContractsStore.set(id, localContract);
    saveLocalContracts(localContractsStore);

    if (assinaturaSupabaseService.isConnected()) {
      const supabaseContract = await assinaturaSupabaseService.createContract({
        client_name,
        client_cpf: client_cpf || null,
        client_email: client_email || null,
        client_phone: client_phone || null,
        contract_html: contract_html || null,
        protocol_number: protocolNum,
        status: status || 'pending',
        access_token,
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
    
    const accessToken = localContract?.access_token || id;

    if (assinaturaSupabaseService.isConnected()) {
      const addressData = address ? {
        address_street: address.street,
        address_number: address.number,
        address_complement: address.complement,
        address_city: address.city,
        address_state: address.state,
        address_zipcode: address.zipcode,
      } : {};
      
      const supabaseResult = await assinaturaSupabaseService.finalizeContractByToken(accessToken, {
        ...addressData,
        selfie_photo,
        document_photo,
        document_back_photo,
        signed_contract_html,
        status: status || 'signed'
      });
      
      if (supabaseResult) {
        console.log(`[Assinatura] Contrato finalizado no Supabase com sucesso`);
      } else {
        console.log(`[Assinatura] Falha ao finalizar no Supabase, tentando por ID`);
        
        if (localContract) {
          const byIdResult = await assinaturaSupabaseService.finalizeContract(localContract.id, {
            ...addressData,
            selfie_photo,
            document_photo,
            document_back_photo,
            signed_contract_html,
            status: status || 'signed'
          });
          if (byIdResult) {
            console.log(`[Assinatura] Contrato finalizado no Supabase por ID`);
          }
        }
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
