import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDynamicSupabaseClient } from '../lib/multiTenantSupabase';
import { db } from '../db';
import { workspaceThemes, workspacePublicMapping } from '../../shared/db-schema';
import { eq, and } from 'drizzle-orm';
import { queryWithCache, CACHE_NAMESPACES, CACHE_TTLS, cacheWorkspaceData, invalidateWorkspaceCache } from '../lib/cacheStrategies';
import { cache } from '../lib/cache';

export const workspaceRoutes = Router();

// Utility functions for case conversion
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = toSnakeCase(key);
        converted[snakeKey] = convertKeysToSnakeCase(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        converted[camelKey] = convertKeysToCamelCase(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

// Helper function to convert date values to timestamps (numbers)
function toTimestamp(value: any): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

// Salvar estado completo do workspace
workspaceRoutes.post('/save', authenticateToken, async (req, res) => {
  try {
    const { pages, boards, databases, deletedPageIds, deletedBoardIds, deletedDatabaseIds } = req.body;
    const { clientId, tenantId } = req.user;

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      return res.status(400).json({
        success: false,
        error: 'Supabase não configurado para este cliente'
      });
    }

    const now = Date.now();

    // Salvar pages (sem auto-delete - só deleta se explicitamente solicitado)
    if (pages !== undefined) {
      // Deletar apenas páginas explicitamente marcadas para deleção
      if (deletedPageIds && deletedPageIds.length > 0) {
        const { error: deletePagesError } = await supabase
          .from('workspace_pages')
          .delete()
          .in('id', deletedPageIds);

        if (deletePagesError) throw deletePagesError;
      }

      // Salvar/atualizar páginas recebidas - PRESERVA TODOS OS CAMPOS
      if (pages && pages.length > 0) {
        const pagesData = pages.map((page: any) => {
          const snakeCasePage = convertKeysToSnakeCase({
            ...page,
            tenantId,
            clientId,
            createdAt: toTimestamp(page.createdAt),
            updatedAt: now
          });

          // Stringify JSONB fields
          if (snakeCasePage.blocks) {
            snakeCasePage.blocks = JSON.stringify(snakeCasePage.blocks);
          }
          if (snakeCasePage.databases) {
            snakeCasePage.databases = JSON.stringify(snakeCasePage.databases);
          }
          if (snakeCasePage.properties && typeof snakeCasePage.properties === 'object') {
            snakeCasePage.properties = JSON.stringify(snakeCasePage.properties);
          }

          return snakeCasePage;
        });

        const { error: pagesError } = await supabase
          .from('workspace_pages')
          .upsert(pagesData, { onConflict: 'id' });

        if (pagesError) throw pagesError;
      }
    }

    // Salvar boards (sem auto-delete - só deleta se explicitamente solicitado)
    if (boards !== undefined) {
      // Deletar apenas boards explicitamente marcados para deleção
      if (deletedBoardIds && deletedBoardIds.length > 0) {
        const { error: deleteBoardsError } = await supabase
          .from('workspace_boards')
          .delete()
          .in('id', deletedBoardIds);

        if (deleteBoardsError) throw deleteBoardsError;
      }

      // Salvar/atualizar boards recebidos - PRESERVA TODOS OS CAMPOS
      if (boards && boards.length > 0) {
        const boardsData = boards.map((board: any) => {
          const snakeCaseBoard = convertKeysToSnakeCase({
            ...board,
            tenantId,
            clientId,
            createdAt: toTimestamp(board.createdAt),
            updatedAt: now
          });

          // Stringify JSONB fields
          if (snakeCaseBoard.lists) {
            snakeCaseBoard.lists = JSON.stringify(snakeCaseBoard.lists);
          }
          if (snakeCaseBoard.cards) {
            snakeCaseBoard.cards = JSON.stringify(snakeCaseBoard.cards);
          }
          if (snakeCaseBoard.labels) {
            snakeCaseBoard.labels = JSON.stringify(snakeCaseBoard.labels);
          }
          if (snakeCaseBoard.members) {
            snakeCaseBoard.members = JSON.stringify(snakeCaseBoard.members);
          }
          if (snakeCaseBoard.settings) {
            snakeCaseBoard.settings = JSON.stringify(snakeCaseBoard.settings);
          }

          return snakeCaseBoard;
        });

        const { error: boardsError } = await supabase
          .from('workspace_boards')
          .upsert(boardsData, { onConflict: 'id' });

        if (boardsError) throw boardsError;
      }
    }

    // Salvar databases (sem auto-delete - só deleta se explicitamente solicitado)
    if (databases !== undefined) {
      // Deletar apenas databases explicitamente marcados para deleção
      if (deletedDatabaseIds && deletedDatabaseIds.length > 0) {
        const { error: deleteDatabasesError } = await supabase
          .from('workspace_databases')
          .delete()
          .in('id', deletedDatabaseIds);

        if (deleteDatabasesError) throw deleteDatabasesError;
      }

      // Salvar/atualizar databases recebidos - PRESERVA TODOS OS CAMPOS
      if (databases && databases.length > 0) {
        const databasesData = databases.map((db: any) => {
          const snakeCaseDb = convertKeysToSnakeCase({
            ...db,
            tenantId,
            clientId,
            createdAt: toTimestamp(db.createdAt),
            updatedAt: now,
            viewType: db.view || db.viewType || 'table'
          });

          // Stringify JSONB fields
          if (snakeCaseDb.columns) {
            snakeCaseDb.columns = JSON.stringify(snakeCaseDb.columns);
          }
          if (snakeCaseDb.rows) {
            snakeCaseDb.rows = JSON.stringify(snakeCaseDb.rows);
          }
          if (snakeCaseDb.views) {
            snakeCaseDb.views = JSON.stringify(snakeCaseDb.views);
          }

          return snakeCaseDb;
        });

        const { error: dbsError } = await supabase
          .from('workspace_databases')
          .upsert(databasesData, { onConflict: 'id' });

        if (dbsError) throw dbsError;
      }
    }

    // Invalidate workspace cache after save
    await invalidateWorkspaceCache(clientId, tenantId);
    console.log(`🗑️ Workspace and Dashboard Calendar cache invalidated after save for tenant: ${tenantId}`);

    res.json({
      success: true,
      message: 'Workspace salvo com sucesso',
      saved: {
        pages: pages?.length || 0,
        boards: boards?.length || 0,
        databases: databases?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Erro ao salvar workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar workspace no Supabase',
      details: error.message
    });
  }
});

// Rota de diagnóstico do Workspace
workspaceRoutes.get('/test', authenticateToken, async (req, res) => {
  try {
    const { clientId, tenantId } = req.user;
    const supabase = await getDynamicSupabaseClient(clientId);

    if (!supabase) {
      return res.json({
        success: false,
        error: 'Supabase não configurado',
        clientId,
        tenantId
      });
    }

    const tests = {
      pages: null,
      boards: null,
      databases: null
    };

    // Test pages
    const { data: pages, error: pagesError } = await supabase
      .from('workspace_pages')
      .select('id')
      .limit(1);

    tests.pages = {
      success: !pagesError,
      error: pagesError ? { code: pagesError.code, message: pagesError.message } : null,
      count: pages?.length || 0
    };

    // Test boards
    const { data: boards, error: boardsError } = await supabase
      .from('workspace_boards')
      .select('id')
      .limit(1);

    tests.boards = {
      success: !boardsError,
      error: boardsError ? { code: boardsError.code, message: boardsError.message } : null,
      count: boards?.length || 0
    };

    // Test databases
    const { data: databases, error: dbsError } = await supabase
      .from('workspace_databases')
      .select('id')
      .limit(1);

    tests.databases = {
      success: !dbsError,
      error: dbsError ? { code: dbsError.code, message: dbsError.message } : null,
      count: databases?.length || 0
    };

    res.json({
      success: true,
      clientId,
      tenantId,
      tests
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Carregar estado completo do workspace
// IMPORTANTE: select('*') retorna TODOS os campos do Supabase, incluindo:
// idx, id, tenant_id, client_id, title, content, icon, parent_id, type,
// properties, created_at, updated_at, cover, blocks, databases, font_style,
// small_text, full_width, locked, favorited, etc.
workspaceRoutes.get('/load', authenticateToken, async (req, res) => {
  console.log('🔵 WORKSPACE LOAD REQUEST RECEIVED');
  try {
    const { clientId, tenantId } = req.user;

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      console.log('⚠️ [WORKSPACE] Supabase não configurado - frontend deve usar localStorage');
      return res.json({
        success: true,
        data: { pages: [], boards: [], databases: [] },
        source: 'no_supabase',
        dataSource: 'localStorage',
        message: 'Supabase não configurado - use dados do localStorage'
      });
    }

    // Use cache with compression for workspace data (large payloads)
    const cacheKey = `${CACHE_NAMESPACES.WORKSPACE}:${clientId}:${tenantId}:full-load`;

    const workspaceData = await queryWithCache(
      cacheKey,
      CACHE_TTLS.WORKSPACE, // 1 hour TTL
      async () => {
        console.log('⚠️ Cache MISS - Carregando workspace do Supabase...');

        // Carregar pages - select('*') pega TODOS OS CAMPOS
        const { data: pages, error: pagesError } = await supabase
          .from('workspace_pages')
          .select('*');

        if (pagesError) {
          console.error('❌ Erro ao carregar pages:', pagesError);
          if (pagesError.code === 'PGRST205') {
            console.error('⚠️ TABELA NÃO ENCONTRADA NO SCHEMA CACHE - Execute NOTIFY pgrst, \'reload schema\' no Supabase');
          }
        }

        // Carregar boards
        const { data: boards, error: boardsError } = await supabase
          .from('workspace_boards')
          .select('*');

        if (boardsError) {
          console.error('❌ Erro ao carregar boards:', boardsError);
          if (boardsError.code === 'PGRST205') {
            console.error('⚠️ TABELA workspace_boards NÃO ENCONTRADA NO SCHEMA CACHE');
          }
        }

        // Carregar databases
        const { data: databases, error: dbsError } = await supabase
          .from('workspace_databases')
          .select('*');

        if (dbsError) {
          console.error('❌ Erro ao carregar databases:', dbsError);
          if (dbsError.code === 'PGRST205') {
            console.error('⚠️ TABELA workspace_databases NÃO ENCONTRADA NO SCHEMA CACHE');
          }
        }

        // Parse JSON fields and convert to camelCase
        const parsedPages = (pages || []).map((page: any) => {
          let camelPage = convertKeysToCamelCase(page);

          // Parse JSONB fields
          if (typeof camelPage.blocks === 'string') {
            camelPage.blocks = JSON.parse(camelPage.blocks);
            // Convert nested keys (important for objects inside blocks)
            camelPage.blocks = convertKeysToCamelCase(camelPage.blocks);
          }
          if (typeof camelPage.databases === 'string') {
            camelPage.databases = JSON.parse(camelPage.databases);
            camelPage.databases = convertKeysToCamelCase(camelPage.databases);
          }
          if (typeof camelPage.properties === 'string' && camelPage.properties.startsWith('{')) {
            camelPage.properties = JSON.parse(camelPage.properties);
            camelPage.properties = convertKeysToCamelCase(camelPage.properties);
          }

          return camelPage;
        });

        const parsedBoards = (boards || []).map((board: any) => {
          let camelBoard = convertKeysToCamelCase(board);

          // Parse JSONB fields
          if (typeof camelBoard.lists === 'string') {
            camelBoard.lists = JSON.parse(camelBoard.lists);
            // CRITICAL: Convert nested keys after parsing JSON string
            camelBoard.lists = convertKeysToCamelCase(camelBoard.lists);
          }
          if (typeof camelBoard.cards === 'string') {
            camelBoard.cards = JSON.parse(camelBoard.cards);
            camelBoard.cards = convertKeysToCamelCase(camelBoard.cards);
          }
          if (typeof camelBoard.labels === 'string') {
            camelBoard.labels = JSON.parse(camelBoard.labels);
            camelBoard.labels = convertKeysToCamelCase(camelBoard.labels);
          }
          if (typeof camelBoard.members === 'string') {
            camelBoard.members = JSON.parse(camelBoard.members);
            camelBoard.members = convertKeysToCamelCase(camelBoard.members);
          }
          if (typeof camelBoard.settings === 'string') {
            camelBoard.settings = JSON.parse(camelBoard.settings);
            camelBoard.settings = convertKeysToCamelCase(camelBoard.settings);
          }

          return camelBoard;
        });

        const parsedDatabases = (databases || []).map((db: any) => {
          let camelDb = convertKeysToCamelCase(db);

          // Parse JSONB fields
          if (typeof camelDb.columns === 'string') {
            camelDb.columns = JSON.parse(camelDb.columns);
            camelDb.columns = convertKeysToCamelCase(camelDb.columns);
          }
          if (typeof camelDb.rows === 'string') {
            camelDb.rows = JSON.parse(camelDb.rows);
            camelDb.rows = convertKeysToCamelCase(camelDb.rows);
          }
          if (typeof camelDb.views === 'string') {
            camelDb.views = JSON.parse(camelDb.views);
            camelDb.views = convertKeysToCamelCase(camelDb.views);
          }

          // Map viewType back to view for compatibility
          if (camelDb.viewType && !camelDb.view) {
            camelDb.view = camelDb.viewType;
          }

          return camelDb;
        });

        return {
          pages: parsedPages,
          boards: parsedBoards,
          databases: parsedDatabases
        };
      }
    );

    console.log(`✅ Workspace loaded (pages: ${workspaceData.pages.length}, boards: ${workspaceData.boards.length}, databases: ${workspaceData.databases.length})`);

    res.json({
      success: true,
      data: workspaceData,
      source: 'supabase_cached',
      dataSource: 'supabase',
      message: 'Dados carregados do Supabase',
      loaded: {
        pages: workspaceData.pages.length,
        boards: workspaceData.boards.length,
        databases: workspaceData.databases.length
      }
    });
  } catch (error: any) {
    console.error('Erro ao carregar workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar workspace do Supabase',
      details: error.message
    });
  }
});

// Deletar item do workspace
workspaceRoutes.delete('/:type/:id', authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { clientId, tenantId } = req.user;

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      return res.status(400).json({
        success: false,
        error: 'Supabase não configurado para este cliente'
      });
    }

    const tableMap: Record<string, string> = {
      'page': 'workspace_pages',
      'board': 'workspace_boards',
      'database': 'workspace_databases'
    };

    const table = tableMap[type];
    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Tipo inválido'
      });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate workspace cache after successful deletion
    const resourceTypeMap: Record<string, 'boards' | 'pages' | 'databases'> = {
      'page': 'pages',
      'board': 'boards',
      'database': 'databases'
    };
    await invalidateWorkspaceCache(clientId, tenantId, resourceTypeMap[type], id);

    res.json({
      success: true,
      message: `${type} deletado com sucesso`
    });
  } catch (error: any) {
    console.error('Erro ao deletar item do workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar item do workspace',
      details: error.message
    });
  }
});

