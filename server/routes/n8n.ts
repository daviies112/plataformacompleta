import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, hms100msConfig, formSubmissions } from '../../shared/db-schema';
import { eq, desc, sql } from 'drizzle-orm';
import { decrypt, encrypt } from '../lib/credentialsManager';
import { criarSala, gerarTokenParticipante, desativarSala } from '../services/meetings/hms100ms';
import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';

const n8nRouter = Router();

function generateApiKey(): string {
    return `n8n_${crypto.randomBytes(32).toString('hex')}`;
}

async function authenticateN8NByTenantKey(req: Request, res: Response, next: any) {
    // Tenta obter a chave de múltiplos headers comuns
    const apiKey = (
        req.headers['x-n8n-api-key'] || 
        req.headers['authorization']?.toString().replace('Bearer ', '') ||
        req.query.apiKey
    ) as string;
    
    console.log(`[N8N Auth Debug] URL: ${req.originalUrl || req.url}`);
    console.log(`[N8N Auth Debug] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[N8N Auth Debug] API Key extraída: ${apiKey ? apiKey.substring(0, 8) + '...' : 'null'}`);

    if (!apiKey) {
        console.log(`[N8N Auth] API Key não encontrada nos headers ou query. Enviando 401.`);
        return res.status(401).json({ 
            error: 'Authorization failed - please check your credentials',
            message: 'API Key não fornecida ou inválida. Use o header X-N8N-API-Key.'
        });
    }

    try {
        console.log(`[N8N Auth] API Key recebida (truncada): ${apiKey ? apiKey.substring(0, 8) : 'null'}...`);
        const configs = await db.select().from(hms100msConfig);
        console.log(`[N8N Auth] Verificando ${configs.length} configurações de tenant`);
        
        let matchedConfig = null;
        for (const config of configs) {
            if (config.n8nApiKey) {
                try {
                    const decryptedKey = decrypt(config.n8nApiKey);
                    
                    // Removendo possíveis espaços ou caracteres invisíveis
                    const cleanReceivedKey = apiKey ? apiKey.trim() : '';
                    const cleanDecryptedKey = decryptedKey ? decryptedKey.trim() : '';
                    
                    console.log(`[N8N Auth] Comparando com tenant ${config.tenantId}`);
                    
                    if (cleanDecryptedKey === cleanReceivedKey) {
                        matchedConfig = config;
                        break;
                    }
                } catch (decError) {
                    console.error(`[N8N Auth] Erro ao descriptografar chave para tenant ${config.tenantId}:`, decError);
                }
            }
        }

        if (!matchedConfig) {
            const masterKey = process.env.N8N_API_KEY;
            if (masterKey && apiKey === masterKey) {
                console.log('[N8N Auth] Autenticado via N8N_API_KEY global (legacy)');
                (req as any).n8nAuthType = 'global';
                return next();
            }

            return res.status(401).json({ 
                error: 'API Key inválida',
                message: 'A API Key fornecida não corresponde a nenhum tenant configurado'
            });
        }

        (req as any).tenantConfig = matchedConfig;
        (req as any).n8nAuthType = 'tenant';
        console.log(`[N8N Auth] Autenticado via API Key do tenant: ${matchedConfig.tenantId}`);
        next();
    } catch (error: any) {
        console.error('[N8N Auth] Erro ao validar API Key:', error);
        res.status(500).json({ error: 'Erro interno ao validar autenticação' });
    }
}

