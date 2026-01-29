import { Router, Request, Response } from 'express';
import { getClientSupabaseClientStrict } from '../lib/multiTenantSupabase';
import { requireTenant } from '../middleware/requireTenant';

const router = Router();

function calcularPeriodo(horario: string): string {
  const [hours] = horario.split(':').map(Number);
  if (hours >= 6 && hours < 12) return 'manhã';
  if (hours >= 12 && hours < 18) return 'tarde';
  return 'noite';
}

router.get('/horarios', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const supabase = await getClientSupabaseClientStrict(tenantId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const { data, error } = await supabase
      .from('horarios_disponiveis')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('dia_semana', { ascending: true, nullsFirst: true })
      .order('horario', { ascending: true });

    if (error) {
      console.error('[Horarios] Erro ao listar:', error);
      return res.status(500).json({ error: 'Erro ao listar horários', details: error.message });
    }

    return res.json(data || []);
  } catch (error: any) {
    console.error('[Horarios] Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/horarios', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const supabase = await getClientSupabaseClientStrict(tenantId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const { dias_semana, horario, tipo_reuniao } = req.body;

    // Validar horario
    if (!horario || !/^\d{2}:\d{2}(:\d{2})?$/.test(horario)) {
      return res.status(400).json({ error: 'Horário inválido. Use formato HH:MM' });
    }

    // Validar tipo_reuniao obrigatório
    if (!tipo_reuniao) {
      return res.status(400).json({ error: 'Tipo de reunião é obrigatório' });
    }

    // Validar tipo_reuniao
    const tiposValidos = ['online', 'presencial', 'ambos'];
    if (!tiposValidos.includes(tipo_reuniao)) {
      return res.status(400).json({ error: 'Tipo de reunião inválido' });
    }

    // Validar que dias_semana não é array vazio
    if (Array.isArray(dias_semana) && dias_semana.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um dia da semana' });
    }

    // Validar dias_semana
    if (dias_semana !== null && dias_semana !== undefined) {
      const diasArray = Array.isArray(dias_semana) ? dias_semana : [dias_semana];
      for (const dia of diasArray) {
        if (typeof dia !== 'number' || dia < 0 || dia > 6) {
          return res.status(400).json({ error: 'Dia da semana inválido (0-6)' });
        }
      }
    }

    const periodo = calcularPeriodo(horario);
    const tipo = tipo_reuniao;
    const now = new Date().toISOString();

    // Preparar lista de dias para verificar duplicatas
    let diasParaVerificar: (number | null)[] = [];
    if (dias_semana === null || dias_semana === undefined) {
      diasParaVerificar = [null];
    } else if (Array.isArray(dias_semana)) {
      diasParaVerificar = dias_semana;
    } else {
      diasParaVerificar = [dias_semana];
    }

    // Verificar duplicatas antes de inserir
    for (const dia of diasParaVerificar) {
      let query = supabase
        .from('horarios_disponiveis')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('horario', horario);
      
      if (dia === null) {
        query = query.is('dia_semana', null);
      } else {
        query = query.eq('dia_semana', dia);
      }

      const { data: existente } = await query;
      if (existente && existente.length > 0) {
        const diaNome = dia === null ? 'Todos os dias' : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dia];
        return res.status(400).json({ 
          error: `Já existe horário ${horario} cadastrado para ${diaNome}` 
        });
      }
    }

    const registros: any[] = [];

    for (const dia of diasParaVerificar) {
      registros.push({
        tenant_id: tenantId,
        dia_semana: dia,
        horario,
        periodo,
        tipo_reuniao: tipo,
        ativo: true,
        created_at: now,
        updated_at: now
      });
    }

    const { data, error } = await supabase
      .from('horarios_disponiveis')
      .insert(registros)
      .select();

    if (error) {
      console.error('[Horarios] Erro ao criar:', error);
      return res.status(500).json({ error: 'Erro ao criar horários', details: error.message });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error('[Horarios] Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/horarios/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const supabase = await getClientSupabaseClientStrict(tenantId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const { id } = req.params;
    const { dia_semana, horario, tipo_reuniao, ativo } = req.body;

    // Validar horario se fornecido
    if (horario !== undefined && (!horario || !/^\d{2}:\d{2}(:\d{2})?$/.test(horario))) {
      return res.status(400).json({ error: 'Horário inválido. Use formato HH:MM' });
    }

    // Validar tipo_reuniao se fornecido
    const tiposValidos = ['online', 'presencial', 'ambos'];
    if (tipo_reuniao !== undefined && tipo_reuniao && !tiposValidos.includes(tipo_reuniao)) {
      return res.status(400).json({ error: 'Tipo de reunião inválido' });
    }

    // Validar dia_semana se fornecido
    if (dia_semana !== undefined && dia_semana !== null) {
      if (typeof dia_semana !== 'number' || dia_semana < 0 || dia_semana > 6) {
        return res.status(400).json({ error: 'Dia da semana inválido (0-6)' });
      }
    }

    // Se dia_semana ou horario mudou, verificar duplicatas
    if (dia_semana !== undefined || horario !== undefined) {
      // Buscar registro atual para comparar
      const { data: atual } = await supabase
        .from('horarios_disponiveis')
        .select('dia_semana, horario')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (atual) {
        const novoDia = dia_semana !== undefined ? dia_semana : atual.dia_semana;
        const novoHorario = horario !== undefined ? horario : atual.horario;

        // Verificar se existe outro registro com mesma combinação
        let query = supabase
          .from('horarios_disponiveis')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('horario', novoHorario)
          .neq('id', id);

        if (novoDia === null) {
          query = query.is('dia_semana', null);
        } else {
          query = query.eq('dia_semana', novoDia);
        }

        const { data: existente } = await query;
        if (existente && existente.length > 0) {
          const diaNome = novoDia === null ? 'Todos os dias' : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][novoDia];
          return res.status(400).json({ 
            error: `Já existe horário ${novoHorario} cadastrado para ${diaNome}` 
          });
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (dia_semana !== undefined) updateData.dia_semana = dia_semana;
    if (horario !== undefined) {
      updateData.horario = horario;
      updateData.periodo = calcularPeriodo(horario);
    }
    if (tipo_reuniao !== undefined) updateData.tipo_reuniao = tipo_reuniao;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('horarios_disponiveis')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[Horarios] Erro ao atualizar:', error);
      return res.status(500).json({ error: 'Erro ao atualizar horário', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Horário não encontrado' });
    }

    return res.json(data);
  } catch (error: any) {
    console.error('[Horarios] Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/horarios/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const supabase = await getClientSupabaseClientStrict(tenantId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('horarios_disponiveis')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[Horarios] Erro ao excluir:', error);
      return res.status(500).json({ error: 'Erro ao excluir horário', details: error.message });
    }

    return res.status(204).send();
  } catch (error: any) {
    console.error('[Horarios] Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/horarios/:id/toggle', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const supabase = await getClientSupabaseClientStrict(tenantId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const { id } = req.params;
    const { ativo } = req.body;

    const { data, error } = await supabase
      .from('horarios_disponiveis')
      .update({ 
        ativo: ativo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[Horarios] Erro ao toggle:', error);
      return res.status(500).json({ error: 'Erro ao alternar status', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Horário não encontrado' });
    }

    return res.json(data);
  } catch (error: any) {
    console.error('[Horarios] Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export function registerHorariosRoutes(app: any) {
  app.use('/api', requireTenant, router);
  console.log('[Horarios] Rotas registradas');
}

export default router;
