import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import { reunioes, gravacoes, hms100msConfig, formSubmissions, leads } from "../../shared/db-schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { decrypt } from "../lib/credentialsManager";
import { gerarTokenParticipante, criarSala, obterSala, iniciarGravacao, pararGravacao, obterGravacao, listarGravacoesSala, obterUrlPresignadaAsset } from "../services/meetings/hms100ms";
import { getClientSupabaseClient, getClientSupabaseClientStrict } from "../lib/multiTenantSupabase";
import { nanoid } from "nanoid";
import { z } from "zod";
import { cache } from "../lib/cache";
import { getCachedMeeting, setCachedMeeting } from "../lib/publicCache";

export const meetingsRouter = Router();
export const publicRoomDesignRouter = Router();

// Helper function to sync recording to Supabase
async function syncRecordingToSupabase(tenantId: string, recording: any) {
  try {
    const supabase = await getClientSupabaseClient(tenantId);
    if (!supabase) {
      console.log(`[Recording Sync] Supabase não configurado para tenant ${tenantId} - gravação apenas local`);
      return;
    }

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
    }
  } catch (err) {
    console.error(`[Recording Sync] Erro inesperado ao sincronizar gravação:`, err);
  }
}

// ===========================================
// PUBLIC ROUTES - Participant Data by participant_id
// ===========================================

