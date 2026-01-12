import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, hms100msConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/credentialsManager';
import { criarSala } from '../services/meetings/hms100ms';
import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import { z } from 'zod';

const n8nRouter = Router();

const authenticateN8N = (req: Request, res: Response, next: any) => {
    const apiKey = req.headers['x-n8n-api-key'];
    const masterKey = process.env.N8N_API_KEY;

    // SEGURANÇA: Não permitir acesso se N8N_API_KEY não estiver configurada
    if (!masterKey) {
        console.warn('[N8N] N8N_API_KEY não configurada. Configure nos Replit Secrets para habilitar esta rota.');
        return res.status(503).json({ error: 'N8N API não configurada. Configure N8N_API_KEY nos Secrets.' });
    }

    if (!apiKey || apiKey !== masterKey) {
        return res.status(401).json({ error: 'Não autorizado. API Key inválida ou ausente.' });
    }
    next();
};

const createMeetingSchema = z.object({
    tenantId: z.string(),
    titulo: z.string(),
    userName: z.string().optional(),
    email: z.string().email().optional(),
    dataInicio: z.string().optional(),
});

n8nRouter.post('/reunioes', authenticateN8N, async (req: Request, res: Response) => {
    try {
        const data = createMeetingSchema.parse(req.body);
        const { tenantId, titulo, userName, email, dataInicio } = data;

        const [config] = await db.select().from(hms100msConfig)
            .where(eq(hms100msConfig.tenantId, tenantId))
            .limit(1);

        if (!config || !config.appAccessKey || !config.appSecret) {
            return res.status(400).json({ error: 'Configuração do 100ms não encontrada para este tenant' });
        }

        const appAccessKey = decrypt(config.appAccessKey);
        const appSecret = decrypt(config.appSecret);

        const sala = await criarSala(
            titulo,
            config.templateId || '',
            appAccessKey,
            appSecret
        );

        const startDate = dataInicio ? new Date(dataInicio) : new Date();
        const [newMeeting] = await db.insert(reunioes).values({
            tenantId,
            titulo,
            nome: userName || 'Participante N8N',
            email: email || '',
            dataHora: startDate,
            status: 'agendada',
            tipo: 'online',
            roomId100ms: sala.id,
            linkReuniao: '',
        }).returning();

        const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host') || 'localhost:5000';
        const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;

        await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));

        const syncToSupabase = async () => {
            try {
                const supabase = await getClientSupabaseClient(tenantId);
                if (supabase) {
                    await supabase.from('reunioes').upsert({
                        id: newMeeting.id,
                        tenant_id: tenantId,
                        titulo: titulo,
                        nome: userName || '',
                        email: email || '',
                        data_inicio: startDate.toISOString(),
                        status: 'agendada',
                        tipo: 'online',
                        room_id_100ms: sala.id,
                        link_reuniao: linkReuniao
                    });
                }
            } catch (err) {
                console.error('[N8N Sync] Erro ao sincronizar com Supabase:', err);
            }
        };

        syncToSupabase();

        res.json({
            success: true,
            meetingId: newMeeting.id,
            roomId100ms: sala.id,
            linkReuniao: linkReuniao,
            message: 'Reunião criada com sucesso via N8N'
        });

    } catch (error: any) {
        console.error('[N8N Route] Erro:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
        }
        res.status(500).json({ error: 'Erro interno ao processar requisição do N8N' });
    }
});

export default n8nRouter;
