import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { reunioes, gravacoes, hms100msConfig } from '../../shared/db-schema';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '../lib/credentialsManager';
import { 
  gerarTokenParticipante, 
  criarSala, 
  iniciarGravacao, 
  pararGravacao,
  obterGravacao,
  listarGravacoesSala,
  obterUrlPresignadaAsset
} from '../services/meetings/hms100ms';
import { nanoid } from 'nanoid';

export const meetingsRouter = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    tenantId: string;
    clientId?: string;
    nome?: string;
    email?: string;
  };
}

async function get100msCredentials(tenantId: string) {
  const config = await db.select().from(hms100msConfig)
    .where(eq(hms100msConfig.tenantId, tenantId))
    .limit(1);

  if (!config[0]) {
    return null;
  }

  return {
    appAccessKey: decrypt(config[0].appAccessKey),
    appSecret: decrypt(config[0].appSecret),
    templateId: config[0].templateId
  };
}

meetingsRouter.get('/api/reunioes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    
    const meetings = await db.select().from(reunioes)
      .where(eq(reunioes.tenantId, tenantId))
      .orderBy(desc(reunioes.dataInicio));

    res.json(meetings);
  } catch (error: any) {
    console.error('Erro ao listar reuniões:', error);
    res.status(500).json({ error: 'Erro ao listar reuniões', message: error.message });
  }
});

meetingsRouter.get('/api/reunioes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    res.json(meeting);
  } catch (error: any) {
    console.error('Erro ao buscar reunião:', error);
    res.status(500).json({ error: 'Erro ao buscar reunião', message: error.message });
  }
});

meetingsRouter.post('/api/reunioes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { titulo, nome, email, dataInicio, dataFim, descricao, tipo } = req.body;

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ 
        error: 'Credenciais do 100ms não configuradas',
        message: 'Configure suas credenciais do 100ms em Configurações antes de criar reuniões'
      });
    }

    const sala = await criarSala(
      titulo || 'Reunião', 
      credentials.templateId || '', 
      credentials.appAccessKey, 
      credentials.appSecret
    );

    const meetingId = nanoid();
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const linkReuniao = `https://${baseUrl}/reuniao/${meetingId}`;

    const [newMeeting] = await db.insert(reunioes).values({
      id: meetingId,
      tenantId,
      titulo: titulo || 'Reunião',
      nome,
      email,
      dataInicio: new Date(dataInicio),
      dataFim: dataFim ? new Date(dataFim) : null,
      descricao,
      tipo: tipo || 'video',
      status: 'agendada',
      roomId100ms: sala.id,
      linkReuniao,
    }).returning();

    res.json(newMeeting);
  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ error: 'Erro ao criar reunião', message: error.message });
  }
});

meetingsRouter.post('/api/reunioes/:id/token', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { userName, role = 'guest' } = req.body;

    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting || !meeting.roomId100ms) {
      return res.status(404).json({ error: 'Reunião não encontrada ou sem sala 100ms' });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas' });
    }

    const userId = nanoid(8);
    const token = gerarTokenParticipante(
      meeting.roomId100ms,
      userId,
      role,
      credentials.appAccessKey,
      credentials.appSecret
    );

    res.json({ 
      token, 
      roomId: meeting.roomId100ms,
      userId,
      role
    });
  } catch (error: any) {
    console.error('Erro ao gerar token:', error);
    res.status(500).json({ error: 'Erro ao gerar token', message: error.message });
  }
});

meetingsRouter.post('/api/reunioes/:id/start-recording', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting || !meeting.roomId100ms) {
      return res.status(404).json({ error: 'Reunião não encontrada ou sem sala 100ms' });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas' });
    }

    const result = await iniciarGravacao(
      meeting.roomId100ms,
      credentials.appAccessKey,
      credentials.appSecret,
      meeting.linkReuniao || ''
    );

    const [gravacao] = await db.insert(gravacoes).values({
      id: nanoid(),
      reuniaoId: meeting.id,
      tenantId,
      roomId100ms: meeting.roomId100ms,
      sessionId100ms: result.session_id,
      recordingId100ms: result.id,
      status: 'recording',
      startedAt: new Date(),
    }).returning();

    res.json({ success: true, recording: gravacao, hmsResult: result });
  } catch (error: any) {
    console.error('Erro ao iniciar gravação:', error);
    res.status(500).json({ error: 'Erro ao iniciar gravação', message: error.message });
  }
});

