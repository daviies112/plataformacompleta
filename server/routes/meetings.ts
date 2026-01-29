import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { reunioes, gravacoes, hms100msConfig, formSubmissions, leads } from '../../shared/db-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { decrypt } from '../lib/credentialsManager';
import { 
  gerarTokenParticipante, 
  criarSala, 
  obterSala,
  iniciarGravacao, 
  pararGravacao,
  obterGravacao,
  listarGravacoesSala,
  obterUrlPresignadaAsset
} from '../services/meetings/hms100ms';
import { getClientSupabaseClient, getClientSupabaseClientStrict } from '../lib/multiTenantSupabase';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { cache } from '../lib/cache';

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
// Adjusted path to work with /api/public prefix from routes.ts
// PRIORITY: 1) Meeting metadata config, 2) Tenant config, 3) null
publicRoomDesignRouter.get('/reunioes/:id/room-design-public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[RoomDesign] Buscando config para ID: ${id}`);

    // First try to find by meeting ID (UUID)
    let meeting;
    const [meetingById] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);
    
    meeting = meetingById;

    // If not found, try to find by roomId100ms
    if (!meeting) {
      console.log(`[RoomDesign] Não encontrado por UUID, tentando por roomId100ms...`);
      const [meetingByRoomId] = await db.select().from(reunioes)
        .where(eq(reunioes.roomId100ms, id))
        .limit(1);
      meeting = meetingByRoomId;
    }

    if (!meeting) {
      console.log(`[RoomDesign] Reunião não encontrada para ID: ${id}`);
      return res.status(404).json({ error: 'Reunião não encontrada', roomDesignConfig: null });
    }

    console.log(`[RoomDesign] Reunião encontrada: ${meeting.id}, tenantId: ${meeting.tenantId}`);

    // PRIORITY 1: Check if meeting has custom roomDesignConfig in metadata
    const meetingMetadata = meeting.metadata as any;
    if (meetingMetadata?.roomDesignConfig) {
      console.log(`[RoomDesign] Using meeting-specific config for meeting ${meeting.id}`);
      return res.json({ 
        roomDesignConfig: meetingMetadata.roomDesignConfig,
        source: 'meeting'
      });
    }

    // PRIORITY 2: Fall back to tenant's default config from PostgreSQL
    let [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, meeting.tenantId))
      .limit(1);
    
    // PRIORITY 3: If no roomDesignConfig in PostgreSQL, try Supabase fallback
    if (!config?.roomDesignConfig) {
      console.log(`[RoomDesign] No roomDesignConfig in PostgreSQL, trying Supabase fallback...`);
      try {
        const supabase = await getClientSupabaseClient(meeting.tenantId);
        if (supabase) {
          const { data: supabaseConfig, error } = await supabase
            .from('hms_100ms_config')
            .select('room_design_config')
            .eq('tenant_id', meeting.tenantId)
            .single();

          if (!error && supabaseConfig?.room_design_config) {
            console.log(`[RoomDesign] Found roomDesignConfig in Supabase, caching to PostgreSQL...`);
            
            // Cache back to PostgreSQL for next time
            if (!config) {
              const [inserted] = await db.insert(hms100msConfig)
                .values({
                  tenantId: meeting.tenantId,
                  appAccessKey: 'pending_configuration',
                  appSecret: 'pending_configuration',
                  roomDesignConfig: supabaseConfig.room_design_config,
                })
                .returning();
              config = inserted;
            } else {
              const [updated] = await db.update(hms100msConfig)
                .set({ roomDesignConfig: supabaseConfig.room_design_config, updatedAt: new Date() })
                .where(eq(hms100msConfig.tenantId, meeting.tenantId))
                .returning();
              config = updated;
            }
            console.log(`[RoomDesign] Cached Supabase config to PostgreSQL`);
          } else {
            console.log(`[RoomDesign] Supabase fallback: no config found or error:`, error?.message);
          }
        } else {
          console.log(`[RoomDesign] Supabase client not available for tenant ${meeting.tenantId}`);
        }
      } catch (supabaseErr: any) {
        console.warn(`[RoomDesign] Supabase fallback error:`, supabaseErr.message);
      }
    }
    
    if (!config || !config.roomDesignConfig) {
      console.log(`[RoomDesign] No config found for meeting ${meeting.id} or tenant ${meeting.tenantId}`);
      return res.json({ roomDesignConfig: null, source: 'none' });
    }
    
    console.log(`[RoomDesign] Using tenant config for meeting ${meeting.id}:`, JSON.stringify(config.roomDesignConfig).substring(0, 200));
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ 
      roomDesignConfig: config.roomDesignConfig,
      source: 'tenant'
    });
  } catch (error: any) {
    console.error('Erro ao obter room design config público:', error);
    res.status(500).json({ error: 'Erro ao obter configuração de design', roomDesignConfig: null });
  }
});

// Default room design config for fallback
const DEFAULT_ROOM_DESIGN = {
  branding: {
    logo: null,
    logoUrl: null,
    companyName: '',
    logoPosition: 'left',
    logoSize: 40,
    showLogoInLobby: true,
    showLogoInMeeting: true,
    showLogoInEnd: true,
    showCompanyName: true,
  },
  colors: {
    background: '#0f172a',
    controlsBackground: '#18181b',
    controlsText: '#ffffff',
    primaryButton: '#3b82f6',
    dangerButton: '#ef4444',
    avatarBackground: '#3b82f6',
    avatarText: '#ffffff',
    participantNameBackground: 'rgba(0, 0, 0, 0.6)',
    participantNameText: '#ffffff',
  },
  lobby: {
    title: 'Pronto para participar?',
    subtitle: '',
    buttonText: 'Participar agora',
    showCameraPreview: true,
    showDeviceSelectors: true,
    backgroundImage: null,
  },
  meeting: {
    enableChat: true,
    enableScreenShare: true,
    enableRaiseHand: true,
    enableReactions: true,
    showParticipantCount: true,
    showMeetingCode: true,
    showRecordingIndicator: true,
  },
  endScreen: {
    title: 'Reunião Encerrada',
    message: 'Obrigado por participar!',
    showFeedback: false,
    redirectUrl: null,
  },
};

// Helper function to deep merge room design configs
function mergeRoomDesignConfigs(base: any, override: any): any {
  if (!override) return base;
  return {
    branding: { ...base.branding, ...(override.branding || {}) },
    colors: { ...base.colors, ...(override.colors || {}) },
    lobby: { ...base.lobby, ...(override.lobby || {}) },
    meeting: { ...base.meeting, ...(override.meeting || {}) },
    endScreen: { ...base.endScreen, ...(override.endScreen || {}) },
  };
}

