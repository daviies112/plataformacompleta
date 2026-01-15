import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'supabase-config.json');
const GLOBAL_CONFIG_FILE = path.join(process.cwd(), 'data', 'assinatura_global_config.json');

interface SupabaseConfig {
  url: string;
  anon_key: string;
  service_role_key?: string;
}

interface AssinaturaContract {
  id?: string;
  tenant_id?: string;
  client_name: string;
  client_cpf?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  status?: string;
  access_token?: string;
  protocol_number?: string;
  contract_html?: string | null;
  signed_contract_html?: string | null;
  contract_pdf_url?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zipcode?: string | null;
  selfie_photo?: string | null;
  document_photo?: string | null;
  document_back_photo?: string | null;
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
  app_store_url?: string | null;
  google_play_url?: string | null;
  created_at?: string;
  signed_at?: string | null;
  updated_at?: string;
  // Campos para controle de envio WhatsApp via N8N
  signature_url?: string | null;
  whatsapp_enviado?: boolean;
  whatsapp_enviado_at?: string | null;
}

interface AssinaturaGlobalConfig {
  id?: string;
  tenant_id?: string;
  logo_url?: string | null;
  logo_size?: string;
  logo_position?: string;
  primary_color?: string;
  text_color?: string;
  font_family?: string;
  font_size?: string;
  company_name?: string;
  footer_text?: string;
  maleta_card_color?: string;
  maleta_button_color?: string;
  maleta_text_color?: string;
  verification_primary_color?: string;
  verification_text_color?: string;
  verification_font_family?: string;
  verification_font_size?: string;
  verification_logo_url?: string | null;
  verification_logo_size?: string;
  verification_logo_position?: string;
  verification_footer_text?: string;
  verification_welcome_text?: string;
  verification_instructions?: string;
  verification_security_text?: string | null;
  verification_background_color?: string;
  verification_header_background_color?: string;
  verification_header_company_name?: string;
  progress_card_color?: string;
  progress_button_color?: string;
  progress_text_color?: string;
  progress_title?: string;
  progress_subtitle?: string;
  progress_step1_title?: string;
  progress_step1_description?: string;
  progress_step2_title?: string;
  progress_step2_description?: string;
  progress_step3_title?: string;
  progress_step3_description?: string;
  progress_button_text?: string;
  progress_font_family?: string;
  parabens_title?: string;
  parabens_subtitle?: string;
  parabens_description?: string;
  parabens_card_color?: string;
  parabens_background_color?: string;
  parabens_button_color?: string;
  parabens_text_color?: string;
  parabens_font_family?: string;
  parabens_form_title?: string;
  parabens_button_text?: string;
  app_store_url?: string | null;
  google_play_url?: string | null;
  contract_clauses?: any;
  created_at?: string;
  updated_at?: string;
}

class AssinaturaSupabaseService {
  private supabase: SupabaseClient | null = null;
  private initialized = false;
  
  constructor() {
    this.initialize();
  }
  
