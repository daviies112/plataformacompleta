import axios from 'axios';
import { db } from '../db';
import { totalExpressConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/credentialsManager';

export interface TenantCredentials {
  user: string;
  pass: string;
  reid: string;
  service: string;
  testMode: boolean;
  profitMargin: number;
}

export interface TotalExpressCotacaoRequest {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorDeclarado: number;
}

export interface TotalExpressCotacaoResponse {
  success: boolean;
  transportadora_nome: string;
  servico: string;
  valor_frete: number;
  prazo_dias: number;
  error?: string;
}

export interface TotalExpressRegistroRequest {
  pedido: string;
  destinatarioNome: string;
  destinatarioCpfCnpj?: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  destinatarioCep: string;
  destinatarioLogradouro?: string;
  destinatarioNumero?: string;
  destinatarioComplemento?: string;
  destinatarioBairro?: string;
  destinatarioCidade?: string;
  destinatarioUf?: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorDeclarado: number;
  descricaoConteudo?: string;
  notaFiscal?: string;
  serieNF?: string;
}

export interface TotalExpressRegistroResponse {
  success: boolean;
  awb?: string;
  codigoRastreio?: string;
  etiquetaUrl?: string;
  numeroPedido?: string;
  error?: string;
}

class TotalExpressService {
  private apiBaseUrl = 'https://edi.totalexpress.com.br';
  
  // Default profit margin applied to all freight quotes (40% = 1.40)
  private readonly DEFAULT_PROFIT_MARGIN = 1.40;
  
  // Cache for tenant credentials (avoid DB calls on every request)
  private credentialsCache: Map<string, { credentials: TenantCredentials; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get credentials from environment variables (fallback)
  private getEnvCredentials() {
    const user = process.env.TOTAL_EXPRESS_USER;
    const pass = process.env.TOTAL_EXPRESS_PASS;
    const reid = process.env.TOTAL_EXPRESS_REID;
    const service = process.env.TOTAL_EXPRESS_SERVICE || 'EXP';
    
    return { user, pass, reid, service };
  }

  // Get credentials for a specific tenant from database
  async getTenantCredentials(tenantId: string): Promise<TenantCredentials | null> {
    // Check cache first
    const cached = this.credentialsCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.credentials;
    }

    try {
      const configFromDb = await db.select().from(totalExpressConfig)
        .where(eq(totalExpressConfig.tenantId, tenantId))
        .limit(1);
      
      if (configFromDb[0]) {
        const credentials: TenantCredentials = {
          user: decrypt(configFromDb[0].user),
          pass: decrypt(configFromDb[0].password),
          reid: decrypt(configFromDb[0].reid),
          service: configFromDb[0].service || 'EXP',
          testMode: configFromDb[0].testMode ?? true,
          profitMargin: configFromDb[0].profitMargin || this.DEFAULT_PROFIT_MARGIN,
        };
        
        // Cache the credentials
        this.credentialsCache.set(tenantId, { credentials, timestamp: Date.now() });
        
        return credentials;
      }
      
      return null;
    } catch (error) {
      console.error('[TotalExpress] Erro ao buscar credenciais do tenant:', error);
      return null;
    }
  }

  // Get credentials - tries tenant first, then falls back to env vars
  async getCredentials(tenantId?: string): Promise<{ user?: string; pass?: string; reid?: string; service: string; testMode: boolean; profitMargin: number }> {
    // Try tenant credentials first
    if (tenantId) {
      const tenantCreds = await this.getTenantCredentials(tenantId);
      if (tenantCreds) {
        console.log(`[TotalExpress] Usando credenciais do tenant ${tenantId}`);
        return tenantCreds;
      }
    }
    
    // Fallback to environment variables
    const envCreds = this.getEnvCredentials();
    return {
      ...envCreds,
      testMode: process.env.TOTAL_EXPRESS_TEST_MODE === 'true',
      profitMargin: this.DEFAULT_PROFIT_MARGIN,
    };
  }
  
  private getBasicAuthHeaderFromCreds(user: string, pass: string): string {
    if (!user || !pass) return '';
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  // Legacy method - checks env vars only
  isConfigured(): boolean {
    const { user, pass, reid } = this.getEnvCredentials();
    const configured = !!(user && pass && reid);
    
    console.log('[TotalExpress] Credenciais (env):', {
      user: user ? `${user.substring(0, 4)}...${user.slice(-4)}` : 'NÃO CONFIGURADO',
      pass: pass ? `Configurado (${pass.length} chars)` : 'NÃO CONFIGURADO',
      reid: reid || 'NÃO CONFIGURADO',
      configured
    });
    
    return configured;
  }

  // Check if tenant has TotalExpress configured
  async isConfiguredForTenant(tenantId: string): Promise<boolean> {
    const creds = await this.getTenantCredentials(tenantId);
    return creds !== null;
  }

  isTestMode(): boolean {
    return process.env.TOTAL_EXPRESS_TEST_MODE === 'true';
  }

  // Test credentials without saving
  async testCredentials(user: string, password: string, reid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authHeader = this.getBasicAuthHeaderFromCreds(user, password);
      
      // Make a simple quote request to test credentials
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
                   xmlns:ns1="urn:calcularFrete"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
                   SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:calcularFrete>
      <calcularFreteRequest xsi:type="ns1:calcularFreteRequest">
        <TipoServico xsi:type="xsd:string">EXP</TipoServico>
        <CepDestino xsi:type="xsd:nonNegativeInteger">01310100</CepDestino>
        <Peso xsi:type="xsd:string">1.00</Peso>
        <ValorDeclarado xsi:type="xsd:string">100.00</ValorDeclarado>
        <TipoEntrega xsi:type="xsd:nonNegativeInteger">0</TipoEntrega>
        <Altura xsi:type="xsd:nonNegativeInteger">10</Altura>
        <Largura xsi:type="xsd:nonNegativeInteger">10</Largura>
        <Profundidade xsi:type="xsd:nonNegativeInteger">10</Profundidade>
      </calcularFreteRequest>
    </ns1:calcularFrete>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

      const url = `${this.apiBaseUrl}/webservice_calculo_frete.php`;
      
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'urn:simulaFrete#calcularFrete',
          'Authorization': authHeader
        },
        timeout: 15000
      });

      const data = response.data;
      
      // Check for authentication errors
      if (response.status === 401) {
        return { success: false, error: 'Credenciais inválidas' };
      }
      
      // Check for valid response (even an error response means auth worked)
      if (typeof data === 'string' && data.includes('calcularFreteResponse')) {
        return { success: true };
      }
      
      return { success: false, error: 'Resposta inesperada da API' };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, error: 'Credenciais inválidas' };
      }
      return { success: false, error: error.message || 'Erro ao conectar com Total Express' };
    }
  }

  // Invalidate cache for a tenant (call after saving new credentials)
  invalidateCache(tenantId: string): void {
    this.credentialsCache.delete(tenantId);
  }

  async cotarFrete(dados: TotalExpressCotacaoRequest, tenantId?: string): Promise<TotalExpressCotacaoResponse> {
    const creds = await this.getCredentials(tenantId);
    const { user, pass, reid, service, profitMargin } = creds;
    
    if (!user || !pass || !reid) {
      console.log('[TotalExpress] Credenciais não configuradas');
      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: 'EXP',
        valor_frete: 0,
        prazo_dias: 0,
        error: 'Credenciais não configuradas'
      };
    }

    try {
      const cepDestino = dados.cepDestino.replace(/\D/g, '');
      
      const pesoReal = dados.peso;
      const pesoCubado = (dados.altura * dados.largura * dados.comprimento) / 6000;
      const pesoFinal = Math.max(pesoReal, pesoCubado);

      const tipoServico = service || 'EXP';
      
      console.log('[TotalExpress] Cotando frete:', {
        cepDestino,
        peso: pesoFinal,
        valorDeclarado: dados.valorDeclarado,
        tipoServico,
        usuario: user.substring(0, 4) + '...',
        tenantId: tenantId || 'env'
      });

      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
                   xmlns:ns1="urn:calcularFrete"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
                   SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:calcularFrete>
      <calcularFreteRequest xsi:type="ns1:calcularFreteRequest">
        <TipoServico xsi:type="xsd:string">${this.escapeXml(tipoServico)}</TipoServico>
        <CepDestino xsi:type="xsd:nonNegativeInteger">${cepDestino}</CepDestino>
        <Peso xsi:type="xsd:string">${pesoFinal.toFixed(2)}</Peso>
        <ValorDeclarado xsi:type="xsd:string">${dados.valorDeclarado.toFixed(2)}</ValorDeclarado>
        <TipoEntrega xsi:type="xsd:nonNegativeInteger">0</TipoEntrega>
        <Altura xsi:type="xsd:nonNegativeInteger">${Math.round(dados.altura)}</Altura>
        <Largura xsi:type="xsd:nonNegativeInteger">${Math.round(dados.largura)}</Largura>
        <Profundidade xsi:type="xsd:nonNegativeInteger">${Math.round(dados.comprimento)}</Profundidade>
      </calcularFreteRequest>
    </ns1:calcularFrete>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

      const url = `${this.apiBaseUrl}/webservice_calculo_frete.php`;
      
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'urn:simulaFrete#calcularFrete',
          'Authorization': this.getBasicAuthHeaderFromCreds(user, pass)
        },
        timeout: 15000
      });

      const data = response.data;
      console.log('[TotalExpress] Resposta recebida (preview):', typeof data === 'string' ? data.substring(0, 400) : data);
      
      if (typeof data === 'string') {
        const erroMatch = data.match(/<ErroConsultaFrete[^>]*>([^<]+)<\/ErroConsultaFrete>/i);
        const valorMatch = data.match(/<ValorServico[^>]*>([^<]+)<\/ValorServico>/i);
        const prazoMatch = data.match(/<Prazo[^>]*>([^<]+)<\/Prazo>/i);
        const codigoMatch = data.match(/<CodigoProc[^>]*>([^<]+)<\/CodigoProc>/i);
        
        const codigoProc = codigoMatch ? parseInt(codigoMatch[1]) : -1;
        
        if (erroMatch && erroMatch[1]) {
          console.log('[TotalExpress] Erro na cotação:', erroMatch[1], 'CodigoProc:', codigoProc);
          return {
            success: false,
            transportadora_nome: 'Total Express',
            servico: tipoServico,
            valor_frete: 0,
            prazo_dias: 0,
            error: `Erro Total Express: ${erroMatch[1]}`
          };
        }

        if (valorMatch) {
          const valorOriginal = parseFloat(valorMatch[1].replace(',', '.'));
          const prazo = prazoMatch ? parseInt(prazoMatch[1]) : 5;
          
          // Apply profit margin to the freight value (from tenant config or default)
          const valorComMargem = Math.round(valorOriginal * profitMargin * 100) / 100;

          console.log('[TotalExpress] Cotação bem-sucedida:', { valorOriginal, valorComMargem, prazo, margem: profitMargin });
          return {
            success: true,
            transportadora_nome: 'Total Express',
            servico: tipoServico,
            valor_frete: valorComMargem,
            prazo_dias: prazo
          };
        }
        
        console.log('[TotalExpress] Resposta sem valor de frete:', data.substring(0, 800));
      }

      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: tipoServico,
        valor_frete: 0,
        prazo_dias: 0,
        error: 'Resposta inesperada da API'
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro na cotação:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          transportadora_nome: 'Total Express',
          servico: 'EXP',
          valor_frete: 0,
          prazo_dias: 0,
          error: 'Credenciais inválidas ou acesso negado'
        };
      }
      
      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: 'EXP',
        valor_frete: 0,
        prazo_dias: 0,
        error: error.message || 'Erro ao conectar com Total Express'
      };
    }
  }

  async registrarColeta(dados: TotalExpressRegistroRequest): Promise<TotalExpressRegistroResponse> {
    const { user, pass, reid, service } = this.getCredentials();
    
    if (!user || !pass || !reid) {
      return {
        success: false,
        error: 'Credenciais não configuradas'
      };
    }

    // Test mode - simulate successful registration
    if (this.isTestMode()) {
      console.log('[TotalExpress] MODO TESTE - Simulando registro de coleta');
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const testAwb = `TE${timestamp}${random}BR`;
      return {
        success: true,
        awb: testAwb,
        codigoRastreio: testAwb,
        numeroPedido: dados.pedido,
        etiquetaUrl: `https://edi.totalexpress.com.br/etiqueta_teste.php?awb=${testAwb}`
      };
    }

    try {
      // Use webservice24.php with GravarPedido method (SOAP)
      const url = `${this.apiBaseUrl}/webservice24.php`;
      const cepDestino = dados.destinatarioCep.replace(/\D/g, '');
      const tipoServico = service || 'EXP';
      
      console.log('[TotalExpress] Registrando coleta via webservice24 (GravarPedido):', {
        pedido: dados.pedido,
        usuario: user.substring(0, 4) + '...',
        reid: reid,
        service: tipoServico,
        destinatario: dados.destinatarioNome
      });
      
      // Build SOAP envelope for GravarPedido
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://edi.totalexpress.com.br/">
  <soap:Header/>
  <soap:Body>
    <tns:GravarPedido>
      <usuario>${this.escapeXml(user)}</usuario>
      <senha>${this.escapeXml(pass)}</senha>
      <remetenteId>${this.escapeXml(reid)}</remetenteId>
      <tipoServico>${this.escapeXml(tipoServico)}</tipoServico>
      <pedido>${this.escapeXml(dados.pedido)}</pedido>
      <nomeDestinatario>${this.escapeXml(dados.destinatarioNome)}</nomeDestinatario>
      <cpfCnpjDestinatario>${dados.destinatarioCpfCnpj?.replace(/\D/g, '') || ''}</cpfCnpjDestinatario>
      <telefoneDestinatario>${dados.destinatarioTelefone?.replace(/\D/g, '') || ''}</telefoneDestinatario>
      <emailDestinatario>${dados.destinatarioEmail || ''}</emailDestinatario>
      <enderecoDestinatario>${this.escapeXml(dados.destinatarioLogradouro || '')}</enderecoDestinatario>
      <numeroDestinatario>${dados.destinatarioNumero || 'S/N'}</numeroDestinatario>
      <complementoDestinatario>${this.escapeXml(dados.destinatarioComplemento || '')}</complementoDestinatario>
      <bairroDestinatario>${this.escapeXml(dados.destinatarioBairro || '')}</bairroDestinatario>
      <cidadeDestinatario>${this.escapeXml(dados.destinatarioCidade || '')}</cidadeDestinatario>
      <ufDestinatario>${dados.destinatarioUf || ''}</ufDestinatario>
      <cepDestinatario>${cepDestino}</cepDestinatario>
      <peso>${dados.peso.toFixed(2)}</peso>
      <volumes>1</volumes>
      <altura>${Math.round(dados.altura)}</altura>
      <largura>${Math.round(dados.largura)}</largura>
      <comprimento>${Math.round(dados.comprimento)}</comprimento>
      <valorDeclarado>${dados.valorDeclarado.toFixed(2)}</valorDeclarado>
      <descricaoConteudo>${this.escapeXml(dados.descricaoConteudo || 'Produtos')}</descricaoConteudo>
      <numeroNF>${dados.notaFiscal || dados.pedido}</numeroNF>
      <serieNF>${dados.serieNF || '1'}</serieNF>
    </tns:GravarPedido>
  </soap:Body>
</soap:Envelope>`;

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://edi.totalexpress.com.br/GravarPedido',
          'Authorization': this.getBasicAuthHeader()
        },
        timeout: 30000
      });

      const responseData = response.data;
      console.log('[TotalExpress] Resposta registro GravarPedido:', typeof responseData === 'string' ? responseData.substring(0, 800) : responseData);

      if (typeof responseData === 'string') {
        // Parse various response formats
        const codigoRastreioMatch = responseData.match(/<codigoRastreamento>([^<]+)<\/codigoRastreamento>/i) 
          || responseData.match(/<codigoRastreio>([^<]+)<\/codigoRastreio>/i)
          || responseData.match(/<Awb>([^<]+)<\/Awb>/i)
          || responseData.match(/<awb>([^<]+)<\/awb>/i);
        
        const numeroPedidoMatch = responseData.match(/<numeroPedido>([^<]+)<\/numeroPedido>/i)
          || responseData.match(/<Pedido>([^<]+)<\/Pedido>/i);
        
        const etiquetaMatch = responseData.match(/<etiqueta>([^<]+)<\/etiqueta>/i)
          || responseData.match(/<Etiqueta>([^<]+)<\/Etiqueta>/i)
          || responseData.match(/<urlEtiqueta>([^<]+)<\/urlEtiqueta>/i);
        
        const erroMatch = responseData.match(/<erro>([^<]+)<\/erro>/i)
          || responseData.match(/<Erro>([^<]+)<\/Erro>/i)
          || responseData.match(/<mensagem>([^<]+)<\/mensagem>/i);
        
        const successMatch = responseData.match(/<sucesso>([^<]+)<\/sucesso>/i)
          || responseData.match(/<Success>([^<]+)<\/Success>/i);

        // Check for explicit error
        if (erroMatch && erroMatch[1] && erroMatch[1] !== '0' && erroMatch[1] !== '') {
          console.error('[TotalExpress] Erro no registro:', erroMatch[1]);
          return {
            success: false,
            error: erroMatch[1]
          };
        }

        const codigoRastreio = codigoRastreioMatch ? codigoRastreioMatch[1].trim() : null;
        const numeroPedido = numeroPedidoMatch ? numeroPedidoMatch[1].trim() : null;
        const etiqueta = etiquetaMatch ? etiquetaMatch[1].trim() : null;

        if (codigoRastreio) {
          console.log('[TotalExpress] Coleta registrada - AWB:', codigoRastreio, 'Pedido:', numeroPedido);
          return {
            success: true,
            awb: codigoRastreio,
            codigoRastreio: codigoRastreio,
            numeroPedido: numeroPedido || dados.pedido,
            etiquetaUrl: etiqueta || undefined
          };
        }

        // Try fallback to old endpoint if webservice24 doesn't work
        console.log('[TotalExpress] Tentando fallback para webservice_e_total...');
        return await this.registrarColetaFallback(dados);
      }

      return {
        success: false,
        error: 'Não foi possível obter o código de rastreio'
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro ao registrar coleta:', error.message);
      
      // Try fallback endpoint
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.log('[TotalExpress] Tentando fallback endpoint...');
        return await this.registrarColetaFallback(dados);
      }
      
      return {
        success: false,
        error: error.message || 'Erro ao registrar coleta'
      };
    }
  }

  private async registrarColetaFallback(dados: TotalExpressRegistroRequest): Promise<TotalExpressRegistroResponse> {
    const { user, pass, reid, service } = this.getCredentials();
    
    try {
      const url = `${this.apiBaseUrl}/webservice_e_total.php`;
      const cepDestino = dados.destinatarioCep.replace(/\D/g, '');
      const tipoServico = service || 'EXP';
      
      console.log('[TotalExpress] Fallback - Registrando via webservice_e_total');
      
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Encomendas>
  <Remetente>
    <Usuario>${this.escapeXml(user!)}</Usuario>
    <Senha>${this.escapeXml(pass!)}</Senha>
    <Reid>${this.escapeXml(reid!)}</Reid>
    <Servico>${this.escapeXml(tipoServico)}</Servico>
  </Remetente>
  <Encomenda>
    <Pedido>${this.escapeXml(dados.pedido)}</Pedido>
    <NomeDestinatario>${this.escapeXml(dados.destinatarioNome)}</NomeDestinatario>
    <CpfCnpjDestinatario>${dados.destinatarioCpfCnpj?.replace(/\D/g, '') || ''}</CpfCnpjDestinatario>
    <TelefoneDestinatario>${dados.destinatarioTelefone?.replace(/\D/g, '') || ''}</TelefoneDestinatario>
    <EmailDestinatario>${dados.destinatarioEmail || ''}</EmailDestinatario>
    <LogradouroDestinatario>${this.escapeXml(dados.destinatarioLogradouro || '')}</LogradouroDestinatario>
    <NumeroDestinatario>${dados.destinatarioNumero || 'S/N'}</NumeroDestinatario>
    <ComplementoDestinatario>${this.escapeXml(dados.destinatarioComplemento || '')}</ComplementoDestinatario>
    <BairroDestinatario>${this.escapeXml(dados.destinatarioBairro || '')}</BairroDestinatario>
    <CidadeDestinatario>${this.escapeXml(dados.destinatarioCidade || '')}</CidadeDestinatario>
    <UfDestinatario>${dados.destinatarioUf || ''}</UfDestinatario>
    <CepDestinatario>${cepDestino}</CepDestinatario>
    <Peso>${dados.peso.toFixed(2)}</Peso>
    <Altura>${Math.round(dados.altura)}</Altura>
    <Largura>${Math.round(dados.largura)}</Largura>
    <Comprimento>${Math.round(dados.comprimento)}</Comprimento>
    <ValorDeclarado>${dados.valorDeclarado.toFixed(2)}</ValorDeclarado>
    <DescricaoConteudo>${this.escapeXml(dados.descricaoConteudo || 'Produtos')}</DescricaoConteudo>
    <NumeroNF>${dados.notaFiscal || dados.pedido}</NumeroNF>
    <SerieNF>${dados.serieNF || '1'}</SerieNF>
  </Encomenda>
</Encomendas>`;

      const response = await axios.post(url, xmlBody, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': this.getBasicAuthHeader()
        },
        timeout: 30000
      });

      const responseData = response.data;
      console.log('[TotalExpress] Resposta fallback:', typeof responseData === 'string' ? responseData.substring(0, 500) : responseData);

      if (typeof responseData === 'string') {
        const awbMatch = responseData.match(/<Awb>([^<]+)<\/Awb>/i);
        const etiquetaMatch = responseData.match(/<Etiqueta>([^<]+)<\/Etiqueta>/i);
        const erroMatch = responseData.match(/<Erro>([^<]+)<\/Erro>/i);
        const mensagemMatch = responseData.match(/<Mensagem>([^<]+)<\/Mensagem>/i);

        if (erroMatch && erroMatch[1] !== '0' && erroMatch[1] !== '') {
          const errorMsg = mensagemMatch ? mensagemMatch[1] : erroMatch[1];
          console.error('[TotalExpress] Erro no registro fallback:', errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        const awb = awbMatch ? awbMatch[1] : null;
        const etiqueta = etiquetaMatch ? etiquetaMatch[1] : null;

        if (awb) {
          console.log('[TotalExpress] Coleta registrada via fallback - AWB:', awb);
          return {
            success: true,
            awb: awb,
            codigoRastreio: awb,
            etiquetaUrl: etiqueta || undefined
          };
        }
      }

      return {
        success: false,
        error: 'Não foi possível obter o código de rastreio'
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro no fallback:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao registrar coleta'
      };
    }
  }

  async obterEtiqueta(awb: string): Promise<{
    success: boolean;
    pdfBase64?: string;
    pdfUrl?: string;
    error?: string;
  }> {
    const { user, pass, reid, service } = this.getCredentials();
    
    if (!user || !pass || !reid) {
      return { success: false, error: 'Credenciais não configuradas' };
    }

    // Test mode - return a placeholder
    if (this.isTestMode()) {
      console.log('[TotalExpress] MODO TESTE - Retornando URL de etiqueta simulada');
      return {
        success: true,
        pdfUrl: `https://edi.totalexpress.com.br/etiqueta_teste.php?awb=${awb}&modo=teste`
      };
    }

    try {
      // Try to get label PDF via SOAP
      const url = `${this.apiBaseUrl}/webservice24.php`;
      
      console.log('[TotalExpress] Obtendo etiqueta para AWB:', awb);
      
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://edi.totalexpress.com.br/">
  <soap:Header/>
  <soap:Body>
    <tns:ObterEtiqueta>
      <usuario>${this.escapeXml(user)}</usuario>
      <senha>${this.escapeXml(pass)}</senha>
      <remetenteId>${this.escapeXml(reid)}</remetenteId>
      <awb>${this.escapeXml(awb)}</awb>
      <formato>PDF</formato>
    </tns:ObterEtiqueta>
  </soap:Body>
</soap:Envelope>`;

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://edi.totalexpress.com.br/ObterEtiqueta',
          'Authorization': this.getBasicAuthHeader()
        },
        timeout: 30000
      });

      const responseData = response.data;
      
      if (typeof responseData === 'string') {
        const pdfBase64Match = responseData.match(/<pdf>([^<]+)<\/pdf>/i)
          || responseData.match(/<etiquetaPdf>([^<]+)<\/etiquetaPdf>/i)
          || responseData.match(/<base64>([^<]+)<\/base64>/i);
        
        const pdfUrlMatch = responseData.match(/<url>([^<]+)<\/url>/i)
          || responseData.match(/<etiquetaUrl>([^<]+)<\/etiquetaUrl>/i)
          || responseData.match(/<urlEtiqueta>([^<]+)<\/urlEtiqueta>/i);
        
        if (pdfBase64Match) {
          return {
            success: true,
            pdfBase64: pdfBase64Match[1]
          };
        }
        
        if (pdfUrlMatch) {
          return {
            success: true,
            pdfUrl: pdfUrlMatch[1]
          };
        }
      }

      // Fallback: try direct URL pattern
      const directUrl = `${this.apiBaseUrl}/etiqueta.php?usuario=${encodeURIComponent(user)}&senha=${encodeURIComponent(pass)}&reid=${encodeURIComponent(reid)}&awb=${encodeURIComponent(awb)}`;
      
      return {
        success: true,
        pdfUrl: directUrl
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro ao obter etiqueta:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async rastrear(codigoRastreio: string): Promise<{
    success: boolean;
    eventos?: Array<{
      data: string;
      status: string;
      descricao: string;
      local?: string;
    }>;
    error?: string;
  }> {
    const { user, pass, reid, service } = this.getCredentials();
    
    if (!user || !pass || !reid) {
      return { success: false, error: 'Credenciais não configuradas' };
    }

    // Test mode
    if (this.isTestMode()) {
      return {
        success: true,
        eventos: [{
          data: new Date().toISOString(),
          status: 'MODO TESTE',
          descricao: 'Este é um envio de teste - rastreamento simulado',
          local: 'Sistema de Teste'
        }]
      };
    }

    try {
      const url = `${this.apiBaseUrl}/webservice_rastreamento.php`;

      const response = await axios.get(url, {
        params: {
          Usuario: user,
          Senha: pass,
          Reid: reid,
          Servico: service || 'EXP',
          Awb: codigoRastreio
        },
        headers: {
          'Authorization': this.getBasicAuthHeader()
        },
        timeout: 15000
      });

      const data = response.data;
      const eventos: Array<{
        data: string;
        status: string;
        descricao: string;
        local?: string;
      }> = [];

      if (typeof data === 'string') {
        const eventoMatches = data.matchAll(/<Evento>([\s\S]*?)<\/Evento>/gi);
        
        for (const match of eventoMatches) {
          const eventoXml = match[1];
          const dataMatch = eventoXml.match(/<Data>([^<]+)<\/Data>/i);
          const statusMatch = eventoXml.match(/<Status>([^<]+)<\/Status>/i);
          const descricaoMatch = eventoXml.match(/<Descricao>([^<]+)<\/Descricao>/i);
          const localMatch = eventoXml.match(/<Local>([^<]+)<\/Local>/i);

          if (statusMatch || descricaoMatch) {
            eventos.push({
              data: dataMatch ? dataMatch[1] : new Date().toISOString(),
              status: statusMatch ? statusMatch[1] : 'Em processamento',
              descricao: descricaoMatch ? descricaoMatch[1] : '',
              local: localMatch ? localMatch[1] : undefined
            });
          }
        }
      }

      return {
        success: true,
        eventos: eventos.length > 0 ? eventos : [{
          data: new Date().toISOString(),
          status: 'Aguardando atualização',
          descricao: 'Nenhum evento disponível'
        }]
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro no rastreamento:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const totalExpressService = new TotalExpressService();