// PUBLIC endpoint - Get full meeting room data for PublicMeetingRoom.tsx
// This endpoint is called by the frontend to get meeting + tenant + roomDesignConfig
publicRoomDesignRouter.get('/reunioes/public/:companySlug/:roomId', async (req: Request, res: Response) => {
  try {
    const { companySlug, roomId } = req.params;
    console.log(`[PublicMeetingRoom] Buscando reunião: companySlug=${companySlug}, roomId=${roomId}`);

    // Determine if roomId looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    
    let meeting;
    
    // Try by roomId100ms first (most common for 100ms room IDs)
    const [meetingByRoomId] = await db.select().from(reunioes)
      .where(eq(reunioes.roomId100ms, roomId))
      .limit(1);
    meeting = meetingByRoomId;

    // If not found and looks like UUID, try by ID
    if (!meeting && isUUID) {
      const [meetingById] = await db.select().from(reunioes)
        .where(eq(reunioes.id, roomId))
        .limit(1);
      meeting = meetingById;
    }

    if (!meeting) {
      console.log(`[PublicMeetingRoom] Reunião não encontrada para roomId=${roomId}`);
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    console.log(`[PublicMeetingRoom] Reunião encontrada: ${meeting.id}, tenantId=${meeting.tenantId}`);

    // Get tenant info from 100ms config (includes tenant name/logo)
    let [tenantConfig] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, meeting.tenantId))
      .limit(1);

    console.log(`[PublicMeetingRoom] PostgreSQL config found: ${!!tenantConfig}, has roomDesignConfig: ${!!tenantConfig?.roomDesignConfig}`);

    // Supabase fallback: If no roomDesignConfig in PostgreSQL, try fetching from Supabase
    if (!tenantConfig?.roomDesignConfig) {
      console.log(`[PublicMeetingRoom] No roomDesignConfig in PostgreSQL, trying Supabase fallback...`);
      try {
        const supabase = await getClientSupabaseClient(meeting.tenantId);
        if (supabase) {
          const { data: supabaseConfig, error } = await supabase
            .from('hms_100ms_config')
            .select('room_design_config')
            .eq('tenant_id', meeting.tenantId)
            .single();

          if (!error && supabaseConfig?.room_design_config) {
            console.log(`[PublicMeetingRoom] Found roomDesignConfig in Supabase, caching to PostgreSQL...`);
            
            // Cache back to PostgreSQL
            if (!tenantConfig) {
              // INSERT new row
              const [inserted] = await db.insert(hms100msConfig)
                .values({
                  tenantId: meeting.tenantId,
                  appAccessKey: 'pending_configuration',
                  appSecret: 'pending_configuration',
                  roomDesignConfig: supabaseConfig.room_design_config,
                })
                .returning();
              tenantConfig = inserted;
            } else {
              // UPDATE existing row
              const [updated] = await db.update(hms100msConfig)
                .set({ roomDesignConfig: supabaseConfig.room_design_config, updatedAt: new Date() })
                .where(eq(hms100msConfig.tenantId, meeting.tenantId))
                .returning();
              tenantConfig = updated;
            }
            console.log(`[PublicMeetingRoom] Cached Supabase config to PostgreSQL`);
          } else {
            console.log(`[PublicMeetingRoom] Supabase fallback: no config found or error:`, error?.message);
          }
        } else {
          console.log(`[PublicMeetingRoom] Supabase client not available for tenant ${meeting.tenantId}`);
        }
      } catch (supabaseErr: any) {
        console.warn(`[PublicMeetingRoom] Supabase fallback error:`, supabaseErr.message);
      }
    }

    // Build complete room design config using deep merge:
    // 1. Start with defaults
    // 2. Merge with tenant config
    // 3. Merge with meeting-specific overrides (if any)
    let finalConfig = { ...DEFAULT_ROOM_DESIGN };
    
    if (tenantConfig?.roomDesignConfig) {
      finalConfig = mergeRoomDesignConfigs(finalConfig, tenantConfig.roomDesignConfig);
      console.log(`[PublicMeetingRoom] Usando config do tenant (colors: ${JSON.stringify(tenantConfig.roomDesignConfig?.colors).substring(0, 80)}...)`);
    } else {
      console.log(`[PublicMeetingRoom] No tenant config found, using defaults`);
    }
    
    const meetingMetadata = meeting.metadata as any;
    if (meetingMetadata?.roomDesignConfig) {
      finalConfig = mergeRoomDesignConfigs(finalConfig, meetingMetadata.roomDesignConfig);
      console.log(`[PublicMeetingRoom] Aplicando overrides da reunião`);
    }

    // Normalize logo field (support both 'logo' and 'logoUrl')
    const logoUrl = finalConfig.branding?.logoUrl || finalConfig.branding?.logo || null;

    console.log(`[PublicMeetingRoom] Cores finais: primaryButton=${finalConfig.colors?.primaryButton}, background=${finalConfig.colors?.background}`);

    // Add cache headers
    res.set('Cache-Control', 'private, max-age=60');

    // Build response matching PublicMeetingData interface
    res.json({
      reuniao: {
        id: meeting.id,
        titulo: meeting.titulo || 'Reunião',
        descricao: meeting.descricao || '',
        dataInicio: meeting.dataHora?.toISOString() || new Date().toISOString(),
        dataFim: meeting.dataHoraFim?.toISOString() || new Date().toISOString(),
        duracao: meeting.duracao || 60,
        status: meeting.status || 'agendada',
        roomId100ms: meeting.roomId100ms,
        roomCode100ms: meeting.roomCode100ms,
        linkReuniao: meeting.linkReuniao,
        nome: (meeting.metadata as any)?.participantName,
        email: (meeting.metadata as any)?.participantEmail,
      },
      tenant: {
        id: meeting.tenantId,
        nome: finalConfig.branding?.companyName || companySlug,
        slug: companySlug,
        logoUrl: logoUrl,
      },
      designConfig: {}, // Legacy field
      roomDesignConfig: finalConfig,
    });
  } catch (error: any) {
    console.error('[PublicMeetingRoom] Erro ao buscar reunião pública:', error);
    res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
});

