import { totalExpressService } from './totalExpressService';
import { getClientSupabaseClientStrict } from '../lib/multiTenantSupabase';

export interface Transportadora {
  id: string;
  admin_id: string;
  nome: string;
  codigo: string;
  tipo: string;
  logo_url?: string;
  ativo: boolean;
  prazo_adicional_dias: number;
  markup_percentual: number;
  created_at: string;
}

export interface CotacaoFrete {
  id: string;
  admin_id: string;
  cep_origem: string;
  cep_destino: string;
  peso_kg: number;
  altura_cm?: number;
  largura_cm?: number;
  comprimento_cm?: number;
  valor_declarado?: number;
  transportadora_id?: string;
  transportadora_nome?: string;
  servico?: string;
  valor_frete?: number;
  prazo_dias?: number;
  selecionado: boolean;
  created_at: string;
}

export interface Envio {
  id: string;
  admin_id: string;
  contract_id?: string;
  cotacao_id?: string;
  codigo_rastreio?: string;
  status: 'pendente' | 'aguardando_coleta' | 'coletado' | 'em_transito' | 'saiu_entrega' | 'entregue' | 'cancelado' | 'devolvido';
  remetente_nome?: string;
  remetente_cpf_cnpj?: string;
  remetente_telefone?: string;
  remetente_email?: string;
  remetente_cep?: string;
  remetente_logradouro?: string;
  remetente_numero?: string;
  remetente_complemento?: string;
  remetente_bairro?: string;
  remetente_cidade?: string;
  remetente_uf?: string;
  destinatario_nome: string;
  destinatario_cpf_cnpj?: string;
  destinatario_telefone?: string;
  destinatario_email?: string;
  destinatario_cep: string;
  destinatario_logradouro?: string;
  destinatario_numero?: string;
  destinatario_complemento?: string;
  destinatario_bairro?: string;
  destinatario_cidade?: string;
  destinatario_uf?: string;
  peso_kg?: number;
  altura_cm?: number;
  largura_cm?: number;
  comprimento_cm?: number;
  valor_declarado?: number;
  descricao_conteudo?: string;
  transportadora_id?: string;
  transportadora_nome?: string;
  servico?: string;
  valor_frete?: number;
  prazo_estimado_dias?: number;
  data_previsao_entrega?: string;
  data_postagem?: string;
  data_entrega?: string;
  created_at: string;
  updated_at: string;
}

export interface RastreamentoEvento {
  id: string;
  envio_id: string;
  codigo_rastreio?: string;
  data_hora: string;
  status: string;
  descricao?: string;
  local?: string;
  cidade?: string;
  uf?: string;
  origem_api: boolean;
  created_at: string;
}

export interface ConfigFrete {
  id: string;
  admin_id: string;
  remetente_nome?: string;
  remetente_cpf_cnpj?: string;
  remetente_telefone?: string;
  remetente_email?: string;
  remetente_cep?: string;
  remetente_logradouro?: string;
  remetente_numero?: string;
  remetente_complemento?: string;
  remetente_bairro?: string;
  remetente_cidade?: string;
  remetente_uf?: string;
  frete_gratis_acima?: number;
  prazo_adicional_dias: number;
  markup_padrao: number;
}

export interface ContratoPendenteEnvio {
  id: string;
  client_name: string;
  client_cpf?: string;
  client_email?: string;
  client_phone?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  signed_at?: string;
}

class EnvioService {
  private async getClientForTenant(tenantId: string) {
    const client = await getClientSupabaseClientStrict(tenantId);
    if (!client) {
      throw new Error(`Supabase client não configurado para tenant: ${tenantId}`);
    }
    return client;
  }

  // ==================== TRANSPORTADORAS ====================
  
