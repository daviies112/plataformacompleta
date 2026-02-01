import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import { getSupabaseClient } from '../lib/supabaseClient';
import { testDynamicSupabaseConnection, getDashboardDataFromSupabase, getDynamicSupabaseClient, fetchTenantSupabaseData } from '../lib/multiTenantSupabase';
import { getSupabaseCredentials, getWhatsAppCredentials } from '../lib/credentialsManager';
import { detectNewClients, processNewClients, getCacheStats, cleanExpiredCache } from '../lib/clientMonitor';
import { eq, desc, and, or } from 'drizzle-orm';
import { DashboardCompleteV5, reunioes } from '../../shared/db-schema';
import { cacheDashboardData } from '../lib/cacheStrategies';
import { MockDataGenerator } from '../lib/mockDataGenerator';
import jwt from 'jsonwebtoken';
import ical from 'node-ical';
import fetch from 'node-fetch';

const router = express.Router();

// Remove test endpoints for security - they were used for development only

// 🔐 SECURITY FIX: Generate UNIQUE mock data per tenant
// Each tenant sees different names/emails/phones to prevent data leakage
// Mock data is deterministic - same tenant always gets same data
function generateMockDashboardData(tenantId: string) {
  const generator = new MockDataGenerator(tenantId);
  return generator.generateMockDashboardData(3);
}

