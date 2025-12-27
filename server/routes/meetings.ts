import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, meetingTenants, gravacoes, hms100msConfig } from '../../shared/db-schema';
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

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

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
    } = req.body;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        success: false,
        message: 'dataInicio e dataFim são obrigatórios',
      });
    }

    const [newMeeting] = await db
      .insert(reunioes)
      .values({
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
      })
      .returning();

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

    const [updated] = await db
      .update(reunioes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .returning();

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

    await db.insert(gravacoes).values({
      reuniaoId: id,
      tenantId,
      roomId100ms: meeting.roomId100ms,
      recordingId100ms: recordingResult.id,
      sessionId100ms: recordingResult.session_id,
      status: 'recording',
      startedAt: new Date(),
    });

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

    const stopResult = await pararGravacao(
      meeting.roomId100ms,
      hmsCredentials.appAccessKey,
      hmsCredentials.appSecret
    );

    await db
      .update(gravacoes)
      .set({
        status: 'completed',
        stoppedAt: new Date(),
        fileUrl: stopResult.asset?.path,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gravacoes.reuniaoId, id),
          eq(gravacoes.tenantId, tenantId),
          eq(gravacoes.status, 'recording')
        )
      );

    return res.json({ success: true, data: stopResult });
  } catch (error) {
    console.error('[MEETINGS] Erro ao parar gravação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao parar gravação',
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
