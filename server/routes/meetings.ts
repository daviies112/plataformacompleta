import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, meetingTenants, gravacoes, transcricoes, hms100msConfig } from '../../shared/db-schema';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '../lib/credentialsManager';
import {
  criarSala,
  gerarTokenParticipante,
  desativarSala,
  iniciarGravacao,
  pararGravacao,
} from '../services/meetings/hms100ms';
import {
  notificarReuniaoIniciada,
  notificarReuniaoFinalizada,
  notificarTranscricaoIniciada,
  notificarTranscricaoFinalizada,
} from '../services/meetings/n8n';
import { requireAuth, attachUserData } from '../middleware/multiTenantAuth';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    nome?: string;
    tenantId?: string;
  };
}

// Helper para carregar credenciais HMS100ms do banco de dados
async function getHMS100msCredentials(tenantId: string) {
  // Tenta primeiro na tabela hms_100ms_config (novo lugar)
  const [config] = await db
    .select()
    .from(hms100msConfig)
    .where(eq(hms100msConfig.tenantId, tenantId));

  if (config) {
    return {
      appAccessKey: decrypt(config.appAccessKey),
      appSecret: decrypt(config.appSecret),
      templateId: config.templateId,
    };
  }

  // Se não achar, tenta em meeting_tenants.configuracoes (lugar antigo JSONB)
  const [tenant] = await db
    .select()
    .from(meetingTenants)
    .where(eq(meetingTenants.id, tenantId));

  if (tenant && tenant.configuracoes) {
    const hmsConfig = (tenant.configuracoes as any)?.hms_100ms;
    if (hmsConfig && hmsConfig.appAccessKey && hmsConfig.appSecret) {
      return {
        appAccessKey: hmsConfig.appAccessKey,
        appSecret: hmsConfig.appSecret,
        templateId: hmsConfig.templateId,
      };
    }
  }

  return null;
}

router.use((req: Request, res: Response, next) => {
  attachUserData(req, res, next);
});

router.use((req: Request, res: Response, next) => {
  if (!req.session?.userId) {
    if (process.env.NODE_ENV === 'development') {
      // Use a fixed UUID for development tenant
      const DEV_TENANT_ID = 'f5d8c8d9-7c9e-4b8a-9c7d-4e3b8a9c7d4e';
      (req as any).user = { 
        id: DEV_TENANT_ID, 
        tenantId: DEV_TENANT_ID,
        email: 'dev@example.com',
        nome: 'Dev User'
      };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }
  (req as any).user = {
    id: req.session.userId,
    email: req.session.userEmail,
    nome: req.session.userName,
    tenantId: req.session.tenantId || 'f5d8c8d9-7c9e-4b8a-9c7d-4e3b8a9c7d4e'
  };
  next();
});

router.post('/instantanea', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { titulo = 'Reunião Instantânea' } = req.body;

    const hmsCredentials = await getHMS100msCredentials(tenantId);
    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    const roomName = `instant-${tenantId}-${Date.now()}`;
    const room = await criarSala(
      roomName,
      hmsCredentials.templateId,
      hmsCredentials.appAccessKey,
      hmsCredentials.appSecret
    );

    const publicUrl = process.env.PUBLIC_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const linkReuniao = `${publicUrl}/reuniao/${room.id}`;

    const meetingData = {
      tenantId,
      titulo,
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 60 * 60000), // +1h
      status: 'em_andamento',
      roomId100ms: room.id,
      linkReuniao,
      metadata: {
        isInstant: true,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.email || 'unknown',
      },
    };

    const [newMeeting] = await db
      .insert(reunioes)
      .values({
        ...meetingData,
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 60 * 60000),
      })
      .returning();

    // 🚀 SINCRONIZAÇÃO SUPABASE
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        await supabase.from('reunioes').insert({
          id: newMeeting.id,
          tenant_id: tenantId,
          titulo: newMeeting.titulo,
          data_inicio: newMeeting.dataInicio.toISOString(),
          data_fim: newMeeting.dataFim.toISOString(),
          status: newMeeting.status,
          room_id_100ms: newMeeting.roomId100ms,
          link_reuniao: newMeeting.linkReuniao,
          metadata: newMeeting.metadata
        });
      }
    } catch (err) {
      console.error('[MEETINGS] Erro ao sincronizar reunião instantânea no Supabase:', err);
    }

    return res.status(201).json({ success: true, data: newMeeting });
  } catch (error) {
    console.error('[MEETINGS] Erro ao criar reunião instantânea:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar reunião instantânea',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/recording/start', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { roomId } = req.body;

    const hmsCredentials = await getHMS100msCredentials(tenantId);
    if (!hmsCredentials) {
      return res.status(400).json({ success: false, message: 'Credenciais 100ms não configuradas' });
    }

    const [reuniao] = await db.select().from(reunioes).where(eq(reunioes.roomId100ms, roomId));
    if (!reuniao) return res.status(404).json({ success: false, message: 'Reunião não encontrada' });

    const token = gerarTokenParticipante(
      roomId, 
      "beam-" + Date.now(), 
      "__internal_recorder", 
      hmsCredentials.appAccessKey, 
      hmsCredentials.appSecret
    );
    
    const publicUrl = process.env.PUBLIC_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const recordingUrl = `${publicUrl}/reuniao/${roomId}?token=${token}&auto_join=true&skip_preview=true&skip_device_selection=true`;
    
    const result = await iniciarGravacao(roomId, hmsCredentials.appAccessKey, hmsCredentials.appSecret, recordingUrl);
    
    const [gravacao] = await db.insert(gravacoes).values({
      reuniaoId: reuniao.id,
      tenantId,
      roomId100ms: roomId,
      recordingId100ms: result.id,
      status: "recording",
    }).returning();

    // Sincronizar Supabase
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        await supabase.from('gravacoes').insert({
          id: gravacao.id,
          reuniao_id: gravacao.reuniaoId,
          tenant_id: tenantId,
          room_id_100ms: roomId,
          recording_id_100ms: result.id,
          status: "recording"
        });
      }
    } catch (err) {}

    res.json({ success: true, recordingId: result.id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Alias for documentation compatibility
router.post('/100ms/recording/start', (req, res) => {
  req.url = '/recording/start';
  router.handle(req, res, () => {});
});

router.post('/recording/stop', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { roomId } = req.body;

    const hmsCredentials = await getHMS100msCredentials(tenantId);
    if (!hmsCredentials) return res.status(400).json({ success: false, message: 'Credenciais 100ms não configuradas' });

    await pararGravacao(roomId, hmsCredentials.appAccessKey, hmsCredentials.appSecret);
    
    await db.update(gravacoes)
      .set({ status: "processing", stoppedAt: new Date() })
      .where(and(eq(gravacoes.roomId100ms, roomId), eq(gravacoes.status, "recording")));

    // Sincronizar Supabase
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        await supabase.from('gravacoes')
          .update({ status: "processing", stopped_at: new Date().toISOString() })
          .eq('room_id_100ms', roomId)
          .eq('status', 'recording');
      }
    } catch (err) {}

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Alias for documentation compatibility
router.post('/100ms/recording/stop', (req, res) => {
  req.url = '/recording/stop';
  router.handle(req, res, () => {});
});

router.post('/webhook/100ms', async (req: Request, res: Response) => {
  const event = req.body;
  
  if (event.type === "beam.recording.success") {
    const { id, asset } = event.data;
    
    await db.update(gravacoes)
      .set({ 
        status: "completed", 
        fileUrl: asset?.location,
        fileSize: asset?.size,
        duration: asset?.duration,
        updatedAt: new Date()
      })
      .where(eq(gravacoes.recordingId100ms, id));

    // Sincronizar Supabase
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const [gravacao] = await db.select().from(gravacoes).where(eq(gravacoes.recordingId100ms, id));
      if (gravacao) {
        const supabase = await getDynamicSupabaseClient(gravacao.tenantId);
        if (supabase) {
          await supabase.from('gravacoes')
            .update({ 
              status: "completed", 
              file_url: asset?.location,
              file_size: asset?.size,
              duration: asset?.duration,
              updated_at: new Date().toISOString()
            })
            .eq('recording_id_100ms', id);
        }
      }
    } catch (err) {}
  }
  res.json({ success: true });
});