// OPTIMIZED: Single request for meeting + config + token (Performance optimization)
publicRoomDesignRouter.get('/reunioes/public/:companySlug/:roomId/full', async (req: Request, res: Response) => {
  try {
    const { companySlug, roomId } = req.params;
    const { userName } = req.query;
    
    console.log(`[PublicMeetingRoom/Full] Buscando reunião otimizada: companySlug=${companySlug}, roomId=${roomId}`);

    // Determine if roomId looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    
    let meeting;
    
    // Try by roomId100ms first (most common for 100ms room IDs)
    const [meetingByRoomId] = await db.select().from(reunioes)
      .where(eq(reunioes.roomId100ms, roomId))
      .limit(1);
    meeting = meetingByRoomId;

    // If not found and looks like UUID, try by ID
    if (!meeting && isUUID) {
      const [meetingById] = await db.select().from(reunioes)
        .where(eq(reunioes.id, roomId))
        .limit(1);
      meeting = meetingById;
    }

    if (!meeting) {
      console.log(`[PublicMeetingRoom/Full] Reunião não encontrada para roomId=${roomId}`);
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    console.log(`[PublicMeetingRoom/Full] Reunião encontrada: ${meeting.id}, tenantId=${meeting.tenantId}`);

    // Get tenant info from 100ms config
    let [tenantConfig] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, meeting.tenantId))
      .limit(1);

    // Build complete room design config using deep merge
    let finalConfig = { ...DEFAULT_ROOM_DESIGN };
    
    if (tenantConfig?.roomDesignConfig) {
      finalConfig = mergeRoomDesignConfigs(finalConfig, tenantConfig.roomDesignConfig);
    }
    
    const meetingMetadata = meeting.metadata as any;
    if (meetingMetadata?.roomDesignConfig) {
      finalConfig = mergeRoomDesignConfigs(finalConfig, meetingMetadata.roomDesignConfig);
    }

    // Normalize logo field
    const logoUrl = finalConfig.branding?.logoUrl || finalConfig.branding?.logo || null;

    // If userName provided, generate token as well
    let authToken = null;
    if (userName && typeof userName === 'string' && meeting.roomId100ms) {
      try {
        const credentials = await get100msCredentialsForTenant(meeting.tenantId);
        if (credentials) {
          authToken = gerarTokenParticipante(
            meeting.roomId100ms,
            userName,
            'guest',
            credentials.appAccessKey,
            credentials.appSecret
          );
          console.log(`[PublicMeetingRoom/Full] Token gerado para ${userName}`);
        }
      } catch (tokenErr) {
        console.warn('[PublicMeetingRoom/Full] Token generation failed, client will need separate request');
      }
    }
    
    // Add cache headers
    res.set('Cache-Control', 'private, max-age=60');
    
    return res.json({
      reuniao: {
        id: meeting.id,
        titulo: meeting.titulo || 'Reunião',
        descricao: meeting.descricao || '',
        dataInicio: meeting.dataHora?.toISOString() || new Date().toISOString(),
        dataFim: meeting.dataHoraFim?.toISOString() || new Date().toISOString(),
        duracao: meeting.duracao || 60,
        status: meeting.status || 'agendada',
        roomId100ms: meeting.roomId100ms,
        roomCode100ms: meeting.roomCode100ms,
        linkReuniao: meeting.linkReuniao,
        nome: meetingMetadata?.participantName,
        email: meetingMetadata?.participantEmail,
      },
      tenant: {
        id: meeting.tenantId,
        nome: finalConfig.branding?.companyName || companySlug,
        slug: companySlug,
        logoUrl: logoUrl,
      },
      designConfig: {},
      roomDesignConfig: finalConfig,
      authToken,
    });
  } catch (error: any) {
    console.error('[PublicMeetingRoom/Full] Erro ao buscar reunião pública:', error);
    return res.status(500).json({ error: 'Erro interno' });
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
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const publicUrl = `${protocol}://${host}/reuniao/${meeting.tenantId}/${meeting.id}`;

    res.json({ 
      meeting: {
        id: meeting.id,
        titulo: meeting.titulo,
        roomId100ms: meeting.roomId100ms,
        status: meeting.status,
        dataHora: meeting.dataHora,
        tenantId: meeting.tenantId,
        publicUrl
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
    const { userName } = req.body;

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

    // Verify room status in 100ms before generating token
    try {
      const roomInfo = await obterSala(
        meeting.roomId100ms,
        credentials.appAccessKey,
        credentials.appSecret
      );
      
      console.log(`[Token Public] 100ms Room Info:`, JSON.stringify({
        id: roomInfo.id,
        name: roomInfo.name,
        enabled: roomInfo.enabled,
        template_id: roomInfo.template_id,
        customer_id: roomInfo.customer_id
      }, null, 2));

      if (!roomInfo.enabled) {
        console.warn(`[Token Public] AVISO: Sala ${meeting.roomId100ms} está DESATIVADA no 100ms!`);
        // Optionally re-enable the room
        // await ativarSala(meeting.roomId100ms, credentials.appAccessKey, credentials.appSecret);
      }
    } catch (roomError: any) {
      console.error(`[Token Public] Erro ao verificar sala no 100ms:`, roomError.response?.data || roomError.message);
      // Continue anyway - the room might still work
    }

    // Check if user has a valid session - if so, they get host role
    const sessionUserId = (req as any).session?.userId;
    const sessionTenantId = (req as any).session?.tenantId;
    const isAuthenticatedUser = sessionUserId && sessionTenantId && sessionTenantId === meeting.tenantId;
    
    // Authenticated users from the same tenant get host role (can record)
    // Public visitors get guest role (cannot record)
    const participantRole = isAuthenticatedUser ? 'host' : 'guest';
    const participantName = userName || (isAuthenticatedUser ? 'Administrador' : 'Visitante');

    console.log(`[Token Public] Sessão detectada: userId=${sessionUserId}, tenantId=${sessionTenantId}, meetingTenant=${meeting.tenantId}`);
    console.log(`[Token Public] Usuário autenticado: ${isAuthenticatedUser ? 'SIM → role=host' : 'NÃO → role=guest'}`);
    console.log(`[Token Public] Gerando token para ${participantName} (${participantRole}) na sala ${meeting.roomId100ms}`);
    console.log(`[Token Public] Usando template_id: ${credentials.templateId || 'NÃO CONFIGURADO'}`);

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
      console.warn(`[HMS] Configuração não encontrada para tenant: ${tenantId}. Usando padrão de desenvolvimento.`);
      return null;
    }

    if (!config[0].appAccessKey || !config[0].appSecret || config[0].appAccessKey === 'pending_configuration') {
      console.warn(`[HMS] Credenciais pendentes ou inválidas para tenant: ${tenantId}`);
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
      console.warn(`[HMS] Configuração não encontrada para tenant: ${tenantId}. Usando padrão de desenvolvimento.`);
      return null;
    }

    if (!config[0].appAccessKey || !config[0].appSecret || config[0].appAccessKey === 'pending_configuration') {
      console.warn(`[HMS] Credenciais pendentes ou inválidas para tenant: ${tenantId}`);
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

// GET /api/reunioes - List local meetings with Supabase sync fallback
// STRICT MODE: Only sync from Supabase if tenant has their own credentials configured
meetingsRouter.get('/reunioes', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    
    // 1. Get local meetings (always from PostgreSQL with tenantId filter)
    let localMeetings = await db.select().from(reunioes)
      .where(eq(reunioes.tenantId, tenantId))
      .orderBy(desc(reunioes.dataInicio));

    // 2. Attempt to sync from Supabase ONLY if tenant has their own credentials (strict mode)
    // Using getClientSupabaseClientStrict to avoid fallback to incorrect credentials
    try {
      const supabase = await getClientSupabaseClientStrict(tenantId);
      if (supabase) {
        const { data: supabaseMeetings, error } = await supabase
          .from('reunioes')
          .select('*')
          .eq('tenant_id', tenantId);

        if (!error && supabaseMeetings && supabaseMeetings.length > 0) {
          console.log(`[Supabase Sync] Encontradas ${supabaseMeetings.length} reuniões no Supabase para tenant ${tenantId}`);
          
          // Basic sync: insert missing meetings into local DB
          for (const sMeeting of supabaseMeetings) {
            const exists = localMeetings.some(m => m.id === sMeeting.id);
            if (!exists) {
              await db.insert(reunioes).values({
                id: sMeeting.id,
                tenantId: tenantId,
                titulo: sMeeting.titulo,
                nome: sMeeting.nome,
                email: sMeeting.email,
                dataInicio: sMeeting.data_inicio ? new Date(sMeeting.data_inicio) : new Date(),
                dataFim: sMeeting.data_fim ? new Date(sMeeting.data_fim) : null,
                duracao: sMeeting.duracao,
                status: sMeeting.status,
                tipo: sMeeting.tipo || 'online',
                roomId100ms: sMeeting.room_id_100ms,
                linkReuniao: sMeeting.link_reuniao,
                compareceu: sMeeting.compareceu ?? false, // Preserve attendance from Supabase or default to false
                createdAt: sMeeting.created_at ? new Date(sMeeting.created_at) : new Date(),
              }).onConflictDoNothing();
            }
          }
          
          // Re-fetch local meetings after sync
          localMeetings = await db.select().from(reunioes)
            .where(eq(reunioes.tenantId, tenantId))
            .orderBy(desc(reunioes.dataInicio));
        }
      }
    } catch (syncErr) {
      console.warn(`[Supabase Sync] Falha na sincronização de entrada:`, syncErr);
    }

    res.json(localMeetings);
  } catch (error: any) {
    console.error('Erro ao listar reuniões:', error);
    res.status(500).json({ error: 'Erro ao listar reuniões', message: error.message });
  }
});

meetingsRouter.get('/reunioes/room-design', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    
    // 1. Get local config
    let [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);
    
    // 2. Attempt to sync from Supabase ONLY if tenant has their own credentials (strict mode)
    // Using getClientSupabaseClientStrict to avoid fallback to incorrect credentials
    try {
      const supabase = await getClientSupabaseClientStrict(tenantId);
      if (supabase) {
        // Tabela correta para configurações de design é hms_100ms_config no Supabase
        const { data: supabaseConfig, error } = await supabase
          .from('hms_100ms_config')
          .select('room_design_config')
          .eq('tenant_id', tenantId)
          .single();
        
        if (!error && supabaseConfig && supabaseConfig.room_design_config) {
          console.log(`[Supabase Sync] Design config encontrado no Supabase (hms_100ms_config) para tenant ${tenantId}`);
          
          if (!config) {
            [config] = await db.insert(hms100msConfig)
              .values({
                tenantId,
                appAccessKey: 'pending_configuration',
                appSecret: 'pending_configuration',
                roomDesignConfig: supabaseConfig.room_design_config,
              })
              .returning();
          } else {
            [config] = await db.update(hms100msConfig)
              .set({ roomDesignConfig: supabaseConfig.room_design_config, updatedAt: new Date() })
              .where(eq(hms100msConfig.tenantId, tenantId))
              .returning();
          }
        }
      }
    } catch (syncErr) {
      console.warn(`[Supabase Sync] Falha na sincronização de design:`, syncErr);
    }

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
    
    console.log(`[RoomDesign PATCH] Salvando config para tenant: ${tenantId}`);
    
    if (!roomDesignConfig) {
      return res.status(400).json({ error: 'Configuração de design é obrigatória' });
    }

    const validatedConfig = roomDesignConfigSchema.parse(roomDesignConfig);
    console.log(`[RoomDesign PATCH] Config validada:`, JSON.stringify(validatedConfig.colors).substring(0, 100));

    // Check if row exists for this tenant
    const [existingConfig] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, tenantId))
      .limit(1);

    let config;
    
    if (existingConfig) {
      // UPDATE existing row
      console.log(`[RoomDesign PATCH] Row exists, updating...`);
      const [updated] = await db.update(hms100msConfig)
        .set({ roomDesignConfig: validatedConfig, updatedAt: new Date() })
        .where(eq(hms100msConfig.tenantId, tenantId))
        .returning();
      config = updated;
    } else {
      // INSERT new row
      console.log(`[RoomDesign PATCH] No row exists, inserting new row...`);
      const [inserted] = await db.insert(hms100msConfig)
        .values({
          tenantId,
          appAccessKey: 'pending_configuration',
          appSecret: 'pending_configuration',
          roomDesignConfig: validatedConfig,
        })
        .returning();
      config = inserted;
    }

    if (!config) {
      console.error(`[RoomDesign PATCH] ERRO: Falha ao salvar config no PostgreSQL para tenant ${tenantId}`);
      return res.status(500).json({ error: 'Falha ao salvar configuração no banco de dados' });
    }

    console.log(`[RoomDesign PATCH] Config salva com sucesso no PostgreSQL para tenant ${tenantId}`);

    // Sincronizar com Supabase
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        const { error: supabaseError } = await supabase
          .from('hms_100ms_config')
          .upsert({
            tenant_id: tenantId,
            room_design_config: validatedConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id' });
        
        if (supabaseError) {
          console.error(`[RoomDesign PATCH] Erro ao sincronizar com Supabase:`, supabaseError);
        } else {
          console.log(`[RoomDesign PATCH] Config sincronizada com Supabase para tenant ${tenantId}`);
        }
      }
    } catch (e) {
      console.error('[RoomDesign PATCH] Erro ao sincronizar design com Supabase:', e);
    }

    res.json({ roomDesignConfig: config.roomDesignConfig });
  } catch (error: any) {
    console.error('[RoomDesign PATCH] Erro ao atualizar room design config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração de design', message: error.message });
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
      compareceu: false, // Default: not attended until someone joins
    }).returning();

    // Update with the correct meeting link using the generated UUID
    const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;
    
    // Fallback: Se for uma URL do 100ms.live (n8n), redirecionamos internamente
    // mas aqui garantimos que o link local sempre aponte para a plataforma
    await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));
    newMeeting.linkReuniao = linkReuniao;

    // Sincronizar com Supabase (Tenant) se configurado
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        console.log(`[Supabase Sync] Sincronizando reunião instantânea ${newMeeting.id} para tenant ${tenantId}`);
        
        // Ensure we are using the correct field names for Supabase
        const supabaseData = {
          id: newMeeting.id,
          tenant_id: tenantId,
          titulo: newMeeting.titulo,
          nome: newMeeting.nome || '',
          email: newMeeting.email || '',
          data_inicio: newMeeting.dataInicio instanceof Date ? newMeeting.dataInicio.toISOString() : newMeeting.dataInicio,
          data_fim: newMeeting.dataFim instanceof Date ? newMeeting.dataFim.toISOString() : newMeeting.dataFim,
          duracao: newMeeting.duracao,
          status: newMeeting.status,
          tipo: 'online',
          room_id_100ms: newMeeting.roomId100ms,
          link_reuniao: linkReuniao,
          compareceu: false, // Default: not attended until someone joins
          created_at: newMeeting.createdAt instanceof Date ? newMeeting.createdAt.toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`[Supabase Sync] Payload:`, JSON.stringify(supabaseData, null, 2));

        const { error: syncError } = await supabase
          .from('reunioes')
          .upsert(supabaseData, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Supabase Sync] Erro ao sincronizar reunião instantânea ${newMeeting.id}:`, JSON.stringify(syncError, null, 2));
        } else {
          console.log(`[Supabase Sync] Reunião instantânea ${newMeeting.id} sincronizada com sucesso no Supabase`);
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

    // Invalidar cache do calendário para exibir a nova reunião imediatamente
    try {
      await cache.delPattern(`dashboard:*:${tenantId}:calendar`);
      await cache.delPattern(`dashboard:*:${tenantId}:*`);
      console.log(`✅ Cache do calendário invalidado após criar reunião instantânea ${newMeeting.id} para tenant ${tenantId}`);
    } catch (cacheError) {
      console.error('Erro ao invalidar cache:', cacheError);
    }

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
      linkReuniao: '', // Placeholder updated later
      compareceu: false, // Default: not attended until someone joins
    }).returning();

    // Link real com o ID do banco
    const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;

    // Sincronizar com Supabase (Tenant) se configurado
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        console.log(`[Supabase Sync] Sincronizando reunião agendada ${newMeeting.id} para tenant ${tenantId}`);
        
        const supabaseData = {
          id: newMeeting.id,
          tenant_id: tenantId,
          titulo: newMeeting.titulo,
          nome: newMeeting.nome || '',
          email: newMeeting.email || '',
          data_inicio: newMeeting.dataInicio instanceof Date ? newMeeting.dataInicio.toISOString() : newMeeting.dataInicio,
          data_fim: newMeeting.dataFim instanceof Date ? newMeeting.dataFim.toISOString() : newMeeting.dataFim,
          duracao: newMeeting.duracao,
          descricao: newMeeting.descricao || '',
          status: newMeeting.status,
          tipo: newMeeting.tipo,
          room_id_100ms: newMeeting.roomId100ms,
          link_reuniao: linkReuniao,
          compareceu: false, // Default: not attended until someone joins
          created_at: newMeeting.createdAt instanceof Date ? newMeeting.createdAt.toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`[Supabase Sync] Payload agendada:`, JSON.stringify(supabaseData, null, 2));

        const { error: syncError } = await supabase
          .from('reunioes')
          .upsert(supabaseData, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Supabase Sync] Erro ao sincronizar reunião agendada ${newMeeting.id}:`, syncError);
        } else {
          console.log(`[Supabase Sync] Reunião agendada ${newMeeting.id} sincronizada com sucesso`);
        }
      }
    } catch (syncErr) {
      console.error(`[Supabase Sync] Erro inesperado ao sincronizar reunião agendada:`, syncErr);
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

    // Invalidar cache do calendário para exibir a nova reunião imediatamente
    try {
      await cache.delPattern(`dashboard:*:${tenantId}:calendar`);
      await cache.delPattern(`dashboard:*:${tenantId}:*`);
      console.log(`✅ Cache do calendário invalidado após criar reunião ${newMeeting.id} para tenant ${tenantId}`);
    } catch (cacheError) {
      console.error('Erro ao invalidar cache:', cacheError);
    }

    res.json(newMeeting);
  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ error: 'Erro ao criar reunião', message: error.message });
  }
});