// Get dashboard data - PROTEGIDO: requer autenticação para isolamento multi-tenant
// Now returns aggregated data from all 12 Supabase tables
router.get('/dashboard-data', authenticateToken, async (req, res) => {
  try {
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar apenas dados da sessão autenticada
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId; // Usar tenantId da sessão, NÃO mapeamento hard-coded
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    // Testa conexão dinâmica com Supabase primeiro (usando credenciais do cliente)
    const dynamicConnectionTest = await testDynamicSupabaseConnection(clientId);
    if (!dynamicConnectionTest) {
      // DISABLED MOCK DATA: Return empty data with clear message
      return res.json({
        success: true,
        data: [],
        aggregatedData: null,
        source: 'no_data',
        warning: 'Supabase não configurado para este cliente. Configure as credenciais em /configuracoes para visualizar dados reais.'
      });
    }
    
    // Busca dados agregados de todas as 12 tabelas do Supabase
    const aggregatedData = await cacheDashboardData(
      clientId,
      tenantId,
      async () => {
        const data = await fetchTenantSupabaseData(clientId, tenantId);
        if (data === null) throw new Error('Failed to fetch aggregated data from Supabase');
        return data;
      },
      { compress: true, suffix: 'aggregated' }
    ).catch(async (error) => {
      console.error('Cache wrapper error for aggregated data, fetching directly:', error);
      return fetchTenantSupabaseData(clientId, tenantId);
    });
    
    // Busca dados legados do clientes_completos para compatibilidade
    const legacyDashboardData = await cacheDashboardData(
      clientId,
      tenantId,
      async () => {
        const data = await getDashboardDataFromSupabase(clientId, tenantId);
        if (data === null) throw new Error('Failed to fetch from Supabase');
        return data;
      },
      { compress: true, suffix: 'legacy' }
    ).catch(async (error) => {
      console.error('Cache wrapper error for legacy data, using fallback:', error);
      return getDashboardDataFromSupabase(clientId, tenantId);
    });
    
    if (aggregatedData === null && legacyDashboardData === null) {
      // DISABLED MOCK DATA: Return empty data with clear message
      return res.json({
        success: true,
        data: [],
        aggregatedData: null,
        source: 'no_data_fallback',
        warning: 'Nenhum dado disponível no Supabase. Verifique a configuração e as tabelas do banco de dados.'
      });
    }
    
    res.json({
      success: true,
      data: legacyDashboardData || [],
      aggregatedData: aggregatedData,
      source: 'supabase_with_aggregation',
      message: 'Dados carregados com sucesso do Supabase (12 tabelas agregadas)',
      summary: aggregatedData?.summary || null
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Get Supabase data summary - PROTEGIDO: requer autenticação para isolamento multi-tenant
router.get('/supabase-summary', authenticateToken, async (req, res) => {
  try {
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar apenas dados da sessão autenticada
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId; // Usar tenantId da sessão, NÃO mapeamento hard-coded
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    // Testa conexão dinâmica com Supabase primeiro
    const dynamicConnectionTest = await testDynamicSupabaseConnection(clientId);
    if (!dynamicConnectionTest) {
      return res.json({
        success: false,
        connected: false,
        message: 'Supabase não configurado para este cliente',
        data: null
      });
    }
    
    // Busca dados agregados de todas as 12 tabelas
    const aggregatedData = await fetchTenantSupabaseData(clientId, tenantId);
    
    if (!aggregatedData) {
      return res.json({
        success: false,
        connected: true,
        message: 'Erro ao buscar dados do Supabase',
        data: null
      });
    }
    
    res.json({
      success: true,
      connected: true,
      message: 'Dados agregados carregados com sucesso',
      data: {
        workspace: {
          pagesCount: aggregatedData.workspace.pagesCount,
          databasesCount: aggregatedData.workspace.databasesCount,
          boardsCount: aggregatedData.workspace.boardsCount,
          recentPages: aggregatedData.workspace.recentPages
        },
        forms: {
          formsCount: aggregatedData.forms.formsCount,
          submissionsCount: aggregatedData.forms.submissionsCount,
          recentSubmissions: aggregatedData.forms.recentSubmissions
        },
        products: {
          productsCount: aggregatedData.products.productsCount,
          suppliersCount: aggregatedData.products.suppliersCount,
          resellersCount: aggregatedData.products.resellersCount,
          categoriesCount: aggregatedData.products.categoriesCount,
          printQueueCount: aggregatedData.products.printQueueCount
        },
        billing: {
          filesCount: aggregatedData.billing.filesCount
        },
        dashboard: {
          clientsCount: aggregatedData.dashboard.clientsCount
        },
        summary: aggregatedData.summary
      }
    });
  } catch (error) {
    console.error('Error fetching Supabase summary:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Failed to fetch Supabase summary',
      data: null
    });
  }
});

// Get specific client data - protected and using Supabase
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId: paramClientId } = req.params;
    const clientId = req.user!.clientId;
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar tenantId da sessão
    const tenantId = req.user!.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    // Get dynamic Supabase client using user's configured credentials
    const dynamicSupabase = await getDynamicSupabaseClient(clientId);
    if (!dynamicSupabase) {
      // 🔐 SECURITY FIX: Generate unique mock data per tenant using crypto-based seeding
      const mockData = generateMockDashboardData(tenantId);
      const mockClient = mockData.find(item => 
        item.telefone === paramClientId && item.tenant_id === tenantId
      );
      if (!mockClient) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      return res.json({
        success: true,
        data: mockClient,
        source: 'mock_data',
        warning: 'Usando dados mockados - Supabase não configurado para este cliente'
      });
    }
    
    // Fetch specific client data from Supabase with cache
    // Use unique suffix to avoid collision with /dashboard-data cache
    const clientData = await cacheDashboardData(
      clientId,
      tenantId,
      async () => {
        const { data, error } = await dynamicSupabase
          .from('clientes_completos')
          .select('*')
          .eq('telefone', paramClientId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('CLIENT_NOT_FOUND');
          }
          console.error('Supabase query error:', error);
          throw error;
        }
        
        return data;
      },
      { 
        compress: false, 
        ttl: 300, // 5 minutes TTL for specific client data
        suffix: `client:${paramClientId}` // Unique cache key per client to avoid collision
      }
    ).catch((error) => {
      if (error.message === 'CLIENT_NOT_FOUND') {
        return null;
      }
      throw error;
    });
    
    if (!clientData) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    
    res.json({
      success: true,
      data: clientData,
      source: 'supabase_cached'
    });
  } catch (error) {
    console.error('Error fetching client data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client data'
    });
  }
});

// Input validation schemas
const statusUpdateSchema = z.object({
  status: z.enum(['active', 'pause', 'completed'])
});

// Update client status - protected, validated, and using Supabase
router.put('/client/:clientId/status', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar tenantId da sessão
    const tenantId = req.user!.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    // Validate input
    const validation = statusUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        details: validation.error.issues
      });
    }
    
    const { clientId: paramClientId } = req.params;
    const { status } = validation.data;
    
    // Get dynamic Supabase client using user's configured credentials
    const dynamicSupabase = await getDynamicSupabaseClient(clientId);
    if (!dynamicSupabase) {
      // 🔐 SECURITY FIX: Generate unique mock data per tenant using crypto-based seeding
      const mockData = generateMockDashboardData(tenantId);
      const mockClient = mockData.find(item => 
        item.telefone === paramClientId && item.tenant_id === tenantId
      );
      if (!mockClient) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Simulate update in mock mode
      return res.json({
        success: true,
        data: { ...mockClient, status_atendimento: status, ultima_atividade: new Date().toISOString() },
        source: 'mock_data',
        warning: 'Usando dados mockados - Supabase não configurado para este cliente'
      });
    }
    
    // Update client status in Supabase
    const { data, error } = await dynamicSupabase
      .from('clientes_completos')
      .update({
        status_atendimento: status,
        ultima_atividade: new Date().toISOString()
      })
      .eq('telefone', paramClientId)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      console.error('Supabase update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update client status in database',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error updating client status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client status'
    });
  }
});