router.get('/recording/list', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const recordings = await db.select({
      id: gravacoes.id,
      reuniaoId: gravacoes.reuniaoId,
      status: gravacoes.status,
      createdAt: gravacoes.createdAt,
      duration: gravacoes.duration,
      fileUrl: gravacoes.fileUrl,
      reuniao: {
        titulo: reunioes.titulo,
      }
    })
    .from(gravacoes)
    .leftJoin(reunioes, eq(gravacoes.reuniaoId, reunioes.id))
    .where(eq(gravacoes.tenantId, tenantId))
    .orderBy(desc(gravacoes.createdAt));
    
    // Sincronizar com Supabase
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        const { data: supabaseRecordings } = await supabase
          .from('gravacoes')
          .select('*, reunioes(titulo)')
          .order('created_at', { ascending: false });
        
        if (supabaseRecordings && supabaseRecordings.length > 0) {
          const normalized = supabaseRecordings.map(r => ({
            id: r.id,
            reuniaoId: r.reuniao_id,
            status: r.status,
            createdAt: r.created_at,
            duration: r.duration,
            fileUrl: r.file_url,
            reuniao: {
              titulo: r.reunioes?.titulo || "Reunião Instantânea",
            }
          }));
          return res.json({ success: true, data: normalized });
        }
      }
    } catch (err) {}
    
    res.json({ success: true, data: recordings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Alias for frontend
router.get('/gravacoes/list', (req, res) => {
  req.url = '/recording/list';
  router.handle(req, res, () => {});
});

router.patch('/room-design', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { roomDesignConfig } = req.body;

    if (!roomDesignConfig) {
      return res.status(400).json({
        success: false,
        message: 'roomDesignConfig é obrigatório',
      });
    }

    // 🚀 SINCRONIZAÇÃO SUPABASE (Design)
    // Fazemos isso antes ou em paralelo, mas para depuração vamos garantir as credenciais
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      
      const supabase = await getDynamicSupabaseClient(tenantId, { 
        url: supabaseUrl, 
        key: supabaseKey 
      });

      if (supabase) {
        console.log(`[MEETINGS] Sincronizando design com Supabase para tenant ${tenantId}...`);
        
        // Tenta salvar na tabela meeting_tenant_config (conforme sugerido pelo erro do PostgREST)
        const { error: syncError } = await supabase
          .from('meeting_tenant_config')
          .upsert({
            id: tenantId,
            room_design_config: roomDesignConfig,
            updated_at: new Date().toISOString()
          });

        if (syncError) {
          console.error(`[MEETINGS] Erro ao sincronizar design no Supabase (tabela meeting_tenant_config):`, syncError);
          
          // Tenta fallback para meeting_tenants se a primeira falhar
          const { error: fallbackError } = await supabase
            .from('meeting_tenants')
            .upsert({
              id: tenantId,
              room_design_config: roomDesignConfig,
              updated_at: new Date().toISOString()
            });
            
          if (fallbackError) {
            console.error(`[MEETINGS] Falha final na sincronização Supabase:`, fallbackError);
          } else {
            console.log(`[MEETINGS] Design sincronizado com sucesso no Supabase (tabela meeting_tenants)!`);
          }
        } else {
          console.log(`[MEETINGS] Design sincronizado com sucesso no Supabase (tabela meeting_tenant_config)!`);
        }
      }
    } catch (err) {
      console.warn(`[MEETINGS] Supabase não disponível para sincronizar design:`, err);
    }

    // Use regex check to avoid UUID error if tenantId is not a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);

    if (isUuid) {
      const [updated] = await db
        .update(meetingTenants)
        .set({ roomDesignConfig, updatedAt: new Date() })
        .where(eq(meetingTenants.id, tenantId))
        .returning();

      if (updated) {
        return res.json({ success: true, data: updated });
      }

      const [newTenant] = await db
        .insert(meetingTenants)
        .values({
          id: tenantId,
          roomDesignConfig,
        })
        .returning();
      
      return res.json({ success: true, data: newTenant });
    } else {
      console.warn(`[MEETINGS] tenantId "${tenantId}" is not a valid UUID, skipping local database update for meeting_tenants`);
      // Retornamos sucesso mesmo sem salvar localmente se for um tenant de dev (UUID requerido pelo Postgres)
      // Mas o Supabase já tentou salvar acima (que aceita texto)
      return res.json({ 
        success: true, 
        message: 'Configuração enviada ao Supabase (banco local ignorado por não ser UUID)',
        data: { id: tenantId, roomDesignConfig } 
      });
    }
  } catch (error) {
    console.error('[MEETINGS] Erro ao atualizar design da sala:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar design da sala',
    });
  }
});

