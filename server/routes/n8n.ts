import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, hms100msConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt, encrypt } from '../lib/credentialsManager';
import { criarSala, gerarTokenParticipante } from '../services/meetings/hms100ms';
import { getClientSupabaseClient } from '../lib/multiTenantSupabase';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';

const n8nRouter = Router();

function generateApiKey(): string {
    return `n8n_${crypto.randomBytes(32).toString('hex')}`;
}

async function authenticateN8NByTenantKey(req: Request, res: Response, next: any) {
    const apiKey = req.headers['x-n8n-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({ 
            error: 'API Key não fornecida',
            message: 'Inclua o header X-N8N-API-Key na requisição'
        });
    }

    try {
        const configs = await db.select().from(hms100msConfig);
        
        let matchedConfig = null;
        for (const config of configs) {
            if (config.n8nApiKey) {
                const decryptedKey = decrypt(config.n8nApiKey);
                if (decryptedKey === apiKey) {
                    matchedConfig = config;
                    break;
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
    email: z.string().email().optional(),
    telefone: z.string().optional(),
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

        const metadata: any = {
            source: 'n8n',
            createdVia: 'n8n-api'
        };
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
                        metadata: metadata
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

n8nRouter.get('/health', (req: Request, res: Response) => {
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
        example: {
            simple: {
                titulo: 'Reunião com Cliente',
                nome: 'João Silva',
                email: 'joao@email.com',
                telefone: '+5511999999999'
            },
            withDate: {
                titulo: 'Reunião Agendada',
                nome: 'Maria Santos',
                dataInicio: '2026-01-15T14:00:00.000Z',
                duracao: 45
            }
        }
    });
});

export default n8nRouter;
