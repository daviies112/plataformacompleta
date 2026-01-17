import { Router, Request, Response } from 'express';
import { envioService } from '../services/envioService';

const router = Router();

function getAdminId(req: Request): string {
  const session = (req as any).session;
  if (session?.userId) return session.userId;
  if (session?.tenantId) return session.tenantId;
  return 'system';
}

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

export default router;