n8nRouter.post('/api-key/generate', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.tenantId) {
            return res.status(400).json({ error: 'Tenant não identificado' });
        }

        const tenantId = user.tenantId;

        const [existingConfig] = await db.select().from(hms100msConfig)
            .where(eq(hms100msConfig.tenantId, tenantId))
            .limit(1);

        if (!existingConfig) {
            return res.status(400).json({ 
                error: 'Configuração 100ms não encontrada',
                message: 'Configure primeiro as credenciais do 100ms em Configurações'
            });
        }

        const newApiKey = generateApiKey();
        const encryptedKey = encrypt(newApiKey);

        await db.update(hms100msConfig)
            .set({ 
                n8nApiKey: encryptedKey,
                n8nApiKeyCreatedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(hms100msConfig.tenantId, tenantId));

        console.log(`[N8N] API Key gerada para tenant ${tenantId}`);

        res.json({
            success: true,
            message: 'API Key gerada com sucesso',
            apiKey: newApiKey,
            createdAt: new Date().toISOString(),
            warning: 'Guarde esta chave em local seguro. Ela não será mostrada novamente.'
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao gerar API Key:', error);
        res.status(500).json({ error: 'Erro ao gerar API Key' });
    }
});

n8nRouter.delete('/api-key', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.tenantId) {
            return res.status(400).json({ error: 'Tenant não identificado' });
        }

        await db.update(hms100msConfig)
            .set({ 
                n8nApiKey: null,
                n8nApiKeyCreatedAt: null,
                updatedAt: new Date()
            })
            .where(eq(hms100msConfig.tenantId, user.tenantId));

        console.log(`[N8N] API Key revogada para tenant ${user.tenantId}`);

        res.json({
            success: true,
            message: 'API Key revogada com sucesso'
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao revogar API Key:', error);
        res.status(500).json({ error: 'Erro ao revogar API Key' });
    }
});

n8nRouter.get('/api-key/status', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user?.tenantId) {
            return res.status(400).json({ error: 'Tenant não identificado' });
        }

        const [config] = await db.select().from(hms100msConfig)
            .where(eq(hms100msConfig.tenantId, user.tenantId))
            .limit(1);

        if (!config) {
            return res.json({
                hasApiKey: false,
                hasConfig: false,
                message: 'Configure primeiro as credenciais do 100ms'
            });
        }

        res.json({
            hasApiKey: !!config.n8nApiKey,
            hasConfig: true,
            createdAt: config.n8nApiKeyCreatedAt?.toISOString() || null
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao verificar status API Key:', error);
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});

const createMeetingSchema = z.object({
    tenantId: z.string().optional(),
    titulo: z.string(),
    nome: z.string().optional(),
    // Aceita string vazia, email valido ou undefined
    email: z.string().optional().transform(val => {
        if (!val || val.trim() === '') return undefined;
        return val;
    }).pipe(z.string().email().optional()),
    telefone: z.string().optional().transform(val => {
        if (!val || val.trim() === '') return undefined;
        return val;
    }),
    dataInicio: z.string().optional(),
    duracao: z.number().min(15).max(480).optional().default(60),
    roomDesignConfig: z.any().optional()
});