  async getTransportadoras(adminId: string, tenantId: string): Promise<Transportadora[]> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('transportadoras')
      .select('*')
      .or(`admin_id.eq.${adminId},admin_id.eq.system,admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .eq('ativo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  async createTransportadora(transportadora: Partial<Transportadora>, tenantId: string): Promise<Transportadora> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('transportadoras')
      .insert(transportadora)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ==================== COTACOES ====================

  async getCotacoes(adminId: string, tenantId: string, limit = 50): Promise<CotacaoFrete[]> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('cotacoes_frete')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  async createCotacao(cotacao: Partial<CotacaoFrete>, tenantId: string): Promise<CotacaoFrete> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('cotacoes_frete')
      .insert(cotacao)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async calcularFrete(adminId: string, tenantId: string, dados: {
    cepOrigem: string;
    cepDestino: string;
    peso: number;
    altura: number;
    largura: number;
    comprimento: number;
    valorDeclarado: number;
  }): Promise<CotacaoFrete[]> {
    const transportadoras = await this.getTransportadoras(adminId, tenantId);
    const cotacoes: CotacaoFrete[] = [];

    for (const transp of transportadoras) {
      const valorBase = this.calcularValorBase(dados.peso, dados.cepOrigem, dados.cepDestino);
      const prazoBase = this.calcularPrazoBase(transp.codigo, dados.cepOrigem, dados.cepDestino);
      
      const valorComMarkup = valorBase * (1 + (transp.markup_percentual / 100));
      const prazoFinal = prazoBase + transp.prazo_adicional_dias;

      const cotacao: Partial<CotacaoFrete> = {
        admin_id: adminId,
        cep_origem: dados.cepOrigem,
        cep_destino: dados.cepDestino,
        peso_kg: dados.peso,
        altura_cm: dados.altura,
        largura_cm: dados.largura,
        comprimento_cm: dados.comprimento,
        valor_declarado: dados.valorDeclarado,
        transportadora_id: transp.id,
        transportadora_nome: transp.nome,
        servico: this.getServicoNome(transp.codigo),
        valor_frete: Math.round(valorComMarkup * 100) / 100,
        prazo_dias: prazoFinal,
        selecionado: false
      };

      const created = await this.createCotacao(cotacao, tenantId);
      cotacoes.push(created);
    }

    const hasTenantConfig = await totalExpressService.isConfiguredForTenant(adminId);
    if (hasTenantConfig || totalExpressService.isConfigured()) {
      try {
        const cotacaoTotalExpress = await totalExpressService.cotarFrete({
          cepOrigem: dados.cepOrigem,
          cepDestino: dados.cepDestino,
          peso: dados.peso,
          altura: dados.altura,
          largura: dados.largura,
          comprimento: dados.comprimento,
          valorDeclarado: dados.valorDeclarado
        }, adminId);

        if (cotacaoTotalExpress.success && cotacaoTotalExpress.valor_frete > 0) {
          const cotacaoTE: Partial<CotacaoFrete> = {
            admin_id: adminId,
            cep_origem: dados.cepOrigem,
            cep_destino: dados.cepDestino,
            peso_kg: dados.peso,
            altura_cm: dados.altura,
            largura_cm: dados.largura,
            comprimento_cm: dados.comprimento,
            valor_declarado: dados.valorDeclarado,
            transportadora_nome: cotacaoTotalExpress.transportadora_nome,
            servico: cotacaoTotalExpress.servico,
            valor_frete: cotacaoTotalExpress.valor_frete,
            prazo_dias: cotacaoTotalExpress.prazo_dias,
            selecionado: false
          };

          const createdTE = await this.createCotacao(cotacaoTE, tenantId);
          cotacoes.push(createdTE);
          console.log('[EnvioService] Cotação Total Express adicionada:', cotacaoTotalExpress.valor_frete);
        }
      } catch (error) {
        console.error('[EnvioService] Erro ao cotar Total Express:', error);
      }
    }

    return cotacoes.sort((a, b) => (a.valor_frete || 0) - (b.valor_frete || 0));
  }

  private calcularValorBase(peso: number, cepOrigem: string, cepDestino: string): number {
    const regiaoOrigem = parseInt(cepOrigem.substring(0, 1));
    const regiaoDestino = parseInt(cepDestino.substring(0, 1));
    const distanciaFator = Math.abs(regiaoOrigem - regiaoDestino) + 1;
    
    const valorPorKg = 8.50;
    const taxaBase = 12.00;
    const taxaDistancia = distanciaFator * 3.50;
    
    return taxaBase + (peso * valorPorKg) + taxaDistancia;
  }

  private calcularPrazoBase(codigoTransp: string, cepOrigem: string, cepDestino: string): number {
    const regiaoOrigem = parseInt(cepOrigem.substring(0, 1));
    const regiaoDestino = parseInt(cepDestino.substring(0, 1));
    const distanciaFator = Math.abs(regiaoOrigem - regiaoDestino);
    
    const prazosBase: Record<string, number> = {
      'correios_sedex': 2,
      'correios_pac': 5,
      'jadlog_package': 3,
      'jadlog_com': 4,
      'loggi_express': 2,
      'azul_amanha': 1,
      'azul_ecommerce': 3
    };

    const prazoBase = prazosBase[codigoTransp] || 5;
    return prazoBase + Math.floor(distanciaFator / 2);
  }

  private getServicoNome(codigo: string): string {
    const servicos: Record<string, string> = {
      'correios_sedex': 'SEDEX',
      'correios_pac': 'PAC',
      'jadlog_package': '.Package',
      'jadlog_com': '.Com',
      'loggi_express': 'Express',
      'azul_amanha': 'Amanhã',
      'azul_ecommerce': 'E-commerce'
    };
    return servicos[codigo] || codigo;
  }

  // ==================== ENVIOS ====================

  async getEnvios(adminId: string, tenantId: string, status?: string, limit = 100): Promise<Envio[]> {
    const client = await this.getClientForTenant(tenantId);
    let query = client
      .from('envios')
      .select('*')
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getEnvioById(id: string, adminId: string, tenantId: string): Promise<Envio | null> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('envios')
      .select('*')
      .eq('id', id)
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async searchDestinatarios(adminId: string, tenantId: string, search: string, limit = 10): Promise<{
    id: string;
    destinatario_nome: string;
    destinatario_cpf_cnpj?: string;
    destinatario_telefone?: string;
    destinatario_email?: string;
    destinatario_cep?: string;
    destinatario_logradouro?: string;
    destinatario_numero?: string;
    destinatario_complemento?: string;
    destinatario_bairro?: string;
    destinatario_cidade?: string;
    destinatario_uf?: string;
    ultimo_envio?: string;
  }[]> {
    const client = await this.getClientForTenant(tenantId);
    
    let query = client
      .from('envios')
      .select('id, destinatario_nome, destinatario_cpf_cnpj, destinatario_telefone, destinatario_email, destinatario_cep, destinatario_logradouro, destinatario_numero, destinatario_complemento, destinatario_bairro, destinatario_cidade, destinatario_uf, created_at')
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .order('created_at', { ascending: false });
    
    if (search && search.trim().length > 0) {
      query = query.ilike('destinatario_nome', `%${search}%`);
    }
    
    const { data, error } = await query.limit(limit * 3);
    
    if (error) throw error;
    
    const uniqueDestinatarios = new Map<string, any>();
    for (const envio of (data || [])) {
      const key = `${envio.destinatario_nome?.toLowerCase()}-${envio.destinatario_cep}`;
      if (!uniqueDestinatarios.has(key)) {
        uniqueDestinatarios.set(key, {
          ...envio,
          ultimo_envio: envio.created_at
        });
        if (uniqueDestinatarios.size >= limit) break;
      }
    }
    
    return Array.from(uniqueDestinatarios.values());
  }

  async createEnvio(envio: Partial<Envio>, tenantId: string): Promise<Envio> {
    const client = await this.getClientForTenant(tenantId);
    
    const codigoRastreio = envio.codigo_rastreio || this.gerarCodigoRastreio();
    
    const { data, error } = await client
      .from('envios')
      .insert({
        ...envio,
        codigo_rastreio: codigoRastreio,
        status: envio.status || 'pendente'
      })
      .select()
      .single();
    
    if (error) throw error;

    await this.addRastreamentoEvento({
      envio_id: data.id,
      codigo_rastreio: codigoRastreio,
      data_hora: new Date().toISOString(),
      status: 'Objeto criado',
      descricao: 'Envio registrado no sistema',
      local: 'Sistema',
      origem_api: false
    }, tenantId);

    return data;
  }

  async updateEnvio(id: string, adminId: string, tenantId: string, updates: Partial<Envio>): Promise<Envio> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('envios')
      .update(updates)
      .eq('id', id)
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateEnvioStatus(id: string, adminId: string, tenantId: string, status: Envio['status'], descricao?: string): Promise<Envio> {
    const envio = await this.updateEnvio(id, adminId, tenantId, { status });
    
    await this.addRastreamentoEvento({
      envio_id: id,
      codigo_rastreio: envio.codigo_rastreio,
      data_hora: new Date().toISOString(),
      status: this.getStatusLabel(status),
      descricao: descricao || `Status atualizado para: ${this.getStatusLabel(status)}`,
      origem_api: false
    }, tenantId);

    return envio;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pendente': 'Pendente',
      'aguardando_coleta': 'Aguardando Coleta',
      'coletado': 'Coletado',
      'em_transito': 'Em Trânsito',
      'saiu_entrega': 'Saiu para Entrega',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado',
      'devolvido': 'Devolvido'
    };
    return labels[status] || status;
  }

  private gerarCodigoRastreio(): string {
    const prefixo = 'ME';
    const numeros = Math.random().toString().substring(2, 11).padEnd(9, '0');
    const sufixo = 'BR';
    return `${prefixo}${numeros}${sufixo}`;
  }

  async getEnvioStats(adminId: string, tenantId: string): Promise<{
    total: number;
    pendentes: number;
    em_transito: number;
    entregues: number;
    cancelados: number;
  }> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('envios')
      .select('status')
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`);
    