// Listar todos os temas
workspaceRoutes.get('/themes', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.user;

    // Buscar temas do PostgreSQL local via Drizzle
    const themes = await db
      .select()
      .from(workspaceThemes)
      .where(eq(workspaceThemes.userId, tenantId))
      .orderBy(workspaceThemes.createdAt);

    const parsedThemes = themes.map((theme: any) => convertKeysToCamelCase(theme));

    res.json(parsedThemes);
  } catch (error: any) {
    console.error('Erro ao carregar temas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar temas',
      details: error.message
    });
  }
});

// Criar novo tema
workspaceRoutes.post('/themes', authenticateToken, async (req, res) => {
  try {
    const { id, name, icon, color } = req.body;
    const { tenantId } = req.user;

    // Inserir tema no PostgreSQL local via Drizzle
    const [theme] = await db
      .insert(workspaceThemes)
      .values({
        id,
        name,
        icon,
        color: color || '#6366f1',
        userId: tenantId
      })
      .returning();

    const parsedTheme = convertKeysToCamelCase(theme);

    res.json(parsedTheme);
  } catch (error: any) {
    console.error('Erro ao criar tema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar tema',
      details: error.message
    });
  }
});

// Deletar tema
workspaceRoutes.delete('/themes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Verificar se o tema pertence ao tenant antes de deletar
    const themeToDelete = await db
      .select()
      .from(workspaceThemes)
      .where(and(eq(workspaceThemes.id, id), eq(workspaceThemes.userId, tenantId)))
      .limit(1);

    if (themeToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tema não encontrado ou não pertence a este tenant'
      });
    }

    // Deletar tema do PostgreSQL local via Drizzle
    await db
      .delete(workspaceThemes)
      .where(and(eq(workspaceThemes.id, id), eq(workspaceThemes.userId, tenantId)));

    res.json({
      success: true,
      message: 'Tema deletado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar tema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar tema',
      details: error.message
    });
  }
});