router.get('/tenant-config', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // 1. Tenta buscar do Supabase primeiro (prioridade)
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      
      const supabase = await getDynamicSupabaseClient(tenantId, { 
        url: supabaseUrl, 
        key: supabaseKey 
      });

      if (supabase) {
        // Tenta buscar da tabela meeting_tenant_config primeiro
        let { data: supabaseTenant, error } = await supabase
          .from('meeting_tenant_config')
          .select('*')
          .eq('id', tenantId)
          .single();

        // Se não encontrar ou der erro de tabela não encontrada, tenta meeting_tenants
        if (error || !supabaseTenant) {
          const { data: altTenant, error: altError } = await supabase
            .from('meeting_tenants')
            .select('*')
            .eq('id', tenantId)
            .single();
          
          if (!altError && altTenant) {
            supabaseTenant = altTenant;
            error = null;
          }
        }

        if (!error && supabaseTenant) {
          return res.json({ 
            success: true, 
            data: {
              ...supabaseTenant,
              roomDesignConfig: supabaseTenant.room_design_config || supabaseTenant.roomDesignConfig
            } 
          });
        }
      }
    } catch (err) {
      console.warn(`[MEETINGS] Supabase não disponível para carregar config:`, err);
    }

    // 2. Fallback para banco local (apenas se for UUID válido)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
    
    if (isUuid) {
      const [tenant] = await db
        .select()
        .from(meetingTenants)
        .where(eq(meetingTenants.id, tenantId));

      if (tenant) {
        return res.json({ success: true, data: tenant });
      }
    }

    return res.json({ 
      success: true, 
      data: { 
        id: tenantId,
        roomDesignConfig: null 
      } 
    });
  } catch (error) {
    console.error('[MEETINGS] Erro ao obter configuração do tenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter configuração do tenant',
    });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // 1. Tenta buscar do Supabase se o tenant tiver credenciais
    try {
      const supabaseUrl = req.headers['x-supabase-url'] as string;
      const supabaseKey = req.headers['x-supabase-key'] as string;
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      
      const supabase = await getDynamicSupabaseClient(tenantId, { 
        url: supabaseUrl, 
        key: supabaseKey 
      });

      if (supabase) {
        console.log(`[MEETINGS] Buscando reuniões do Supabase para tenant ${tenantId}...`);
        const { data: supabaseMeetings, error } = await supabase
          .from('reunioes')
          .select('*')
          .order('data_inicio', { ascending: false });

        if (!error && supabaseMeetings) {
          // Normaliza os dados do Supabase para o formato do banco local
          const normalizedMeetings = supabaseMeetings.map(m => ({
            id: m.id,
            tenantId: m.tenant_id,
            titulo: m.titulo,
            descricao: m.descricao,
            dataInicio: new Date(m.data_inicio),
            dataFim: new Date(m.data_fim),
            duracao: m.duracao,
            status: m.status,
            participantes: m.participantes,
            metadata: m.metadata,
            nome: m.nome,
            email: m.email,
            telefone: m.telefone,
            createdAt: m.created_at ? new Date(m.created_at) : null,
            updatedAt: m.updated_at ? new Date(m.updated_at) : null,
          }));
          return res.json({ success: true, data: normalizedMeetings });
        }
        console.warn(`[MEETINGS] Erro ao buscar do Supabase, caindo para banco local:`, error);
      }
    } catch (err) {
      console.warn(`[MEETINGS] Supabase não disponível, usando banco local:`, err);
    }

    // 2. Fallback para banco de dados local
    const meetings = await db
      .select()
      .from(reunioes)
      .where(eq(reunioes.tenantId, tenantId))
      .orderBy(desc(reunioes.dataInicio));

    return res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('[MEETINGS] Erro ao listar reuniões:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar reuniões',
    });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      titulo,
      descricao,
      dataInicio,
      dataFim,
      duracao,
      participantes,
      nome,
      email,
      telefone,
      roomDesignConfig,
    } = req.body;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        success: false,
        message: 'dataInicio e dataFim são obrigatórios',
      });
    }

    // 📌 Busca design do tenant se não for passado
    let designConfig = roomDesignConfig;
    try {
      if (!designConfig) {
        // Use regex check to avoid UUID error if tenantId is not a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        
        if (isUuid) {
          const [tenant] = await db
            .select()
            .from(meetingTenants)
            .where(eq(meetingTenants.id, tenantId));
          
          if (tenant?.roomDesignConfig) {
            designConfig = tenant.roomDesignConfig;
          }
        } else {
          console.warn(`[MEETINGS] tenantId "${tenantId}" is not a valid UUID, skipping tenant lookup`);
        }
      }
    } catch (dbError: any) {
      console.warn('[MEETINGS] Falha ao buscar design do tenant, usando padrão:', dbError.message);
    }

    const meetingData = {
      tenantId,
      titulo: titulo || 'Nova Reunião',
      descricao,
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
      duracao: duracao || 30,
      participantes: participantes || [],
      nome,
      email,
      telefone,
      status: 'agendada',
      metadata: {
        roomDesignConfig: designConfig,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.email || 'unknown',
      },
    };

    const [newMeeting] = await db
      .insert(reunioes)
      .values({
        ...meetingData,
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 60 * 60000),
      })
      .returning();

    // 🚀 SINCRONIZAÇÃO SUPABASE (Dual-Write)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      
      if (supabase) {
        console.log(`[MEETINGS] Sincronizando reunião ${newMeeting.id} com Supabase do tenant...`);
        const { error: syncError } = await supabase
          .from('reunioes')
          .insert({
            id: newMeeting.id,
            tenant_id: tenantId,
            titulo: newMeeting.titulo,
            descricao: newMeeting.descricao,
            data_inicio: newMeeting.dataInicio.toISOString(),
            data_fim: newMeeting.dataFim.toISOString(),
            duracao: newMeeting.duracao,
            status: newMeeting.status,
            participantes: newMeeting.participantes,
            metadata: newMeeting.metadata,
            nome: newMeeting.nome,
            email: newMeeting.email,
            telefone: newMeeting.telefone
          });

        if (syncError) {
          console.error(`[MEETINGS] Erro na sincronização Supabase:`, syncError);
        } else {
          console.log(`[MEETINGS] Sincronização Supabase concluída com sucesso!`);
        }
      }
    } catch (syncErr) {
      console.error(`[MEETINGS] Falha crítica na sincronização Supabase:`, syncErr);
    }

    return res.status(201).json({ success: true, data: newMeeting });
  } catch (error) {
    console.error('[MEETINGS] Erro ao criar reunião:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar reunião',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    return res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('[MEETINGS] Erro ao obter reunião:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter reunião',
    });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const updateData = req.body;

    const [existing] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    if (updateData.dataInicio) {
      updateData.dataInicio = new Date(updateData.dataInicio);
    }
    if (updateData.dataFim) {
      updateData.dataFim = new Date(updateData.dataFim);
    }

    // 📌 Se atualizar design, persiste no metadata
    if (updateData.roomDesignConfig) {
      updateData.metadata = {
        ...(existing.metadata as any),
        roomDesignConfig: updateData.roomDesignConfig,
        updatedAt: new Date().toISOString(),
      };
      delete updateData.roomDesignConfig;
    }

    const [updated] = await db
      .update(reunioes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .returning();

    // 🚀 SINCRONIZAÇÃO SUPABASE (Update)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        const { data: updated, error } = await supabase
          .from('reunioes')
          .update({
            titulo: req.body.titulo,
            descricao: req.body.descricao,
            status: req.body.status,
            data_inicio: req.body.dataInicio,
            data_fim: req.body.dataFim,
            metadata: req.body.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
      }
    } catch (err) {
      console.error('[MEETINGS] Erro ao sincronizar update no Supabase:', err);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[MEETINGS] Erro ao atualizar reunião:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar reunião',
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    await db
      .delete(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    // 🚀 SINCRONIZAÇÃO SUPABASE (Delete)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase) {
        await supabase.from('reunioes').delete().eq('id', id);
      }
    } catch (err) {
      console.error('[MEETINGS] Erro ao sincronizar delete no Supabase:', err);
    }

    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('[MEETINGS] Erro ao deletar reunião:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao deletar reunião',
    });
  }
});