n8nRouter.post('/reunioes', authenticateN8NByTenantKey, async (req: Request, res: Response) => {
    try {
        console.log('[N8N] Recebendo requisição para criar reunião');
        
        const data = createMeetingSchema.parse(req.body);
        const { titulo, nome, email, telefone, dataInicio, duracao, roomDesignConfig: customDesignConfig } = data;

        let config = (req as any).tenantConfig;
        let tenantId: string;

        if (config) {
            tenantId = config.tenantId;
        } else if ((req as any).n8nAuthType === 'global') {
            if (data.tenantId) {
                tenantId = data.tenantId;
                const [foundConfig] = await db.select().from(hms100msConfig)
                    .where(eq(hms100msConfig.tenantId, tenantId))
                    .limit(1);
                
                if (!foundConfig) {
                    return res.status(400).json({ 
                        error: 'Configuração do 100ms não encontrada para o tenantId especificado'
                    });
                }
                config = foundConfig;
            } else {
                const allConfigs = await db.select().from(hms100msConfig).limit(2);
                
                if (allConfigs.length === 0) {
                    return res.status(400).json({ 
                        error: 'Nenhuma configuração 100ms encontrada',
                        message: 'Configure as credenciais do 100ms na plataforma primeiro'
                    });
                }
                
                if (allConfigs.length === 1) {
                    config = allConfigs[0];
                    tenantId = config.tenantId;
                    console.log(`[N8N] Usando único tenant disponível: ${tenantId}`);
                } else {
                    return res.status(400).json({ 
                        error: 'tenantId obrigatório',
                        message: 'Existem múltiplos tenants configurados. Especifique o tenantId ou use uma API Key específica do tenant.',
                        hint: 'Gere uma API Key do tenant em /configuracoes para autenticação automática'
                    });
                }
            }
        } else {
            return res.status(400).json({ 
                error: 'Configuração inválida'
            });
        }

        if (!config.appAccessKey || !config.appSecret) {
            return res.status(400).json({ 
                error: 'Credenciais do 100ms não configuradas para este tenant'
            });
        }

        const appAccessKey = decrypt(config.appAccessKey);
        const appSecret = decrypt(config.appSecret);

        if (!appAccessKey || !appSecret) {
            return res.status(400).json({ error: 'Credenciais do 100ms inválidas ou corrompidas' });
        }

        if (config.templateId) {
            console.log(`[N8N] Usando templateId configurado: ${config.templateId}`);
        }

        console.log(`[N8N] Criando sala no 100ms para tenant ${tenantId}...`);
        const sala = await criarSala(
            titulo,
            config.templateId || '',
            appAccessKey,
            appSecret
        );
        console.log(`[N8N] Sala criada no 100ms: ${sala.id}`);

        const startDate = dataInicio ? new Date(dataInicio) : new Date();
        const endDate = new Date(startDate.getTime() + (duracao * 60 * 1000));

        let finalDesignConfig = customDesignConfig || config.roomDesignConfig || null;

        // Try to find form submission by phone or email for automatic contract pre-fill
        let formSubmissionId: string | null = null;
        
        if (telefone) {
            const normalizedPhone = telefone.replace(/\D/g, '');
            console.log(`[N8N] Buscando form_submission por telefone: ${normalizedPhone}`);
            const [sub] = await db.select({ id: formSubmissions.id }).from(formSubmissions)
                .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || ${normalizedPhone} || '%'`)
                .orderBy(desc(formSubmissions.createdAt))
                .limit(1);
            if (sub) {
                formSubmissionId = sub.id;
                console.log(`[N8N] Form submission encontrado por telefone: ${formSubmissionId}`);
            }
        }
        
        if (!formSubmissionId && email) {
            console.log(`[N8N] Buscando form_submission por email: ${email}`);
            const [sub] = await db.select({ id: formSubmissions.id }).from(formSubmissions)
                .where(sql`LOWER(${formSubmissions.contactEmail}) = LOWER(${email})`)
                .orderBy(desc(formSubmissions.createdAt))
                .limit(1);
            if (sub) {
                formSubmissionId = sub.id;
                console.log(`[N8N] Form submission encontrado por email: ${formSubmissionId}`);
            }
        }

        const metadata: any = {
            source: 'n8n',
            createdVia: 'n8n-api'
        };
        
        // Store formSubmissionId in metadata for signature pre-fill
        if (formSubmissionId) {
            metadata.formSubmissionId = formSubmissionId;
            console.log(`[N8N] formSubmissionId armazenado no metadata: ${formSubmissionId}`);
        }
        
        if (finalDesignConfig) {
            metadata.roomDesignConfig = finalDesignConfig;
        }

        const participantName = nome || 'Participante';

        const [newMeeting] = await db.insert(reunioes).values({
            tenantId,
            titulo,
            nome: participantName,
            email: email || '',
            telefone: telefone || '',
            dataInicio: startDate,
            dataFim: endDate,
            duracao: duracao,
            status: 'agendada',
            roomId100ms: sala.id,
            linkReuniao: '',
            metadata: metadata,
            compareceu: false, // Default: not attended until someone joins
        }).returning();

        const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host') || 'localhost:5000';
        const linkReuniao = `https://${baseUrl}/reuniao/${newMeeting.id}`;
        const linkPublico = `https://${baseUrl}/reuniao-publica/${newMeeting.id}`;

        await db.update(reunioes).set({ linkReuniao }).where(eq(reunioes.id, newMeeting.id));

        console.log(`[N8N] Reunião salva no banco: ${newMeeting.id}`);

        const syncToSupabase = async () => {
            try {
                const supabase = await getClientSupabaseClient(tenantId);
                if (supabase) {
                    await supabase.from('reunioes').upsert({
                        id: newMeeting.id,
                        tenant_id: tenantId,
                        titulo: titulo,
                        nome: participantName,
                        email: email || '',
                        telefone: telefone || '',
                        data_inicio: startDate.toISOString(),
                        data_fim: endDate.toISOString(),
                        duracao: duracao,
                        status: 'agendada',
                        room_id_100ms: sala.id,
                        link_reuniao: linkReuniao,
                        metadata: metadata,
                        compareceu: false // Default: not attended until someone joins
                    }, { onConflict: 'id' });
                    console.log(`[N8N Sync] Reunião ${newMeeting.id} sincronizada com Supabase`);
                }
            } catch (err) {
                console.error('[N8N Sync] Erro ao sincronizar com Supabase:', err);
            }
        };

        syncToSupabase();

        let hostToken = null;
        try {
            hostToken = gerarTokenParticipante(
                sala.id,
                participantName,
                'host',
                appAccessKey,
                appSecret
            );
        } catch (tokenErr) {
            console.warn('[N8N] Erro ao gerar token do host:', tokenErr);
        }

        res.status(201).json({
            success: true,
            message: 'Reunião criada com sucesso',
            data: {
                meetingId: newMeeting.id,
                roomId100ms: sala.id,
                titulo: newMeeting.titulo,
                linkReuniao: linkReuniao,
                linkPublico: linkPublico,
                dataInicio: startDate.toISOString(),
                dataFim: endDate.toISOString(),
                duracao: duracao,
                status: newMeeting.status,
                hostToken: hostToken,
                tenantId: tenantId,
                hasCustomDesign: !!finalDesignConfig,
                createdAt: newMeeting.createdAt
            }
        });

        console.log(`[N8N] Reunião criada com sucesso: ${linkReuniao}`);

    } catch (error: any) {
        console.error('[N8N Route] Erro:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: 'Dados inválidos', 
                details: error.errors 
            });
        }
        res.status(500).json({ 
            error: 'Erro interno ao processar requisição',
            message: error.message
        });
    }
});