// ========== CALENDAR SYNC ROUTES ==========

// Interface para eventos de calendário do workspace
interface WorkspaceCalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  source: 'database' | 'board';
  sourceId: string;
  description?: string;
  type: 'date' | 'dueDate';
  metadata?: {
    databaseId?: string;
    fieldId?: string;
    boardId?: string;
    cardId?: string;
  };
}

// Função auxiliar para extrair eventos de databases
function extractEventsFromDatabases(databases: any[]): WorkspaceCalendarEvent[] {
  const events: WorkspaceCalendarEvent[] = [];

  console.log(`[extractEventsFromDatabases] Processing ${databases.length} databases`);

  databases.forEach((db: any, dbIndex: number) => {
    console.log(`[extractEventsFromDatabases] Database ${dbIndex + 1}/${databases.length}:`, {
      id: db.id,
      title: db.title || db.name,
      hasColumns: !!db.columns,
      hasRows: !!db.rows,
      columnsType: typeof db.columns,
      rowsType: typeof db.rows
    });

    let columns = db.columns;
    let rows = db.rows;

    // Parse JSON if needed
    if (typeof columns === 'string') {
      try {
        columns = JSON.parse(columns);
        console.log(`[extractEventsFromDatabases] Parsed columns from string for database ${db.id}`);
      } catch (e) {
        console.error(`[extractEventsFromDatabases] Failed to parse columns for database ${db.id}:`, e);
        return;
      }
    }

    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
        console.log(`[extractEventsFromDatabases] Parsed rows from string for database ${db.id}`);
      } catch (e) {
        console.error(`[extractEventsFromDatabases] Failed to parse rows for database ${db.id}:`, e);
        return;
      }
    }

    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      console.log(`[extractEventsFromDatabases] Database ${db.id} sem columns/rows válidos - columns isArray: ${Array.isArray(columns)}, rows isArray: ${Array.isArray(rows)}`);
      return;
    }

    console.log(`[extractEventsFromDatabases] Database ${db.id} has ${columns.length} columns and ${rows.length} rows`);

    // Log all column types
    const columnTypes = columns.map((col: any) => ({ id: col.id, name: col.name, type: col.type }));
    console.log(`[extractEventsFromDatabases] Column types in database ${db.id}:`, columnTypes);

    const dateColumns = columns.filter((col: any) => col.type === 'date');
    console.log(`[extractEventsFromDatabases] Found ${dateColumns.length} date columns in database ${db.id}:`,
      dateColumns.map((col: any) => ({ id: col.id, name: col.name }))
    );

    dateColumns.forEach((column: any) => {
      console.log(`[extractEventsFromDatabases] Processing date column "${column.name}" (${column.id}) in database ${db.id}`);

      rows.forEach((row: any, rowIndex: number) => {
        const dateValue = row[column.id];

        if (dateValue) {
          console.log(`[extractEventsFromDatabases] Found date value in row ${rowIndex + 1}:`, {
            rowId: row.id,
            rowTitle: row.title || row.name,
            columnId: column.id,
            columnName: column.name,
            dateValue
          });

          events.push({
            id: `db_${db.id}_${row.id}_${column.id}`,
            title: row.title || row.name || 'Evento sem título',
            date: dateValue,
            source: 'database',
            sourceId: row.id,
            type: 'date',
            description: column.name,
            metadata: {
              databaseId: db.id,
              fieldId: column.id
            }
          });
        }
      });
    });
  });

  console.log(`[extractEventsFromDatabases] Total events extracted: ${events.length}`);
  if (events.length > 0) {
    console.log(`[extractEventsFromDatabases] Sample events:`, events.slice(0, 3));
  }

  return events;
}