router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    const hmsCredentials = await getHMS100msCredentials(tenantId);

    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    const roomName = `meeting-${id}-${Date.now()}`;
    const room = await criarSala(
      roomName,
      hmsCredentials.templateId,
      hmsCredentials.appAccessKey,
      hmsCredentials.appSecret
    );

    const [updated] = await db
      .update(reunioes)
      .set({
        roomId100ms: room.id,
        status: 'em_andamento',
        updatedAt: new Date(),
      })
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .returning();

    try {
      await notificarReuniaoIniciada(updated);
    } catch (webhookError) {
      console.error('[MEETINGS] Erro ao notificar início da reunião:', webhookError);
    }

    return res.json({
      success: true,
      data: {
        meeting: updated,
        room,
      },
    });
  } catch (error) {
    console.error('[MEETINGS] Erro ao iniciar reunião:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      message: 'Erro ao iniciar reunião',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      error: errorMessage,
    });
  }
});

router.post('/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    if (meeting.roomId100ms) {
      const hmsCredentials = await getHMS100msCredentials(tenantId);

      if (hmsCredentials) {
        try {
          await desativarSala(meeting.roomId100ms, hmsCredentials.appAccessKey, hmsCredentials.appSecret);
        } catch (hmsError) {
          console.error('[MEETINGS] Erro ao desativar sala 100ms:', hmsError);
        }
      }
    }

    const [updated] = await db
      .update(reunioes)
      .set({
        status: 'finalizada',
        dataFim: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .returning();

    try {
      await notificarReuniaoFinalizada(updated);
    } catch (webhookError) {
      console.error('[MEETINGS] Erro ao notificar fim da reunião:', webhookError);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[MEETINGS] Erro ao encerrar reunião:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao encerrar reunião',
    });
  }
});