// ============================================
// CANCELAR REUNIÃO - DELETE /api/reunioes/:id
// ============================================
meetingsRouter.delete('/reunioes/:id', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    console.log(`[Meetings] Cancelando reunião: ${id} (tenant: ${tenantId})`);

    // Buscar reunião
    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunião não encontrada'
      });
    }

    // Se já cancelada, retornar sucesso
    if (meeting.status === 'cancelada') {
      return res.json({
        success: true,
        message: 'Reunião já estava cancelada',
        data: meeting
      });
    }

    // Desativar sala no 100ms (se existir)
    if (meeting.roomId100ms) {
      try {
        const credentials = await get100msCredentials(tenantId);
        if (credentials) {
          const { desativarSala } = await import('../services/meetings/hms100ms');
          console.log(`[Meetings] Desativando sala 100ms: ${meeting.roomId100ms}`);
          await desativarSala(meeting.roomId100ms, credentials.appAccessKey, credentials.appSecret);
          console.log(`[Meetings] Sala 100ms desativada`);
        }
      } catch (hmsError: any) {
        console.error(`[Meetings] Erro ao desativar sala 100ms:`, hmsError.message);
      }
    }

    // Atualizar no PostgreSQL
    const [updatedMeeting] = await db.update(reunioes)
      .set({
        status: 'cancelada',
        updatedAt: new Date()
      })
      .where(eq(reunioes.id, id))
      .returning();

    // Sincronizar com Supabase (fire-and-forget)
    const syncToSupabase = async () => {
      try {
        const supabase = await getClientSupabaseClient(tenantId);
        if (supabase) {
          const { error } = await supabase
            .from('reunioes')
            .update({
              status: 'cancelada',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) {
            console.error(`[Meetings Sync] Erro ao sincronizar cancelamento:`, error);
          } else {
            console.log(`[Meetings Sync] Cancelamento sincronizado com Supabase`);
          }
        }
      } catch (err) {
        console.error(`[Meetings Sync] Erro ao sincronizar cancelamento:`, err);
      }
    };

    syncToSupabase();

    // Invalidar cache
    try {
      await cache.delPattern(`dashboard:*:${tenantId}:*`);
    } catch (cacheError) {
      console.error('Erro ao invalidar cache:', cacheError);
    }

    res.json({
      success: true,
      message: 'Reunião cancelada com sucesso',
      data: updatedMeeting
    });

  } catch (error: any) {
    console.error('[Meetings] Erro ao cancelar reunião:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao cancelar reunião',
      message: error.message
    });
  }
});

