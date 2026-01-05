import { Router, Request, Response, NextFunction } from 'express';
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
import { z } from 'zod';

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

function requireTenantId(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.tenantId) {
    return res.status(401).json({ error: 'Tenant não identificado' });
  }
  next();
}

const createMeetingSchema = z.object({
  titulo: z.string().optional(),
  nome: z.string().optional(),
  email: z.string().email().optional(),
  dataInicio: z.string(),
  dataFim: z.string().optional(),
  descricao: z.string().optional(),
  duracao: z.number().optional()
});

const tokenRequestSchema = z.object({
  userName: z.string().optional(),
  role: z.enum(['host', 'guest']).optional()
});

async function get100msCredentials(tenantId: string) {
  try {
    const config = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);

    if (!config[0]) {
      return null;
    }

    if (!config[0].appAccessKey || !config[0].appSecret) {
      return null;
    }

    const appAccessKey = decrypt(config[0].appAccessKey);
    const appSecret = decrypt(config[0].appSecret);

    if (!appAccessKey || !appSecret) {
      return null;
    }

    return {
      appAccessKey,
      appSecret,
      templateId: config[0].templateId
    };
  } catch (error) {
    console.error('Erro ao obter credenciais 100ms');
    return null;
  }
}

meetingsRouter.get('/reunioes', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.get('/reunioes/:id', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.get('/reunioes/:id/token-100ms', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const role = (req.query.role as string) || 'guest';

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
    console.error('Erro ao gerar token 100ms:', error);
    res.status(500).json({ error: 'Erro ao gerar token', message: error.message });
  }
});

meetingsRouter.post('/reunioes/instantanea', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userName = req.user?.nome || req.user?.email || 'Host';

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ 
        error: 'Credenciais do 100ms não configuradas',
        message: 'Configure suas credenciais do 100ms em Configurações antes de criar reuniões'
      });
    }

    const titulo = `Reunião Instantânea - ${new Date().toLocaleString('pt-BR')}`;
    
    const sala = await criarSala(
      titulo, 
      credentials.templateId || '', 
      credentials.appAccessKey, 
      credentials.appSecret
    );

    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const dataInicio = new Date();
    const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000); // 1 hour default duration

    const [newMeeting] = await db.insert(reunioes).values({
      tenantId,
      titulo,
      nome: userName,
      email: req.user?.email,
      dataInicio,
      dataFim,
      duracao: 60,
      status: 'em_andamento',
      roomId100ms: sala.id,
      linkReuniao: '', // Will be updated after we get the ID
    }).returning();

    // Update with the correct meeting link using the generated UUID
    const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;
    await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));
    newMeeting.linkReuniao = linkReuniao;

    const userId = nanoid(8);
    const token = gerarTokenParticipante(
      sala.id,
      userId,
      'host',
      credentials.appAccessKey,
      credentials.appSecret
    );

    res.json({ 
      ...newMeeting, 
      token,
      roomId: sala.id,
      userId
    });
  } catch (error: any) {
    console.error('Erro ao criar reunião instantânea:', error);
    res.status(500).json({ error: 'Erro ao criar reunião instantânea', message: error.message });
  }
});

meetingsRouter.post('/reunioes', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
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

    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const startDate = new Date(dataInicio);
    // Calculate dataFim: use provided value or default to 1 hour duration
    const endDate = dataFim ? new Date(dataFim) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const duracao = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // duration in minutes

    const [newMeeting] = await db.insert(reunioes).values({
      tenantId,
      titulo: titulo || 'Reunião',
      nome,
      email,
      dataInicio: startDate,
      dataFim: endDate,
      duracao,
      descricao,
      status: 'agendada',
      roomId100ms: sala.id,
      linkReuniao: '', // Will be updated after we get the ID
    }).returning();

    // Update with the correct meeting link using the generated UUID
    const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;
    await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));
    newMeeting.linkReuniao = linkReuniao;

    res.json(newMeeting);
  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ error: 'Erro ao criar reunião', message: error.message });
  }
});