router.post('/:id/recording/start', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { meetingUrl } = req.body;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({
        success: false,
        message: 'Reunião ainda não iniciada - sala não existe',
      });
    }

    const hmsCredentials = await getHMS100msCredentials(tenantId);

    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    const recordingResult = await iniciarGravacao(
      meeting.roomId100ms,
      hmsCredentials.appAccessKey,
      hmsCredentials.appSecret,
      meetingUrl || `https://app.100ms.live/meeting/${meeting.roomId100ms}`
    );

    const [newRecording] = await db.insert(gravacoes).values({
      reuniaoId: id,
      tenantId,
      roomId100ms: meeting.roomId100ms,
      recordingId100ms: recordingResult.id,
      sessionId100ms: recordingResult.session_id,
      status: 'recording',
      startedAt: new Date(),
    }).returning();

    // 🚀 SINCRONIZAÇÃO SUPABASE (Recording Start)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase && newRecording) {
        await supabase
          .from('gravacoes')
          .insert({
            id: newRecording.id,
            reuniao_id: newRecording.reuniaoId,
            tenant_id: newRecording.tenantId,
            room_id_100ms: newRecording.roomId100ms,
            recording_id_100ms: newRecording.recordingId100ms,
            session_id_100ms: newRecording.sessionId100ms,
            status: newRecording.status,
            started_at: newRecording.startedAt.toISOString(),
            created_at: new Date().toISOString()
          });
      }
    } catch (syncErr) {
      console.error('[MEETINGS] Erro ao sincronizar gravação (start) no Supabase:', syncErr);
    }

    return res.json({ success: true, data: recordingResult });
  } catch (error) {
    console.error('[MEETINGS] Erro ao iniciar gravação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao iniciar gravação',
    });
  }
});