// Calendar events endpoint - agregação de eventos do Workspace e iCal
router.get('/calendar-events', authenticateToken, async (req, res) => {
  try {
    const authClientId = req.user!.clientId;
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar tenantId da sessão
    const tenantId = req.user!.tenantId;
    
    // Cache calendar events aggregation (workspace + iCal)
    const calendarData = await cacheDashboardData(
      authClientId,
      tenantId,
      async () => {
        // ============================================================================
        // WORKSPACE EVENTS - Buscar eventos de databases e boards do Supabase
        // ============================================================================
        let workspaceEvents: any[] = [];
        try {
          const supabase = await getDynamicSupabaseClient(authClientId);
          if (supabase) {
            // Buscar databases com colunas de data
            const { data: databases } = await supabase
              .from('workspace_databases')
              .select('*');
            
            // Buscar boards com cards que tem due dates
            const { data: boards } = await supabase
              .from('workspace_boards')
              .select('*');
            
            // Buscar reuniões do Supabase para o calendário
            const { data: supabaseMeetings, error: meetingsError } = await supabase
              .from('reunioes')
              .select('*');

            if (meetingsError) {
              console.error(`❌ Erro ao buscar reuniões do Supabase:`, meetingsError);
            }

            if (supabaseMeetings && supabaseMeetings.length > 0) {
              console.log(`🎥 Encontradas ${supabaseMeetings.length} reuniões no Supabase (EXIBIÇÃO TOTAL ATIVA)`);
              
              for (const meeting of supabaseMeetings) {
                // Suportar múltiplos formatos de campo de data
                const startDate = meeting.data_inicio || meeting.dataHora || meeting.data_hora || meeting.created_at;
                
                if (!startDate) {
                  console.log(`⚠️ Reunião ${meeting.id} sem data. Dados:`, JSON.stringify(meeting));
                  continue;
                }

                try {
                  const dateObj = new Date(startDate);
                  if (isNaN(dateObj.getTime())) {
                    console.log(`⚠️ Data inválida para reunião ${meeting.id}: ${startDate}`);
                    continue;
                  }

                  // Formatação robusta para o calendário (YYYY-MM-DD)
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const dateOnly = `${year}-${month}-${day}`;

                  const timeOnly = dateObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                  });

                  workspaceEvents.push({
                    id: `supabase_meeting_${meeting.id}`,
                    title: `🎥 Reunião: ${meeting.titulo || 'Sem título'}`,
                    description: meeting.descricao || `Reunião vinda do Supabase`,
                    date: dateOnly,
                    time: timeOnly,
                    duration: meeting.duracao || 60,
                    isAllDay: false,
                    type: 'meeting',
                    client: meeting.nome || 'Cliente',
                    status: meeting.status || 'agendada',
                    location: meeting.link_reuniao || meeting.link || '',
                    meetLink: meeting.link_reuniao || meeting.link || '',
                    source: 'supabase_meeting'
                  });
                } catch (err) {
                  console.error(`❌ Erro ao processar reunião ${meeting.id}:`, err);
                }
              }
            }
        
            // Extrair eventos de databases (rows com colunas tipo date)
        if (databases && databases.length > 0) {
          for (const db of databases) {
            try {
              const columns = typeof db.columns === 'string' ? JSON.parse(db.columns) : db.columns;
              const rows = typeof db.rows === 'string' ? JSON.parse(db.rows) : db.rows;
              
              // Encontrar colunas do tipo date
              const dateColumns = columns?.filter((col: any) => col.type === 'date') || [];
              
              if (dateColumns.length > 0 && rows && rows.length > 0) {
                for (const row of rows) {
                  for (const dateCol of dateColumns) {
                    const dateValue = row[dateCol.id];
                    if (dateValue) {
                      // Extrair título da row (primeira coluna text/title)
                      const titleColumn = columns?.find((c: any) => c.type === 'text' || c.type === 'title');
                      const title = titleColumn ? row[titleColumn.id] : 'Evento sem título';
                      
                      // Extrair data e hora corretamente
                      let dateOnly = dateValue;
                      let timeOnly = '00:00';
                      let hasTime = false;
                      
                      // Se dateValue contém horário (formato ISO com 'T'), extrair separadamente
                      if (dateValue.includes('T')) {
                        dateOnly = dateValue.split('T')[0];
                        
                        // Extrair horário usando timezone de São Paulo
                        const dateObj = new Date(dateValue);
                        timeOnly = dateObj.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                        });
                        hasTime = true;
                      } else {
                        // Procurar por coluna de hora associada (time_<dateColId> ou similar)
                        const timeColumn = columns?.find((c: any) => 
                          c.type === 'time' && 
                          (c.id === `time_${dateCol.id}` || c.name?.toLowerCase().includes('hora') || c.name?.toLowerCase().includes('time'))
                        );
                        
                        if (timeColumn && row[timeColumn.id]) {
                          timeOnly = row[timeColumn.id];
                          hasTime = true;
                        }
                      }
                      
                      workspaceEvents.push({
                        id: `workspace_db_${db.id}_${row.id}_${dateCol.id}`,
                        title: `📊 ${db.title || 'Database'}: ${title}`,
                        description: `Evento do workspace database`,
                        date: dateOnly,
                        time: timeOnly,
                        duration: undefined,
                        isAllDay: !hasTime,
                        type: 'workspace',
                        client: 'Workspace Database',
                        status: 'confirmado',
                        location: `/workspace`,
                        meetLink: '',
                        source: 'workspace_database'
                      });
                    }
                  }
                }
              }
            } catch (parseError) {
              console.error('Erro ao processar database:', db.id, parseError);
            }
          }
        }
        
        // Extrair eventos de boards (cards com dueDate)
        if (boards && boards.length > 0) {
          console.log(`📋 Processando ${boards.length} boards...`);
          for (const board of boards) {
            try {
              // Boards têm estrutura: board.lists[].cards[]
              const lists = typeof board.lists === 'string' ? JSON.parse(board.lists) : board.lists;
              console.log(`📋 Board "${board.title}": ${lists?.length || 0} listas encontradas`);
              
              if (lists && lists.length > 0) {
                for (const list of lists) {
                  const cards = list.cards || [];
                  console.log(`   Lista "${list.title}": ${cards.length} cards`);
                  
                  if (cards && cards.length > 0) {
                    for (const card of cards) {
                      // Suportar múltiplas variantes do campo de data
                      const dueDate = card.dueDate || card.due_date || card.properties?.due_date || card.properties?.dueDate;
                      
                      if (dueDate) {
                        // Extrair apenas a parte da data (yyyy-mm-dd) se for timestamp ISO
                        const dateOnly = dueDate.split('T')[0];
                        
                        // Extrair horário: usar dueTime se existir, senão extrair do dueDate
                        let timeOnly = card.dueTime;
                        if (!timeOnly && dueDate.includes('T')) {
                          // Se dueDate tem horário (formato ISO), extrair usando timezone de São Paulo
                          const dueDateObj = new Date(dueDate);
                          timeOnly = dueDateObj.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          });
                        }
                        
                        // Se ainda não tiver horário, usar 00:00
                        if (!timeOnly) {
                          timeOnly = '00:00';
                        }
                        
                        workspaceEvents.push({
                          id: `workspace_board_${board.id}_${card.id}`,
                          title: `📋 ${card.title || 'Card sem título'}`,
                          description: card.description || `Card do board "${board.title}"`,
                          date: dateOnly,
                          time: timeOnly,
                          duration: undefined,
                          isAllDay: !card.dueTime && !dueDate.includes('T'), // All-day se não tiver horário
                          type: 'workspace',
                          client: board.title || 'Workspace Board',
                          status: card.completed ? 'concluído' : 'pendente',
                          location: `/workspace`,
                          meetLink: '',
                          source: 'workspace_board'
                        });
                        console.log(`     ✅ Evento extraído: "${card.title}" em ${dateOnly} às ${timeOnly}`);
                      }
                    }
                  }
                }
              }
            } catch (parseError) {
              console.error('❌ Erro ao processar board:', board.id, parseError);
            }
          }
        }
        
        console.log(`✅ Workspace: ${workspaceEvents.length} eventos encontrados`);
      }
    } catch (workspaceError) {
      console.error('Erro ao buscar eventos do workspace:', workspaceError);
    }

    // ============================================================================
    // MEETING EVENTS - Buscar reuniões agendadas do sistema 100ms
    // ============================================================================
    let meetingEvents: any[] = [];
    try {
      const tenantId = req.user!.tenantId;
      console.log(`🎥 Buscando reuniões para tenantId: ${tenantId}`);
      const { db } = await import('../db');
      const meetings = await db.select().from(reunioes)
        .where(eq(reunioes.tenantId, tenantId))
        .orderBy(desc(reunioes.dataInicio));

      if (meetings && meetings.length > 0) {
        console.log(`🎥 Encontradas ${meetings.length} reuniões no banco de dados`);
        for (const meeting of meetings) {
          try {
            const startDate = meeting.dataInicio;
            if (!startDate) {
              console.log(`⚠️ Reunião ${meeting.id} sem data de início`);
              continue;
            }

            const dateObj = new Date(startDate);
            const dateOnly = dateObj.toISOString().split('T')[0];
            const timeOnly = dateObj.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
            });

            console.log(`✅ Adicionando reunião: ${meeting.titulo} em ${dateOnly} ${timeOnly}`);

            meetingEvents.push({
              id: `meeting_${meeting.id}`,
              title: `🎥 Reunião: ${meeting.titulo || 'Sem título'}`,
              description: meeting.descricao || `Reunião agendada via 100ms`,
              date: dateOnly,
              time: timeOnly,
              duration: meeting.duracao || 60,
              isAllDay: false,
              type: 'video',
              client: meeting.nome || 'Sistema de Reunião',
              status: meeting.status || 'agendada',
              location: `/reuniao/${meeting.id}`,
              meetLink: `/reuniao/${meeting.id}`,
              source: 'meeting_system'
            });
          } catch (meetingProcessError) {
            console.error('Erro ao processar reunião:', meeting.id, meetingProcessError);
          }
        }
      } else {
        console.log(`ℹ️ Nenhuma reunião encontrada para o tenant ${tenantId}`);
      }
      console.log(`✅ Reuniões: ${meetingEvents.length} eventos processados`);
    } catch (meetingError) {
      console.error('Erro ao buscar reuniões do sistema:', meetingError);
    }
    
    // ============================================================================
    // ICAL EVENTS - Buscar eventos do iCal (se configurado)
    // ============================================================================
    
    // SEMPRE processar iCal como complemento
    let icalEvents = [];
    try {
        const icalUrl = process.env.ICAL_URL;
        
        if (!icalUrl) {
          console.warn('ICAL_URL não configurado - pulando integração iCal');
        } else {
          const response = await fetch(icalUrl);
          const icalData = await response.text();
        const parsedData = ical.sync.parseICS(icalData);
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        for (const key in parsedData) {
          const event = parsedData[key];
          if (event.type === 'VEVENT') {
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            
            // Filtrar eventos dentro do mesmo range do Google Calendar (últimos 7 dias + próximos 30 dias)
            if (startDate >= sevenDaysAgo && startDate <= thirtyDaysFromNow) {
              // Verificar se é evento de dia inteiro de forma mais robusta
              const isAllDay = !(event.start instanceof Date && event.start.getHours !== undefined) || 
                             (typeof event.start === 'string' && !event.start.includes('T'));
              const durationMinutes = isAllDay ? undefined : Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
              
              icalEvents.push({
                id: event.uid || `ical_${Math.random().toString(36).substr(2, 9)}`,
                title: event.summary || 'Evento sem título',
                description: event.description || '',
                date: startDate.toISOString().split('T')[0],
                time: isAllDay ? 'Dia todo' : startDate.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                }),
                duration: durationMinutes,
                isAllDay: isAllDay,
                type: (event.description && event.description.includes('meet.google.com')) || (event.location && event.location.includes('meet.google.com')) ? 'video' : 'presential',
                client: event.organizer?.name || event.organizer?.email || 'Não informado',
                status: 'confirmado',
                location: event.location || '',
                meetLink: (() => {
                  // Procurar o link do Google Meet na descrição ou location
                  const desc = event.description || '';
                  const loc = event.location || '';
                  const meetMatch = (desc + ' ' + loc).match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
                  return meetMatch ? meetMatch[0] : '';
                })()
              });
            }
          }
        }
        
        console.log(`iCal encontrou ${icalEvents.length} eventos`);
        if (icalEvents.length > 0) {
          console.log('Primeiro evento do iCal:', JSON.stringify(icalEvents[0], null, 2));
        }
        }
    } catch (icalError) {
      console.error('Erro ao buscar dados do iCal:', icalError);
    }

    // Combinar eventos do iCal, Workspace e Reuniões
    const allEvents = [...icalEvents, ...workspaceEvents, ...meetingEvents];
    
    // Remover duplicatas baseado no título e data
    const uniqueEvents = allEvents.filter((event, index, arr) => 
      index === arr.findIndex(e => e.id === event.id || (e.title === event.title && e.date === event.date && e.time === event.time))
    );
    
    // Ordenar todos os eventos por data e hora
    uniqueEvents.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.time && a.time !== 'Dia todo' ? a.time : '00:00') + ':00');
      const dateB = new Date(b.date + 'T' + (b.time && b.time !== 'Dia todo' ? b.time : '00:00') + ':00');
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log(`Total de eventos únicos: ${uniqueEvents.length}`);
    console.log(`  - iCal: ${icalEvents.length}`);
    console.log(`  - Workspace: ${workspaceEvents.length}`);
    if (uniqueEvents.length > 0) {
      console.log('Eventos finais processados:', uniqueEvents.map(e => ({ title: e.title, date: e.date, time: e.time })));
    }
    
    return {
      success: true,
      data: uniqueEvents,
      timestamp: new Date().toISOString(),
      source: 'integrated',
      sources: {
        ical: icalEvents.length,
        workspace: workspaceEvents.length,
        meetings: meetingEvents.length,
        total_unique: uniqueEvents.length
      },
      total: uniqueEvents.length
    };
      },
      { compress: true, suffix: 'calendar' }
    ).catch(async (error) => {
      console.error('❌ Cache error for calendar events, using fallback:', error);
      
      // Graceful degradation - buscar workspace events sem cache
      let workspaceEvents: any[] = [];
      try {
        const supabase = await getDynamicSupabaseClient(authClientId);
        if (supabase) {
          const { data: databases } = await supabase
            .from('workspace_databases')
            .select('*');
          const { data: boards } = await supabase
            .from('workspace_boards')
            .select('*');
          
          // Processar databases com colunas de data (simplificado para fallback)
          if (databases && databases.length > 0) {
            for (const db of databases) {
              try {
                const columns = typeof db.columns === 'string' ? JSON.parse(db.columns) : db.columns;
                const rows = typeof db.rows === 'string' ? JSON.parse(db.rows) : db.rows;
                const dateColumns = columns?.filter((col: any) => col.type === 'date') || [];
                
                if (dateColumns.length > 0 && rows && rows.length > 0) {
                  for (const row of rows) {
                    for (const dateCol of dateColumns) {
                      const dateValue = row[dateCol.id];
                      if (dateValue) {
                        const titleColumn = columns?.find((c: any) => c.type === 'text' || c.type === 'title');
                        const title = titleColumn ? row[titleColumn.id] : 'Evento sem título';
                        
                        workspaceEvents.push({
                          id: `workspace_db_${db.id}_${row.id}_${dateCol.id}`,
                          title: `📊 ${db.title || 'Database'}: ${title}`,
                          description: `Evento do workspace database`,
                          date: dateValue,
                          time: '00:00',
                          isAllDay: true,
                          type: 'workspace',
                          client: 'Workspace Database',
                          status: 'confirmado',
                          location: `/workspace`,
                          source: 'workspace_database'
                        });
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.error('Erro ao processar database no fallback:', parseError);
              }
            }
          }
        }
      } catch (workspaceError) {
        console.error('Erro ao buscar eventos do workspace no fallback:', workspaceError);
      }
      
      return {
        success: true,
        data: workspaceEvents.length > 0 ? workspaceEvents : [{
          id: 'fallback_1',
          title: 'Nenhum evento encontrado',
          description: 'Configure o Workspace ou iCal para visualizar eventos.',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          duration: 60,
          type: 'presential',
          client: 'Sistema',
          status: 'pending',
          location: '',
          meetLink: ''
        }],
        source: workspaceEvents.length > 0 ? 'workspace_only_fallback' : 'fallback_data',
        sources: {
          ical: 0,
          workspace: workspaceEvents.length,
          total_unique: workspaceEvents.length || 1
        },
        warning: 'Cache error. ' + (workspaceEvents.length > 0 ? 'Mostrando apenas eventos do Workspace.' : 'Mostrando dados de fallback.'),
        total: workspaceEvents.length || 1
      };
    });
    
    // Return cached data
    res.json(calendarData);

  } catch (error) {
    console.error('❌ Error in calendar-events endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test connections endpoint - PROTEGIDO: requer autenticação para isolamento multi-tenant
router.get('/test-connections', authenticateToken, async (req, res) => {
  try {
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar apenas dados da sessão autenticada
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }

    const connectionResults = {
      timestamp: new Date().toISOString(),
      clientId: clientId,
      tenantId: tenantId,
      supabase: { status: 'not_configured', message: '', hasCredentials: false },
      whatsapp: { status: 'not_configured', message: '', hasCredentials: false },
      dashboard_data: null as any,
      overall_status: 'offline'
    };

    // Test Supabase connection
    try {
      const supabaseCredentials = getSupabaseCredentials(clientId);
      if (supabaseCredentials) {
        connectionResults.supabase.hasCredentials = true;
        const supabaseConnected = await testDynamicSupabaseConnection(clientId);
        
        if (supabaseConnected) {
          connectionResults.supabase.status = 'connected';
          connectionResults.supabase.message = 'Conexão com Supabase estabelecida com sucesso';
          
          // Buscar dados reais do dashboard
          try {
            const realData = await getDashboardDataFromSupabase(clientId, tenantId);
            if (realData && realData.length > 0) {
              connectionResults.dashboard_data = {
                source: 'dynamic_supabase',
                count: realData.length,
                data: realData
              };
            }
          } catch (dataError) {
            console.error('Erro ao buscar dados do Supabase:', dataError);
          }
        } else {
          connectionResults.supabase.status = 'error';
          connectionResults.supabase.message = 'Falha na conexão com Supabase - verificar credenciais';
        }
      } else {
        connectionResults.supabase.status = 'not_configured';
        connectionResults.supabase.message = 'Credenciais do Supabase não configuradas';
      }
    } catch (error) {
      connectionResults.supabase.status = 'error';
      connectionResults.supabase.message = `Erro ao testar Supabase: ${error.message}`;
    }

    // Test WhatsApp/Evolution API connection
    try {
      const whatsappCredentials = getWhatsAppCredentials(clientId);
      if (whatsappCredentials && whatsappCredentials.apiKey && whatsappCredentials.phoneNumber) {
        connectionResults.whatsapp.hasCredentials = true;
        
        try {
          // Test WhatsApp API with a simple status check
          // This is a placeholder - you would replace with actual WhatsApp API endpoint
          const testUrl = `https://api.evolution.com.br/instance/status`; // Example URL
          
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${whatsappCredentials.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          });

          if (response.ok) {
            connectionResults.whatsapp.status = 'connected';
            connectionResults.whatsapp.message = 'Conexão com WhatsApp API estabelecida com sucesso';
          } else {
            connectionResults.whatsapp.status = 'error';
            connectionResults.whatsapp.message = `Erro HTTP ${response.status} ao conectar com WhatsApp API`;
          }
        } catch (whatsappError) {
          // Since WhatsApp API might not be reachable in dev, mark as partial instead of error
          connectionResults.whatsapp.status = 'partial';
          connectionResults.whatsapp.message = 'Credenciais configuradas, mas API não pôde ser testada (verificar URL/conectividade)';
        }
      } else {
        connectionResults.whatsapp.status = 'not_configured';
        connectionResults.whatsapp.message = 'Credenciais do WhatsApp não configuradas';
      }
    } catch (error) {
      connectionResults.whatsapp.status = 'error';
      connectionResults.whatsapp.message = `Erro ao testar WhatsApp: ${error.message}`;
    }

    // Determine overall status
    const hasActiveConnection = connectionResults.supabase.status === 'connected' || 
                               connectionResults.whatsapp.status === 'connected';

    if (hasActiveConnection) {
      connectionResults.overall_status = 'connected';
    } else {
      const hasPartialConnection = connectionResults.supabase.status === 'partial' || 
                                  connectionResults.whatsapp.status === 'partial';
      connectionResults.overall_status = hasPartialConnection ? 'partial' : 'error';
    }

    // If no real data was found but we have a connection, fallback to mock data
    if (!connectionResults.dashboard_data) {
      // 🔐 SECURITY FIX: Generate unique mock data per tenant using crypto-based seeding
      const mockData = generateMockDashboardData(tenantId);
      connectionResults.dashboard_data = {
        source: 'mock_data',
        count: mockData.length,
        data: mockData
      };
    }

    res.json({
      success: true,
      connections: connectionResults,
      message: `Status das conexões atualizado. Status geral: ${connectionResults.overall_status}`
    });

  } catch (error) {
    console.error('Error testing connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connections',
      details: error.message
    });
  }
});

// Test all integrations endpoint - DEVELOPMENT ONLY for security
router.get('/test-integrations', async (req, res) => {
  // SECURITY: Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not available in production'
    });
  }
  // DEVELOPMENT ENDPOINT: Verificar se Supabase está configurado em environment variables
  const supabaseConfigured = !!(process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL) && 
                              !!(process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
  if (supabaseConfigured) {
    console.log('✅ Supabase configurado via environment variables');
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    supabase: { status: 'unknown', message: '' },
    jwt: { status: 'unknown', message: '' },
    database: { status: 'unknown', message: '' },
    environment_variables: {
      supabase_configured: supabaseConfigured,
      jwt_configured: !!process.env.JWT_SECRET,
      database_configured: !!process.env.DATABASE_URL
    }
  };

  // Test Supabase connection
  try {
    const supabaseClient = await getSupabaseClient();
    if (supabaseClient) {
      // Test with a simple query
      const { error } = await supabaseClient
        .from('clientes_completos')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        results.supabase = { status: 'connected', message: 'Successfully connected to Supabase' };
      } else {
        results.supabase = { status: 'error', message: 'Supabase connection failed' };
      }
    } else {
      results.supabase = { status: 'error', message: 'Supabase client not configured' };
    }
  } catch (error) {
    results.supabase = { status: 'error', message: `Supabase error: ${error.message}` };
  }

  // Test JWT functionality
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      const testToken = jwt.sign({ test: 'payload' }, jwtSecret, { expiresIn: '1h' });
      const decoded = jwt.verify(testToken, jwtSecret);
      results.jwt = { status: 'working', message: 'JWT signing and verification working' };
    } else {
      results.jwt = { status: 'error', message: 'JWT_SECRET not configured' };
    }
  } catch (error) {
    results.jwt = { status: 'error', message: `JWT error: ${error.message}` };
  }


  // Test Database URL
  try {
    if (process.env.DATABASE_URL) {
      results.database = { status: 'configured', message: 'Database URL configured' };
    } else {
      results.database = { status: 'warning', message: 'DATABASE_URL not configured' };
    }
  } catch (error) {
    results.database = { status: 'error', message: `Database error: ${error.message}` };
  }

  res.json({
    success: true,
    message: 'Integration test results',
    results
  });
});