// ============================================
// REAGENDAR REUNIÃO - PATCH /api/reunioes/:id
// ============================================
meetingsRouter.patch('/reunioes/:id', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { dataInicio, dataFim, duracao } = req.body;
    console.log(`[Meetings] Reagendando reunião: ${id} (tenant: ${tenantId})`);

    if (!dataInicio) {
      return res.status(400).json({
        success: false,
        error: 'dataInicio é obrigatório'
      });
    }

    // Buscar reunião
    const [meeting] = await db.select().from(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunião não encontrada'
      });
    }

    // Não reagendar canceladas
    if (meeting.status === 'cancelada') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível reagendar uma reunião cancelada'
      });
    }

    // Calcular novas datas
    const newDataInicio = new Date(dataInicio);
    let newDataFim: Date;

    if (dataFim) {
      newDataFim = new Date(dataFim);
    } else if (duracao) {
      newDataFim = new Date(newDataInicio.getTime() + (duracao * 60 * 1000));
    } else {
      const originalDuration = meeting.duracao || 60;
      newDataFim = new Date(newDataInicio.getTime() + (originalDuration * 60 * 1000));
    }

    const newDuracao = Math.round((newDataFim.getTime() - newDataInicio.getTime()) / (1000 * 60));

    // Atualizar no PostgreSQL
    const [updatedMeeting] = await db.update(reunioes)
      .set({
        dataInicio: newDataInicio,
        dataFim: newDataFim,
        duracao: newDuracao,
        status: 'reagendada',
        updatedAt: new Date()
      })
      .where(eq(reunioes.id, id))
      .returning();

    console.log(`[Meetings] Reunião ${id} reagendada: ${newDataInicio.toISOString()}`);

    // Sincronizar com Supabase (fire-and-forget)
    const syncToSupabase = async () => {
      try {
        const supabase = await getClientSupabaseClient(tenantId);
        if (supabase) {
          const { error } = await supabase
            .from('reunioes')
            .update({
              data_inicio: newDataInicio.toISOString(),
              data_fim: newDataFim.toISOString(),
              duracao: newDuracao,
              status: 'reagendada',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) {
            console.error(`[Meetings Sync] Erro ao sincronizar reagendamento:`, error);
          } else {
            console.log(`[Meetings Sync] Reagendamento sincronizado com Supabase`);
          }
        }
      } catch (err) {
        console.error(`[Meetings Sync] Erro ao sincronizar reagendamento:`, err);
      }
    };

    syncToSupabase();

    // Invalidar cache
    try {
      await cache.delPattern(`dashboard:*:${tenantId}:*`);
    } catch (cacheError) {
      console.error('Erro ao invalidar cache:', cacheError);
    }

    res.json({
      success: true,
      message: 'Reunião reagendada com sucesso',
      data: updatedMeeting
    });

  } catch (error: any) {
    console.error('[Meetings] Erro ao reagendar reunião:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao reagendar reunião',
      message: error.message
    });
  }
});

// GET /api/100ms/get-token - Get 100ms token for authenticated users (always HOST)
meetingsRouter.post('/100ms/get-token', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, name } = req.body;
    const tenantId = req.user!.tenantId;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId é obrigatório' });
    }

    const credentials = await get100msCredentials(tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas' });
    }

    // Authenticated users entering through the platform are always hosts
    const role = 'host';

    const token = gerarTokenParticipante(
      roomId,
      name || req.user?.nome || 'Admin',
      role,
      credentials.appAccessKey,
      credentials.appSecret
    );

    res.json({ token, role });
  } catch (error: any) {
    console.error('Erro ao gerar token:', error);
    res.status(500).json({ error: 'Erro ao gerar token', message: error.message });
  }
});

meetingsRouter.post('/reunioes/:id/token', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { userName } = req.body;

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

    // Authenticated users through the platform are ALWAYS hosts (can record)
    const role = 'host';
    const userId = userName || req.user?.nome || nanoid(8);
    console.log(`[Token Authenticated] Gerando token para ${userId} (${role}) na sala ${meeting.roomId100ms}`);
    
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

    // Sync to Supabase (async, non-blocking)
    try {
      const supabase = await getClientSupabaseClient(meeting.tenantId);
      if (supabase) {
        console.log(`[Recording Start Sync] Sincronizando gravação iniciada ${gravacao.id} para tenant ${tenantId}`);
        const toISOString = (date: Date | string | null | undefined): string | null => {
          if (!date) return null;
          if (date instanceof Date) return date.toISOString();
          if (typeof date === 'string') return date;
          return null;
        };

        const { error: syncError } = await supabase
          .from('gravacoes')
          .upsert({
            id: gravacao.id,
            reuniao_id: gravacao.reuniaoId,
            tenant_id: gravacao.tenantId,
            room_id_100ms: gravacao.roomId100ms || null,
            session_id_100ms: gravacao.sessionId100ms || null,
            recording_id_100ms: gravacao.recordingId100ms || null,
            status: gravacao.status || 'recording',
            started_at: toISOString(gravacao.startedAt),
            created_at: toISOString(gravacao.createdAt),
          }, { onConflict: 'id' });

        if (syncError) {
          console.error(`[Recording Start Sync] Erro ao sincronizar gravação ${gravacao.id}:`, syncError);
        }
      }
    } catch (e) {
      console.error('Erro ao sincronizar gravação inicial com Supabase:', e);
    }

    res.json({ success: true, recording: gravacao });
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

    // Update the recording record
    const [gravacao] = await db.update(gravacoes)
      .set({
        status: 'processing',
        stoppedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(gravacoes.reuniaoId, meeting.id),
        eq(gravacoes.status, 'recording')
      ))
      .returning();

    // Sync to Supabase (async, non-blocking)
    if (gravacao) {
      try {
        const supabase = await getClientSupabaseClient(meeting.tenantId);
        if (supabase) {
          console.log(`[Recording Stop Sync] Sincronizando gravação parada ${gravacao.id} para tenant ${tenantId}`);
          const toISOString = (date: Date | string | null | undefined): string | null => {
            if (!date) return null;
            if (date instanceof Date) return date.toISOString();
            if (typeof date === 'string') return date;
            return null;
          };

          const { error: syncError } = await supabase
            .from('gravacoes')
            .upsert({
              id: gravacao.id,
              status: 'processing',
              stopped_at: toISOString(gravacao.stoppedAt),
              updated_at: toISOString(gravacao.updatedAt),
            }, { onConflict: 'id' });

          if (syncError) {
            console.error(`[Recording Stop Sync] Erro ao sincronizar gravação ${gravacao.id}:`, syncError);
          }
        }
      } catch (e) {
        console.error('Erro ao sincronizar parada de gravação com Supabase:', e);
      }
    }

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Erro ao parar gravação:', error);
    res.status(500).json({ error: 'Erro ao parar gravação', message: error.message });
  }
});

// GET /api/reunioes/:id - Get single meeting
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
    console.error('Erro ao obter reunião:', error);
    res.status(500).json({ error: 'Erro ao obter reunião', message: error.message });
  }
});

// DELETE /api/reunioes/:id - Delete meeting
meetingsRouter.delete('/reunioes/:id', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Delete locally
    const [meeting] = await db.delete(reunioes)
      .where(and(eq(reunioes.id, id), eq(reunioes.tenantId, tenantId)))
      .returning();

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    // Delete from Supabase
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        await supabase
          .from('reunioes')
          .delete()
          .eq('id', id);
      }
    } catch (e) {
      console.error('Erro ao excluir do Supabase:', e);
    }

    // Invalidar cache
    await cache.delPattern(`dashboard:*:${tenantId}:*`);

    res.json({ success: true, meeting });
  } catch (error: any) {
    console.error('Erro ao excluir reunião:', error);
    res.status(500).json({ error: 'Erro ao excluir reunião', message: error.message });
  }
});