// Get participant data by participant_id or form_submission_id (for contract pre-fill)
publicRoomDesignRouter.get('/reunioes/:meetingId/participant-data', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const { pid, fsid } = req.query;

    console.log(`[ParticipantData] Buscando dados para meeting ${meetingId}, pid=${pid || 'nenhum'}, fsid=${fsid || 'nenhum'}`);

    // First, get the meeting to find tenantId
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    let formSubmission = null;

    // Method 0 (PRIORITY): Use fsid (form_submission_id) directly from URL - MOST RELIABLE
    // This is the best method because each form_submission has a unique ID
    // Works even when multiple participants share the same meeting URL
    if (fsid && typeof fsid === 'string') {
      console.log(`[ParticipantData] Buscando form_submission por fsid (ID direto): ${fsid}`);
      const [sub] = await db.select().from(formSubmissions)
        .where(eq(formSubmissions.id, fsid))
        .limit(1);
      
      if (sub) {
        formSubmission = sub;
        console.log(`[ParticipantData] ✅ Encontrado por fsid: ${sub.id} - ${sub.contactName}`);
      }
    }

    // Method 1: Use participant_id from URL query parameter
    if (!formSubmission && pid && typeof pid === 'string') {
      console.log(`[ParticipantData] Buscando form_submission por participant_id: ${pid}`);
      const [sub] = await db.select().from(formSubmissions)
        .where(eq(formSubmissions.participantId, pid))
        .limit(1);
      
      if (sub) {
        formSubmission = sub;
        console.log(`[ParticipantData] Encontrado por participant_id: ${sub.id}`);
      }
    }

    // Method 2: Fallback to meeting's participantId column
    if (!formSubmission && meeting.participantId) {
      console.log(`[ParticipantData] Buscando por meeting.participantId: ${meeting.participantId}`);
      const [sub] = await db.select().from(formSubmissions)
        .where(eq(formSubmissions.participantId, meeting.participantId))
        .limit(1);
      
      if (sub) {
        formSubmission = sub;
        console.log(`[ParticipantData] Encontrado por meeting.participantId: ${sub.id}`);
      }
    }

    // Method 3: Fallback to metadata.formSubmissionId (legacy)
    if (!formSubmission) {
      const metadata = meeting.metadata as any;
      if (metadata?.formSubmissionId) {
        console.log(`[ParticipantData] Buscando por metadata.formSubmissionId: ${metadata.formSubmissionId}`);
        const [sub] = await db.select().from(formSubmissions)
          .where(eq(formSubmissions.id, metadata.formSubmissionId))
          .limit(1);
        
        if (sub) {
          formSubmission = sub;
          console.log(`[ParticipantData] Encontrado por formSubmissionId: ${sub.id}`);
        }
      }
    }

    // Method 4: Fallback to matching by phone/email from meeting data
    if (!formSubmission) {
      const normalizedPhone = meeting.telefone?.replace(/\D/g, '') || '';
      
      if (normalizedPhone && normalizedPhone.length >= 8) {
        console.log(`[ParticipantData] Buscando por telefone: ${normalizedPhone}`);
        const [sub] = await db.select().from(formSubmissions)
          .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${normalizedPhone} || '%'`)
          .orderBy(desc(formSubmissions.createdAt))
          .limit(1);
        
        if (sub) {
          formSubmission = sub;
          console.log(`[ParticipantData] Encontrado por telefone: ${sub.id}`);
        }
      }
      
      if (!formSubmission && meeting.email) {
        console.log(`[ParticipantData] Buscando por email: ${meeting.email}`);
        const [sub] = await db.select().from(formSubmissions)
          .where(sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${meeting.email})`)
          .orderBy(desc(formSubmissions.createdAt))
          .limit(1);
        
        if (sub) {
          formSubmission = sub;
          console.log(`[ParticipantData] Encontrado por email: ${sub.id}`);
        }
      }
    }

    // Prepare response data
    let responseData: any = null;
    
    // If we have formSubmission from local DB, check if it has complete data
    if (formSubmission) {
      responseData = {
        nome: formSubmission.contactName,
        email: formSubmission.contactEmail,
        telefone: formSubmission.contactPhone,
        cpf: formSubmission.contactCpf,
        instagram: formSubmission.instagramHandle,
        dataNascimento: formSubmission.birthDate,
        endereco: {
          cep: formSubmission.addressCep,
          logradouro: formSubmission.addressStreet,
          numero: formSubmission.addressNumber,
          complemento: formSubmission.addressComplement,
          bairro: formSubmission.addressNeighborhood,
          cidade: formSubmission.addressCity,
          estado: formSubmission.addressState
        }
      };
    }
    
    // If local data is incomplete, try to fetch from Supabase tenant
    const hasCompleteData = responseData?.nome && responseData?.cpf;
    if (!hasCompleteData && (fsid || formSubmission?.id)) {
      const submissionId = fsid || formSubmission?.id;
      console.log(`[ParticipantData] Dados locais incompletos, buscando no Supabase do tenant: ${meeting.tenantId}`);
      
      try {
        const supabase = await getClientSupabaseClient(meeting.tenantId);
        if (supabase) {
          const { data: supabaseSubmission, error } = await supabase
            .from('form_submissions')
            .select('*')
            .eq('id', submissionId)
            .single();
          
          if (supabaseSubmission && !error) {
            console.log(`[ParticipantData] ✅ Dados encontrados no Supabase: ${supabaseSubmission.contact_name}`);
            responseData = {
              nome: supabaseSubmission.contact_name,
              email: supabaseSubmission.contact_email,
              telefone: supabaseSubmission.contact_phone,
              cpf: supabaseSubmission.contact_cpf,
              instagram: supabaseSubmission.instagram_handle,
              dataNascimento: supabaseSubmission.birth_date,
              endereco: {
                cep: supabaseSubmission.address_cep,
                logradouro: supabaseSubmission.address_street,
                numero: supabaseSubmission.address_number,
                complemento: supabaseSubmission.address_complement,
                bairro: supabaseSubmission.address_neighborhood,
                cidade: supabaseSubmission.address_city,
                estado: supabaseSubmission.address_state
              }
            };
            
            // Also include the form_submission_id for contract pre-fill
            if (!formSubmission) {
              formSubmission = { id: submissionId } as any;
            }
          } else if (error) {
            console.log(`[ParticipantData] Erro ao buscar no Supabase: ${error.message}`);
          }
        }
      } catch (err) {
        console.log(`[ParticipantData] Erro ao conectar ao Supabase: ${(err as Error).message}`);
      }
    }
    
    if (!responseData || (!responseData.nome && !responseData.email)) {
      console.log(`[ParticipantData] Nenhum form_submission encontrado`);
      return res.json({
        found: false,
        participantId: pid || meeting.participantId || null,
        meetingInfo: {
          nome: meeting.nome,
          email: meeting.email,
          telefone: meeting.telefone
        }
      });
    }

    // Return participant data
    res.json({
      found: true,
      participantId: formSubmission?.participantId || pid || meeting.participantId,
      formSubmissionId: formSubmission?.id || fsid,
      data: responseData
    });

  } catch (error: any) {
    console.error('[ParticipantData] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do participante' });
  }
});

