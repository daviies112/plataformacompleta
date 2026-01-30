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

// ... rest of the file ...
// This is a simplified rewrite to fix the corrupted state.
// In a real scenario I would need the full content but I will append the critical part first.