n8nRouter.get('/reunioes/:id', authenticateN8NByTenantKey, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [meeting] = await db.select().from(reunioes)
            .where(eq(reunioes.id, id))
            .limit(1);

        if (!meeting) {
            return res.status(404).json({
                error: 'Reunião não encontrada'
            });
        }

        const config = (req as any).tenantConfig;
        if (config && meeting.tenantId !== config.tenantId) {
            return res.status(403).json({
                error: 'Acesso negado. Esta reunião pertence a outro tenant.'
            });
        }

        res.json({
            success: true,
            data: meeting
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao buscar reunião:', error);
        res.status(500).json({
            error: 'Erro ao buscar reunião',
            message: error.message
        });
    }
});

// ============================================
// CANCELAR REUNIÃO - DELETE /api/n8n/reunioes/:id
// ============================================
n8nRouter.delete('/reunioes/:id', authenticateN8NByTenantKey, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`[N8N] Cancelando reunião: ${id}`);

        // Buscar reunião no banco de dados
        const [meeting] = await db.select().from(reunioes)
            .where(eq(reunioes.id, id))
            .limit(1);

        if (!meeting) {
            return res.status(404).json({
                success: false,
                error: 'Reunião não encontrada',
                message: `Nenhuma reunião com ID ${id} foi encontrada`
            });
        }

        // Verificar se pertence ao tenant correto (se autenticado por tenant key)
        const config = (req as any).tenantConfig;
        if (config && meeting.tenantId !== config.tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado',
                message: 'Esta reunião pertence a outro tenant'
            });
        }

        // Se já está cancelada, retornar sucesso sem fazer nada
        if (meeting.status === 'cancelada') {
            return res.json({
                success: true,
                message: 'Reunião já estava cancelada',
                data: {
                    id: meeting.id,
                    status: meeting.status
                }
            });
        }

        // Desativar sala no 100ms (se existir room_id_100ms)
        if (meeting.roomId100ms) {
            try {
                // Buscar credenciais do tenant
                const [hmsConfig] = await db.select().from(hms100msConfig)
                    .where(eq(hms100msConfig.tenantId, meeting.tenantId))
                    .limit(1);

                if (hmsConfig && hmsConfig.appAccessKey && hmsConfig.appSecret) {
                    const appAccessKey = decrypt(hmsConfig.appAccessKey);
                    const appSecret = decrypt(hmsConfig.appSecret);

                    if (appAccessKey && appSecret) {
                        console.log(`[N8N] Desativando sala 100ms: ${meeting.roomId100ms}`);
                        await desativarSala(meeting.roomId100ms, appAccessKey, appSecret);
                        console.log(`[N8N] Sala 100ms desativada com sucesso`);
                    }
                }
            } catch (hmsError: any) {
                // Log erro mas continua com o cancelamento no banco
                console.error(`[N8N] Erro ao desativar sala no 100ms (continuando cancelamento):`, hmsError.message);
            }
        }

        // Atualizar status no PostgreSQL
        const [updatedMeeting] = await db.update(reunioes)
            .set({
                status: 'cancelada',
                updatedAt: new Date()
            })
            .where(eq(reunioes.id, id))
            .returning();

        console.log(`[N8N] Reunião ${id} cancelada no PostgreSQL`);

        // Sincronizar com Supabase (fire-and-forget)
        const syncToSupabase = async () => {
            try {
                const supabase = await getClientSupabaseClient(meeting.tenantId);
                if (supabase) {
                    const { error } = await supabase
                        .from('reunioes')
                        .update({
                            status: 'cancelada',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    if (error) {
                        console.error(`[N8N Sync] Erro ao sincronizar cancelamento com Supabase:`, error);
                    } else {
                        console.log(`[N8N Sync] Cancelamento sincronizado com Supabase para reunião ${id}`);
                    }
                }
            } catch (err) {
                console.error(`[N8N Sync] Erro ao sincronizar cancelamento:`, err);
            }
        };

        syncToSupabase();

        res.json({
            success: true,
            message: 'Reunião cancelada com sucesso',
            data: {
                id: updatedMeeting.id,
                titulo: updatedMeeting.titulo,
                status: updatedMeeting.status,
                cancelledAt: updatedMeeting.updatedAt
            }
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao cancelar reunião:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao cancelar reunião',
            message: error.message
        });
    }
});

