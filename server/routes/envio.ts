import { Router, Request, Response } from 'express';
import { envioService } from '../services/envioService';
import { totalExpressService } from '../services/totalExpressService';
import { walletService } from '../services/walletService';
import { isPagarmeConfigured } from '../middleware/checkBalance';

const router = Router();

// Shipping uses dynamic pricing: carrier cost + 35% margin
// No fixed price - calculated per shipment based on TotalExpress quote
const SHIPPING_MARGIN = 0.35; // 35% margin on carrier cost

function getAdminId(req: Request): string {
  const session = (req as any).session;
  if (session?.userId) return session.userId;
  if (session?.tenantId) return session.tenantId;
  return 'system';
}

// ==================== CONTRATOS PENDENTES ====================

router.get('/contratos-pendentes', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const contratos = await envioService.getContratosPendentesEnvio(adminId);
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
    const transportadoras = await envioService.getTransportadoras(adminId);
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
    const limit = parseInt(req.query.limit as string) || 50;
    const cotacoes = await envioService.getCotacoes(adminId, limit);
    res.json(cotacoes);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar cotações:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cotacoes/calcular', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { cepOrigem, cepDestino, peso, altura, largura, comprimento, valorDeclarado } = req.body;

    if (!cepOrigem || !cepDestino || !peso) {
      return res.status(400).json({ error: 'CEP de origem, destino e peso são obrigatórios' });
    }

    const cotacoes = await envioService.calcularFrete(adminId, {
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
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const envios = await envioService.getEnvios(adminId, status, limit);
    res.json(envios);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar envios:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/envios/stats', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const stats = await envioService.getEnvioStats(adminId);
    res.json(stats);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic endpoint to test TotalExpress credentials
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
    
    // Test a simple cotação to see if API responds
    let apiTest = null;
    if (isConfigured) {
      try {
        const testResult = await totalExpressService.cotarFrete({
          cepOrigem: '01310100', // CEP São Paulo
          cepDestino: '22041080', // CEP Rio de Janeiro
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
    const envio = await envioService.getEnvioById(req.params.id, adminId);
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
    const envio = await envioService.createEnvio({
      admin_id: adminId,
      ...req.body
    });
    res.status(201).json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao criar envio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/envios/:id', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const envio = await envioService.updateEnvio(req.params.id, adminId, req.body);
    res.json(envio);
  } catch (error: any) {
    console.error('[Envio] Erro ao atualizar envio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/envios/:id/status', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { status, descricao } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    const envio = await envioService.updateEnvioStatus(req.params.id, adminId, status, descricao);
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
    const codigo = req.params.codigo.toUpperCase();
    const resultado = await envioService.getRastreamentoByCodigo(codigo, adminId);
    
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
    const envio = await envioService.getEnvioById(req.params.id, adminId);
    if (!envio) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }
    const eventos = await envioService.getRastreamentoEventos(req.params.id);
    res.json(eventos);
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar eventos de rastreamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/envios/:id/rastreamento', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { status, descricao, local, cidade, uf } = req.body;
    
    const envio = await envioService.getEnvioById(req.params.id, adminId);
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
    });

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
    const config = await envioService.getConfigFrete(adminId);
    res.json(config || {});
  } catch (error: any) {
    console.error('[Envio] Erro ao buscar configuração:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const config = await envioService.saveConfigFrete({
      admin_id: adminId,
      ...req.body
    });
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
    });

    res.json(cotacao);
  } catch (error: any) {
    console.error('[TotalExpress] Erro na cotação:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/total-express/registrar', async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const session = (req as any).session;
    const tenantId = session?.tenantId || session?.userId;
    
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
      custoFrete // Cost from carrier quote (passed from frontend)
    } = req.body;

    if (!pedido || !destinatarioNome || !destinatarioCep) {
      return res.status(400).json({ error: 'Pedido, nome e CEP do destinatário são obrigatórios' });
    }

    // Calculate shipping price with 35% margin
    const carrierCost = parseFloat(custoFrete) || 0;
    const shippingPrice = carrierCost > 0 ? walletService.calculateShippingPrice(carrierCost) : 0;
    const walletSystemEnabled = isPagarmeConfigured();
    
    // WALLET: Verificar saldo antes de registrar envio (apenas se Pagar.me configurado)
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

    // WALLET: Debitar saldo APÓS registro bem-sucedido (apenas se Pagar.me configurado)
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

    if (resultado.success && resultado.codigoRastreio && envio_id) {
      await envioService.updateEnvio(envio_id, adminId, {
        codigo_rastreio: resultado.codigoRastreio,
        transportadora_nome: 'Total Express',
        status: 'aguardando_coleta'
      });

      await envioService.addRastreamentoEvento({
        envio_id: envio_id,
        codigo_rastreio: resultado.codigoRastreio,
        data_hora: new Date().toISOString(),
        status: 'Registrado na Total Express',
        descricao: `AWB: ${resultado.awb}`,
        origem_api: true
      });
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

// Webhook para receber atualizações de status da Total Express
// Autenticado via secret header para segurança
router.post('/webhooks/total-express', async (req: Request, res: Response) => {
  try {
    // Validar secret para autenticação do webhook
    const webhookSecret = req.headers['x-totalexpress-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.TOTAL_EXPRESS_WEBHOOK_SECRET || process.env.TOTAL_EXPRESS_PASS;
    
    if (!expectedSecret) {
      console.log('[TotalExpress Webhook] Secret não configurado - webhook desabilitado');
      return res.status(503).json({ error: 'Webhook não configurado' });
    }
    
    // Aceitar tanto header customizado quanto Bearer token
    const receivedSecret = typeof webhookSecret === 'string' 
      ? webhookSecret.replace('Bearer ', '') 
      : null;
      
    if (!receivedSecret || receivedSecret !== expectedSecret) {
      console.warn('[TotalExpress Webhook] Tentativa não autorizada');
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { awb, status, dataEvento, descricao, local } = req.body;
    
    console.log('[TotalExpress Webhook] Recebido:', { awb, status });

    if (!awb) {
      return res.status(400).json({ error: 'AWB é obrigatório' });
    }

    // Validar status permitidos
    const validStatuses = ['COLETADO', 'EM_TRANSITO', 'SAIU_ENTREGA', 'ENTREGUE', 'DEVOLVIDO', 'PENDENTE', 'CANCELADO'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      console.warn('[TotalExpress Webhook] Status inválido:', status);
      return res.status(400).json({ error: 'Status inválido' });
    }

    const resultado = await envioService.getRastreamentoByCodigo(awb);
    
    if (resultado.envio) {
      await envioService.addRastreamentoEvento({
        envio_id: resultado.envio.id,
        codigo_rastreio: awb,
        data_hora: dataEvento || new Date().toISOString(),
        status: status || 'Atualização',
        descricao: descricao || '',
        local: local || '',
        origem_api: true
      });

      const statusMap: Record<string, string> = {
        'COLETADO': 'coletado',
        'EM_TRANSITO': 'em_transito',
        'SAIU_ENTREGA': 'saiu_entrega',
        'ENTREGUE': 'entregue',
        'DEVOLVIDO': 'devolvido'
      };

      if (statusMap[status?.toUpperCase()]) {
        await envioService.updateEnvio(resultado.envio.id, resultado.envio.admin_id, {
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