// Função auxiliar para extrair eventos de boards
function extractEventsFromBoards(boards: any[]): WorkspaceCalendarEvent[] {
  const events: WorkspaceCalendarEvent[] = [];

  boards.forEach((board: any) => {
    let lists = board.lists || board.listas;
    if (typeof lists === 'string') {
      try {
        lists = JSON.parse(lists);
      } catch (e) {
        console.error('Failed to parse lists:', e);
      }
    }
    if (!Array.isArray(lists)) return;

    lists.forEach((list: any) => {
      let cards = list.cards || list.itens || [];
      if (typeof cards === 'string') {
        try {
          cards = JSON.parse(cards);
        } catch (e) {
          console.error('Failed to parse cards:', e);
        }
      }
      if (!Array.isArray(cards)) return;

      cards.forEach((card: any) => {
        // Handle both camelCase and snake_case for properties, including inside 'properties' object
        const dueDate = card.dueDate || card.due_date || card.properties?.due_date || card.properties?.dueDate;
        const dueTime = card.dueTime || card.due_time || card.properties?.due_time || card.properties?.dueTime;
        const title = card.title || card.titulo || card.name || card.nome || 'Card sem título';
        const description = card.description || card.descricao || '';

        if (dueDate) {
          try {
            const dueDateObj = new Date(dueDate);
            if (isNaN(dueDateObj.getTime())) return;

            const dateOnly = typeof dueDate === 'string' && dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;

            let timeOnly = dueTime;
            if (!timeOnly) {
              // If dueDate is a full ISO string with time, extract it
              if (typeof dueDate === 'string' && dueDate.includes('T')) {
                const timePart = dueDate.split('T')[1];
                if (timePart && timePart.length >= 5) {
                  timeOnly = timePart.substring(0, 5);
                }
              }

              if (!timeOnly) {
                timeOnly = dueDateObj.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                });
              }
            }

            events.push({
              id: `board_${board.id}_${card.id}`,
              title,
              date: dateOnly,
              time: timeOnly,
              source: 'board',
              sourceId: card.id,
              type: 'dueDate',
              description,
              metadata: {
                boardId: board.id,
                cardId: card.id
              }
            });
          } catch (e) {
            console.error(`Error processing card ${card.id}:`, e);
          }
        }
      });
    });
  });

  return events;
}