    if (error) throw error;

    const envios = data || [];
    return {
      total: envios.length,
      pendentes: envios.filter(e => e.status === 'pendente' || e.status === 'aguardando_coleta').length,
      em_transito: envios.filter(e => ['coletado', 'em_transito', 'saiu_entrega'].includes(e.status)).length,
      entregues: envios.filter(e => e.status === 'entregue').length,
      cancelados: envios.filter(e => e.status === 'cancelado' || e.status === 'devolvido').length
    };
  }

  // ==================== RASTREAMENTO ====================

  async getRastreamentoEventos(envioId: string, tenantId: string): Promise<RastreamentoEvento[]> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('rastreamento_eventos')
      .select('*')
      .eq('envio_id', envioId)
      .order('data_hora', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getRastreamentoByCodigo(codigoRastreio: string, tenantId: string, adminId?: string): Promise<{
    envio: Envio | null;
    eventos: RastreamentoEvento[];
  }> {
    const client = await this.getClientForTenant(tenantId);
    
    let query = client
      .from('envios')
      .select('*')
      .eq('codigo_rastreio', codigoRastreio.toUpperCase());
    
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    
    const { data: envio } = await query.single();

    if (!envio) {
      return { envio: null, eventos: [] };
    }

    const eventos = await this.getRastreamentoEventos(envio.id, tenantId);
    return { envio, eventos };
  }

  async addRastreamentoEvento(evento: Partial<RastreamentoEvento>, tenantId: string): Promise<RastreamentoEvento> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('rastreamento_eventos')
      .insert(evento)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ==================== CONFIGURACOES ====================

  async getConfigFrete(adminId: string, tenantId: string): Promise<ConfigFrete | null> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('config_frete')
      .select('*')
      .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async saveConfigFrete(config: Partial<ConfigFrete>, tenantId: string): Promise<ConfigFrete> {
    const client = await this.getClientForTenant(tenantId);
    const { data, error } = await client
      .from('config_frete')
      .upsert(config, { onConflict: 'admin_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ==================== CONTRATOS PENDENTES ====================

  async getContratosPendentesEnvio(adminId: string, tenantId: string): Promise<ContratoPendenteEnvio[]> {
    console.log('[EnvioService] Buscando contratos pendentes para adminId:', adminId, 'tenantId:', tenantId);
    
    const effectiveTenantId = tenantId || adminId;
    const client = await getClientSupabaseClientStrict(effectiveTenantId);
    
    if (!client) {
      console.log('[EnvioService] Tenant', effectiveTenantId, 'não tem credenciais Supabase configuradas');
      console.log('[EnvioService] Admin deve configurar credenciais em /configuracoes para ver contratos');
      return [];
    }
    
    let contractIdsComEnvio: string[] = [];
    
    try {
      const { data: enviosExistentes, error: enviosError } = await client
        .from('envios')
        .select('contract_id')
        .or(`admin_id.eq.${adminId},admin_id.eq.sistema,admin_id.eq.${tenantId}`)
        .not('contract_id', 'is', null);
      
      if (!enviosError && enviosExistentes) {
        contractIdsComEnvio = enviosExistentes
          .map((e: any) => e.contract_id)
          .filter(Boolean);
        console.log('[EnvioService] Contratos já com envio:', contractIdsComEnvio.length);
      }
    } catch (err) {
      console.error('[EnvioService] Erro ao buscar contract_ids dos envios:', err);
    }

    console.log('[EnvioService] Buscando contratos do Supabase para tenant:', effectiveTenantId);
    
    const { data: allContracts, error: contractsError } = await client
      .from('contracts')
      .select('id, client_name, client_cpf, client_email, client_phone, address_street, address_number, address_complement, address_city, address_state, address_zipcode, signed_at, status')
      .eq('status', 'signed')
      .order('signed_at', { ascending: false });
    
    if (contractsError) {
      console.error('[EnvioService] Erro ao buscar contratos:', contractsError);
      console.error('[EnvioService] Detalhes do erro:', JSON.stringify(contractsError, null, 2));
      return [];
    }
    
    console.log('[EnvioService] Total de contratos assinados (status=signed) encontrados:', allContracts?.length || 0);
    
    const pendingContracts = (allContracts || []).filter((contract: any) => {
      if (contractIdsComEnvio.includes(contract.id)) {
        console.log('[EnvioService] Contrato', contract.id, 'já tem envio, excluindo');
        return false;
      }
      console.log('[EnvioService] Incluindo contrato:', contract.id, 'client:', contract.client_name);
      return true;
    });
    
    return pendingContracts.map((c: any) => ({
      id: c.id,
      client_name: c.client_name,
      client_cpf: c.client_cpf,
      client_email: c.client_email,
      client_phone: c.client_phone,
      address_street: c.address_street,
      address_number: c.address_number,
      address_complement: c.address_complement,
      address_city: c.address_city,
      address_state: c.address_state,
      address_zipcode: c.address_zipcode,
      signed_at: c.signed_at
    }));
  }
}

export const envioService = new EnvioService();