// PUBLIC endpoint - Get participant data from form submission for signature pre-fill
// PRIORITY: Supabase do cliente (external) > PostgreSQL local
// Can be called by: phone, email, or formSubmissionId stored in meeting metadata
// For signature flow: Always return full data to pre-fill contract (client is signing their own data)
publicRoomDesignRouter.get('/reunioes/:id/participant-data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phone, email } = req.query;
    
    console.log(`[ParticipantData] Buscando dados para reunião ${id}, phone=${phone}, email=${email}`);

    // 1. Get the meeting - try Supabase first, then local DB
    let meeting: any = null;
    let supabaseClient: any = null;
    
    // Try to get Supabase client
    try {
      const { getClienteSupabase, isClienteSupabaseConfigured } = await import('../lib/clienteSupabase.js');
      if (await isClienteSupabaseConfigured()) {
        supabaseClient = await getClienteSupabase();
        console.log('[ParticipantData] Supabase do cliente configurado, buscando dados externos');
      }
    } catch (e) {
      console.log('[ParticipantData] Supabase do cliente não disponível, usando banco local');
    }
    
    // Check if id is a valid UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Try Supabase first for meeting
    if (supabaseClient) {
      if (isUUID) {
        const { data: supabaseMeeting } = await supabaseClient
          .from('reunioes')
          .select('*')
          .eq('id', id)
          .single();
        if (supabaseMeeting) meeting = supabaseMeeting;
      }
      
      if (!meeting) {
        const { data: supabaseMeeting } = await supabaseClient
          .from('reunioes')
          .select('*')
          .eq('room_id_100ms', id)
          .single();
        if (supabaseMeeting) meeting = supabaseMeeting;
      }
    }
    
    // Fallback to local DB
    if (!meeting) {
      if (isUUID) {
        const [m] = await db.select().from(reunioes)
          .where(eq(reunioes.id, id))
          .limit(1);
        meeting = m;
      }
      
      if (!meeting) {
        console.log(`[ParticipantData] ID ${id} não é UUID ou não encontrado, tentando por roomId100ms`);
        const [m] = await db.select().from(reunioes)
          .where(eq(reunioes.roomId100ms, id))
          .limit(1);
        meeting = m;
      }
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    // Normalize field names (Supabase uses snake_case, local uses camelCase)
    const meetingPhone = meeting.telefone || meeting.phone;
    const meetingEmail = meeting.email;
    const meetingName = meeting.nome || meeting.name;
    const meetingId = meeting.id;
    
    // Get tenantId from meeting for security filtering (used in all queries)
    const meetingTenantId = meeting.tenant_id || meeting.tenantId;
    console.log(`[ParticipantData] Reunião encontrada: ${meetingId}, telefone: ${meetingPhone}, email: ${meetingEmail}, tenantId: ${meetingTenantId || 'não definido'}`);

    // 2. Try to find form submission - Supabase first, then local
    // SECURITY: All queries are scoped by tenantId to prevent cross-tenant data leakage
    let submission: any = null;
    
    // Normalize phone for search (remove @s.whatsapp.net and non-digits)
    const normalizePhone = (p: string) => p?.replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '') || '';
    const searchPhone = normalizePhone(String(phone || meetingPhone || ''));
    const searchEmail = String(email || meetingEmail || '').toLowerCase();
    const phoneLastDigits = searchPhone.slice(-9);
    
    // Try Supabase first - try WITH tenant filter first, then WITHOUT if not found
    if (supabaseClient && !submission) {
      // Try by phone - create flexible pattern that works with formatted phones like "(31) 9226-7220"
      if (searchPhone) {
        // Create pattern: for "9226720" -> "%9%2%2%6%7%2%0" to match formatted phones
        const flexiblePhonePattern = '%' + phoneLastDigits.split('').join('%') + '%';
        console.log(`[ParticipantData] Supabase: buscando por telefone, padrão flexível: ${flexiblePhonePattern}, tenantId: ${meetingTenantId || 'nenhum'}`);
        
        // First try with tenant filter
        if (meetingTenantId) {
          const { data: subs, error } = await supabaseClient
            .from('form_submissions')
            .select('*')
            .ilike('contact_phone', flexiblePhonePattern)
            .eq('tenant_id', meetingTenantId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.log(`[ParticipantData] Supabase erro (com tenant): ${error.message}`);
          }
          if (subs && subs.length > 0) {
            submission = subs[0];
            console.log(`[ParticipantData] Supabase: encontrado por telefone (com tenant): ${submission.id}`);
          }
        }
        
        // If not found with tenant, try without tenant filter (backward compatibility)
        if (!submission) {
          const { data: subs, error } = await supabaseClient
            .from('form_submissions')
            .select('*')
            .ilike('contact_phone', flexiblePhonePattern)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.log(`[ParticipantData] Supabase erro (sem tenant): ${error.message}`);
          }
          if (subs && subs.length > 0) {
            submission = subs[0];
            console.log(`[ParticipantData] Supabase: encontrado por telefone (sem tenant): ${submission.id}, tenant_id do registro: ${submission.tenant_id}`);
          }
        }
      }
      
      // Try by email
      if (!submission && searchEmail) {
        console.log(`[ParticipantData] Supabase: buscando por email: ${searchEmail}`);
        
        // First try with tenant filter
        if (meetingTenantId) {
          const { data: subs, error } = await supabaseClient
            .from('form_submissions')
            .select('*')
            .ilike('contact_email', searchEmail)
            .eq('tenant_id', meetingTenantId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.log(`[ParticipantData] Supabase email erro (com tenant): ${error.message}`);
          }
          if (subs && subs.length > 0) {
            submission = subs[0];
            console.log(`[ParticipantData] Supabase: encontrado por email (com tenant): ${submission.id}`);
          }
        }
        
        // If not found with tenant, try without tenant filter
        if (!submission) {
          const { data: subs, error } = await supabaseClient
            .from('form_submissions')
            .select('*')
            .ilike('contact_email', searchEmail)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.log(`[ParticipantData] Supabase email erro (sem tenant): ${error.message}`);
          }
          if (subs && subs.length > 0) {
            submission = subs[0];
            console.log(`[ParticipantData] Supabase: encontrado por email (sem tenant): ${submission.id}, tenant_id do registro: ${submission.tenant_id}`);
          }
        }
      }
    }
    
    // Fallback to local DB with tenant filtering
    if (!submission && searchPhone) {
      console.log(`[ParticipantData] Local DB: buscando por telefone: ${phoneLastDigits}`);
      let whereCondition = sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${phoneLastDigits}`;
      if (meetingTenantId) {
        whereCondition = sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${phoneLastDigits} AND ${formSubmissions.tenantId} = ${meetingTenantId}`;
      }
      const [sub] = await db.select().from(formSubmissions)
        .where(whereCondition)
        .orderBy(desc(formSubmissions.createdAt))
        .limit(1);
      submission = sub;
    }

    if (!submission && searchEmail) {
      console.log(`[ParticipantData] Local DB: buscando por email: ${searchEmail}`);
      let whereCondition = sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${searchEmail})`;
      if (meetingTenantId) {
        whereCondition = sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${searchEmail}) AND ${formSubmissions.tenantId} = ${meetingTenantId}`;
      }
      const [sub] = await db.select().from(formSubmissions)
        .where(whereCondition)
        .orderBy(desc(formSubmissions.createdAt))
        .limit(1);
      submission = sub;
    }

    if (!submission) {
      console.log(`[ParticipantData] Nenhum form_submission encontrado, buscando dados do lead...`);
      
      // Try to find lead data by phone or email (leads have CPF and other data)
      let lead: any = null;
      
      // Search lead in Supabase first with tenant filtering
      if (supabaseClient && !lead) {
        if (searchPhone) {
          console.log(`[ParticipantData] Supabase: buscando lead por telefone (últimos 9 dígitos): ${phoneLastDigits}`);
          let query = supabaseClient
            .from('leads')
            .select('*')
            .ilike('telefone_normalizado', `%${phoneLastDigits}`);
          
          // Add tenant filter if available
          if (meetingTenantId) {
            query = query.eq('tenant_id', meetingTenantId);
          }
          
          const { data: leadData } = await query
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (leadData && leadData.length > 0) {
            lead = leadData[0];
            console.log(`[ParticipantData] Supabase: lead encontrado por telefone: ${lead.id}`);
          }
        }
        
        if (!lead && searchEmail) {
          console.log(`[ParticipantData] Supabase: buscando lead por email: ${searchEmail}`);
          let query = supabaseClient
            .from('leads')
            .select('*')
            .ilike('email', searchEmail);
          
          // Add tenant filter if available
          if (meetingTenantId) {
            query = query.eq('tenant_id', meetingTenantId);
          }
          
          const { data: leadData } = await query
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (leadData && leadData.length > 0) {
            lead = leadData[0];
            console.log(`[ParticipantData] Supabase: lead encontrado por email: ${lead.id}`);
          }
        }
      }
      
      // Fallback to local DB for lead with tenant filtering
      if (!lead && searchPhone) {
        console.log(`[ParticipantData] Local DB: buscando lead por telefone: ${phoneLastDigits}`);
        let whereCondition = sql`${leads.telefoneNormalizado} LIKE '%' || ${phoneLastDigits}`;
        if (meetingTenantId) {
          whereCondition = sql`${leads.telefoneNormalizado} LIKE '%' || ${phoneLastDigits} AND ${leads.tenantId} = ${meetingTenantId}`;
        }
        const [leadResult] = await db.select().from(leads)
          .where(whereCondition)
          .orderBy(desc(leads.createdAt))
          .limit(1);
        lead = leadResult;
      }
      
      if (!lead && searchEmail) {
        console.log(`[ParticipantData] Local DB: buscando lead por email: ${searchEmail}`);
        let whereCondition = sql`LOWER(${leads.email}) = LOWER(${searchEmail})`;
        if (meetingTenantId) {
          whereCondition = sql`LOWER(${leads.email}) = LOWER(${searchEmail}) AND ${leads.tenantId} = ${meetingTenantId}`;
        }
        const [leadResult] = await db.select().from(leads)
          .where(whereCondition)
          .orderBy(desc(leads.createdAt))
          .limit(1);
        lead = leadResult;
      }
      
      if (lead) {
        // Lead found - return lead data with CPF
        const leadName = lead.nome || lead.name || meetingName;
        const leadEmail = lead.email || meetingEmail;
        const leadPhone = lead.telefone || lead.phone || meetingPhone;
        const leadCpf = lead.cpf || lead.cpf_normalizado || lead.cpfNormalizado;
        
        console.log(`[ParticipantData] Lead encontrado: ${lead.id}, nome: ${leadName}, cpf: ${leadCpf ? 'presente' : 'ausente'}`);
        
        // Try to get address data from form_submissions
        // First try by submission_id if available, otherwise search by phone/email
        let addressData: any = {};
        let addressSubmission: any = null;
        
        const subId = lead.submission_id || lead.submissionId;
        
        if (supabaseClient) {
          // Try by submission_id first
          if (subId) {
            console.log(`[ParticipantData] Buscando submission por ID: ${subId}`);
            const { data: subData } = await supabaseClient
              .from('form_submissions')
              .select('*')
              .eq('id', subId)
              .single();
            if (subData) {
              addressSubmission = subData;
            }
          }
          
          // If no submission found, search by phone/email with tenant filter
          if (!addressSubmission && searchPhone) {
            console.log(`[ParticipantData] Buscando submission por telefone para endereço...`);
            let query = supabaseClient
              .from('form_submissions')
              .select('*')
              .ilike('contact_phone', `%${phoneLastDigits}`);
            
            if (meetingTenantId) {
              query = query.eq('tenant_id', meetingTenantId);
            }
            
            const { data: subs } = await query
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (subs && subs.length > 0) {
              addressSubmission = subs[0];
              console.log(`[ParticipantData] Submission encontrada por telefone: ${addressSubmission.id}`);
            }
          }
          
          if (!addressSubmission && searchEmail) {
            console.log(`[ParticipantData] Buscando submission por email para endereço...`);
            let query = supabaseClient
              .from('form_submissions')
              .select('*')
              .ilike('contact_email', searchEmail);
            
            if (meetingTenantId) {
              query = query.eq('tenant_id', meetingTenantId);
            }
            
            const { data: subs } = await query
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (subs && subs.length > 0) {
              addressSubmission = subs[0];
              console.log(`[ParticipantData] Submission encontrada por email: ${addressSubmission.id}`);
            }
          }
          
          // Extract address data from submission
          if (addressSubmission) {
            addressData = {
              cep: addressSubmission.address_cep,
              rua: addressSubmission.address_street,
              numero: addressSubmission.address_number,
              complemento: addressSubmission.address_complement,
              bairro: addressSubmission.address_neighborhood,
              cidade: addressSubmission.address_city,
              estado: addressSubmission.address_state
            };
            console.log(`[ParticipantData] Endereço encontrado: ${addressData.rua || 'vazio'}, ${addressData.cidade || 'vazio'}`);
          }
        } else {
          // Local DB - try by submission_id first
          if (subId) {
            const [subData] = await db.select().from(formSubmissions)
              .where(eq(formSubmissions.id, subId))
              .limit(1);
            if (subData) {
              addressSubmission = subData;
            }
          }
          
          // If no submission, search by phone
          if (!addressSubmission && searchPhone) {
            let whereCondition = sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${phoneLastDigits}`;
            if (meetingTenantId) {
              whereCondition = sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${phoneLastDigits} AND ${formSubmissions.tenantId} = ${meetingTenantId}`;
            }
            const [subData] = await db.select().from(formSubmissions)
              .where(whereCondition)
              .orderBy(desc(formSubmissions.createdAt))
              .limit(1);
            if (subData) {
              addressSubmission = subData;
            }
          }
          
          // If no submission, search by email  
          if (!addressSubmission && searchEmail) {
            let whereCondition = sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${searchEmail})`;
            if (meetingTenantId) {
              whereCondition = sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${searchEmail}) AND ${formSubmissions.tenantId} = ${meetingTenantId}`;
            }
            const [subData] = await db.select().from(formSubmissions)
              .where(whereCondition)
              .orderBy(desc(formSubmissions.createdAt))
              .limit(1);
            if (subData) {
              addressSubmission = subData;
            }
          }
          
          // Extract address data
          if (addressSubmission) {
            addressData = {
              cep: addressSubmission.addressCep,
              rua: addressSubmission.addressStreet,
              numero: addressSubmission.addressNumber,
              complemento: addressSubmission.addressComplement,
              bairro: addressSubmission.addressNeighborhood,
              cidade: addressSubmission.addressCity,
              estado: addressSubmission.addressState
            };
          }
        }
        
        // Also get CPF from submission if lead doesn't have it
        const finalCpf = leadCpf || addressSubmission?.cpf || addressSubmission?.cpf_normalizado;
        
        return res.json({
          found: true,
          source: 'lead',
          leadId: lead.id,
          submissionId: addressSubmission?.id,
          participantData: {
            nome: leadName,
            email: leadEmail,
            telefone: leadPhone?.replace(/@s\.whatsapp\.net/g, ''),
            cpf: finalCpf,
            endereco: Object.keys(addressData).some(k => addressData[k]) ? addressData : undefined
          },
          meetingData: {
            id: meetingId,
            titulo: meeting.titulo || meeting.title,
            source: supabaseClient ? 'supabase' : 'local'
          }
        });
      }
      
      // No lead found - try one more time to find submission by phone/email for address data
      console.log(`[ParticipantData] Nenhum lead encontrado, tentando buscar submission diretamente para dados...`);
      
      let lastChanceSubmission: any = null;
      const meetingTenantId2 = meeting.tenant_id || meeting.tenantId;
      
      if (supabaseClient && searchPhone) {
        let query = supabaseClient
          .from('form_submissions')
          .select('*')
          .ilike('contact_phone', `%${phoneLastDigits}`);
        
        if (meetingTenantId2) {
          query = query.eq('tenant_id', meetingTenantId2);
        }
        
        const { data: subs } = await query
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (subs && subs.length > 0) {
          lastChanceSubmission = subs[0];
        }
      }
      
      if (!lastChanceSubmission && supabaseClient && searchEmail) {
        let query = supabaseClient
          .from('form_submissions')
          .select('*')
          .ilike('contact_email', searchEmail);
        
        if (meetingTenantId2) {
          query = query.eq('tenant_id', meetingTenantId2);
        }
        
        const { data: subs } = await query
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (subs && subs.length > 0) {
          lastChanceSubmission = subs[0];
        }
      }
      
      if (lastChanceSubmission) {
        console.log(`[ParticipantData] Submission encontrada na última tentativa: ${lastChanceSubmission.id}`);
        const subCpf = lastChanceSubmission.cpf || lastChanceSubmission.cpf_normalizado;
        const addressData = {
          cep: lastChanceSubmission.address_cep,
          rua: lastChanceSubmission.address_street,
          numero: lastChanceSubmission.address_number,
          complemento: lastChanceSubmission.address_complement,
          bairro: lastChanceSubmission.address_neighborhood,
          cidade: lastChanceSubmission.address_city,
          estado: lastChanceSubmission.address_state
        };
        
        return res.json({
          found: true,
          source: 'form_submission_fallback',
          submissionId: lastChanceSubmission.id,
          participantData: {
            nome: lastChanceSubmission.contact_name || lastChanceSubmission.name || meetingName,
            email: lastChanceSubmission.contact_email || meetingEmail,
            telefone: (lastChanceSubmission.contact_phone || meetingPhone)?.replace(/@s\.whatsapp\.net/g, ''),
            cpf: subCpf,
            endereco: Object.keys(addressData).some(k => addressData[k]) ? addressData : undefined
          },
          meetingData: {
            id: meetingId,
            titulo: meeting.titulo || meeting.title,
            source: 'supabase'
          }
        });
      }
      
      // Nothing found - return basic meeting data
      console.log(`[ParticipantData] Nenhum lead ou submission encontrado, usando dados básicos da reunião`);
      return res.json({ 
        found: false,
        message: 'Nenhum formulário ou lead encontrado para este participante',
        meetingData: {
          nome: meetingName,
          email: meetingEmail,
          telefone: meetingPhone
        }
      });
    }

    // Normalize submission field names (Supabase uses snake_case)
    const contactName = submission.contact_name || submission.contactName;
    const contactEmail = submission.contact_email || submission.contactEmail;
    const contactPhone = submission.contact_phone || submission.contactPhone;
    const contactCpf = submission.contact_cpf || submission.contactCpf;
    const instagramHandle = submission.instagram_handle || submission.instagramHandle;
    const birthDate = submission.birth_date || submission.birthDate;
    const addressCep = submission.address_cep || submission.addressCep;
    const addressStreet = submission.address_street || submission.addressStreet;
    const addressNumber = submission.address_number || submission.addressNumber;
    const addressComplement = submission.address_complement || submission.addressComplement;
    const addressNeighborhood = submission.address_neighborhood || submission.addressNeighborhood;
    const addressCity = submission.address_city || submission.addressCity;
    const addressState = submission.address_state || submission.addressState;

    console.log(`[ParticipantData] Form submission encontrado: ${submission.id}, nome: ${contactName}, cpf: ${contactCpf ? 'presente' : 'ausente'}`);
    console.log(`[ParticipantData] Endereço: CEP=${addressCep}, Rua=${addressStreet}, Num=${addressNumber}, Cidade=${addressCity}, Estado=${addressState}`);

    // For signature flow, return full data (client is signing their own contract)
    // This is the client's own data that they already provided in the form
    res.json({
      found: true,
      formSubmissionId: submission.id,
      participantData: {
        nome: contactName,
        email: contactEmail,
        telefone: contactPhone,
        cpf: contactCpf,
        instagram: instagramHandle,
        dataNascimento: birthDate,
        endereco: {
          cep: addressCep,
          rua: addressStreet,
          numero: addressNumber,
          complemento: addressComplement,
          bairro: addressNeighborhood,
          cidade: addressCity,
          estado: addressState
        }
      },
      meetingData: {
        id: meetingId,
        titulo: meeting.titulo || meeting.title,
        source: supabaseClient ? 'supabase' : 'local'
      }
    });
  } catch (error: any) {
    console.error('[ParticipantData] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do participante', message: error.message });
  }
});

