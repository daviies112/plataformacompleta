import axios from 'axios';

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
}

export interface TotalExpressRegistroResponse {
  success: boolean;
  awb?: string;
  codigoRastreio?: string;
  etiquetaUrl?: string;
  error?: string;
}

class TotalExpressService {
  private apiBaseUrl = 'https://edi.totalexpress.com.br';
  
  private getCredentials() {
    const user = process.env.TOTAL_EXPRESS_USER;
    const pass = process.env.TOTAL_EXPRESS_PASS;
    const reid = process.env.TOTAL_EXPRESS_REID;
    const service = process.env.TOTAL_EXPRESS_SERVICE;
    
    return { user, pass, reid, service };
  }
  
  private getBasicAuthHeader(): string {
    const { user, pass } = this.getCredentials();
    if (!user || !pass) return '';
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }
  
  isConfigured(): boolean {
    const { user, pass, reid } = this.getCredentials();
    const configured = !!(user && pass && reid);
    
    console.log('[TotalExpress] Credenciais:', {
      user: user ? `${user.substring(0, 4)}...${user.slice(-4)}` : 'NÃO CONFIGURADO',
      pass: pass ? `Configurado (${pass.length} chars)` : 'NÃO CONFIGURADO',
      reid: reid || 'NÃO CONFIGURADO',
      configured
    });
    
    return configured;
  }

  async cotarFrete(dados: TotalExpressCotacaoRequest): Promise<TotalExpressCotacaoResponse> {
    const { user, pass, reid, service } = this.getCredentials();
    
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
        usuario: user.substring(0, 4) + '...'
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
          'Authorization': this.getBasicAuthHeader()
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
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          const prazo = prazoMatch ? parseInt(prazoMatch[1]) : 5;

          console.log('[TotalExpress] Cotação bem-sucedida:', { valor, prazo });
          return {
            success: true,
            transportadora_nome: 'Total Express',
            servico: tipoServico,
            valor_frete: valor,
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

    try {
      const url = `${this.apiBaseUrl}/webservice_e_total.php`;
      const cepDestino = dados.destinatarioCep.replace(/\D/g, '');
      const tipoServico = service || 'EXP';
      
      console.log('[TotalExpress] Registrando coleta:', {
        pedido: dados.pedido,
        usuario: user.substring(0, 4) + '...',
        reid: reid,
        service: tipoServico
      });
      
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Encomendas>
  <Remetente>
    <Usuario>${this.escapeXml(user)}</Usuario>
    <Senha>${this.escapeXml(pass)}</Senha>
    <Reid>${this.escapeXml(reid)}</Reid>
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
      console.log('[TotalExpress] Resposta registro:', typeof responseData === 'string' ? responseData.substring(0, 500) : responseData);

      if (typeof responseData === 'string') {
        const awbMatch = responseData.match(/<Awb>([^<]+)<\/Awb>/i);
        const etiquetaMatch = responseData.match(/<Etiqueta>([^<]+)<\/Etiqueta>/i);
        const erroMatch = responseData.match(/<Erro>([^<]+)<\/Erro>/i);
        const mensagemMatch = responseData.match(/<Mensagem>([^<]+)<\/Mensagem>/i);

        if (erroMatch && erroMatch[1] !== '0' && erroMatch[1] !== '') {
          const errorMsg = mensagemMatch ? mensagemMatch[1] : erroMatch[1];
          console.error('[TotalExpress] Erro no registro:', errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }

        const awb = awbMatch ? awbMatch[1] : null;
        const etiqueta = etiquetaMatch ? etiquetaMatch[1] : null;

        if (awb) {
          console.log('[TotalExpress] Coleta registrada - AWB:', awb);
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
      console.error('[TotalExpress] Erro ao registrar coleta:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao registrar coleta'
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