// Public route to get full meeting data (alias for /info with more data)
publicRoomDesignRouter.get('/reunioes/:meetingId/public', async (req: Request, res: Response) => {
  try {
    // Clean meetingId - remove any query string that might be URL-encoded in the path
    const meetingId = req.params.meetingId?.split('?')[0]?.split('%3F')[0];
    
    if (!meetingId) {
      return res.status(400).json({ error: 'ID da reunião é obrigatório' });
    }
    
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    res.json({
      id: meeting.id,
      tenantId: meeting.tenantId,
      titulo: meeting.titulo,
      nome: meeting.nome,
      email: meeting.email,
      telefone: meeting.telefone,
      dataInicio: meeting.dataInicio,
      dataFim: meeting.dataFim,
      duracao: meeting.duracao,
      status: meeting.status,
      participantId: meeting.participantId,
      roomId100ms: meeting.roomId100ms,
      metadata: meeting.metadata
    });

  } catch (error: any) {
    console.error('[MeetingPublic] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar informações da reunião' });
  }
});

// Public route to get room design config (alias)
publicRoomDesignRouter.get('/reunioes/:meetingId/room-design-public', async (req: Request, res: Response) => {
  try {
    // Clean meetingId - remove any query string that might be URL-encoded in the path
    const meetingId = req.params.meetingId?.split('?')[0]?.split('%3F')[0];
    
    if (!meetingId) {
      return res.status(400).json({ error: 'ID da reunião é obrigatório' });
    }
    
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    const metadata = meeting.metadata as any;
    const designConfig = metadata?.roomDesignConfig || null;

    res.json({
      designConfig,
      meetingInfo: {
        id: meeting.id,
        titulo: meeting.titulo,
        status: meeting.status,
        tenantId: meeting.tenantId
      }
    });

  } catch (error: any) {
    console.error('[RoomDesignPublic] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração da sala' });
  }
});

// Public route to get meeting info (limited data)
publicRoomDesignRouter.get('/reunioes/:meetingId/info', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    res.json({
      id: meeting.id,
      titulo: meeting.titulo,
      dataInicio: meeting.dataInicio,
      dataFim: meeting.dataFim,
      status: meeting.status,
      participantId: meeting.participantId,
      roomId100ms: meeting.roomId100ms
    });

  } catch (error: any) {
    console.error('[MeetingInfo] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar informações da reunião' });
  }
});

// Get room design config (public)
publicRoomDesignRouter.get('/room-design/:meetingId', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    
    // Check cache first
    const cached = await getCachedMeeting(meetingId);
    if (cached && cached.designConfig) {
      return res.json({ 
        designConfig: cached.designConfig,
        meetingInfo: cached.meetingInfo,
        fromCache: true 
      });
    }
    
    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    // Get design config from metadata or tenant config
    const metadata = meeting.metadata as any;
    let designConfig = metadata?.roomDesignConfig || null;
    
    if (!designConfig && meeting.tenantId) {
      const [config] = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, meeting.tenantId))
        .limit(1);
      
      if (config?.roomDesignConfig) {
        designConfig = config.roomDesignConfig;
      }
    }

    const result = {
      designConfig,
      meetingInfo: {
        titulo: meeting.titulo,
        nome: meeting.nome,
        dataInicio: meeting.dataInicio,
        status: meeting.status,
        participantId: meeting.participantId
      }
    };
    
    // Cache the result
    await setCachedMeeting(meetingId, result);

    res.json(result);
    
  } catch (error: any) {
    console.error('[RoomDesign] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração da sala' });
  }
});