router.post('/:id/recording/stop', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({
        success: false,
        message: 'Reunião não possui sala associada',
      });
    }

    const hmsCredentials = await getHMS100msCredentials(tenantId);

    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    let stopResult: any = null;
    let error100ms: any = null;

    try {
      stopResult = await pararGravacao(
        meeting.roomId100ms,
        hmsCredentials.appAccessKey,
        hmsCredentials.appSecret
      );
      console.log('[MEETINGS] Gravação parada com sucesso no 100ms:', stopResult);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('[MEETINGS] 404 ao parar gravação (beam não encontrado) - gravação já pode estar parada');
        error100ms = err;
      } else {
        throw err;
      }
    }

    // 🚀 TENTATIVA DE RECUPERAÇÃO DE ASSET ID (Cascata)
    let finalAssetId = stopResult?.asset?.id || null;
    let finalFileUrl = stopResult?.asset?.path || null;
    let finalMetadata = stopResult?.asset || {};

    if (!finalAssetId) {
      console.log('[MEETINGS] AssetId não retornado no stop, tentando obter por recordingId...');
      const [gravacaoPendente] = await db
        .select()
        .from(gravacoes)
        .where(
          and(
            eq(gravacoes.reuniaoId, id),
            eq(gravacoes.status, 'recording')
          )
        )
        .limit(1);

      if (gravacaoPendente?.recordingId100ms) {
        const { obterAssetIdPorRecordingId, listarAssetsRecentesSala, obterAssetGravacao } = await import('../services/meetings/hms100ms');
        
        // Estratégia 1: Por Recording ID
        finalAssetId = await obterAssetIdPorRecordingId(
          gravacaoPendente.recordingId100ms,
          hmsCredentials.appAccessKey,
          hmsCredentials.appSecret
        );

        // Estratégia 2: Assets recentes da sala
        if (!finalAssetId) {
          console.log('[MEETINGS] Estratégia 2: Buscando assets recentes da sala...');
          const recentAssets = await listarAssetsRecentesSala(
            meeting.roomId100ms,
            hmsCredentials.appAccessKey,
            hmsCredentials.appSecret
          );
          if (recentAssets.length > 0) {
            finalAssetId = recentAssets[0].id;
          }
        }

        // Se encontrou o Asset ID, busca os detalhes (URL/Path)
        if (finalAssetId) {
          try {
            const assetDetails = await obterAssetGravacao(
              finalAssetId,
              hmsCredentials.appAccessKey,
              hmsCredentials.appSecret
            );
            finalFileUrl = assetDetails?.path || null;
            finalMetadata = assetDetails || {};
          } catch (assetErr) {
            console.error('[MEETINGS] Erro ao buscar detalhes do asset recuperado:', assetErr);
          }
        }
      }
    }

    // Atualizar gravação como 'completed'
    const [updatedRecording] = await db
      .update(gravacoes)
      .set({
        status: 'completed',
        stoppedAt: new Date(),
        assetId: finalAssetId,
        fileUrl: finalFileUrl,
        metadata: finalMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gravacoes.reuniaoId, id),
          eq(gravacoes.tenantId, tenantId),
          eq(gravacoes.status, 'recording')
        )
      )
      .returning();

    // 🚀 SINCRONIZAÇÃO SUPABASE (Recording Stop)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      if (supabase && updatedRecording) {
        await supabase
          .from('gravacoes')
          .update({
            status: updatedRecording.status,
            stopped_at: updatedRecording.stoppedAt?.toISOString(),
            asset_id: updatedRecording.assetId,
            file_url: updatedRecording.fileUrl,
            metadata: updatedRecording.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', updatedRecording.id);
      }
    } catch (syncErr) {
      console.error('[MEETINGS] Erro ao sincronizar gravação (stop) no Supabase:', syncErr);
    }

    console.log('[MEETINGS] Gravação atualizada:', updatedRecording);

    return res.json({ 
      success: true, 
      data: stopResult || { message: 'Gravação parada (beam não encontrado no 100ms, mas marcada como concluída localmente)' }
    });
  } catch (error: any) {
    console.error('[MEETINGS] Erro ao parar gravação:', error);
    console.error('[MEETINGS] Erro completo:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao parar gravação: ' + (error.response?.data?.message || error.message),
    });
  }
});

router.get('/:id/gravacoes', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const recordings = await db
      .select()
      .from(gravacoes)
      .where(and(eq(gravacoes.reuniaoId, id), eq(gravacoes.tenantId, tenantId)))
      .orderBy(desc(gravacoes.createdAt));

    return res.json({ success: true, data: recordings });
  } catch (error) {
    console.error('[MEETINGS] Erro ao obter gravações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter gravações',
    });
  }
});

router.get('/:id/transcricoes', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const transcriptions = await db
      .select()
      .from(transcricoes)
      .where(and(eq(transcricoes.reuniaoId, id), eq(transcricoes.tenantId, tenantId)));

    return res.json({ success: true, data: transcriptions });
  } catch (error) {
    console.error('[MEETINGS] Erro ao obter transcrições:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter transcrições',
    });
  }
});