meetingsRouter.post('/reunioes/:id/token', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.post('/reunioes/:id/start-recording', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.post('/reunioes/:id/stop-recording', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.get('/gravacoes', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.get('/gravacoes/:id/playback', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.delete('/gravacoes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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

meetingsRouter.get('/100ms/active-recordings', authenticateToken, async (req: AuthRequest, res: Response) => {
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

// GET /reunioes/room-design - Get room design config for tenant
meetingsRouter.get('/reunioes/room-design', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    
    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);
    
    if (!config) {
      return res.json({ roomDesignConfig: null });
    }
    
    res.json({ roomDesignConfig: config.roomDesignConfig });
  } catch (error: any) {
    console.error('Erro ao obter room design config:', error);
    res.status(500).json({ error: 'Erro ao obter configuração de design', message: error.message });
  }
});

// Room Design Config validation schema
const roomDesignConfigSchema = z.object({
  branding: z.object({
    logo: z.string().nullable().optional(),
    logoSize: z.number().optional(),
    logoPosition: z.enum(['left', 'center', 'right']).optional(),
    companyName: z.string().optional(),
    showCompanyName: z.boolean().optional(),
    showLogoInLobby: z.boolean().optional(),
    showLogoInMeeting: z.boolean().optional(),
    showLogoInEnd: z.boolean().optional()
  }).optional(),
  colors: z.object({
    background: z.string().optional(),
    controlsBackground: z.string().optional(),
    controlsText: z.string().optional(),
    primaryButton: z.string().optional(),
    dangerButton: z.string().optional(),
    avatarBackground: z.string().optional(),
    avatarText: z.string().optional(),
    participantNameBackground: z.string().optional(),
    participantNameText: z.string().optional()
  }).optional(),
  lobby: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    buttonText: z.string().optional(),
    showDeviceSelectors: z.boolean().optional(),
    showCameraPreview: z.boolean().optional(),
    backgroundImage: z.string().nullable().optional()
  }).optional(),
  meeting: z.object({
    showParticipantCount: z.boolean().optional(),
    showMeetingCode: z.boolean().optional(),
    showRecordingIndicator: z.boolean().optional(),
    enableReactions: z.boolean().optional(),
    enableChat: z.boolean().optional(),
    enableScreenShare: z.boolean().optional(),
    enableRaiseHand: z.boolean().optional()
  }).optional(),
  endScreen: z.object({
    title: z.string().optional(),
    message: z.string().optional(),
    showFeedback: z.boolean().optional(),
    redirectUrl: z.string().nullable().optional()
  }).optional()
}).passthrough();

// PATCH /reunioes/room-design - Update room design config for tenant
meetingsRouter.patch('/reunioes/room-design', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { roomDesignConfig } = req.body;
    
    if (!roomDesignConfig) {
      return res.status(400).json({ error: 'roomDesignConfig é obrigatório' });
    }

    const validationResult = roomDesignConfigSchema.safeParse(roomDesignConfig);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Configuração de design inválida', 
        details: validationResult.error.errors 
      });
    }
    
    const [existingConfig] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);
    
    let updatedConfig;
    
    if (!existingConfig) {
      [updatedConfig] = await db.insert(hms100msConfig)
        .values({
          tenantId,
          appAccessKey: 'pending_configuration',
          appSecret: 'pending_configuration',
          roomDesignConfig: validationResult.data,
        })
        .returning();
    } else {
      [updatedConfig] = await db.update(hms100msConfig)
        .set({ roomDesignConfig: validationResult.data, updatedAt: new Date() })
        .where(eq(hms100msConfig.tenantId, tenantId))
        .returning();
    }
    
    res.json({ roomDesignConfig: updatedConfig.roomDesignConfig });
  } catch (error: any) {
    console.error('Erro ao atualizar room design config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração de design', message: error.message });
  }
});