// GET /api/workspace/calendar/events
// Agrega eventos de databases, boards e Google Calendar
workspaceRoutes.get('/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { clientId, tenantId } = req.user;

    const calendarData = await cacheWorkspaceData(
      clientId,
      tenantId,
      'calendar',
      async () => {
        const events: WorkspaceCalendarEvent[] = [];
        let dataSource = 'none';

        console.log('[Calendar Events GET] Buscando eventos do workspace...');

        const supabase = await getDynamicSupabaseClient(clientId);

        let databases: any[] = [];
        let boards: any[] = [];

        if (supabase) {
          console.log('[Calendar Events GET] Tentando buscar do Supabase...');

          const { data: dbData, error: dbError } = await supabase
            .from('workspace_databases')
            .select('*');

          const { data: boardData, error: boardError } = await supabase
            .from('workspace_boards')
            .select('*');

          if (!dbError && dbData && dbData.length > 0) {
            databases = dbData;
            dataSource = 'supabase';
            console.log(`[Calendar Events GET] ${databases.length} databases encontradas no Supabase`);
          }

          if (!boardError && boardData && boardData.length > 0) {
            boards = boardData;
            dataSource = 'supabase';
            console.log(`[Calendar Events GET] ${boards.length} boards encontrados no Supabase`);
          }
        }

        if (databases.length === 0 && boards.length === 0) {
          console.log('[Calendar Events GET] Supabase vazio ou não configurado, verificando request body...');

          if (req.body && (req.body.databases || req.body.boards)) {
            databases = req.body.databases || [];
            boards = req.body.boards || [];
            dataSource = 'request_body';
            console.log(`[Calendar Events GET] Usando dados do request body: ${databases.length} databases, ${boards.length} boards`);
          }
        }

        if (databases.length > 0) {
          console.log('[Calendar Events GET] Extraindo eventos de databases...');
          const dbEvents = extractEventsFromDatabases(databases);
          events.push(...dbEvents);
          console.log(`[Calendar Events GET] ${dbEvents.length} eventos extraídos de databases`);
        }

        if (boards.length > 0) {
          console.log('[Calendar Events GET] Extraindo eventos de boards...');
          const boardEvents = extractEventsFromBoards(boards);
          events.push(...boardEvents);
          console.log(`[Calendar Events GET] ${boardEvents.length} eventos extraídos de boards`);
        }

        console.log(`[Calendar Events GET] Total de ${events.length} eventos encontrados (fonte: ${dataSource})`);

        return {
          events,
          dataSource,
          sources: {
            database: events.filter(e => e.source === 'database').length,
            board: events.filter(e => e.source === 'board').length
          }
        };
      },
      { compress: true }
    ).catch(async (error) => {
      console.error('Cache error for calendar events, using fallback:', error);
      const events: WorkspaceCalendarEvent[] = [];
      const supabase = await getDynamicSupabaseClient(clientId);
      if (supabase) {
        const { data: dbData } = await supabase.from('workspace_databases').select('*');
        const { data: boardData } = await supabase.from('workspace_boards').select('*');
        if (dbData) events.push(...extractEventsFromDatabases(dbData));
        if (boardData) events.push(...extractEventsFromBoards(boardData));
      }
      return {
        events,
        dataSource: 'fallback',
        sources: {
          database: events.filter(e => e.source === 'database').length,
          board: events.filter(e => e.source === 'board').length
        }
      };
    });

    res.json({
      success: true,
      data: calendarData.events,
      total: calendarData.events.length,
      dataSource: calendarData.dataSource,
      sources: calendarData.sources
    });
  } catch (error: any) {
    console.error('[Calendar Events GET] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar eventos do calendário',
      details: error.message
    });
  }
});

