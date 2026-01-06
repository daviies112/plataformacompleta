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
import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Helper function to sync recording to Supabase
async function syncRecordingToSupabase(tenantId: string, recording: any) {
  try {
    const supabase = await getClientSupabaseClient(tenantId);
    if (!supabase) {
      console.log(`[Recording Sync] Supabase não configurado para tenant ${tenantId} - gravação apenas local`);
      return;
    }

    // Serialize dates to ISO strings for Supabase compatibility
    const toISOString = (date: Date | string | null | undefined): string | null => {
      if (!date) return null;
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') return date;
      return null;
    };

    const { error } = await supabase
      .from('gravacoes')
      .upsert({
        id: recording.id,
        reuniao_id: recording.reuniaoId,
        tenant_id: recording.tenantId,
        room_id_100ms: recording.roomId100ms || null,
        session_id_100ms: recording.sessionId100ms || null,
        recording_id_100ms: recording.recordingId100ms || null,
        asset_id: recording.assetId || null,
        status: recording.status || 'recording',
        started_at: toISOString(recording.startedAt),
        stopped_at: toISOString(recording.stoppedAt),
        duration: recording.duration || null,
        file_url: recording.fileUrl || null,
        file_size: recording.fileSize || null,
        thumbnail_url: recording.thumbnailUrl || null,
        metadata: recording.metadata ? JSON.parse(JSON.stringify(recording.metadata)) : {},
        created_at: toISOString(recording.createdAt),
        updated_at: toISOString(recording.updatedAt),
      }, { onConflict: 'id' });

    if (error) {
      console.error(`[Recording Sync] Erro ao sincronizar gravação ${recording.id} com Supabase:`, error);
    } else {
      console.log(`[Recording Sync] Gravação ${recording.id} sincronizada com Supabase para tenant ${tenantId}`);
    }
  } catch (err) {
    console.error(`[Recording Sync] Erro inesperado ao sincronizar gravação:`, err);
  }
}

export const meetingsRouter = Router();

// PUBLIC router - no authentication required for these routes
export const publicRoomDesignRouter = Router();

// PUBLIC endpoint - Get room design config by meeting ID (no auth required)
// This allows meeting participants to see the correct room design colors
publicRoomDesignRouter.get('/reunioes/:id/room-design-public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, get the meeting to find its tenantId
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada', roomDesignConfig: null });
    }

    // Get the room design config for this tenant
    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, meeting.tenantId))
      .limit(1);
    
    if (!config) {
      return res.json({ roomDesignConfig: null });
    }
    
    res.json({ roomDesignConfig: config.roomDesignConfig });
  } catch (error: any) {
    console.error('Erro ao obter room design config público:', error);
    res.status(500).json({ error: 'Erro ao obter configuração de design', roomDesignConfig: null });
  }
});

// PUBLIC endpoint - Get meeting info by ID (no auth required - for recording bot and external participants)
publicRoomDesignRouter.get('/reunioes/:id/public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    // Return limited meeting info for public access
    res.json({ 
      meeting: {
        id: meeting.id,
        titulo: meeting.titulo,
        roomId100ms: meeting.roomId100ms,
        status: meeting.status,
        dataHora: meeting.dataHora,
        tenantId: meeting.tenantId
      }
    });
  } catch (error: any) {
    console.error('Erro ao obter reunião pública:', error);
    res.status(500).json({ error: 'Erro ao obter reunião' });
  }
});