meetingsRouter.post('/api/reunioes/:id/stop-recording', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting || !meeting.roomId100ms) {
      return res.status(404).json({ error: 'Reunião não encontrada ou sem sala 100ms' });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas' });
    }

    const result = await pararGravacao(
      meeting.roomId100ms,
      credentials.appAccessKey,
      credentials.appSecret
    );

    await db.update(gravacoes)
      .set({
        status: 'stopped',
        stoppedAt: new Date(),
      })
      .where(and(
        eq(gravacoes.reuniaoId, meeting.id),
        eq(gravacoes.status, 'recording')
      ));

    res.json({ success: true, hmsResult: result });
  } catch (error: any) {
    console.error('Erro ao parar gravação:', error);
    res.status(500).json({ error: 'Erro ao parar gravação', message: error.message });
  }
});

meetingsRouter.get('/api/gravacoes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const recordings = await db.select().from(gravacoes)
      .where(eq(gravacoes.tenantId, tenantId))
      .orderBy(desc(gravacoes.createdAt));

    res.json(recordings);
  } catch (error: any) {
    console.error('Erro ao listar gravações:', error);
    res.status(500).json({ error: 'Erro ao listar gravações', message: error.message });
  }
});

meetingsRouter.get('/api/gravacoes/:id/playback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [recording] = await db.select().from(gravacoes)
      .where(and(eq(gravacoes.id, id), eq(gravacoes.tenantId, tenantId)))
      .limit(1);

    if (!recording) {
      return res.status(404).json({ error: 'Gravação não encontrada' });
    }

    if (recording.fileUrl) {
      return res.json({ url: recording.fileUrl });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials || !recording.recordingId100ms) {
      return res.status(400).json({ error: 'Não foi possível obter URL de playback' });
    }

    const recordingDetails = await obterGravacao(
      recording.recordingId100ms,
      credentials.appAccessKey,
      credentials.appSecret
    );

    if (recordingDetails.asset?.id) {
      const presigned = await obterUrlPresignadaAsset(
        recordingDetails.asset.id,
        credentials.appAccessKey,
        credentials.appSecret
      );
      return res.json({ url: presigned.url });
    }

    res.status(404).json({ error: 'URL de playback não disponível ainda' });
  } catch (error: any) {
    console.error('Erro ao obter playback:', error);
    res.status(500).json({ error: 'Erro ao obter playback', message: error.message });
  }
});

meetingsRouter.delete('/api/gravacoes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [recording] = await db.select().from(gravacoes)
      .where(and(eq(gravacoes.id, id), eq(gravacoes.tenantId, tenantId)))
      .limit(1);

    if (!recording) {
      return res.status(404).json({ error: 'Gravação não encontrada' });
    }

    await db.delete(gravacoes).where(eq(gravacoes.id, id));

    res.json({ success: true, message: 'Gravação excluída' });
  } catch (error: any) {
    console.error('Erro ao excluir gravação:', error);
    res.status(500).json({ error: 'Erro ao excluir gravação', message: error.message });
  }
});

meetingsRouter.get('/api/100ms/active-recordings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const activeRecordings = await db.select().from(gravacoes)
      .where(and(
        eq(gravacoes.tenantId, tenantId),
        eq(gravacoes.status, 'recording')
      ));

    res.json(activeRecordings);
  } catch (error: any) {
    console.error('Erro ao listar gravações ativas:', error);
    res.status(500).json({ error: 'Erro ao listar gravações ativas', message: error.message });
  }
});