// Endpoint para detecção automática de novos clientes
router.get('/check-new-clients', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar tenantId da sessão
    const tenantId = req.user!.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    console.log(`🔍 Verificando novos clientes para cliente ${clientId} (tenant: ${tenantId})`);
    
    // Limpar cache expirado antes da verificação
    cleanExpiredCache();
    
    // Detectar novos clientes
    const detection = await detectNewClients(clientId, tenantId);
    
    let processResults = [];
    
    // Se existem novos clientes e o processamento automático está habilitado
    if (detection.newClients.length > 0) {
      const shouldProcessAutomatically = req.query.autoProcess !== 'false'; // Default é true
      
      if (shouldProcessAutomatically) {
        console.log(`🚀 Processando ${detection.newClients.length} novos clientes automaticamente...`);
        
        try {
          processResults = await processNewClients(clientId, detection.newClients);
          
          // Log dos resultados
          const successful = processResults.filter(r => r.success).length;
          const failed = processResults.filter(r => !r.success).length;
          
          console.log(`✅ Processamento concluído: ${successful} sucessos, ${failed} falhas`);
          
        } catch (processError) {
          console.error('❌ Erro no processamento automático:', processError);
          // Não falhar a resposta toda por erro no processamento
          processResults = [{
            error: `Erro no processamento automático: ${processError.message}`,
            success: false
          }];
        }
      } else {
        console.log(`⏸️ Processamento automático desabilitado via query parameter`);
      }
    }
    
    // Estatísticas do cache para debugging
    const cacheStats = getCacheStats();
    
    res.json({
      success: true,
      detection: {
        newClientsCount: detection.newClients.length,
        newClients: detection.newClients.map(client => ({
          telefone: client.telefone,
          nome_completo: client.nome_completo,
          email_principal: client.email_principal,
          primeiro_contato: client.primeiro_contato,
          tenant_id: client.tenant_id
        })),
        totalClients: detection.totalClients,
        source: detection.source
      },
      processing: {
        enabled: req.query.autoProcess !== 'false',
        results: processResults,
        successCount: processResults.filter(r => r.success).length,
        errorCount: processResults.filter(r => !r.success).length
      },
      cache: {
        stats: cacheStats,
        clientId: clientId,
        tenantId: tenantId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na detecção de novos clientes:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno na detecção de novos clientes',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint adicional para estatísticas do cache (útil para debugging)
router.get('/cache-stats', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    // 🔐 ISOLAMENTO MULTI-TENANT: Usar tenantId da sessão
    const tenantId = req.user!.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida - faça login novamente'
      });
    }
    
    const stats = getCacheStats();
    
    res.json({
      success: true,
      clientId,
      tenantId,
      cache: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: error.message
    });
  }
});

export { router as dashboardRoutes };