// PUBLIC endpoint - Generate 100ms token for public participants (no auth required)
publicRoomDesignRouter.post('/reunioes/:id/token-public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, role } = req.body;

    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({ error: 'Reunião não possui sala 100ms configurada' });
    }

    // Get 100ms credentials for this tenant
    const credentials = await get100msCredentialsForTenant(meeting.tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas para este tenant' });
    }

    // Determine role - recording bot gets special role, others get guest
    const participantRole = role === 'recorder' ? 'recorder' : 'guest';
    const participantName = userName || 'Participante';

    console.log(`[Token Public] Gerando token para ${participantName} (${participantRole}) na sala ${meeting.roomId100ms}`);

    const token = gerarTokenParticipante(
      meeting.roomId100ms,
      participantName,
      participantRole,
      credentials.appAccessKey,
      credentials.appSecret
    );

    res.json({ 
      token,
      roomId: meeting.roomId100ms,
      role: participantRole
    });
  } catch (error: any) {
    console.error('Erro ao gerar token público:', error);
    res.status(500).json({ error: 'Erro ao gerar token de acesso' });
  }
});

// Helper function to get 100ms credentials without auth (for public recording routes)
async function get100msCredentialsForTenant(tenantId: string) {
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
    console.error('Erro ao obter credenciais 100ms para tenant:', error);
    return null;
  }
}

// PUBLIC RECORDING ROUTES - No authentication required
// These routes allow the recording bot to control recordings without being logged in