// POST /api/workspace/calendar/events
// Extrai eventos de boards e databases enviados no request body
// Útil para quando o Supabase não está configurado e os dados estão no localStorage
workspaceRoutes.post('/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { boards, databases } = req.body;
    const events: WorkspaceCalendarEvent[] = [];

    console.log('[Calendar Events POST] Processando eventos do request body...');
    console.log(`[Calendar Events POST] Recebidos: ${databases?.length || 0} databases, ${boards?.length || 0} boards`);

    if (!boards && !databases) {
      return res.status(400).json({
        success: false,
        error: 'É necessário enviar ao menos boards ou databases no body'
      });
    }

    if (databases && Array.isArray(databases) && databases.length > 0) {
      console.log('[Calendar Events POST] Extraindo eventos de databases...');
      const dbEvents = extractEventsFromDatabases(databases);
      events.push(...dbEvents);
      console.log(`[Calendar Events POST] ${dbEvents.length} eventos extraídos de databases`);
    }

    if (boards && Array.isArray(boards) && boards.length > 0) {
      console.log('[Calendar Events POST] Extraindo eventos de boards...');
      const boardEvents = extractEventsFromBoards(boards);
      events.push(...boardEvents);
      console.log(`[Calendar Events POST] ${boardEvents.length} eventos extraídos de boards`);
    }

    console.log(`[Calendar Events POST] Total de ${events.length} eventos processados`);

    res.json({
      success: true,
      data: events,
      total: events.length,
      dataSource: 'request_body',
      sources: {
        database: events.filter(e => e.source === 'database').length,
        board: events.filter(e => e.source === 'board').length
      }
    });
  } catch (error: any) {
    console.error('[Calendar Events POST] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar eventos do calendário',
      details: error.message
    });
  }
});