// 📌 GET all recordings for tenant (for Gravacoes page)
router.get('/gravacoes/list', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const recordings = await db
      .select({
        id: gravacoes.id,
        reuniaoId: gravacoes.reuniaoId,
        tenantId: gravacoes.tenantId,
        roomId100ms: gravacoes.roomId100ms,
        sessionId100ms: gravacoes.sessionId100ms,
        recordingId100ms: gravacoes.recordingId100ms,
        assetId: gravacoes.assetId,
        status: gravacoes.status,
        startedAt: gravacoes.startedAt,
        stoppedAt: gravacoes.stoppedAt,
        duration: gravacoes.duration,
        fileUrl: gravacoes.fileUrl,
        fileSize: gravacoes.fileSize,
        thumbnailUrl: gravacoes.thumbnailUrl,
        createdAt: gravacoes.createdAt,
        reuniao: {
          id: reunioes.id,
          titulo: reunioes.titulo,
          nome: reunioes.nome,
          email: reunioes.email,
          dataInicio: reunioes.dataInicio,
          dataFim: reunioes.dataFim,
        }
      })
      .from(gravacoes)
      .leftJoin(reunioes, eq(gravacoes.reuniaoId, reunioes.id))
      .where(eq(gravacoes.tenantId, tenantId))
      .orderBy(desc(gravacoes.createdAt));

    // 🚀 SINCRONIZAÇÃO SUPABASE (Listagem)
    try {
      const { getDynamicSupabaseClient } = await import('../lib/multiTenantSupabase');
      const supabase = await getDynamicSupabaseClient(tenantId);
      
      if (supabase) {
        console.log(`[MEETINGS] Buscando gravações do Supabase para tenant ${tenantId}...`);
        const { data: supabaseRecordings, error } = await supabase
          .from('gravacoes')
          .select('*, reunioes(*)')
          .order('created_at', { ascending: false });

        if (!error && supabaseRecordings) {
          console.log(`[MEETINGS] Encontradas ${supabaseRecordings.length} gravações no Supabase.`);
          const normalizedRecordings = supabaseRecordings.map(r => ({
            id: r.id,
            reuniaoId: r.reuniao_id,
            tenantId: r.tenant_id,
            roomId100ms: r.room_id_100ms,
            sessionId100ms: r.session_id_100ms,
            recordingId100ms: r.recording_id_100ms,
            assetId: r.asset_id,
            status: r.status,
            startedAt: r.started_at ? new Date(r.started_at) : null,
            stoppedAt: r.stopped_at ? new Date(r.stopped_at) : null,
            duration: r.duration,
            fileUrl: r.file_url,
            fileSize: r.file_size,
            thumbnailUrl: r.thumbnail_url,
            createdAt: r.created_at ? new Date(r.created_at) : null,
            reuniao: r.reunioes ? {
              id: r.reunioes.id,
              titulo: r.reunioes.titulo,
              nome: r.reunioes.nome,
              email: r.reunioes.email,
              dataInicio: new Date(r.reunioes.data_inicio),
              dataFim: new Date(r.reunioes.data_fim),
            } : null
          }));
          
          // Se o Supabase retornou dados, priorizamos eles mas podemos mesclar se necessário
          // Por enquanto, seguimos a lógica de prioridade do Supabase conforme outras rotas
          if (normalizedRecordings.length > 0) {
            return res.json(normalizedRecordings);
          }
        } else if (error) {
          console.error(`[MEETINGS] Erro ao buscar gravações no Supabase:`, error);
        }
      }
    } catch (err) {
      console.warn(`[MEETINGS] Supabase não disponível para listagem de gravações:`, err);
    }

    console.log(`[MEETINGS] Retornando ${recordings.length} gravações do banco local.`);
    return res.json(recordings);
  } catch (error) {
    console.error('[MEETINGS] Erro ao listar gravações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar gravações',
    });
  }
});

// 📌 GET presigned URL for recording playback
router.get('/gravacoes/:id/url', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [gravacao] = await db
      .select()
      .from(gravacoes)
      .where(and(eq(gravacoes.id, id), eq(gravacoes.tenantId, tenantId)));

    if (!gravacao) {
      return res.status(404).json({
        success: false,
        message: 'Gravação não encontrada',
      });
    }

    if (gravacao.status === 'recording') {
      return res.status(400).json({
        success: false,
        message: 'Gravação ainda está em andamento',
        status: 'recording',
      });
    }

    if (gravacao.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Gravação falhou ou é muito curta',
        status: 'failed',
      });
    }

    if (!gravacao.recordingId100ms) {
      return res.status(400).json({
        success: false,
        message: 'ID da gravação não encontrado',
      });
    }

    const hmsCredentials = await getHMS100msCredentials(tenantId);

    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    const { obterUrlPresignadaAsset, obterAssetIdPorRecordingId, obterAssetGravacao } = await import('../services/meetings/hms100ms');
    
    let assetIdToUse: string | null = null;
    
    // SEMPRE tenta recuperar o assetId correto do 100ms para garantir que é um vídeo (room-composite)
    // Ignora o cache do banco para evitar usar um chat asset ID
    if (gravacao.recordingId100ms) {
      console.log(`[MEETINGS] Buscando assetId correto (room-composite) para recordingId ${gravacao.recordingId100ms}...`);
      assetIdToUse = await obterAssetIdPorRecordingId(
        gravacao.recordingId100ms,
        hmsCredentials.appAccessKey,
        hmsCredentials.appSecret
      );
      
      if (assetIdToUse && assetIdToUse !== gravacao.assetId) {
        console.log(`[MEETINGS] AssetId correto recuperado: ${assetIdToUse}. Atualizando banco...`);
        // Atualiza no banco para futuras requisições
        await db.update(gravacoes).set({ assetId: assetIdToUse }).where(eq(gravacoes.id, id));
      } else if (assetIdToUse) {
        console.log(`[MEETINGS] AssetId do banco ainda é o correto: ${assetIdToUse}`);
      }
    }
    
    // Fallback: usa o assetId do banco se não conseguir recuperar um novo
    if (!assetIdToUse && gravacao.assetId) {
      console.log(`[MEETINGS] Usando assetId do banco como fallback: ${gravacao.assetId}`);
      assetIdToUse = gravacao.assetId;
    }

    if (!assetIdToUse) {
      console.error(`[MEETINGS] Falha final: Nenhum assetId disponível para a gravação ${id}`);
      return res.status(400).json({
        success: false,
        message: 'A gravação ainda está sendo processada pelo 100ms. Por favor, aguarde alguns minutos e tente novamente.',
      });
    }

    try {
      console.log(`[MEETINGS] Gerando URL para assetId: ${assetIdToUse}`);
      const presignedUrl = await obterUrlPresignadaAsset(
        assetIdToUse,
        hmsCredentials.appAccessKey,
        hmsCredentials.appSecret
      );
      
      if (presignedUrl && presignedUrl.url) {
        console.log(`[MEETINGS] URL gerada com sucesso para asset ${assetIdToUse}`);
        console.log(`[MEETINGS] URL presignada: ${presignedUrl.url.substring(0, 150)}...`);
        console.log(`[MEETINGS] Expiry: ${presignedUrl.expiry}`);
        
        // Garante que a URL seja tratada como vídeo e não forçada para download
        let finalUrl = presignedUrl.url;
        if (finalUrl.includes('response-content-disposition=')) {
          finalUrl = finalUrl.replace(/response-content-disposition=[^&]*/, 'response-content-disposition=inline');
        } else {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'response-content-disposition=inline';
        }

        console.log(`[MEETINGS] URL final: ${finalUrl.substring(0, 150)}...`);
        return res.json({ url: finalUrl });
      }
      
      throw new Error('URL retornada é inválida');
    } catch (urlError: any) {
      const errorMsg = urlError.response?.data?.message || urlError.message;
      console.error(`[MEETINGS] Erro crítico ao gerar URL para asset ${assetIdToUse}:`, errorMsg);
      
      // Tentativa de último recurso: Listar assets da sala vinculada à reunião
      try {
        if (gravacao.roomId100ms) {
          console.log(`[MEETINGS] Tentativa de último recurso: buscando assets para sala ${gravacao.roomId100ms}`);
          const { listarAssetsRecentesSala } = await import('../services/meetings/hms100ms');
          const assets = await listarAssetsRecentesSala(
            gravacao.roomId100ms,
            hmsCredentials.appAccessKey,
            hmsCredentials.appSecret
          );
          
          const validAsset = assets.find(a => a.status === 'completed');
          if (validAsset) {
            console.log(`[MEETINGS] Encontrado asset válido alternativo: ${validAsset.id}. Tentando gerar URL...`);
            const retryPresigned = await obterUrlPresignadaAsset(
              validAsset.id,
              hmsCredentials.appAccessKey,
              hmsCredentials.appSecret
            );
            
            // Atualiza o banco com o novo assetId funcional
            await db.update(gravacoes).set({ assetId: validAsset.id }).where(eq(gravacoes.id, id));
            
            return res.json({ url: retryPresigned.url });
          }
        }
      } catch (lastResortError) {
        console.error(`[MEETINGS] Falha no último recurso para gravação ${id}:`, lastResortError);
      }

      return res.status(500).json({
        success: false,
        message: 'A gravação ainda não está disponível para visualização. O 100ms está processando o arquivo. Tente novamente em 5-10 minutos.',
        details: errorMsg
      });
    }
  } catch (error: any) {
    console.error('[MEETINGS] Erro ao obter URL presignada:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter URL da gravação',
    });
  }
});