// POST /api/100ms/recording/start - Start recording by 100ms roomId
publicRoomDesignRouter.post('/100ms/recording/start', async (req: Request, res: Response) => {
  try {
    const { roomId, meetingUrl } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId é obrigatório' });
    }

    console.log(`[Recording] Iniciando gravação para roomId: ${roomId}`);

    // Find the meeting by 100ms roomId
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.roomId100ms, roomId))
      .limit(1);

    if (!meeting) {
      console.error(`[Recording] Reunião não encontrada para roomId: ${roomId}`);
      return res.status(404).json({ error: 'Reunião não encontrada para este roomId' });
    }

    console.log(`[Recording] Reunião encontrada: ${meeting.id}, tenant: ${meeting.tenantId}`);

    // Get 100ms credentials for this tenant
    const credentials = await get100msCredentialsForTenant(meeting.tenantId);
    if (!credentials) {
      console.error(`[Recording] Credenciais 100ms não configuradas para tenant: ${meeting.tenantId}`);
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas para este tenant' });
    }

    // Start SFU (Server-Side) recording via 100ms API
    // SFU recording captures the room directly without needing a browser URL
    // This ensures we record the actual meeting content, not loading screens
    console.log(`[Recording] Iniciando gravação SFU (Server-Side) para roomId: ${roomId}`);

    const result = await iniciarGravacao(
      roomId,
      credentials.appAccessKey,
      credentials.appSecret
    );

    console.log(`[Recording] Gravação iniciada com sucesso:`, result);

    // Save recording to database
    const [gravacao] = await db.insert(gravacoes).values({
      reuniaoId: meeting.id,
      tenantId: meeting.tenantId,
      roomId100ms: roomId,
      sessionId100ms: result.session_id,
      recordingId100ms: result.id,
      status: 'recording',
      startedAt: new Date(),
    }).returning();

    // Sync to Supabase (async, non-blocking)
    syncRecordingToSupabase(meeting.tenantId, gravacao).catch(console.error);

    res.json({ 
      success: true, 
      recording: gravacao, 
      recordingId: result.id,
      hmsResult: result 
    });
  } catch (error: any) {
    console.error('[Recording] Erro ao iniciar gravação:', error);
    res.status(500).json({ 
      error: 'Erro ao iniciar gravação', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// POST /api/100ms/recording/stop - Stop recording by 100ms roomId
publicRoomDesignRouter.post('/100ms/recording/stop', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId é obrigatório' });
    }

    console.log(`[Recording] Parando gravação para roomId: ${roomId}`);

    // Find the meeting by 100ms roomId
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.roomId100ms, roomId))
      .limit(1);

    if (!meeting) {
      console.error(`[Recording] Reunião não encontrada para roomId: ${roomId}`);
      return res.status(404).json({ error: 'Reunião não encontrada para este roomId' });
    }

    console.log(`[Recording] Reunião encontrada: ${meeting.id}, tenant: ${meeting.tenantId}`);

    // Get 100ms credentials for this tenant
    const credentials = await get100msCredentialsForTenant(meeting.tenantId);
    if (!credentials) {
      console.error(`[Recording] Credenciais 100ms não configuradas para tenant: ${meeting.tenantId}`);
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas para este tenant' });
    }

    // Stop recording via 100ms API
    const result = await pararGravacao(
      roomId,
      credentials.appAccessKey,
      credentials.appSecret
    );

    console.log(`[Recording] Gravação parada com sucesso:`, result);

    // Check if asset is available immediately
    let finalStatus = 'processing';
    let fileUrl = null;
    let duration = null;
    let fileSize = null;

    if (result.asset?.id) {
      try {
        const presigned = await obterUrlPresignadaAsset(
          result.asset.id,
          credentials.appAccessKey,
          credentials.appSecret
        );
        fileUrl = presigned.url;
        finalStatus = 'completed';
        duration = result.asset.duration || null;
        fileSize = result.asset.size || null;
        console.log(`[Recording] Asset disponível imediatamente: ${result.asset.id}`);
      } catch (assetError) {
        console.log(`[Recording] Asset ainda não está pronto, marcando como processing`);
      }
    }

    // Update recording in database with asset info if available
    const [updatedRecording] = await db.update(gravacoes)
      .set({
        status: finalStatus,
        stoppedAt: new Date(),
        updatedAt: new Date(),
        fileUrl: fileUrl,
        duration: duration,
        fileSize: fileSize,
        assetId: result.asset?.id || null,
      })
      .where(and(
        eq(gravacoes.roomId100ms, roomId),
        eq(gravacoes.status, 'recording')
      ))
      .returning();

    // Sync updated recording to Supabase (async, non-blocking)
    if (updatedRecording) {
      syncRecordingToSupabase(meeting.tenantId, updatedRecording).catch(console.error);
    }

    res.json({ success: true, status: finalStatus, hmsResult: result });
  } catch (error: any) {
    console.error('[Recording] Erro ao parar gravação:', error);
    res.status(500).json({ 
      error: 'Erro ao parar gravação', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// GET /api/100ms/recording/:roomId - List recordings for a 100ms roomId
publicRoomDesignRouter.get('/100ms/recording/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    console.log(`[Recording] Listando gravações para roomId: ${roomId}`);

    // Find recordings for this roomId
    const recordings = await db.select().from(gravacoes)
      .where(eq(gravacoes.roomId100ms, roomId))
      .orderBy(desc(gravacoes.createdAt));

    res.json(recordings);
  } catch (error: any) {
    console.error('[Recording] Erro ao listar gravações:', error);
    res.status(500).json({ error: 'Erro ao listar gravações', message: error.message });
  }
});

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

    // Sincronizar com Supabase (Tenant) se configurado
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        console.log(`[Supabase Sync] Sincronizando reunião instantânea ${newMeeting.id} para tenant ${tenantId}`);
        const { error: syncError } = await supabase
          .from('reunioes')
          .upsert({
            id: newMeeting.id,
            tenant_id: tenantId,
            titulo: newMeeting.titulo,
            nome: newMeeting.nome,
            email: newMeeting.email,
            data_inicio: newMeeting.dataInicio?.toISOString(),
            data_fim: newMeeting.dataFim?.toISOString(),
            duracao: newMeeting.duracao,
            status: newMeeting.status,
            tipo: 'online',
            room_id_100ms: newMeeting.roomId100ms,
            link_reuniao: newMeeting.linkReuniao,
            created_at: newMeeting.createdAt?.toISOString(),
            updated_at: newMeeting.updatedAt?.toISOString()
          }, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Supabase Sync] Erro ao sincronizar reunião instantânea ${newMeeting.id}:`, syncError);
        }
      }
    } catch (syncErr) {
      console.error(`[Supabase Sync] Erro inesperado ao sincronizar reunião instantânea:`, syncErr);
    }

    // Sincronizar com Supabase (Tenant) se configurado
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        console.log(`[Supabase Sync] Sincronizando reunião instantânea ${newMeeting.id} para tenant ${tenantId}`);
        const { error: syncError } = await supabase
          .from('reunioes')
          .upsert({
            id: newMeeting.id,
            tenant_id: tenantId,
            titulo: newMeeting.titulo,
            nome: newMeeting.nome,
            email: newMeeting.email,
            data_inicio: newMeeting.dataInicio?.toISOString(),
            data_fim: newMeeting.dataFim?.toISOString(),
            duracao: newMeeting.duracao,
            status: newMeeting.status,
            tipo: 'online',
            room_id_100ms: newMeeting.roomId100ms,
            link_reuniao: newMeeting.linkReuniao,
            created_at: newMeeting.createdAt?.toISOString(),
            updated_at: newMeeting.updatedAt?.toISOString()
          }, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Supabase Sync] Erro ao sincronizar reunião instantânea ${newMeeting.id}:`, syncError);
        }
      }
    } catch (syncErr) {
      console.error(`[Supabase Sync] Erro inesperado ao sincronizar reunião instantânea:`, syncErr);
    }

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

    let roomId100ms = null;
    if (tipo === 'online') {
      const credentials = await get100msCredentials(tenantId);
      if (!credentials) {
        return res.status(400).json({ 
          error: 'Credenciais do 100ms não configuradas',
          message: 'Configure suas credenciais do 100ms em Configurações antes de criar reuniões online'
        });
      }

      const sala = await criarSala(
        titulo || 'Reunião',
        credentials.templateId || '',
        credentials.appAccessKey,
        credentials.appSecret
      );
      roomId100ms = sala.id;
    }

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
      tipo: tipo || 'online',
      roomId100ms,
      linkReuniao: '', // Will be updated after we get the ID
    }).returning();

    // Sincronizar com Supabase (Tenant) se configurado
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        console.log(`[Supabase Sync] Sincronizando reunião agendada ${newMeeting.id} para tenant ${tenantId}`);
        const { error: syncError } = await supabase
          .from('reunioes')
          .upsert({
            id: newMeeting.id,
            tenant_id: tenantId,
            titulo: newMeeting.titulo,
            nome: newMeeting.nome,
            email: newMeeting.email,
            data_inicio: newMeeting.dataInicio?.toISOString(),
            data_fim: newMeeting.dataFim?.toISOString(),
            duracao: newMeeting.duracao,
            descricao: newMeeting.descricao,
            status: newMeeting.status,
            tipo: newMeeting.tipo,
            room_id_100ms: newMeeting.roomId100ms,
            link_reuniao: newMeeting.linkReuniao,
            created_at: newMeeting.createdAt?.toISOString(),
            updated_at: newMeeting.updatedAt?.toISOString()
          }, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Supabase Sync] Erro ao sincronizar reunião ${newMeeting.id}:`, syncError);
        }
      }
    } catch (syncErr) {
      console.error(`[Supabase Sync] Erro inesperado ao sincronizar reunião:`, syncErr);
    }

    // Update with the correct meeting link using the generated UUID
    let linkReuniao = '';
    if (tipo === 'online') {
      linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;
    } else {
      linkReuniao = descricao || 'Presencial'; // Or some other default for presencial
    }

    await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));
    newMeeting.linkReuniao = linkReuniao;

    // Atualizar link no Supabase também
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        await supabase
          .from('reunioes')
          .update({ link_reuniao: linkReuniao })
          .eq('id', newMeeting.id);
      }
    } catch (e) {
      console.error('Erro ao atualizar link no Supabase:', e);
    }

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

    // SFU recording captures the room directly without needing a browser URL
    const result = await iniciarGravacao(
      meeting.roomId100ms,
      credentials.appAccessKey,
      credentials.appSecret
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

// Helper function to find the best video asset from recording_assets array
function findVideoAsset(recordingAssets: any[]): any | null {
  if (!recordingAssets || !Array.isArray(recordingAssets)) return null;
  
  // Find the largest completed room-composite asset (video file)
  const videoAssets = recordingAssets
    .filter(asset => asset.type === 'room-composite' && asset.status === 'completed' && asset.size > 0)
    .sort((a, b) => (b.size || 0) - (a.size || 0));
  
  return videoAssets[0] || null;
}

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

    // Find the best video asset from recording_assets array
    const videoAsset = findVideoAsset(recordingDetails.recording_assets);
    
    if (videoAsset) {
      const presigned = await obterUrlPresignadaAsset(
        videoAsset.id,
        credentials.appAccessKey,
        credentials.appSecret
      );
      
      // Also update the database with the asset info
      await db.update(gravacoes)
        .set({
          status: 'completed',
          fileUrl: presigned.url,
          duration: videoAsset.duration || recording.duration,
          fileSize: videoAsset.size || recording.fileSize,
          assetId: videoAsset.id,
          updatedAt: new Date(),
        })
        .where(eq(gravacoes.id, id));
      
      return res.json({ url: presigned.url });
    }

    res.status(404).json({ error: 'URL de playback não disponível ainda', status: 'processing' });
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

// POST /api/gravacoes/:id/refresh - Refresh recording status from 100ms
meetingsRouter.post('/gravacoes/:id/refresh', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const [recording] = await db.select().from(gravacoes)
      .where(and(eq(gravacoes.id, id), eq(gravacoes.tenantId, tenantId)))
      .limit(1);

    if (!recording) {
      return res.status(404).json({ error: 'Gravacao nao encontrada' });
    }

    // If already completed, return current data
    if (recording.status === 'completed' && recording.fileUrl) {
      return res.json({ success: true, recording, message: 'Gravacao ja esta pronta' });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais 100ms nao configuradas' });
    }

    // Try to get recording details from 100ms
    if (recording.recordingId100ms) {
      try {
        const recordingDetails = await obterGravacao(
          recording.recordingId100ms,
          credentials.appAccessKey,
          credentials.appSecret
        );

        console.log('[Recording Refresh] Details from 100ms:', recordingDetails);

        // Find the best video asset from recording_assets array
        const videoAsset = findVideoAsset(recordingDetails.recording_assets);

        if (videoAsset) {
          console.log('[Recording Refresh] Found video asset:', videoAsset.id, 'size:', videoAsset.size);
          
          const presigned = await obterUrlPresignadaAsset(
            videoAsset.id,
            credentials.appAccessKey,
            credentials.appSecret
          );

          // Update recording with asset info
          const [updated] = await db.update(gravacoes)
            .set({
              status: 'completed',
              fileUrl: presigned.url,
              duration: videoAsset.duration || recording.duration,
              fileSize: videoAsset.size || recording.fileSize,
              assetId: videoAsset.id,
              updatedAt: new Date(),
            })
            .where(eq(gravacoes.id, id))
            .returning();

          return res.json({ success: true, recording: updated, message: 'Gravacao atualizada com sucesso' });
        } else if (recordingDetails.status === 'failed') {
          await db.update(gravacoes)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(gravacoes.id, id));

          return res.json({ success: false, message: 'Gravacao falhou no processamento' });
        } else {
          console.log('[Recording Refresh] No video asset found yet, recording status:', recordingDetails.status);
        }
      } catch (apiError: any) {
        console.error('[Recording Refresh] Error fetching from 100ms:', apiError.message);
      }
    }

    res.json({ success: false, message: 'Gravacao ainda esta sendo processada' });
  } catch (error: any) {
    console.error('Erro ao atualizar gravacao:', error);
    res.status(500).json({ error: 'Erro ao atualizar gravacao', message: error.message });
  }
});