// ============================================
// REAGENDAR REUNIÃO - PATCH /api/n8n/reunioes/:id
// ============================================
const rescheduleSchema = z.object({
    dataInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'dataInicio deve ser uma data válida no formato ISO 8601'
    }),
    dataFim: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'dataFim deve ser uma data válida no formato ISO 8601'
    }),
    duracao: z.number().min(15).max(480).optional()
});

n8nRouter.patch('/reunioes/:id', authenticateN8NByTenantKey, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`[N8N] Reagendando reunião: ${id}`);

        // Validar body
        const validatedData = rescheduleSchema.parse(req.body);

        // Buscar reunião no banco de dados
        const [meeting] = await db.select().from(reunioes)
            .where(eq(reunioes.id, id))
            .limit(1);

        if (!meeting) {
            return res.status(404).json({
                success: false,
                error: 'Reunião não encontrada',
                message: `Nenhuma reunião com ID ${id} foi encontrada`
            });
        }

        // Verificar se pertence ao tenant correto (se autenticado por tenant key)
        const config = (req as any).tenantConfig;
        if (config && meeting.tenantId !== config.tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado',
                message: 'Esta reunião pertence a outro tenant'
            });
        }

        // Verificar se pode ser reagendada (não pode reagendar cancelada ou finalizada)
        if (meeting.status === 'cancelada') {
            return res.status(400).json({
                success: false,
                error: 'Operação não permitida',
                message: 'Não é possível reagendar uma reunião cancelada. Crie uma nova reunião.'
            });
        }

        // Calcular novas datas
        const newDataInicio = new Date(validatedData.dataInicio);
        let newDataFim: Date;

        if (validatedData.dataFim) {
            newDataFim = new Date(validatedData.dataFim);
        } else if (validatedData.duracao) {
            newDataFim = new Date(newDataInicio.getTime() + (validatedData.duracao * 60 * 1000));
        } else {
            // Manter duração original
            const originalDuration = meeting.duracao || 60;
            newDataFim = new Date(newDataInicio.getTime() + (originalDuration * 60 * 1000));
        }

        // Calcular duração em minutos
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

        console.log(`[N8N] Reunião ${id} reagendada no PostgreSQL: ${newDataInicio.toISOString()} - ${newDataFim.toISOString()}`);

        // Sincronizar com Supabase (fire-and-forget)
        const syncToSupabase = async () => {
            try {
                const supabase = await getClientSupabaseClient(meeting.tenantId);
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
                        console.error(`[N8N Sync] Erro ao sincronizar reagendamento com Supabase:`, error);
                    } else {
                        console.log(`[N8N Sync] Reagendamento sincronizado com Supabase para reunião ${id}`);
                    }
                }
            } catch (err) {
                console.error(`[N8N Sync] Erro ao sincronizar reagendamento:`, err);
            }
        };

        syncToSupabase();

        res.json({
            success: true,
            message: 'Reunião reagendada com sucesso',
            data: {
                id: updatedMeeting.id,
                titulo: updatedMeeting.titulo,
                dataInicio: updatedMeeting.dataInicio,
                dataFim: updatedMeeting.dataFim,
                duracao: updatedMeeting.duracao,
                status: updatedMeeting.status,
                linkReuniao: updatedMeeting.linkReuniao,
                rescheduledAt: updatedMeeting.updatedAt
            }
        });

    } catch (error: any) {
        console.error('[N8N] Erro ao reagendar reunião:', error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erro interno ao reagendar reunião',
            message: error.message
        });
    }
});