// 📌 DELETE recording
router.delete('/gravacoes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [gravacao] = await db
      .select()
      .from(gravacoes)
      .where(and(eq(gravacoes.id, id), eq(gravacoes.tenantId, tenantId)));

    if (!gravacao) {
      return res.status(404).json({
        success: false,
        message: 'Gravação não encontrada',
      });
    }

    await db.delete(gravacoes).where(eq(gravacoes.id, id));

    return res.json({ success: true });
  } catch (error) {
    console.error('[MEETINGS] Erro ao deletar gravação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao deletar gravação',
    });
  }
});

router.get('/:id/token', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { role = 'guest', userName } = req.query;

    const [meeting] = await db
      .select()
      .from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Reunião não encontrada',
      });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({
        success: false,
        message: 'Reunião ainda não iniciada',
      });
    }

    const hmsCredentials = await getHMS100msCredentials(tenantId);

    if (!hmsCredentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do 100ms não configuradas',
      });
    }

    const userId = `${userName || req.user!.userId}-${Date.now()}`;
    const token = gerarTokenParticipante(
      meeting.roomId100ms,
      userId,
      role as string,
      hmsCredentials.appAccessKey,
      hmsCredentials.appSecret
    );

    return res.json({
      success: true,
      data: {
        token,
        roomId: meeting.roomId100ms,
        userId,
        role,
      },
    });
  } catch (error) {
    console.error('[MEETINGS] Erro ao gerar token:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar token de participante',
    });
  }
});

router.post('/transcription/start', async (req: AuthRequest, res: Response) => {
  try {
    const { room_id, nome, email, telefone, data_inicio } = req.body;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: 'room_id é obrigatório',
      });
    }

    const result = await notificarTranscricaoIniciada({
      room_id,
      nome: nome || 'Participante',
      email: email || '',
      telefone,
      data_inicio,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[MEETINGS] Erro ao notificar início de transcrição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao notificar início de transcrição',
    });
  }
});

router.post('/transcription/end', async (req: AuthRequest, res: Response) => {
  try {
    const { room_id, data_fim } = req.body;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: 'room_id é obrigatório',
      });
    }

    const result = await notificarTranscricaoFinalizada({
      room_id,
      data_fim,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[MEETINGS] Erro ao notificar fim de transcrição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao notificar fim de transcrição',
    });
  }
});

export default router;