// ===========================================
// AUTHENTICATED ROUTES
// ===========================================

// List meetings for current tenant
meetingsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const meetings = await db.select().from(reunioes)
      .where(eq(reunioes.tenantId, user.tenantId))
      .orderBy(desc(reunioes.dataInicio))
      .limit(100);

    res.json(meetings);

  } catch (error: any) {
    console.error('[Meetings] Erro ao listar:', error);
    res.status(500).json({ error: 'Erro ao listar reuniões' });
  }
});

// Get single meeting
meetingsRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const [meeting] = await db.select().from(reunioes)
      .where(and(
        eq(reunioes.id, id),
        eq(reunioes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    res.json(meeting);

  } catch (error: any) {
    console.error('[Meetings] Erro ao buscar:', error);
    res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
});

// Get host token for a meeting
meetingsRouter.get('/:id/host-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const [meeting] = await db.select().from(reunioes)
      .where(and(
        eq(reunioes.id, id),
        eq(reunioes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({ error: 'Reunião sem sala 100ms configurada' });
    }

    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, user.tenantId))
      .limit(1);

    if (!config || !config.appAccessKey || !config.appSecret) {
      return res.status(400).json({ error: 'Credenciais 100ms não configuradas' });
    }

    const appAccessKey = decrypt(config.appAccessKey);
    const appSecret = decrypt(config.appSecret);

    const hostToken = gerarTokenParticipante(
      meeting.roomId100ms,
      user.name || 'Host',
      'host',
      appAccessKey,
      appSecret
    );

    res.json({ token: hostToken });

  } catch (error: any) {
    console.error('[Meetings] Erro ao gerar token:', error);
    res.status(500).json({ error: 'Erro ao gerar token de host' });
  }
});

// Get guest token for a meeting (public access)
meetingsRouter.get('/:id/guest-token', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, pid } = req.query;
    
    const participantName = (name as string) || 'Participante';
    const participantId = pid as string | undefined;

    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({ error: 'Reunião sem sala 100ms configurada' });
    }

    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, meeting.tenantId))
      .limit(1);

    if (!config || !config.appAccessKey || !config.appSecret) {
      return res.status(400).json({ error: 'Credenciais 100ms não configuradas' });
    }

    const appAccessKey = decrypt(config.appAccessKey);
    const appSecret = decrypt(config.appSecret);

    const guestToken = gerarTokenParticipante(
      meeting.roomId100ms,
      participantName,
      'guest',
      appAccessKey,
      appSecret
    );

    // Mark meeting as attended if not already
    if (!meeting.compareceu) {
      await db.update(reunioes)
        .set({ compareceu: true, updatedAt: new Date() })
        .where(eq(reunioes.id, id));
      
      // Sync to Supabase
      const supabase = await getClientSupabaseClient(meeting.tenantId);
      if (supabase) {
        await supabase.from('reunioes')
          .update({ compareceu: true })
          .eq('id', id);
      }
    }

    res.json({ 
      token: guestToken,
      participantId: participantId || meeting.participantId || null
    });

  } catch (error: any) {
    console.error('[Meetings] Erro ao gerar token de guest:', error);
    res.status(500).json({ error: 'Erro ao gerar token de participante' });
  }
});

