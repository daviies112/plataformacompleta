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
  
  // Read credentials dynamically each time (not cached at class initialization)
  private getCredentials() {
    const user = process.env.TOTAL_EXPRESS_USER;
    const pass = process.env.TOTAL_EXPRESS_PASS;
    const reid = process.env.TOTAL_EXPRESS_REID;
    const service = process.env.TOTAL_EXPRESS_SERVICE;
    
    console.log('[TotalExpress] Verificando credenciais:', {
      user: user ? `${user.substring(0, 4)}...` : 'NÃO CONFIGURADO',
      pass: pass ? `${pass.substring(0, 4)}...` : 'NÃO CONFIGURADO',
      reid: reid || 'NÃO CONFIGURADO',
      service: service || 'NÃO CONFIGURADO (usando EXP)'
    });
    
    return { user, pass, reid, service };
  }
  
  isConfigured(): boolean {
    const { user, pass, reid } = this.getCredentials();
    return !!(user && pass && reid);
  }

  private getAuthParams() {
    const { user, pass, reid, service } = this.getCredentials();
    return {
      Usuario: user,
      Senha: pass,
      Reid: reid,
      Servico: service || 'EXP'
    };
  }

  async cotarFrete(dados: TotalExpressCotacaoRequest): Promise<TotalExpressCotacaoResponse> {
    const { user, pass, reid, service } = this.getCredentials();
    
    if (!user || !pass || !reid) {
      console.log('[TotalExpress] Credenciais não configuradas');
      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: 'Expresso',
        valor_frete: 0,
        prazo_dias: 0,
        error: 'Credenciais não configuradas'
      };
    }

    try {
      const cepOrigem = dados.cepOrigem.replace(/\D/g, '');
      const cepDestino = dados.cepDestino.replace(/\D/g, '');
      
      const pesoReal = dados.peso;
      const pesoCubado = (dados.altura * dados.largura * dados.comprimento) / 6000;
      const pesoFinal = Math.max(pesoReal, pesoCubado);

      const url = `${this.apiBaseUrl}/webservice_calculo_frete.php`;
      
      console.log('[TotalExpress] Cotando frete via SOAP:', {
        cepOrigem,
        cepDestino,
        peso: pesoFinal,
        valorDeclarado: dados.valorDeclarado,
        usuario: user.substring(0, 4) + '...',
        reid: reid
      });

      // Construir envelope SOAP para chamar o método calcularFrete
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
        <usuario xsi:type="xsd:string">${this.escapeXml(user)}</usuario>
        <senha xsi:type="xsd:string">${this.escapeXml(pass)}</senha>
        <reid xsi:type="xsd:string">${this.escapeXml(reid)}</reid>
        <servico xsi:type="xsd:string">${this.escapeXml(service || 'EXP')}</servico>
        <cep_origem xsi:type="xsd:string">${cepOrigem}</cep_origem>
        <cep_destino xsi:type="xsd:string">${cepDestino}</cep_destino>
        <peso xsi:type="xsd:string">${pesoFinal.toFixed(2)}</peso>
        <valor_declarado xsi:type="xsd:string">${dados.valorDeclarado.toFixed(2)}</valor_declarado>
      </calcularFreteRequest>
    </ns1:calcularFrete>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'urn:simulaFrete#calcularFrete'
        },
        timeout: 15000
      });

      const data = response.data;
      console.log('[TotalExpress] Resposta SOAP recebida (preview):', typeof data === 'string' ? data.substring(0, 300) : data);
      
      if (typeof data === 'string') {
        // Parse SOAP response - tentar múltiplos padrões
        const valorMatch = data.match(/<valor[^>]*>([^<]+)<\/valor>/i) || 
                          data.match(/<Valor[^>]*>([^<]+)<\/Valor>/i) ||
                          data.match(/<frete[^>]*>([^<]+)<\/frete>/i) ||
                          data.match(/<vl_frete[^>]*>([^<]+)<\/vl_frete>/i);
        const prazoMatch = data.match(/<prazo[^>]*>([^<]+)<\/prazo>/i) || 
                          data.match(/<Prazo[^>]*>([^<]+)<\/Prazo>/i) ||
                          data.match(/<dias[^>]*>([^<]+)<\/dias>/i);
        const erroMatch = data.match(/<erro[^>]*>([^<]+)<\/erro>/i) || 
                         data.match(/<Erro[^>]*>([^<]+)<\/Erro>/i) ||
                         data.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i) ||
                         data.match(/<mensagem[^>]*>([^<]+)<\/mensagem>/i);
        
        if (erroMatch && erroMatch[1] && erroMatch[1].trim() !== '0' && erroMatch[1].trim() !== '' && !erroMatch[1].toLowerCase().includes('sucesso')) {
          console.log('[TotalExpress] Erro na cotação:', erroMatch[1]);
          return {
            success: false,
            transportadora_nome: 'Total Express',
            servico: service || 'Expresso',
            valor_frete: 0,
            prazo_dias: 0,
            error: `Erro Total Express: ${erroMatch[1]}`
          };
        }

        const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
        const prazo = prazoMatch ? parseInt(prazoMatch[1]) : 5;

        if (valor > 0) {
          console.log('[TotalExpress] Cotação bem-sucedida:', { valor, prazo });
          return {
            success: true,
            transportadora_nome: 'Total Express',
            servico: service || 'Expresso',
            valor_frete: valor,
            prazo_dias: prazo
          };
        }
        
        // Log resposta completa para debug se não encontrou valor
        console.log('[TotalExpress] Resposta sem valor de frete detectado:', data.substring(0, 1000));
      }

      console.log('[TotalExpress] Resposta inesperada:', data);
      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: 'Expresso',
        valor_frete: 0,
        prazo_dias: 0,
        error: 'Resposta inesperada da API'
      };

    } catch (error: any) {
      console.error('[TotalExpress] Erro na cotação:', error.message);
      return {
        success: false,
        transportadora_nome: 'Total Express',
        servico: 'Expresso',
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
      
      console.log('[TotalExpress] Registrando coleta com credenciais:', {
        usuario: user.substring(0, 4) + '...',
        reid: reid,
        service: service || 'EXP'
      });
      
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Encomendas>
  <Remetente>
    <Usuario>${user}</Usuario>
    <Senha>${pass}</Senha>
    <Reid>${reid}</Reid>
    <Servico>${service || 'EXP'}</Servico>
  </Remetente>
  <Encomenda>
    <Pedido>${dados.pedido}</Pedido>
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
    <Altura>${dados.altura}</Altura>
    <Largura>${dados.largura}</Largura>
    <Comprimento>${dados.comprimento}</Comprimento>
    <ValorDeclarado>${dados.valorDeclarado.toFixed(2)}</ValorDeclarado>
    <DescricaoConteudo>${this.escapeXml(dados.descricaoConteudo || 'Produtos')}</DescricaoConteudo>
  </Encomenda>
</Encomendas>`;

      console.log('[TotalExpress] Registrando coleta para pedido:', dados.pedido);

      const response = await axios.post(url, xmlBody, {
        headers: {
          'Content-Type': 'application/xml'
        },
        timeout: 30000
      });

      const responseData = response.data;

      if (typeof responseData === 'string') {
        const awbMatch = responseData.match(/<Awb>([^<]+)<\/Awb>/);
        const etiquetaMatch = responseData.match(/<Etiqueta>([^<]+)<\/Etiqueta>/);
        const erroMatch = responseData.match(/<Erro>([^<]+)<\/Erro>/);
        const mensagemMatch = responseData.match(/<Mensagem>([^<]+)<\/Mensagem>/);

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

      console.log('[TotalExpress] Resposta do registro:', responseData);
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
    if (!this.isConfigured()) {
      return { success: false, error: 'Credenciais não configuradas' };
    }

    try {
      const url = `${this.apiBaseUrl}/webservice_rastreamento.php`;

      const response = await axios.get(url, {
        params: {
          ...this.getAuthParams(),
          Awb: codigoRastreio
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
        const eventoMatches = data.matchAll(/<Evento>([\s\S]*?)<\/Evento>/g);
        
        for (const match of eventoMatches) {
          const eventoXml = match[1];
          const dataMatch = eventoXml.match(/<Data>([^<]+)<\/Data>/);
          const statusMatch = eventoXml.match(/<Status>([^<]+)<\/Status>/);
          const descricaoMatch = eventoXml.match(/<Descricao>([^<]+)<\/Descricao>/);
          const localMatch = eventoXml.match(/<Local>([^<]+)<\/Local>/);

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