// GET /api/workspace/boards - Listar todos os boards do usuário
workspaceRoutes.get('/boards', authenticateToken, async (req, res) => {
  try {
    const { clientId, tenantId } = req.user;

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      return res.status(400).json({
        error: 'Supabase não configurado para este cliente'
      });
    }

    const boards = await cacheWorkspaceData(
      clientId,
      tenantId,
      'boards',
      async () => {
        const { data, error } = await supabase
          .from('workspace_boards')
          .select('id, title')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar boards:', error);
          throw error;
        }

        return data || [];
      },
      { compress: true }
    ).catch(async (error) => {
      console.error('Cache error for boards, using fallback:', error);
      const { data, error: fallbackError } = await supabase
        .from('workspace_boards')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return data || [];
    });

    res.json(boards);
  } catch (error: any) {
    console.error('Erro ao listar boards:', error);
    res.status(500).json({
      error: 'Erro ao buscar quadros',
      details: error.message
    });
  }
});

// POST /api/workspace/boards/:boardId/import-page - Importar página para board
workspaceRoutes.post('/boards/:boardId/import-page', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { pageTitle, pageData } = req.body;
    const { clientId } = req.user;

    if (!pageTitle || !pageData) {
      return res.status(400).json({
        error: 'Dados da página incompletos'
      });
    }

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      return res.status(400).json({
        error: 'Supabase não configurado para este cliente'
      });
    }

    // Buscar o board
    const { data: board, error: boardError } = await supabase
      .from('workspace_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      console.error('Board não encontrado:', boardError);
      return res.status(404).json({ error: 'Quadro não encontrado' });
    }

    // Parse dos dados existentes
    let lists = typeof board.lists === 'string' ? JSON.parse(board.lists) : (board.lists || []);
    let cards = typeof board.cards === 'string' ? JSON.parse(board.cards) : (board.cards || []);

    // Garantir que existe pelo menos uma lista
    if (lists.length === 0) {
      lists.push({
        id: `list_${Date.now()}`,
        title: 'Importados',
        order: 0
      });
    }

    // Usar a primeira lista ou criar uma nova "Importados"
    const targetList = lists[0];

    // Criar card a partir da página
    const newCard = {
      id: `card_${Date.now()}`,
      title: pageTitle,
      description: `Página importada em ${new Date().toLocaleString('pt-BR')}`,
      listId: targetList.id,
      order: cards.filter((c: any) => c.listId === targetList.id).length,
      labels: [],
      members: [],
      attachments: [],
      comments: [],
      checklist: [],
      dueDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        importedFrom: 'workspace_page',
        originalData: pageData
      }
    };

    cards.push(newCard);

    // Atualizar o board no Supabase
    const { error: updateError } = await supabase
      .from('workspace_boards')
      .update({
        lists: JSON.stringify(lists),
        cards: JSON.stringify(cards),
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId);

    if (updateError) {
      console.error('Erro ao atualizar board:', updateError);
      throw updateError;
    }

    res.json({
      success: true,
      cardId: newCard.id,
      boardId,
      message: 'Página importada para o quadro com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao importar página para board:', error);
    res.status(500).json({
      error: 'Erro ao mover página para o quadro',
      details: error.message
    });
  }
});