n8nRouter.get('/health', (req: Request, res: Response) => {
    console.log('[N8N] Health check accessed');
    res.json({
        status: 'ok',
        message: 'N8N API endpoint está funcionando',
        timestamp: new Date().toISOString(),
        authMethods: {
            tenantApiKey: 'Recomendado - API Key gerada por tenant em /configuracoes',
            globalApiKey: 'Legacy - Usa N8N_API_KEY do ambiente (requer tenantId no body)'
        },
        endpoints: {
            createMeeting: 'POST /api/n8n/reunioes',
            getMeeting: 'GET /api/n8n/reunioes/:id',
            cancelMeeting: 'DELETE /api/n8n/reunioes/:id',
            rescheduleMeeting: 'PATCH /api/n8n/reunioes/:id',
            generateApiKey: 'POST /api/n8n/api-key/generate (autenticado)',
            revokeApiKey: 'DELETE /api/n8n/api-key (autenticado)',
            checkApiKeyStatus: 'GET /api/n8n/api-key/status (autenticado)',
            health: 'GET /api/n8n/health',
            schema: 'GET /api/n8n/schema'
        }
    });
});

n8nRouter.get('/schema', (req: Request, res: Response) => {
    res.json({
        authentication: {
            header: 'X-N8N-API-Key',
            description: 'Use a API Key gerada pelo tenant. Gere em /configuracoes ou via POST /api/n8n/api-key/generate'
        },
        createMeeting: {
            endpoint: 'POST /api/n8n/reunioes',
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-Key': 'sua_api_key_do_tenant'
            },
            body: {
                titulo: { type: 'string', required: true, description: 'Título da reunião' },
                nome: { type: 'string', required: false, description: 'Nome do participante' },
                email: { type: 'string', required: false, description: 'Email do participante' },
                telefone: { type: 'string', required: false, description: 'Telefone do participante' },
                dataInicio: { type: 'string (ISO 8601)', required: false, description: 'Data/hora de início' },
                duracao: { type: 'number', required: false, default: 60, description: 'Duração em minutos (15-480)' },
                roomDesignConfig: { 
                    type: 'object', 
                    required: false, 
                    description: 'OPCIONAL - Override de design. Se não fornecido, usa configuração do tenant automaticamente'
                }
            },
            response: {
                success: 'boolean',
                message: 'string',
                data: {
                    meetingId: 'UUID da reunião',
                    roomId100ms: 'ID da sala no 100ms',
                    titulo: 'Título',
                    linkReuniao: 'Link para participar',
                    linkPublico: 'Link público (sem autenticação)',
                    dataInicio: 'Data/hora de início',
                    dataFim: 'Data/hora de fim',
                    duracao: 'Duração em minutos',
                    status: 'Status da reunião',
                    hostToken: 'Token JWT para o host',
                    tenantId: 'ID do tenant',
                    hasCustomDesign: 'boolean - indica se tem design personalizado',
                    createdAt: 'Data de criação'
                }
            }
        },
        cancelMeeting: {
            endpoint: 'DELETE /api/n8n/reunioes/:id',
            description: 'Cancela uma reunião existente e desativa a sala no 100ms',
            headers: {
                'X-N8N-API-Key': 'sua_api_key_do_tenant'
            },
            urlParams: {
                id: { type: 'UUID', required: true, description: 'ID da reunião a ser cancelada' }
            },
            response: {
                success: 'boolean',
                message: 'string',
                data: {
                    id: 'UUID da reunião',
                    titulo: 'Título',
                    status: 'cancelada',
                    cancelledAt: 'Data do cancelamento'
                }
            }
        },
        rescheduleMeeting: {
            endpoint: 'PATCH /api/n8n/reunioes/:id',
            description: 'Reagenda uma reunião existente para nova data/hora',
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-Key': 'sua_api_key_do_tenant'
            },
            urlParams: {
                id: { type: 'UUID', required: true, description: 'ID da reunião a ser reagendada' }
            },
            body: {
                dataInicio: { type: 'string (ISO 8601)', required: true, description: 'Nova data/hora de início' },
                dataFim: { type: 'string (ISO 8601)', required: false, description: 'Nova data/hora de fim (opcional)' },
                duracao: { type: 'number', required: false, description: 'Duração em minutos (15-480). Usado se dataFim não for fornecido' }
            },
            response: {
                success: 'boolean',
                message: 'string',
                data: {
                    id: 'UUID da reunião',
                    titulo: 'Título',
                    dataInicio: 'Nova data/hora de início',
                    dataFim: 'Nova data/hora de fim',
                    duracao: 'Duração em minutos',
                    status: 'reagendada',
                    linkReuniao: 'Link para participar (inalterado)',
                    rescheduledAt: 'Data do reagendamento'
                }
            }
        },
        examples: {
            createSimple: {
                titulo: 'Reunião com Cliente',
                nome: 'João Silva',
                email: 'joao@email.com',
                telefone: '+5511999999999'
            },
            createWithDate: {
                titulo: 'Reunião Agendada',
                nome: 'Maria Santos',
                dataInicio: '2026-01-15T14:00:00.000Z',
                duracao: 45
            },
            reschedule: {
                dataInicio: '2026-01-20T10:00:00.000Z',
                duracao: 60
            }
        }
    });
});

export default n8nRouter;
