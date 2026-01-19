import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDynamicSupabaseClient } from '../lib/multiTenantSupabase';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';

const router = express.Router();

// GET /api/reseller/products - Catalogo de produtos para revendedora
router.get('/products', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.session?.userRole !== 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a revendedoras' });
    }

    const tenantId = req.user?.tenantId || req.session?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Sessao invalida' });
    }

    const client = await getDynamicSupabaseClient(tenantId);
    
    if (!client) {
      return res.status(500).json({
        error: 'Banco de dados nao configurado para este tenant',
        tenantId
      });
    }

    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }

    res.json({
      success: true,
      products: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('Erro no endpoint products:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/reseller/my-sales - Vendas da revendedora
router.get('/my-sales', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.session?.userRole !== 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a revendedoras' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const revendedoraId = req.user?.userId || req.session?.userId;
    const adminId = req.user?.tenantId || req.session?.tenantId;

    // 🔐 VALIDAÇÃO: Garantir que temos IDs válidos para isolamento
    if (!revendedoraId || !adminId) {
      console.error('[NEXUS] Sessão inválida - revendedoraId ou adminId ausente');
      return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
    }

    // 🔐 ISOLAMENTO: Filtra por revendedora_id E admin_id para garantir que só veja vendas do seu tenant
    const { data, error } = await supabaseOwner
      .from('vendas_revendedora')
      .select('*')
      .eq('revendedora_id', revendedoraId)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return res.status(500).json({ error: 'Erro ao buscar vendas' });
    }

    const vendas = data || [];
    const totalComissao = vendas.reduce((sum, v) => sum + Number(v.valor_comissao || 0), 0);
    const totalVendas = vendas.reduce((sum, v) => sum + Number(v.valor_total || 0), 0);

    res.json({
      success: true,
      vendas,
      resumo: {
        totalTransacoes: vendas.length,
        totalVendas,
        totalComissao,
        pendente: vendas.filter(v => v.status_pagamento === 'pendente').length
      }
    });
    
  } catch (error) {
    console.error('Erro no endpoint my-sales:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/reseller/dashboard-stats - Estatisticas do dashboard da revendedora
router.get('/dashboard-stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.session?.userRole !== 'reseller') {
      return res.status(403).json({ error: 'Acesso restrito a revendedoras' });
    }

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const revendedoraId = req.user?.userId || req.session?.userId;
    const adminId = req.user?.tenantId || req.session?.tenantId;

    // 🔐 VALIDAÇÃO: Garantir que temos IDs válidos para isolamento
    if (!revendedoraId || !adminId) {
      console.error('[NEXUS] Sessão inválida - revendedoraId ou adminId ausente');
      return res.status(401).json({ error: 'Sessão inválida - faça login novamente' });
    }

    // 🔐 ISOLAMENTO: Filtra por revendedora_id E admin_id para garantir isolamento de dados
    const { data: vendas } = await supabaseOwner
      .from('vendas_revendedora')
      .select('*')
      .eq('revendedora_id', revendedoraId)
      .eq('admin_id', adminId);

    const vendasList = vendas || [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Calcular metricas
    const vendasHoje = vendasList.filter(v => new Date(v.created_at) >= hoje);
    const totalComissaoHoje = vendasHoje.reduce((sum, v) => sum + Number(v.valor_comissao || 0), 0);
    const totalVendasHoje = vendasHoje.reduce((sum, v) => sum + Number(v.valor_total || 0), 0);

    const totalComissao = vendasList.reduce((sum, v) => sum + Number(v.valor_comissao || 0), 0);
    const totalVendas = vendasList.reduce((sum, v) => sum + Number(v.valor_total || 0), 0);

    const pendentes = vendasList.filter(v => v.status_pagamento === 'pendente');
    const comissaoPendente = pendentes.reduce((sum, v) => sum + Number(v.valor_comissao || 0), 0);

    res.json({
      success: true,
      stats: {
        hoje: {
          vendas: vendasHoje.length,
          valorTotal: totalVendasHoje,
          comissao: totalComissaoHoje
        },
        total: {
          vendas: vendasList.length,
          valorTotal: totalVendas,
          comissao: totalComissao
        },
        pendente: {
          vendas: pendentes.length,
          comissao: comissaoPendente
        }
      }
    });

  } catch (error) {
    console.error('Erro no endpoint dashboard-stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/reseller/create-sale - Criar venda (usado pelo checkout)
// 🔐 SEGURANÇA: O admin_id é derivado da revendedora, NÃO aceito do body para evitar injeção
router.post('/create-sale', async (req, res) => {
  try {
    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      return res.status(503).json({ error: 'Sistema nao configurado' });
    }

    const { 
      revendedoraId, 
      produtoId,
      produtoNome,
      valorTotal,
      valorComissao,
      valorEmpresa,
      clienteNome,
      clienteTelefone,
      stripePaymentId
    } = req.body;

    if (!revendedoraId || !valorTotal) {
      return res.status(400).json({ error: 'Dados incompletos: revendedoraId e valorTotal são obrigatórios' });
    }

    // 🔐 SEGURANÇA: Buscar admin_id da revendedora para garantir integridade
    const { data: revendedora, error: lookupError } = await supabaseOwner
      .from('revendedoras')
      .select('admin_id, comissao_padrao')
      .eq('id', revendedoraId)
      .single();

    if (lookupError || !revendedora) {
      console.error('[NEXUS] Revendedora não encontrada:', revendedoraId);
      return res.status(404).json({ error: 'Revendedora não encontrada' });
    }

    const adminIdVerificado = revendedora.admin_id;
    
    // Calcular comissão se não foi informada
    const comissaoCalculada = valorComissao ?? (valorTotal * (Number(revendedora.comissao_padrao) / 100));
    const empresaCalculada = valorEmpresa ?? (valorTotal - comissaoCalculada);

    const { data, error } = await supabaseOwner
      .from('vendas_revendedora')
      .insert({
        revendedora_id: revendedoraId,
        admin_id: adminIdVerificado, // 🔐 Derivado da revendedora, não do body
        produto_id: produtoId || null,
        produto_nome: produtoNome || null,
        valor_total: valorTotal,
        valor_comissao: comissaoCalculada,
        valor_empresa: empresaCalculada,
        status_pagamento: 'pendente',
        stripe_payment_id: stripePaymentId || null,
        cliente_nome: clienteNome || null,
        cliente_telefone: clienteTelefone || null
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar venda:', error);
      return res.status(500).json({ error: 'Erro ao registrar venda' });
    }

    console.log(`✅ [NEXUS] Venda criada: revendedora=${revendedoraId}, admin=${adminIdVerificado}, valor=${valorTotal}`);

    res.json({
      success: true,
      venda: data
    });

  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