// Tornar um item do workspace público ou privado
workspaceRoutes.post('/public/toggle', authenticateToken, async (req: any, res) => {
  try {
    const { itemId, itemType, isPublic } = req.body;
    const { clientId, tenantId } = req.user;

    console.log(`🔒 [Workspace] Toggling public state for ${itemType} ${itemId} to ${isPublic}`);

    const supabase = await getDynamicSupabaseClient(clientId);
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase não configurado' });
    }

    const tableMap: Record<string, string> = {
      'page': 'workspace_pages',
      'database': 'workspace_databases',
      'board': 'workspace_boards'
    };

    const tableName = tableMap[itemType];
    if (!tableName) return res.status(400).json({ error: 'Tipo de item inválido' });

    let publicSlug = null;

    if (isPublic) {
      // 1. Gerar slug único
      publicSlug = `wp_${Math.random().toString(36).substring(2, 10)}`;

      // 2. Criar mapeamento no banco local
      await db.insert(workspacePublicMapping).values({
        id: publicSlug,
        itemId,
        itemType,
        tenantId,
        clientId,
        isActive: true,
        updatedAt: new Date()
      });
    } else {
      // Desativar mapeamentos existentes
      await db.update(workspacePublicMapping)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(workspacePublicMapping.itemId, itemId), eq(workspacePublicMapping.itemType, itemType)));
    }

    // 3. Atualizar flag no Supabase
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        is_public: isPublic,
        public_slug: publicSlug
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Erro ao atualizar Supabase:', updateError);
      throw updateError;
    }

    // Invalidar cache
    await invalidateWorkspaceCache(clientId, tenantId);

    res.json({
      success: true,
      isPublic,
      publicSlug,
      url: publicSlug ? `/w/${publicSlug}` : null
    });

  } catch (error: any) {
    console.error('Erro ao alternar visibilidade pública:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação', details: error.message });
  }
});