  private loadConfig(): SupabaseConfig | null {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(data);
        const url = config.url || config.supabaseUrl;
        const anon_key = config.anon_key || config.supabaseAnonKey;
        if (url && anon_key) {
          console.log('[AssinaturaSupabase] Config carregada do arquivo');
          return { url, anon_key };
        }
      }
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao carregar config:', error);
    }
    
    const url = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (url && key) {
      console.log('[AssinaturaSupabase] Config carregada das env vars');
      return { url, anon_key: key };
    }
    
    return null;
  }
  
  private initialize(): void {
    const config = this.loadConfig();
    if (config) {
      this.supabase = createClient(config.url, config.anon_key);
      this.initialized = true;
      console.log('[AssinaturaSupabase] Conectado ao Supabase');
    } else {
      console.warn('[AssinaturaSupabase] Supabase não configurado - usando fallback local');
    }
  }
  
  isConnected(): boolean {
    return this.initialized && this.supabase !== null;
  }
  
  private loadLocalGlobalConfig(): AssinaturaGlobalConfig | null {
    try {
      if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
        const data = fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao carregar config global local:', error);
    }
    return null;
  }
  
  private saveLocalGlobalConfig(config: AssinaturaGlobalConfig): void {
    try {
      const dataDir = path.dirname(GLOBAL_CONFIG_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao salvar config global local:', error);
    }
  }
  
  async getGlobalConfig(tenantId: string = 'default'): Promise<AssinaturaGlobalConfig | null> {
    const localConfig = this.loadLocalGlobalConfig();
    if (localConfig) {
      return localConfig;
    }
    return null;
  }
  
  async saveGlobalConfig(config: AssinaturaGlobalConfig, tenantId: string = 'default'): Promise<AssinaturaGlobalConfig | null> {
    const updatedConfig = {
      ...config,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    };
    this.saveLocalGlobalConfig(updatedConfig);
    console.log('[AssinaturaSupabase] Config global salva localmente');
    return updatedConfig;
  }
  
  async getAllContracts(tenantId: string = 'default'): Promise<AssinaturaContract[]> {
    if (!this.supabase) return [];
    
    try {
      console.log(`[AssinaturaSupabase] Fetching contracts from 'contracts' table`);
      
      const { data, error } = await this.supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AssinaturaSupabase] Erro ao buscar contratos:', error);
        return [];
      }
      
      console.log(`[AssinaturaSupabase] Encontrados ${data?.length || 0} contratos no Supabase`);
      return data || [];
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao buscar contratos:', error);
      return [];
    }
  }
  
  async getContractById(id: string): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      console.log(`[AssinaturaSupabase] Fetching contract by ID: ${id}`);
      
      const { data, error } = await this.supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[AssinaturaSupabase] Supabase error:', error);
        return null;
      }
      
      if (data) {
        console.log('[AssinaturaSupabase] Contract found by ID:', {
          id: data.id,
          has_selfie: !!data.selfie_photo,
          has_doc: !!data.document_photo,
          has_signed_html: !!data.signed_contract_html
        });
      }
      
      return data;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao buscar contrato:', error);
      return null;
    }
  }
  
  async getContractByToken(token: string): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      console.log(`[AssinaturaSupabase] Fetching contract by access_token: ${token}`);
      
      const { data, error } = await this.supabase
        .from('contracts')
        .select('*')
        .eq('access_token', token)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`[AssinaturaSupabase] No contract found with access_token: ${token}`);
          return null;
        }
        console.error('[AssinaturaSupabase] Erro ao buscar contrato por token:', error);
        return null;
      }
      
      if (data) {
        console.log('[AssinaturaSupabase] Contract found by token:', {
          id: data.id,
          client_name: data.client_name,
          status: data.status,
          has_selfie: !!data.selfie_photo,
          has_doc: !!data.document_photo,
          has_signed_html: !!data.signed_contract_html
        });
      }
      
      return data;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao buscar contrato por token:', error);
      return null;
    }
  }
  
  async createContract(contract: AssinaturaContract, tenantId: string = 'default'): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      const globalConfig = await this.getGlobalConfig(tenantId);
      
      const contractData: any = {
        client_name: contract.client_name,
        client_cpf: contract.client_cpf || null,
        client_email: contract.client_email || null,
        client_phone: contract.client_phone || null,
        status: contract.status || 'pending',
        access_token: contract.access_token,
        protocol_number: contract.protocol_number || `CONT-${Date.now()}`,
        contract_html: contract.contract_html || null,
        logo_url: contract.logo_url ?? globalConfig?.logo_url,
        logo_size: contract.logo_size ?? globalConfig?.logo_size,
        logo_position: contract.logo_position ?? globalConfig?.logo_position,
        primary_color: contract.primary_color ?? globalConfig?.primary_color,
        text_color: contract.text_color ?? globalConfig?.text_color,
        font_family: contract.font_family ?? globalConfig?.font_family,
        font_size: contract.font_size ?? globalConfig?.font_size,
        company_name: contract.company_name ?? globalConfig?.company_name,
        footer_text: contract.footer_text ?? globalConfig?.footer_text,
        maleta_card_color: contract.maleta_card_color ?? globalConfig?.maleta_card_color,
        maleta_button_color: contract.maleta_button_color ?? globalConfig?.maleta_button_color,
        maleta_text_color: contract.maleta_text_color ?? globalConfig?.maleta_text_color,
        verification_primary_color: contract.verification_primary_color ?? globalConfig?.verification_primary_color,
        verification_text_color: contract.verification_text_color ?? globalConfig?.verification_text_color,
        verification_font_family: contract.verification_font_family ?? globalConfig?.verification_font_family,
        verification_font_size: contract.verification_font_size ?? globalConfig?.verification_font_size,
        verification_logo_url: contract.verification_logo_url ?? globalConfig?.verification_logo_url,
        verification_logo_size: contract.verification_logo_size ?? globalConfig?.verification_logo_size,
        verification_logo_position: contract.verification_logo_position ?? globalConfig?.verification_logo_position,
        verification_footer_text: contract.verification_footer_text ?? globalConfig?.verification_footer_text,
        verification_welcome_text: contract.verification_welcome_text ?? globalConfig?.verification_welcome_text,
        verification_instructions: contract.verification_instructions ?? globalConfig?.verification_instructions,
        verification_security_text: contract.verification_security_text ?? globalConfig?.verification_security_text,
        verification_background_color: contract.verification_background_color ?? globalConfig?.verification_background_color,
        verification_header_background_color: contract.verification_header_background_color ?? globalConfig?.verification_header_background_color,
        verification_header_company_name: contract.verification_header_company_name ?? globalConfig?.verification_header_company_name,
        progress_card_color: contract.progress_card_color ?? globalConfig?.progress_card_color,
        progress_button_color: contract.progress_button_color ?? globalConfig?.progress_button_color,
        progress_text_color: contract.progress_text_color ?? globalConfig?.progress_text_color,
        progress_title: contract.progress_title ?? globalConfig?.progress_title,
        progress_subtitle: contract.progress_subtitle ?? globalConfig?.progress_subtitle,
        progress_step1_title: contract.progress_step1_title ?? globalConfig?.progress_step1_title,
        progress_step1_description: contract.progress_step1_description ?? globalConfig?.progress_step1_description,
        progress_step2_title: contract.progress_step2_title ?? globalConfig?.progress_step2_title,
        progress_step2_description: contract.progress_step2_description ?? globalConfig?.progress_step2_description,
        progress_step3_title: contract.progress_step3_title ?? globalConfig?.progress_step3_title,
        progress_step3_description: contract.progress_step3_description ?? globalConfig?.progress_step3_description,
        progress_button_text: contract.progress_button_text ?? globalConfig?.progress_button_text,
        progress_font_family: contract.progress_font_family ?? globalConfig?.progress_font_family,
        parabens_title: contract.parabens_title ?? globalConfig?.parabens_title,
        parabens_subtitle: contract.parabens_subtitle ?? globalConfig?.parabens_subtitle,
        parabens_description: contract.parabens_description ?? globalConfig?.parabens_description,
        parabens_card_color: contract.parabens_card_color ?? globalConfig?.parabens_card_color,
        parabens_background_color: contract.parabens_background_color ?? globalConfig?.parabens_background_color,
        parabens_button_color: contract.parabens_button_color ?? globalConfig?.parabens_button_color,
        parabens_text_color: contract.parabens_text_color ?? globalConfig?.parabens_text_color,
        parabens_font_family: contract.parabens_font_family ?? globalConfig?.parabens_font_family,
        parabens_form_title: contract.parabens_form_title ?? globalConfig?.parabens_form_title,
        parabens_button_text: contract.parabens_button_text ?? globalConfig?.parabens_button_text,
        app_store_url: contract.app_store_url ?? globalConfig?.app_store_url,
        google_play_url: contract.google_play_url ?? globalConfig?.google_play_url,
        created_at: new Date().toISOString(),
        // Campos para controle de envio WhatsApp via N8N
        signature_url: contract.signature_url || null,
        whatsapp_enviado: false // Começa como FALSE, N8N vai enviar WhatsApp
      };
      
      console.log('[AssinaturaSupabase] Creating contract in Supabase contracts table:', {
        client_name: contractData.client_name,
        access_token: contractData.access_token,
        protocol_number: contractData.protocol_number
      });
      
      const { data, error } = await this.supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();
      
      if (error) {
        console.error('[AssinaturaSupabase] Error creating contract:', error);
        return null;
      }
      
      console.log('[AssinaturaSupabase] Contrato criado no Supabase:', data.id);
      return data;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao criar contrato:', error);
      return null;
    }
  }
  
  async updateContractByToken(token: string, updates: Partial<AssinaturaContract>): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      console.log('[AssinaturaSupabase] Updating contract by access_token:', token, {
        has_selfie: !!updates.selfie_photo,
        has_doc: !!updates.document_photo,
        has_signed_html: !!updates.signed_contract_html,
        status: updates.status
      });
      
      const { data, error } = await this.supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('access_token', token)
        .select()
        .single();
      
      if (error) {
        console.error('[AssinaturaSupabase] Error updating contract:', error);
        return null;
      }
      
      console.log('[AssinaturaSupabase] Contrato atualizado:', data.id);
      return data;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao atualizar contrato:', error);
      return null;
    }
  }
  
  async updateContract(id: string, updates: Partial<AssinaturaContract>): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      console.log('[AssinaturaSupabase] Updating contract by ID:', id);
      
      const { data, error } = await this.supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[AssinaturaSupabase] Error updating contract by ID:', error);
        return null;
      }
      
      console.log('[AssinaturaSupabase] Contrato atualizado:', id);
      return data;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao atualizar contrato:', error);
      return null;
    }
  }
  
  async finalizeContractByToken(token: string, data: {
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_city?: string;
    address_state?: string;
    address_zipcode?: string;
    selfie_photo?: string;
    document_photo?: string;
    document_back_photo?: string;
    signed_contract_html?: string;
    status?: string;
  }): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      const updates: any = {
        status: data.status || 'signed',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Marca como TRUE porque a pessoa completou o fluxo de assinatura
        whatsapp_enviado: true,
        whatsapp_enviado_at: new Date().toISOString()
      };
      
      if (data.address_street) updates.address_street = data.address_street;
      if (data.address_number) updates.address_number = data.address_number;
      if (data.address_complement) updates.address_complement = data.address_complement;
      if (data.address_city) updates.address_city = data.address_city;
      if (data.address_state) updates.address_state = data.address_state;
      if (data.address_zipcode) updates.address_zipcode = data.address_zipcode;
      if (data.selfie_photo) updates.selfie_photo = data.selfie_photo;
      if (data.document_photo) updates.document_photo = data.document_photo;
      if (data.document_back_photo) updates.document_back_photo = data.document_back_photo;
      if (data.signed_contract_html) updates.signed_contract_html = data.signed_contract_html;
      
      console.log('[AssinaturaSupabase] Finalizing contract by token:', token, {
        status: updates.status,
        has_selfie: !!updates.selfie_photo,
        has_doc: !!updates.document_photo,
        has_doc_back: !!updates.document_back_photo,
        has_signed_html: !!updates.signed_contract_html,
        has_address: !!(updates.address_street || updates.address_city)
      });

      const { data: result, error } = await this.supabase
        .from('contracts')
        .update(updates)
        .eq('access_token', token)
        .select()
        .single();
      
      if (error) {
        console.error('[AssinaturaSupabase] Error finalizing contract:', error);
        return null;
      }
      
      console.log('[AssinaturaSupabase] Contrato finalizado:', result.id);
      return result;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao finalizar contrato:', error);
      return null;
    }
  }
  
  async finalizeContract(id: string, data: {
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_city?: string;
    address_state?: string;
    address_zipcode?: string;
    selfie_photo?: string;
    document_photo?: string;
    document_back_photo?: string;
    signed_contract_html?: string;
    status?: string;
  }): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    try {
      const updates: any = {
        status: data.status || 'signed',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Marca como TRUE porque a pessoa completou o fluxo de assinatura
        whatsapp_enviado: true,
        whatsapp_enviado_at: new Date().toISOString()
      };
      
      if (data.address_street) updates.address_street = data.address_street;
      if (data.address_number) updates.address_number = data.address_number;
      if (data.address_complement) updates.address_complement = data.address_complement;
      if (data.address_city) updates.address_city = data.address_city;
      if (data.address_state) updates.address_state = data.address_state;
      if (data.address_zipcode) updates.address_zipcode = data.address_zipcode;
      if (data.selfie_photo) updates.selfie_photo = data.selfie_photo;
      if (data.document_photo) updates.document_photo = data.document_photo;
      if (data.document_back_photo) updates.document_back_photo = data.document_back_photo;
      if (data.signed_contract_html) updates.signed_contract_html = data.signed_contract_html;
      
      console.log('[AssinaturaSupabase] Finalizing contract by ID:', id, {
        status: updates.status,
        has_selfie: !!updates.selfie_photo,
        has_doc: !!updates.document_photo,
        has_doc_back: !!updates.document_back_photo,
        has_signed_html: !!updates.signed_contract_html
      });

      const { data: result, error } = await this.supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[AssinaturaSupabase] Error finalizing contract by ID:', error);
        return null;
      }
      
      console.log('[AssinaturaSupabase] Contrato finalizado:', id);
      return result;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao finalizar contrato:', error);
      return null;
    }
  }
  
  async deleteContract(id: string): Promise<boolean> {
    if (!this.supabase) return false;
    
    try {
      const { error } = await this.supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('[AssinaturaSupabase] Error deleting contract:', error);
        return false;
      }
      
      console.log('[AssinaturaSupabase] Contrato deletado:', id);
      return true;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao deletar contrato:', error);
      return false;
    }
  }
  
  async deleteContractByToken(token: string): Promise<boolean> {
    if (!this.supabase) return false;
    
    try {
      const { error } = await this.supabase
        .from('contracts')
        .delete()
        .eq('access_token', token);
      
      if (error) {
        console.error('[AssinaturaSupabase] Error deleting contract by token:', error);
        return false;
      }
      
      console.log('[AssinaturaSupabase] Contrato deletado por token:', token);
      return true;
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao deletar contrato por token:', error);
      return false;
    }
  }
}

export const assinaturaSupabaseService = new AssinaturaSupabaseService();
export type { AssinaturaContract, AssinaturaGlobalConfig };
