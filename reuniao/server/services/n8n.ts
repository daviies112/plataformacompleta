import axios from 'axios';
import type { Reuniao } from '@shared/schema';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_REUNIAO_INICIADA = process.env.N8N_WEBHOOK_REUNIAO_INICIADA;
const N8N_WEBHOOK_REUNIAO_FINALIZADA = process.env.N8N_WEBHOOK_REUNIAO_FINALIZADA;

async function enviarWebhook(evento: string, dados: any): Promise<void> {
  if (!N8N_WEBHOOK_URL) {
    console.log(`[N8N] Webhook URL não configurada. Evento: ${evento}`);
    return;
  }

  try {
    await axios.post(N8N_WEBHOOK_URL, {
      evento,
      timestamp: new Date().toISOString(),
      dados,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    console.log(`[N8N] Webhook enviado com sucesso: ${evento}`);
  } catch (error) {
    console.error(`[N8N] Erro ao enviar webhook: ${evento}`, error);
  }
}

async function enviarWebhookDireto(url: string, payload: any, nome: string): Promise<any> {
  try {
    console.log(`📤 [N8N] Enviando webhook ${nome}:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log(`✅ [N8N] Webhook ${nome} enviado com sucesso`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ [N8N] Erro ao enviar webhook ${nome}:`, error.message);
    if (error.response) {
      console.error(`[N8N] Status: ${error.response.status}, Data:`, error.response.data);
    }
    throw error;
  }
}

export async function notificarReuniaoAgendada(reuniao: Reuniao): Promise<void> {
  await enviarWebhook('reuniao.agendada', {
    reuniaoId: reuniao.id,
    tenantId: reuniao.tenantId,
    titulo: reuniao.titulo,
    dataInicio: reuniao.dataInicio,
    dataFim: reuniao.dataFim,
    participantes: reuniao.participantes,
    linkReuniao: reuniao.linkReuniao,
    nome: reuniao.nome,
    email: reuniao.email,
    telefone: reuniao.telefone,
  });
}

export async function notificarReuniaoIniciada(reuniao: Reuniao): Promise<void> {
  await enviarWebhook('reuniao.iniciada', {
    reuniaoId: reuniao.id,
    tenantId: reuniao.tenantId,
    titulo: reuniao.titulo,
    dataInicio: reuniao.dataInicio,
    roomId100ms: reuniao.roomId100ms,
    participantes: reuniao.participantes,
    nome: reuniao.nome,
    email: reuniao.email,
  });
}

export async function notificarReuniaoFinalizada(
  reuniao: Reuniao,
  gravacaoUrl?: string
): Promise<void> {
  await enviarWebhook('reuniao.finalizada', {
    reuniaoId: reuniao.id,
    tenantId: reuniao.tenantId,
    titulo: reuniao.titulo,
    dataInicio: reuniao.dataInicio,
    dataFim: reuniao.dataFim,
    duracao: reuniao.duracao,
    roomId100ms: reuniao.roomId100ms,
    gravacaoUrl: gravacaoUrl || reuniao.gravacaoUrl,
    participantes: reuniao.participantes,
    nome: reuniao.nome,
    email: reuniao.email,
  });
}

export interface TranscricaoReuniaoPayload {
  room_id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_inicio?: Date | string;
}

export interface TranscricaoFinalizadaPayload {
  room_id: string;
  data_fim?: Date | string;
}

export async function notificarTranscricaoIniciada(dados: TranscricaoReuniaoPayload): Promise<any> {
  if (!N8N_WEBHOOK_REUNIAO_INICIADA) {
    console.log('[N8N] N8N_WEBHOOK_REUNIAO_INICIADA não configurado');
    return { success: true, message: 'Webhook não configurado, notificação ignorada' };
  }

  if (!dados.room_id) {
    throw new Error('room_id é obrigatório para notificar transcrição iniciada');
  }

  const dataInicio = dados.data_inicio 
    ? (typeof dados.data_inicio === 'string' ? dados.data_inicio : dados.data_inicio.toISOString())
    : new Date().toISOString();

  const payload = {
    room_id: dados.room_id,
    nome: dados.nome || 'Participante',
    email: dados.email || '',
    telefone: dados.telefone || '',
    data_inicio: dataInicio,
  };

  return await enviarWebhookDireto(N8N_WEBHOOK_REUNIAO_INICIADA, payload, 'Reunião Iniciada (Transcrição)');
}

export async function notificarTranscricaoFinalizada(dados: TranscricaoFinalizadaPayload): Promise<any> {
  if (!N8N_WEBHOOK_REUNIAO_FINALIZADA) {
    console.log('[N8N] N8N_WEBHOOK_REUNIAO_FINALIZADA não configurado');
    return { success: true, message: 'Webhook não configurado, notificação ignorada' };
  }

  if (!dados.room_id) {
    throw new Error('room_id é obrigatório para notificar transcrição finalizada');
  }

  const dataFim = dados.data_fim 
    ? (typeof dados.data_fim === 'string' ? dados.data_fim : dados.data_fim.toISOString())
    : new Date().toISOString();

  const payload = {
    room_id: dados.room_id,
    data_fim: dataFim,
  };

  return await enviarWebhookDireto(N8N_WEBHOOK_REUNIAO_FINALIZADA, payload, 'Reunião Finalizada (Transcrição)');
}

export async function notificarBookingCriado(booking: any, reuniao?: any): Promise<void> {
  await enviarWebhook('booking.criado', {
    bookingId: booking.id,
    tenantId: booking.tenantId,
    meetingTypeId: booking.meetingTypeId,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    scheduledDateTime: booking.scheduledDateTime,
    duration: booking.duration,
    timezone: booking.timezone,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    answers: booking.answers,
    locationUrl: booking.locationUrl,
    reuniao: reuniao ? {
      id: reuniao.id,
      titulo: reuniao.titulo,
      linkReuniao: reuniao.linkReuniao,
      roomId100ms: reuniao.roomId100ms,
    } : null,
  });
}

export async function notificarBookingCancelado(booking: any, reason?: string): Promise<void> {
  await enviarWebhook('booking.cancelado', {
    bookingId: booking.id,
    tenantId: booking.tenantId,
    meetingTypeId: booking.meetingTypeId,
    scheduledDateTime: booking.scheduledDateTime,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    cancellationReason: reason || booking.cancellationReason,
  });
}

export async function notificarBookingConfirmado(booking: any): Promise<void> {
  await enviarWebhook('booking.confirmado', {
    bookingId: booking.id,
    tenantId: booking.tenantId,
    meetingTypeId: booking.meetingTypeId,
    scheduledDateTime: booking.scheduledDateTime,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    locationUrl: booking.locationUrl,
  });
}
