import { Router, Request, Response } from 'express';
import { envioService } from '../services/envioService';
import { totalExpressService } from '../services/totalExpressService';
import { walletService } from '../services/walletService';
import { isPagarmeConfigured } from '../middleware/checkBalance';

const router = Router();

const SHIPPING_MARGIN = 0.35;

function getAdminId(req: Request): string {
  const session = (req as any).session;
  if (session?.userId) return session.userId;
  if (session?.tenantId) return session.tenantId;
  return 'system';
}

function getTenantId(req: Request): string {
  const session = (req as any).session;
  return session?.tenantId || session?.userId || 'system';
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m] || m);
}

// ==================== CONTRATOS PENDENTES ====================

router.get('/contratos-pendentes', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const contratos = await envioService.getContratosPendentesEnvio(adminId, tenantId);
    res.json(contratos);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar contratos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRANSPORTADORAS ====================

router.get('/transportadoras', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const transportadoras = await envioService.getTransportadoras(adminId, tenantId);
    res.json(transportadoras);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar transportadoras:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COTACOES ====================

router.get('/cotacoes', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const cotacoes = await envioService.getCotacoes(adminId, tenantId, limit);
    res.json(cotacoes);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar cotações:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cotacoes/calcular', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const { cepOrigem, cepDestino, peso, altura, largura, comprimento, valorDeclarado } = req.body;

    if (!cepOrigem || !cepDestino || !peso) {
      return res.status(400).json({ error: 'CEP de origem, destino e peso são obrigatórios' });
    }

    const cotacoes = await envioService.calcularFrete(adminId, tenantId, {
      cepOrigem: cepOrigem.replace(/\D/g, ''),
      cepDestino: cepDestino.replace(/\D/g, ''),
      peso: parseFloat(peso),
      altura: parseFloat(altura) || 10,
      largura: parseFloat(largura) || 10,
      comprimento: parseFloat(comprimento) || 10,
      valorDeclarado: parseFloat(valorDeclarado) || 0
    });

    res.json(cotacoes);
  } catch (error: any) {
    console.error('[Envio] Erro ao calcular frete:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENVIOS ====================

router.get('/envios', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const envios = await envioService.getEnvios(adminId, tenantId, status, limit);
    res.json(envios);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar envios:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/envios/stats', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const stats = await envioService.getEnvioStats(adminId, tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/envios/destinatarios', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const search = (req.query.search as string) || '';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const destinatarios = await envioService.searchDestinatarios(adminId, tenantId, search, limit);
    res.json(destinatarios);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar destinatários:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/total-express/diagnostico', async (req: Request, res: Response) => {
  try {
    const user = process.env.TOTAL_EXPRESS_USER;
    const pass = process.env.TOTAL_EXPRESS_PASS;
    const reid = process.env.TOTAL_EXPRESS_REID;
    const service = process.env.TOTAL_EXPRESS_SERVICE;
    
    const credentialsStatus = {
      TOTAL_EXPRESS_USER: user ? { configured: true, value: `${user.substring(0, 4)}...${user.slice(-4)}` } : { configured: false },
      TOTAL_EXPRESS_PASS: pass ? { configured: true, length: pass.length } : { configured: false },
      TOTAL_EXPRESS_REID: reid ? { configured: true, value: reid } : { configured: false },
      TOTAL_EXPRESS_SERVICE: service ? { configured: true, value: service } : { configured: false, default: 'EXP' }
    };
    
    const isConfigured = !!(user && pass && reid);
    
    let apiTest = null;
    if (isConfigured) {
      try {
        const testResult = await totalExpressService.cotarFrete({
          cepOrigem: '01310100',
          cepDestino: '22041080',
          peso: 1,
          altura: 10,
          largura: 10,
          comprimento: 10,
          valorDeclarado: 100
        });
        apiTest = {
          success: testResult.success,
          error: testResult.error,
          valor_frete: testResult.valor_frete,
          prazo_dias: testResult.prazo_dias
        };
      } catch (apiError: any) {
        apiTest = { success: false, error: apiError.message };
      }
    }
    
    res.json({
      status: isConfigured ? 'configured' : 'not_configured',
      credentials: credentialsStatus,
      apiTest,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[TotalExpress] Erro no diagnóstico:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/envios/:id', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const envio = await envioService.getEnvioById(req.params.id, adminId, tenantId);
    if (!envio) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }
    res.json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar envio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/envios', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const envio = await envioService.createEnvio({
      admin_id: adminId,
      ...req.body
    }, tenantId);
    res.status(201).json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao criar envio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/envios/:id', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const envio = await envioService.updateEnvio(req.params.id, adminId, tenantId, req.body);
    res.json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao atualizar envio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/envios/:id/status', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const { status, descricao } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    const envio = await envioService.updateEnvioStatus(req.params.id, adminId, tenantId, status, descricao);
    res.json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao atualizar status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RASTREAMENTO ====================

router.get('/rastreamento/:codigo', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const codigo = req.params.codigo.toUpperCase();
    const resultado = await envioService.getRastreamentoByCodigo(codigo, tenantId, adminId);
    
    if (!resultado.envio) {
      return res.status(404).json({ error: 'Código de rastreamento não encontrado' });
    }

    res.json(resultado);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar rastreamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/envios/:id/rastreamento', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const envio = await envioService.getEnvioById(req.params.id, adminId, tenantId);
    if (!envio) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }
    const eventos = await envioService.getRastreamentoEventos(req.params.id, tenantId);
    res.json(eventos);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar eventos de rastreamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/envios/:id/rastreamento', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const { status, descricao, local, cidade, uf } = req.body;
    
    const envio = await envioService.getEnvioById(req.params.id, adminId, tenantId);
    if (!envio) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }

    const evento = await envioService.addRastreamentoEvento({
      envio_id: req.params.id,
      codigo_rastreio: envio.codigo_rastreio,
      data_hora: new Date().toISOString(),
      status,
      descricao,
      local,
      cidade,
      uf,
      origem_api: false
    }, tenantId);

    res.status(201).json(evento);
  } catch (error: any) {
    console.error('[Envio] Erro ao adicionar evento de rastreamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONFIGURACOES ====================

router.get('/config', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const config = await envioService.getConfigFrete(adminId, tenantId);
    res.json(config || {});
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar configuração:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const config = await envioService.saveConfigFrete({
      admin_id: adminId,
      ...req.body
    }, tenantId);
    res.json(config);
  } catch (error: any) {
    console.error('[Envio] Erro ao salvar configuração:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOTAL EXPRESS ====================

router.get('/total-express/status', async (req: Request, res: Response) => {
  try {
    const isConfigured = totalExpressService.isConfigured();
    res.json({ 
      configured: isConfigured,
      transportadora: 'Total Express'
    });
  } catch (error: any) {
    console.error('[TotalExpress] Erro ao verificar status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/total-express/cotar', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const tenantId = session?.tenantId || session?.userId;
    const { cepOrigem, cepDestino, peso, altura, largura, comprimento, valorDeclarado } = req.body;

    if (!cepOrigem || !cepDestino || !peso) {
      return res.status(400).json({ error: 'CEP de origem, destino e peso são obrigatórios' });
    }

    const cotacao = await totalExpressService.cotarFrete({
      cepOrigem: cepOrigem.replace(/\D/g, ''),
      cepDestino: cepDestino.replace(/\D/g, ''),
      peso: parseFloat(peso),
      altura: parseFloat(altura) || 10,
      largura: parseFloat(largura) || 10,
      comprimento: parseFloat(comprimento) || 10,
      valorDeclarado: parseFloat(valorDeclarado) || 0
    }, tenantId);

    res.json(cotacao);
  } catch (error: any) {
    console.error('[TotalExpress] Erro na cotação:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/total-express/registrar', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    
    const {
      envio_id,
      pedido,
      destinatarioNome,
      destinatarioCpfCnpj,
      destinatarioTelefone,
      destinatarioEmail,
      destinatarioCep,
      destinatarioLogradouro,
      destinatarioNumero,
      destinatarioComplemento,
      destinatarioBairro,
      destinatarioCidade,
      destinatarioUf,
      peso,
      altura,
      largura,
      comprimento,
      valorDeclarado,
      descricaoConteudo,
      custoFrete
    } = req.body;

    if (!pedido || !destinatarioNome || !destinatarioCep) {
      return res.status(400).json({ error: 'Pedido, nome e CEP do destinatário são obrigatórios' });
    }

    const carrierCost = parseFloat(custoFrete) || 0;
    const shippingPrice = carrierCost > 0 ? walletService.calculateShippingPrice(carrierCost) : 0;
    const walletSystemEnabled = isPagarmeConfigured();
    
    if (walletSystemEnabled && tenantId && shippingPrice > 0) {
      const balanceCheck = await walletService.checkBalance(tenantId, shippingPrice);
      if (!balanceCheck.sufficient) {
        return res.status(402).json({
          error: 'Saldo insuficiente para registro de envio',
          requiredAmount: shippingPrice,
          carrierCost: carrierCost,
          margin: SHIPPING_MARGIN,
          currentBalance: balanceCheck.currentBalance,
          rechargeRequired: true
        });
      }
    }

    const resultado = await totalExpressService.registrarColeta({
      pedido,
      destinatarioNome,
      destinatarioCpfCnpj,
      destinatarioTelefone,
      destinatarioEmail,
      destinatarioCep: destinatarioCep.replace(/\D/g, ''),
      destinatarioLogradouro,
      destinatarioNumero,
      destinatarioComplemento,
      destinatarioBairro,
      destinatarioCidade,
      destinatarioUf,
      peso: parseFloat(peso) || 0.5,
      altura: parseFloat(altura) || 10,
      largura: parseFloat(largura) || 10,
      comprimento: parseFloat(comprimento) || 10,
      valorDeclarado: parseFloat(valorDeclarado) || 0,
      descricaoConteudo
    });

    if (walletSystemEnabled && resultado.success && tenantId && shippingPrice > 0) {
      const debitResult = await walletService.debitFunds(
        tenantId,
        shippingPrice,
        `Frete - ${pedido} (Custo: R$ ${carrierCost.toFixed(2)} + 35%)`,
        envio_id || resultado.codigoRastreio,
        'ENVIO_FRETE',
        { 
          pedido, 
          transportadora: 'Total Express', 
          codigoRastreio: resultado.codigoRastreio,
          custoTransportadora: carrierCost,
          margem: SHIPPING_MARGIN,
          valorFinal: shippingPrice
        }
      );
      
      if (!debitResult.success) {
        console.warn(`[Envio] Falha ao debitar saldo: ${debitResult.error}`);
      } else {
        console.log(`[Envio] Débito de R$ ${shippingPrice.toFixed(2)} realizado para tenant ${tenantId} (custo: R$ ${carrierCost.toFixed(2)} + 35%)`);
      }
    }

    if (resultado.success && resultado.codigoRastreio) {
      let finalEnvioId = envio_id;
      
      if (envio_id) {
        await envioService.updateEnvio(envio_id, adminId, tenantId, {
          codigo_rastreio: resultado.codigoRastreio,
          transportadora_nome: 'Total Express',
          status: 'aguardando_coleta'
        });
      } else {
        const novoEnvio = await envioService.createEnvio({
          admin_id: adminId,
          contract_id: null,
          transportadora_nome: 'Total Express',
          codigo_rastreio: resultado.codigoRastreio,
          status: 'aguardando_coleta',
          destinatario_nome: destinatarioNome,
          destinatario_cpf_cnpj: destinatarioCpfCnpj || null,
          destinatario_telefone: destinatarioTelefone || null,
          destinatario_email: destinatarioEmail || null,
          destinatario_cep: destinatarioCep?.replace(/\D/g, ''),
          destinatario_logradouro: destinatarioLogradouro || null,
          destinatario_numero: destinatarioNumero || null,
          destinatario_complemento: destinatarioComplemento || null,
          destinatario_bairro: destinatarioBairro || null,
          destinatario_cidade: destinatarioCidade || null,
          destinatario_uf: destinatarioUf || null,
          peso_kg: parseFloat(peso) || 0.5,
          altura_cm: parseFloat(altura) || 10,
          largura_cm: parseFloat(largura) || 10,
          comprimento_cm: parseFloat(comprimento) || 10,
          valor_declarado: parseFloat(valorDeclarado) || 0
        }, tenantId);
        finalEnvioId = novoEnvio?.id;
      }

      if (finalEnvioId) {
        await envioService.addRastreamentoEvento({
          envio_id: finalEnvioId,
          codigo_rastreio: resultado.codigoRastreio,
          data_hora: new Date().toISOString(),
          status: 'Registrado na Total Express',
          descricao: `AWB: ${resultado.awb}`,
          origem_api: true
        }, tenantId);
      }
    }

    res.json(resultado);
  } catch (error: any) {
    console.error('[TotalExpress] Erro ao registrar coleta:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/total-express/rastrear/:codigo', async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const resultado = await totalExpressService.rastrear(codigo);
    res.json(resultado);
  } catch (error: any) {
    console.error('[TotalExpress] Erro no rastreamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ETIQUETAS ====================

router.get('/envios/:id/etiqueta', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    const envio = await envioService.getEnvioById(req.params.id, adminId, tenantId);
    
    if (!envio) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }

    if (!envio.codigo_rastreio) {
      return res.status(400).json({ error: 'Envio não possui código de rastreio' });
    }

    if (totalExpressService.isTestMode() || envio.codigo_rastreio.startsWith('TE')) {
      const htmlLabel = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta - ${escapeHtml(envio.codigo_rastreio)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header .test-badge { background: #ff9800; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; }
    .section { margin-bottom: 15px; }
    .section-title { font-weight: bold; color: #333; margin-bottom: 5px; font-size: 12px; }
    .tracking { text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; padding: 15px; background: #f5f5f5; border: 1px dashed #ccc; }
    .barcode { text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 48px; }
    .info { font-size: 14px; line-height: 1.5; }
    @media print { .test-badge { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <h1>TOTAL EXPRESS</h1>
      <div class="test-badge">MODO TESTE</div>
    </div>
    
    <div class="tracking">${escapeHtml(envio.codigo_rastreio)}</div>
    
    <div class="section">
      <div class="section-title">DESTINATÁRIO:</div>
      <div class="info">
        <strong>${escapeHtml(envio.destinatario_nome || 'N/A')}</strong><br>
        ${escapeHtml(envio.destinatario_logradouro || '')} ${escapeHtml(envio.destinatario_numero || '')}<br>
        ${envio.destinatario_complemento ? escapeHtml(envio.destinatario_complemento) + '<br>' : ''}
        ${escapeHtml(envio.destinatario_bairro || '')}<br>
        ${escapeHtml(envio.destinatario_cidade || '')} - ${escapeHtml(envio.destinatario_uf || '')}<br>
        CEP: ${escapeHtml(envio.destinatario_cep || '')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">DADOS DO PACOTE:</div>
      <div class="info">
        Peso: ${envio.peso_kg || 0} kg<br>
        Dimensões: ${envio.altura_cm || 0} x ${envio.largura_cm || 0} x ${envio.comprimento_cm || 0} cm<br>
        Valor declarado: R$ ${(envio.valor_declarado || 0).toFixed(2)}
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
      Esta é uma etiqueta de TESTE.<br>
      Para produção, configure TOTAL_EXPRESS_TEST_MODE=false
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlLabel);
    }

    const etiquetaResult = await totalExpressService.obterEtiqueta(envio.codigo_rastreio);
    
    if (!etiquetaResult.success) {
      return res.status(500).json({ error: etiquetaResult.error || 'Erro ao obter etiqueta' });
    }

    if (etiquetaResult.pdfBase64) {
      const pdfBuffer = Buffer.from(etiquetaResult.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="etiqueta-${envio.codigo_rastreio}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (etiquetaResult.pdfUrl) {
      return res.redirect(etiquetaResult.pdfUrl);
    }

    return res.status(500).json({ error: 'Etiqueta não disponível' });

  } catch (error: any) {
    console.error('[Envio] Erro ao obter etiqueta:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/total-express/etiqueta/:awb', async (req: Request, res: Response) => {
  try {
    const { awb } = req.params;
    const adminId = getAdminId(req);
    const tenantId = getTenantId(req);
    
    const resultado = await envioService.getRastreamentoByCodigo(awb, tenantId, adminId);
    if (!resultado.envio) {
      return res.status(404).json({ error: 'Envio não encontrado ou não autorizado' });
    }
    
    if (totalExpressService.isTestMode() || awb.startsWith('TE')) {
      const envio = resultado.envio;
      const htmlLabel = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta - ${escapeHtml(awb)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header .test-badge { background: #ff9800; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; }
    .section { margin-bottom: 15px; }
    .section-title { font-weight: bold; color: #333; margin-bottom: 5px; font-size: 12px; }
    .tracking { text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; padding: 15px; background: #f5f5f5; border: 1px dashed #ccc; }
    .info { font-size: 14px; line-height: 1.5; }
    @media print { .test-badge { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <h1>TOTAL EXPRESS</h1>
      <div class="test-badge">MODO TESTE</div>
    </div>
    <div class="tracking">${escapeHtml(awb)}</div>
    <div class="section">
      <div class="section-title">DESTINATÁRIO:</div>
      <div class="info">
        ${envio ? `
        <strong>${escapeHtml(envio.destinatario_nome || 'N/A')}</strong><br>
        ${escapeHtml(envio.destinatario_logradouro || '')} ${escapeHtml(envio.destinatario_numero || '')}<br>
        ${envio.destinatario_complemento ? escapeHtml(envio.destinatario_complemento) + '<br>' : ''}
        ${escapeHtml(envio.destinatario_bairro || '')}<br>
        ${escapeHtml(envio.destinatario_cidade || '')} - ${escapeHtml(envio.destinatario_uf || '')}<br>
        CEP: ${escapeHtml(envio.destinatario_cep || '')}
        ` : 'Dados não disponíveis'}
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
      Esta é uma etiqueta de TESTE.
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlLabel);
    }

    const etiquetaResult = await totalExpressService.obterEtiqueta(awb);
    
    if (!etiquetaResult.success) {
      return res.status(500).json({ error: etiquetaResult.error || 'Erro ao obter etiqueta' });
    }

    if (etiquetaResult.pdfBase64) {
      const pdfBuffer = Buffer.from(etiquetaResult.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="etiqueta-${awb}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (etiquetaResult.pdfUrl) {
      return res.redirect(etiquetaResult.pdfUrl);
    }

    return res.status(500).json({ error: 'Etiqueta não disponível' });
  } catch (error: any) {
    console.error('[TotalExpress] Erro ao obter etiqueta:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/total-express/test-mode', async (req: Request, res: Response) => {
  res.json({
    testMode: totalExpressService.isTestMode(),
    configured: totalExpressService.isConfigured(),
    message: totalExpressService.isTestMode() 
      ? 'Modo de teste ativo - envios serão simulados sem custos' 
      : 'Modo produção - envios serão registrados na TotalExpress'
  });
});

router.post('/webhooks/total-express', async (req: Request, res: Response) => {
  try {
    const webhookSecret = req.headers['x-totalexpress-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.TOTAL_EXPRESS_WEBHOOK_SECRET || process.env.TOTAL_EXPRESS_PASS;
    
    if (!expectedSecret) {
      console.log('[TotalExpress Webhook] Secret não configurado - webhook desabilitado');
      return res.status(503).json({ error: 'Webhook não configurado' });
    }
    
    const receivedSecret = typeof webhookSecret === 'string' 
      ? webhookSecret.replace('Bearer ', '') 
      : null;
      
    if (!receivedSecret || receivedSecret !== expectedSecret) {
      console.warn('[TotalExpress Webhook] Tentativa não autorizada');
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { awb, status, dataEvento, descricao, local, tenant_id } = req.body;
    
    console.log('[TotalExpress Webhook] Recebido:', { awb, status });

    if (!awb) {
      return res.status(400).json({ error: 'AWB é obrigatório' });
    }

    const validStatuses = ['COLETADO', 'EM_TRANSITO', 'SAIU_ENTREGA', 'ENTREGUE', 'DEVOLVIDO', 'PENDENTE', 'CANCELADO'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      console.warn('[TotalExpress Webhook] Status inválido:', status);
      return res.status(400).json({ error: 'Status inválido' });
    }

    if (!tenant_id) {
      console.warn('[TotalExpress Webhook] tenant_id não fornecido no payload do webhook');
      return res.status(400).json({ error: 'tenant_id é obrigatório no payload do webhook' });
    }

    const resultado = await envioService.getRastreamentoByCodigo(awb, tenant_id);
    
    if (resultado.envio) {
      await envioService.addRastreamentoEvento({
        envio_id: resultado.envio.id,
        codigo_rastreio: awb,
        data_hora: dataEvento || new Date().toISOString(),
        status: status || 'Atualização',
        descricao: descricao || '',
        local: local || '',
        origem_api: true
      }, tenant_id);

      const statusMap: Record<string, string> = {
        'COLETADO': 'coletado',
        'EM_TRANSITO': 'em_transito',
        'SAIU_ENTREGA': 'saiu_entrega',
        'ENTREGUE': 'entregue',
        'DEVOLVIDO': 'devolvido'
      };

      if (statusMap[status?.toUpperCase()]) {
        await envioService.updateEnvio(resultado.envio.id, resultado.envio.admin_id, tenant_id, {
          status: statusMap[status.toUpperCase()] as any
        });
      }

      console.log('[TotalExpress Webhook] Evento registrado para envio:', resultado.envio.id);
    }

    res.send('OK');
  } catch (error: any) {
    console.error('[TotalExpress Webhook] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