// GET /api/gravacoes - List recordings
meetingsRouter.get('/gravacoes', authenticateToken, requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    
    // 1. Get local recordings
    let localRecordings = await db.select().from(gravacoes)
      .where(eq(gravacoes.tenantId, tenantId))
      .orderBy(desc(gravacoes.createdAt));

    // 2. Attempt to sync from Supabase
    try {
      const supabase = await getClientSupabaseClient(tenantId);
      if (supabase) {
        const { data: supabaseRecordings, error } = await supabase
          .from('gravacoes')
          .select('*')
          .eq('tenant_id', tenantId);

        if (!error && supabaseRecordings && supabaseRecordings.length > 0) {
          // Sync missing recordings
          for (const sRec of supabaseRecordings) {
            const exists = localRecordings.some(r => r.id === sRec.id);
            if (!exists) {
              await db.insert(gravacoes).values({
                id: sRec.id,
                reuniaoId: sRec.reuniao_id,
                tenantId: tenantId,
                roomId100ms: sRec.room_id_100ms,
                sessionId100ms: sRec.session_id_100ms,
                recordingId100ms: sRec.recording_id_100ms,
                assetId: sRec.asset_id,
                status: sRec.status,
                startedAt: sRec.started_at ? new Date(sRec.started_at) : new Date(),
                stoppedAt: sRec.stopped_at ? new Date(sRec.stopped_at) : null,
                duration: sRec.duration,
                fileUrl: sRec.file_url,
                fileSize: sRec.file_size,
                thumbnailUrl: sRec.thumbnail_url,
                metadata: sRec.metadata,
                createdAt: sRec.created_at ? new Date(sRec.created_at) : new Date(),
              }).onConflictDoNothing();
            }
          }
          
          // Re-fetch local recordings after sync
          localRecordings = await db.select().from(gravacoes)
            .where(eq(gravacoes.tenantId, tenantId))
            .orderBy(desc(gravacoes.createdAt));
        }
      }
    } catch (syncErr) {
      console.warn(`[Supabase Sync] Falha na sincronização de gravações:`, syncErr);
    }

    res.json(localRecordings);
  } catch (error: any) {
    console.error('Erro ao listar gravações:', error);
    res.status(500).json({ error: 'Erro ao listar gravações', message: error.message });
  }
});

