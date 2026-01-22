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
  private user = process.env.TOTAL_EXPRESS_USER;
  private pass = process.env.TOTAL_EXPRESS_PASS;
  private reid = process.env.TOTAL_EXPRESS_REID;
  private service = process.env.TOTAL_EXPRESS_SERVICE;
  
  private apiBaseUrl = 'https://edi.totalexpress.com.br';
  
  isConfigured(): boolean {
    return !!(this.user && this.pass && this.reid);
  }

  private getAuthParams() {
    return {
      Usuario: this.user,
      Senha: this.pass,
      Reid: this.reid,
      Servico: this.service || 'EXP'
    };
  }

  async cotarFrete(dados: TotalExpressCotacaoRequest): Promise<TotalExpressCotacaoResponse> {
    if (!this.isConfigured()) {
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
      
      console.log('[TotalExpress] Cotando frete:', {
        cepOrigem,
        cepDestino,
        peso: pesoFinal,
        valorDeclarado: dados.valorDeclarado
      });

      const response = await axios.get(url, {
        params: {
          ...this.getAuthParams(),
          CepOrigem: cepOrigem,
          CepDestino: cepDestino,
          Peso: pesoFinal.toFixed(2),
          ValorDeclarado: dados.valorDeclarado.toFixed(2),
          Altura: dados.altura,
          Largura: dados.largura,
          Comprimento: dados.comprimento
        },
        timeout: 15000
      });

      const data = response.data;
      
      if (typeof data === 'string' && data.includes('<')) {
        const valorMatch = data.match(/<Valor>([^<]+)<\/Valor>/);
        const prazoMatch = data.match(/<Prazo>([^<]+)<\/Prazo>/);
        const erroMatch = data.match(/<Erro>([^<]+)<\/Erro>/);
        
        if (erroMatch && erroMatch[1] !== '0' && erroMatch[1] !== '') {
          console.log('[TotalExpress] Erro na cotação:', erroMatch[1]);
          return {
            success: false,
            transportadora_nome: 'Total Express',
            servico: 'Expresso',
            valor_frete: 0,
            prazo_dias: 0,
            error: `Erro Total Express: ${erroMatch[1]}`
          };
        }

        const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
        const prazo = prazoMatch ? parseInt(prazoMatch[1]) : 5;

        console.log('[TotalExpress] Cotação bem-sucedida:', { valor, prazo });

        return {
          success: true,
          transportadora_nome: 'Total Express',
          servico: 'Expresso',
          valor_frete: valor,
          prazo_dias: prazo
        };
      }

      if (data && typeof data === 'object') {
        const valor = data.valor || data.Valor || 0;
        const prazo = data.prazo || data.Prazo || 5;
        
        return {
          success: true,
          transportadora_nome: 'Total Express',
          servico: 'Expresso',
          valor_frete: parseFloat(String(valor).replace(',', '.')),
          prazo_dias: parseInt(String(prazo))
        };
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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Credenciais não configuradas'
      };
    }

    try {
      const url = `${this.apiBaseUrl}/webservice_e_total.php`;

      const cepDestino = dados.destinatarioCep.replace(/\D/g, '');
      
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Encomendas>
  <Remetente>
    <Usuario>${this.user}</Usuario>
    <Senha>${this.pass}</Senha>
    <Reid>${this.reid}</Reid>
    <Servico>${this.service || 'EXP'}</Servico>
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