// Update meeting status
meetingsRouter.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const validStatuses = ['agendada', 'em_andamento', 'concluida', 'cancelada'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const [meeting] = await db.select().from(reunioes)
      .where(and(
        eq(reunioes.id, id),
        eq(reunioes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    await db.update(reunioes)
      .set({ status, updatedAt: new Date() })
      .where(eq(reunioes.id, id));

    // Sync to Supabase
    const supabase = await getClientSupabaseClient(user.tenantId);
    if (supabase) {
      await supabase.from('reunioes')
        .update({ status })
        .eq('id', id);
    }

    res.json({ success: true, status });

  } catch (error: any) {
    console.error('[Meetings] Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da reunião' });
  }
});

// List recordings for a meeting
meetingsRouter.get('/:id/recordings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const [meeting] = await db.select().from(reunioes)
      .where(and(
        eq(reunioes.id, id),
        eq(reunioes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    const recordings = await db.select().from(gravacoes)
      .where(eq(gravacoes.reuniaoId, id))
      .orderBy(desc(gravacoes.startedAt));

    res.json(recordings);

  } catch (error: any) {
    console.error('[Meetings] Erro ao listar gravações:', error);
    res.status(500).json({ error: 'Erro ao listar gravações' });
  }
});

// Start recording
meetingsRouter.post('/:id/recordings/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const [meeting] = await db.select().from(reunioes)
      .where(and(
        eq(reunioes.id, id),
        eq(reunioes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({ error: 'Reunião sem sala 100ms' });
    }

    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, user.tenantId))
      .limit(1);

    if (!config || !config.appAccessKey || !config.appSecret) {
      return res.status(400).json({ error: 'Credenciais 100ms não configuradas' });
    }

    const appAccessKey = decrypt(config.appAccessKey);
    const appSecret = decrypt(config.appSecret);

    const recordingResult = await iniciarGravacao(meeting.roomId100ms, appAccessKey, appSecret);

    // Save recording to database
    const [newRecording] = await db.insert(gravacoes).values({
      reuniaoId: id,
      tenantId: user.tenantId,
      roomId100ms: meeting.roomId100ms,
      status: 'recording',
      startedAt: new Date(),
      metadata: recordingResult
    }).returning();

    // Sync to Supabase
    await syncRecordingToSupabase(user.tenantId, newRecording);

    res.json({ success: true, recording: newRecording });

  } catch (error: any) {
    console.error('[Meetings] Erro ao iniciar gravação:', error);
    res.status(500).json({ error: 'Erro ao iniciar gravação' });
  }
});

// Stop recording
meetingsRouter.post('/:id/recordings/:recordingId/stop', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, recordingId } = req.params;
    const user = (req as any).user;
    
    if (!user?.tenantId) {
      return res.status(400).json({ error: 'Tenant não identificado' });
    }

    const [recording] = await db.select().from(gravacoes)
      .where(and(
        eq(gravacoes.id, recordingId),
        eq(gravacoes.reuniaoId, id),
        eq(gravacoes.tenantId, user.tenantId)
      ))
      .limit(1);

    if (!recording) {
      return res.status(404).json({ error: 'Gravação não encontrada' });
    }

    const [config] = await db.select().from(hms100msConfig)
      .where(eq(hms100msConfig.tenantId, user.tenantId))
      .limit(1);

    if (!config || !config.appAccessKey || !config.appSecret) {
      return res.status(400).json({ error: 'Credenciais 100ms não configuradas' });
    }

    const appAccessKey = decrypt(config.appAccessKey);
    const appSecret = decrypt(config.appSecret);

    if (recording.roomId100ms) {
      await pararGravacao(recording.roomId100ms, appAccessKey, appSecret);
    }

    // Update recording status
    const [updatedRecording] = await db.update(gravacoes)
      .set({ 
        status: 'completed',
        stoppedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(gravacoes.id, recordingId))
      .returning();

    // Sync to Supabase
    await syncRecordingToSupabase(user.tenantId, updatedRecording);

    res.json({ success: true, recording: updatedRecording });

  } catch (error: any) {
    console.error('[Meetings] Erro ao parar gravação:', error);
    res.status(500).json({ error: 'Erro ao parar gravação' });
  }
});

export default meetingsRouter;