// POST /api/reunioes/registrar-presenca - Register attendance (public endpoint)
// This endpoint is called by the frontend when a user joins a meeting
publicRoomDesignRouter.post('/reunioes/registrar-presenca', async (req: Request, res: Response) => {
  try {
    const { room_id, room_id_100ms, usuario_id, nome } = req.body;
    
    // Accept either room_id or room_id_100ms
    const roomId = room_id_100ms || room_id;
    
    if (!roomId) {
      return res.status(400).json({ 
        error: 'room_id ou room_id_100ms é obrigatório',
        message: 'Informe o ID da sala para registrar a presença'
      });
    }

    console.log(`[Presença] Registrando presença na sala ${roomId} para usuário: ${nome || usuario_id || 'anônimo'}`);

    // Find the meeting by 100ms room ID
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.roomId100ms, roomId))
      .limit(1);

    if (!meeting) {
      console.warn(`[Presença] Reunião não encontrada para roomId: ${roomId}`);
      return res.status(404).json({ 
        error: 'Reunião não encontrada',
        message: 'Nenhuma reunião encontrada com este room_id'
      });
    }

    // Check if already marked as attended
    if (meeting.compareceu === true) {
      console.log(`[Presença] Presença já registrada para reunião ${meeting.id}`);
      return res.json({ 
        success: true, 
        message: 'Presença já estava registrada',
        meetingId: meeting.id,
        alreadyRegistered: true
      });
    }

    // Update compareceu to true in PostgreSQL
    await db.update(reunioes)
      .set({ 
        compareceu: true,
        updatedAt: new Date()
      })
      .where(eq(reunioes.id, meeting.id));

    console.log(`✅ [Presença] Presença registrada com sucesso para reunião ${meeting.id} (sala: ${roomId})`);

    // Sync to Supabase (async, non-blocking)
    const syncToSupabase = async () => {
      try {
        const supabase = await getClientSupabaseClient(meeting.tenantId);
        if (supabase) {
          const { error } = await supabase
            .from('reunioes')
            .update({ 
              compareceu: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', meeting.id);

          if (error) {
            console.error(`[Presença Sync] Erro ao sincronizar presença com Supabase:`, error);
          } else {
            console.log(`✅ [Presença Sync] Presença sincronizada com Supabase para reunião ${meeting.id}`);
          }
        }
      } catch (err) {
        console.error(`[Presença Sync] Erro inesperado:`, err);
      }
    };

    // Fire and forget - don't block the response
    syncToSupabase();

    res.json({ 
      success: true, 
      message: `Presença registrada para ${nome || usuario_id || 'participante'} na sala ${roomId}`,
      meetingId: meeting.id,
      alreadyRegistered: false
    });

  } catch (error: any) {
    console.error('[Presença] Erro ao registrar presença:', error);
    res.status(500).json({ 
      error: 'Erro ao registrar presença',
      message: error.message 
    });
  }
});
