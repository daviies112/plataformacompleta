import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BaseBlock } from '@/types/notion';
import type { Board, Label } from '@/types/kanban';
import { initialBoardWithExamples, defaultLabels } from '@/data/notion/mockData';
import { supabaseStorage, deleteFromSupabase } from '@/lib/workspaceStorage';

// Simplified Block type for store - implements BaseBlock
export interface StoreBlock extends BaseBlock {
  // All properties inherited from BaseBlock
  textColor?: string;
  backgroundColor?: string;
}

// Extended Page type for store with simplified structure
export interface StorePage {
  id: string;
  title: string;
  icon: string;
  cover?: string;
  content?: string;
  type?: string;
  properties?: any;
  blocks: StoreBlock[];
  databases: any[];
  parentId?: string;
  themeId?: string;
  createdAt: number;
  updatedAt: number;
  fontStyle?: 'sans' | 'serif' | 'mono';
  smallText?: boolean;
  fullWidth?: boolean;
  locked?: boolean;
  favorited?: boolean;
}

// Simplified Database type
export interface StoreDatabase {
  id: string;
  title: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    options?: string[];
    textColor?: string;
    bgColor?: string;
  }>;
  rows: Array<{
    id: string;
    values: Record<string, any>;
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold' | 'light';
    fontSize?: 'small' | 'normal' | 'large';
    fontStyle?: 'normal' | 'italic';
  }>;
  view: string;
  views?: Array<{
    id: string;
    type: string;
    name: string;
    filters?: Array<{
      id: string;
      fieldId: string;
      condition: string;
      value?: any;
    }>;
    sorts?: Array<{
      id: string;
      fieldId: string;
      direction: string;
    }>;
    groupBy?: string;
  }>;
  currentViewId?: string;
  filters?: Array<{
    id: string;
    fieldId: string;
    condition: string;
    value?: any;
  }>;
  sorts?: Array<{
    id: string;
    fieldId: string;
    direction: string;
  }>;
  icon?: string;
  cover?: string;
  description?: string;
  locked?: boolean;
  favorited?: boolean;
  themeId?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'donut';
  chartXAxis?: string;
  chartYAxis?: string;
  formSettings?: {
    enabled: boolean;
    successMessage: string;
    allowMultiple: boolean;
    publicUrl?: string;
  };
}

export interface NotionState {
  pages: StorePage[];
  databases: StoreDatabase[];
  boards: Board[];
  currentPageId: string | null;
  currentDatabaseId: string | null;
  currentBoardId: string | null;
  searchQuery: string;
}

interface NotionStore extends NotionState {
  // Page actions
  addPage: (parentId?: string, title?: string, icon?: string, themeId?: string) => void;
  deletePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<StorePage>) => void;
  setCurrentPage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  togglePageFavorite: (pageId: string) => void;
  
  // Block actions
  addBlock: (type?: string) => void;
  addBlockAfter: (afterBlockId: string, type?: string) => string | null;
  deleteBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<StoreBlock>) => void;
  moveBlockUp: (blockId: string) => void;
  moveBlockDown: (blockId: string) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  
  // Database actions
  addDatabase: (title?: string, icon?: string, themeId?: string) => void;
  updateDatabase: (dbId: string, updates: Partial<StoreDatabase>) => void;
  deleteDatabase: (dbId: string) => void;
  duplicateDatabase: (dbId: string) => void;
  setCurrentDatabase: (dbId: string) => void;
  toggleDatabaseFavorite: (dbId: string) => void;
  
  // Database View actions
  addView: (dbId: string, viewType: string, viewName?: string) => void;
  deleteView: (dbId: string, viewId: string) => void;
  updateView: (dbId: string, viewId: string, updates: any) => void;
  setCurrentView: (dbId: string, viewId: string) => void;
  
  // Board actions
  addBoard: (title?: string, icon?: string, themeId?: string) => string;
  updateBoard: (boardId: string, updates: any) => void;
  deleteBoard: (boardId: string) => void;
  duplicateBoard: (boardId: string) => void;
  setCurrentBoard: (boardId: string) => void;
  toggleBoardFavorite: (boardId: string) => void;
  
  // Board Label actions
  addBoardLabel: (boardId: string, name: string, color: string) => Label;
  updateBoardLabel: (boardId: string, labelId: string, updates: { name?: string; color?: string }) => void;
  deleteBoardLabel: (boardId: string, labelId: string) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  
  // Export/Import
  exportData: () => string;
  importData: (data: string) => void;
  
  // Helpers
  getCurrentPage: () => StorePage | null;
  getCurrentDatabase: () => StoreDatabase | null;
  getCurrentBoard: () => Board | null;
  
  // Supabase reload
  reloadFromSupabase: () => Promise<void>;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useNotionStore = create<NotionStore>()(
  persist(
    (set, get) => ({
      pages: [],
      databases: [],
      boards: [initialBoardWithExamples],
      currentPageId: null,
      currentDatabaseId: null,
      currentBoardId: null,
      searchQuery: '',

      addPage: (parentId?: string, title?: string, icon?: string, themeId?: string) => {
        const firstBlock: StoreBlock = {
          id: generateId(),
          type: 'text',
          content: '',
          properties: {},
          checked: false,
        };

        const newPage: StorePage = {
          id: generateId(),
          title: title || 'Nova Página',
          icon: icon || '📄',
          blocks: [firstBlock],
          databases: [],
          parentId,
          themeId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          pages: [...state.pages, newPage],
          currentPageId: newPage.id,
        }));
      },

      deletePage: (pageId: string) => {
        const state = get();
        
        // Função recursiva para coletar TODAS as páginas descendentes (DFS - busca em profundidade)
        const collectAllDescendants = (parentId: string, pages: StorePage[]): string[] => {
          const directChildren = pages.filter(p => p.parentId === parentId);
          const allDescendants: string[] = [];
          
          for (const child of directChildren) {
            allDescendants.push(child.id);
            // Recursivamente coletar descendentes deste filho (netos, bisnetos, etc.)
            const childDescendants = collectAllDescendants(child.id, pages);
            allDescendants.push(...childDescendants);
          }
          
          return allDescendants;
        };
        
        // Coletar TODAS as páginas descendentes (inclui filhos, netos, bisnetos, etc.)
        const allDescendantIds = collectAllDescendants(pageId, state.pages);
        const allIdsToDelete = [pageId, ...allDescendantIds];
        
        console.log(`🗑️ Deletando página ${pageId} e ${allDescendantIds.length} descendentes recursivamente`);
        
        // Atualizar state local IMEDIATAMENTE
        set((state) => {
          const filteredPages = state.pages.filter(p => !allIdsToDelete.includes(p.id));
          return {
            pages: filteredPages,
            currentPageId: state.currentPageId === pageId 
              ? (filteredPages[0]?.id || null) 
              : state.currentPageId,
          };
        });
        
        // Deletar do Supabase em background (não bloqueia UI)
        Promise.resolve().then(async () => {
          try {
            // Deletar TODAS as páginas (principal + todos os descendentes) do Supabase
            console.log(`🔥 Deletando ${allIdsToDelete.length} páginas do Supabase...`);
            for (const id of allIdsToDelete) {
              await deleteFromSupabase('page', id);
            }
            console.log(`✅ ${allIdsToDelete.length} páginas deletadas do Supabase com sucesso!`);
          } catch (error) {
            console.error('❌ Erro ao deletar páginas do Supabase:', error);
            // Não propaga erro - localStorage já foi atualizado
          }
        });
      },

      updatePage: (pageId: string, updates: Partial<StorePage>) => {
        set((state) => ({
          pages: state.pages.map(p => 
            p.id === pageId 
              ? { ...p, ...updates, updatedAt: Date.now() } 
              : p
          ),
        }));
      },

      setCurrentPage: (pageId: string) => {
        set({ currentPageId: pageId, currentDatabaseId: null, currentBoardId: null });
      },

      duplicatePage: (pageId: string) => {
        const state = get();
        const pageToDuplicate = state.pages.find(p => p.id === pageId);
        if (!pageToDuplicate) return;

        const duplicatedPage: StorePage = {
          ...pageToDuplicate,
          id: generateId(),
          title: `${pageToDuplicate.title} (cópia)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          blocks: pageToDuplicate.blocks.map(block => ({
            ...block,
            id: generateId(),
          })),
          databases: pageToDuplicate.databases.map(db => ({
            ...db,
            id: generateId(),
          })),
        };

        set((state) => ({
          pages: [...state.pages, duplicatedPage],
          currentPageId: duplicatedPage.id,
        }));
      },

      addBlock: (type: string = 'text') => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        const newBlock: StoreBlock = {
          id: generateId(),
          type,
          content: '',
          properties: {},
          checked: false,
        };

        get().updatePage(currentPage.id, {
          blocks: [...currentPage.blocks, newBlock],
        });
      },

      addBlockAfter: (afterBlockId: string, type: string = 'text') => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return null;

        const newBlock: StoreBlock = {
          id: generateId(),
          type,
          content: '',
          properties: {},
          checked: false,
        };

        const blocks = [...currentPage.blocks];
        const index = blocks.findIndex(b => b.id === afterBlockId);
        
        if (index !== -1) {
          blocks.splice(index + 1, 0, newBlock);
          get().updatePage(currentPage.id, { blocks });
          return newBlock.id;
        }
        return null;
      },

      deleteBlock: (blockId: string) => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        get().updatePage(currentPage.id, {
          blocks: currentPage.blocks.filter(b => b.id !== blockId),
        });
      },

      updateBlock: (blockId: string, updates: Partial<StoreBlock>) => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        get().updatePage(currentPage.id, {
          blocks: currentPage.blocks.map(b => 
            b.id === blockId ? { ...b, ...updates } : b
          ),
        });
      },

      moveBlockUp: (blockId: string) => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        const blocks = [...currentPage.blocks];
        const index = blocks.findIndex(b => b.id === blockId);
        
        if (index > 0) {
          [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
          get().updatePage(currentPage.id, { blocks });
        }
      },

      moveBlockDown: (blockId: string) => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        const blocks = [...currentPage.blocks];
        const index = blocks.findIndex(b => b.id === blockId);
        
        if (index < blocks.length - 1) {
          [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
          get().updatePage(currentPage.id, { blocks });
        }
      },

      reorderBlocks: (startIndex: number, endIndex: number) => {
        const currentPage = get().getCurrentPage();
        if (!currentPage) return;

        const blocks = [...currentPage.blocks];
        const [removed] = blocks.splice(startIndex, 1);
        blocks.splice(endIndex, 0, removed);
        
        get().updatePage(currentPage.id, { blocks });
      },

      addDatabase: (title?: string, icon?: string, themeId?: string) => {
        const newDatabase: StoreDatabase = {
          id: generateId(),
          title: title || 'Nova Tabela',
          icon: icon || '📊',
          themeId,
          fields: [
            { id: generateId(), name: 'Nome', type: 'text' },
            { id: generateId(), name: 'Status', type: 'select', options: ['A Fazer', 'Em Progresso', 'Concluído'] },
          ],
          rows: [],
          view: 'table',
          views: [
            {
              id: generateId(),
              type: 'table',
              name: 'Tabela',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'gallery',
              name: 'Galeria',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'list',
              name: 'Lista',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'chart',
              name: 'Gráfico',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'timeline',
              name: 'Cronograma',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'map',
              name: 'Mapas',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'feed',
              name: 'Feed',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'calendar',
              name: 'Calendário',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'dashboard',
              name: 'Dashboard',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'form',
              name: 'Formulário',
              filters: [],
              sorts: [],
            },
            {
              id: generateId(),
              type: 'board',
              name: 'Quadro',
              filters: [],
              sorts: [],
            }
          ],
          currentViewId: undefined,
          favorited: false,
        };

        // Initialize currentViewId with the first view
        newDatabase.currentViewId = newDatabase.views![0].id;

        // Add to global databases array and set as current
        set((state) => ({
          databases: [...state.databases, newDatabase],
          currentDatabaseId: newDatabase.id,
          currentPageId: null,
          currentBoardId: null,
        }));
      },

      updateDatabase: (dbId: string, updates: Partial<StoreDatabase>) => {
        // Update in global databases array
        set((state) => ({
          databases: state.databases.map(db => 
            db.id === dbId ? { ...db, ...updates } : db
          ),
        }));
        
        // Update in ALL pages
        set((state) => ({
          pages: state.pages.map(page => ({
            ...page,
            databases: page.databases.map(db => 
              db.id === dbId ? { ...db, ...updates } : db
            )
          }))
        }));
      },

      deleteDatabase: (dbId: string) => {
        // Atualizar state local IMEDIATAMENTE
        // Remove from global databases array
        set((state) => {
          const filteredDatabases = state.databases.filter(db => db.id !== dbId);
          return {
            databases: filteredDatabases,
            currentDatabaseId: state.currentDatabaseId === dbId 
              ? (filteredDatabases[0]?.id || null) 
              : state.currentDatabaseId,
          };
        });
        
        // Remove from ALL pages
        set((state) => ({
          pages: state.pages.map(page => ({
            ...page,
            databases: page.databases.filter(db => db.id !== dbId)
          }))
        }));
        
        // Deletar do Supabase em background (não bloqueia UI)
        Promise.resolve().then(async () => {
          try {
            await deleteFromSupabase('database', dbId);
          } catch (error) {
            console.error('❌ Erro ao deletar database do Supabase:', error);
            // Não propaga erro - localStorage já foi atualizado
          }
        });
      },

      duplicateDatabase: (dbId: string) => {
        const state = get();
        const databaseToDuplicate = state.databases.find(db => db.id === dbId);
        if (!databaseToDuplicate) return;

        const duplicatedDatabase: StoreDatabase = {
          ...databaseToDuplicate,
          id: generateId(),
          title: `${databaseToDuplicate.title} (cópia)`,
          fields: databaseToDuplicate.fields.map(field => ({
            ...field,
            id: generateId(),
          })),
          rows: databaseToDuplicate.rows.map(row => ({
            ...row,
            id: generateId(),
          })),
          views: databaseToDuplicate.views?.map(view => ({
            ...view,
            id: generateId(),
          })),
          currentViewId: undefined,
        };

        // Initialize currentViewId with the first view
        if (duplicatedDatabase.views && duplicatedDatabase.views.length > 0) {
          duplicatedDatabase.currentViewId = duplicatedDatabase.views[0].id;
        }

        set((state) => ({
          databases: [...state.databases, duplicatedDatabase],
          currentDatabaseId: duplicatedDatabase.id,
          currentPageId: null,
          currentBoardId: null,
        }));
      },

      setCurrentDatabase: (dbId: string) => {
        set({ currentDatabaseId: dbId, currentPageId: null, currentBoardId: null });
      },

      addBoard: (title?: string, icon?: string, themeId?: string) => {
        const newBoard: any = {
          id: generateId(),
          title: title || 'Novo Quadro',
          icon: icon || '📋',
          themeId,
          lists: [],
          labels: [...defaultLabels],
          favorited: false,
        };

        set((state) => ({
          boards: [...state.boards, newBoard],
          currentBoardId: newBoard.id,
          currentPageId: null,
          currentDatabaseId: null,
        }));

        return newBoard.id;
      },

      updateBoard: (boardId: string, updates: any) => {
        set((state) => ({
          boards: state.boards.map(b => 
            b.id === boardId ? { ...b, ...updates } : b
          ),
        }));
      },

      deleteBoard: (boardId: string) => {
        // Atualizar state local IMEDIATAMENTE
        set((state) => {
          const filteredBoards = state.boards.filter(b => b.id !== boardId);
          return {
            boards: filteredBoards,
            currentBoardId: state.currentBoardId === boardId 
              ? (filteredBoards[0]?.id || null) 
              : state.currentBoardId,
          };
        });
        
        // Deletar do Supabase em background (não bloqueia UI)
        Promise.resolve().then(async () => {
          try {
            await deleteFromSupabase('board', boardId);
          } catch (error) {
            console.error('❌ Erro ao deletar board do Supabase:', error);
            // Não propaga erro - localStorage já foi atualizado
          }
        });
      },

      duplicateBoard: (boardId: string) => {
        const state = get();
        const boardToDuplicate = state.boards.find(b => b.id === boardId);
        if (!boardToDuplicate) return;

        const duplicatedBoard: any = {
          ...boardToDuplicate,
          id: generateId(),
          title: `${boardToDuplicate.title} (cópia)`,
          lists: boardToDuplicate.lists?.map((list: any) => ({
            ...list,
            id: generateId(),
            cards: list.cards?.map((card: any) => ({
              ...card,
              id: generateId(),
            })),
          })),
        };

        set((state) => ({
          boards: [...state.boards, duplicatedBoard],
          currentBoardId: duplicatedBoard.id,
          currentPageId: null,
          currentDatabaseId: null,
        }));
      },

      setCurrentBoard: (boardId: string) => {
        set({ currentBoardId: boardId, currentPageId: null, currentDatabaseId: null });
      },

      togglePageFavorite: (pageId: string) => {
        set((state) => ({
          pages: state.pages.map(p => 
            p.id === pageId 
              ? { ...p, favorited: !p.favorited } 
              : p
          ),
        }));
      },

      toggleDatabaseFavorite: (dbId: string) => {
        // Update in global databases array
        set((state) => ({
          databases: state.databases.map(db => 
            db.id === dbId 
              ? { ...db, favorited: !db.favorited } 
              : db
          ),
        }));
        
        // Update in ALL pages to maintain consistency
        set((state) => ({
          pages: state.pages.map(page => ({
            ...page,
            databases: page.databases.map(db => 
              db.id === dbId 
                ? { ...db, favorited: !db.favorited } 
                : db
            )
          }))
        }));
      },

      toggleBoardFavorite: (boardId: string) => {
        set((state) => ({
          boards: state.boards.map(b => 
            b.id === boardId 
              ? { ...b, favorited: !b.favorited } 
              : b
          ),
        }));
      },

      addBoardLabel: (boardId: string, name: string, color: string): Label => {
        const newLabel: Label = {
          id: generateId(),
          name: name.trim(),
          color,
        };

        set((state) => ({
          boards: state.boards.map(b => 
            b.id === boardId 
              ? { ...b, labels: [...(b.labels || []), newLabel] } 
              : b
          ),
        }));

        return newLabel;
      },

      updateBoardLabel: (boardId: string, labelId: string, updates: { name?: string; color?: string }) => {
        set((state) => ({
          boards: state.boards.map(b => {
            if (b.id !== boardId) return b;
            
            const updatedLabels = (b.labels || []).map(label =>
              label.id === labelId
                ? { ...label, ...updates }
                : label
            );

            const updatedLists = b.lists.map(list => ({
              ...list,
              cards: list.cards.map(card => ({
                ...card,
                labels: card.labels.map(cardLabel =>
                  cardLabel.id === labelId
                    ? { ...cardLabel, ...updates }
                    : cardLabel
                ),
              })),
            }));

            return { ...b, labels: updatedLabels, lists: updatedLists };
          }),
        }));
      },

      deleteBoardLabel: (boardId: string, labelId: string) => {
        set((state) => ({
          boards: state.boards.map(b => {
            if (b.id !== boardId) return b;
            
            const updatedLabels = (b.labels || []).filter(label => label.id !== labelId);

            const updatedLists = b.lists.map(list => ({
              ...list,
              cards: list.cards.map(card => ({
                ...card,
                labels: card.labels.filter(cardLabel => cardLabel.id !== labelId),
              })),
            }));

            return { ...b, labels: updatedLabels, lists: updatedLists };
          }),
        }));
      },

      addView: (dbId: string, viewType: string, viewName?: string) => {
        const defaultNames: Record<string, string> = {
          table: 'Tabela',
          board: 'Quadro',
          gallery: 'Galeria',
          list: 'Lista',
          calendar: 'Calendário',
          timeline: 'Linha do tempo',
          dashboard: 'Dashboard',
          chart: 'Gráfico',
          feed: 'Feed',
          map: 'Mapa',
          form: 'Formulário',
        };

        const newView = {
          id: generateId(),
          type: viewType,
          name: viewName || defaultNames[viewType] || 'Nova visualização',
          filters: [],
          sorts: [],
        };

        get().updateDatabase(dbId, {
          views: [...(get().databases.find(db => db.id === dbId)?.views || []), newView],
          currentViewId: newView.id,
        });
      },

      deleteView: (dbId: string, viewId: string) => {
        const database = get().databases.find(db => db.id === dbId);
        if (!database) return;

        const views = (database.views || []).filter(v => v.id !== viewId);
        const newCurrentViewId = database.currentViewId === viewId
          ? (views[0]?.id || undefined)
          : database.currentViewId;

        get().updateDatabase(dbId, {
          views,
          currentViewId: newCurrentViewId,
        });
      },

      updateView: (dbId: string, viewId: string, updates: any) => {
        const database = get().databases.find(db => db.id === dbId);
        if (!database) return;

        get().updateDatabase(dbId, {
          views: (database.views || []).map(v =>
            v.id === viewId ? { ...v, ...updates } : v
          ),
        });
      },

      setCurrentView: (dbId: string, viewId: string) => {
        get().updateDatabase(dbId, {
          currentViewId: viewId,
        });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      exportData: () => {
        const state = get();
        return JSON.stringify({
          pages: state.pages,
          databases: state.databases,
        }, null, 2);
      },

      importData: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          set({
            pages: parsed.pages || [],
            databases: parsed.databases || [],
            currentPageId: parsed.pages[0]?.id || null,
          });
        } catch (error) {
          console.error('Error importing data:', error);
        }
      },

      getCurrentPage: () => {
        const state = get();
        return state.pages.find(p => p.id === state.currentPageId) || null;
      },

      getCurrentDatabase: () => {
        const state = get();
        return state.databases.find(db => db.id === state.currentDatabaseId) || null;
      },

      getCurrentBoard: () => {
        const state = get();
        return state.boards.find(b => b.id === state.currentBoardId) || null;
      },
      
      reloadFromSupabase: async () => {
        try {
          console.log('🔄 Recarregando workspace do Supabase...');
          const storageKey = 'notion-clone-storage';
          const data = await supabaseStorage.getItem(storageKey);
          
          if (data) {
            const parsed = JSON.parse(data);
            console.log('✅ Dados carregados do Supabase:', {
              pages: parsed.pages?.length || 0,
              boards: parsed.boards?.length || 0,
              databases: parsed.databases?.length || 0
            });
            
            // Garantir defaults seguros para evitar undefined em HMR
            const safePages = (parsed.pages || []).map((page: any) => ({
              ...page,
              blocks: Array.isArray(page.blocks) ? page.blocks : [],
              databases: Array.isArray(page.databases) ? page.databases : [],
            }));
            
            const safeDatabases = (parsed.databases || []).map((db: any) => ({
              ...db,
              rows: Array.isArray(db.rows) ? db.rows : [],
              fields: Array.isArray(db.fields) ? db.fields : [],
              views: Array.isArray(db.views) ? db.views : [],
            }));
            
            set({
              pages: safePages,
              boards: parsed.boards || [],
              databases: safeDatabases,
              currentPageId: parsed.currentPageId || safePages[0]?.id || null,
              currentBoardId: parsed.currentBoardId || parsed.boards?.[0]?.id || null,
              currentDatabaseId: parsed.currentDatabaseId || null,
            });
          } else {
            console.log('📭 Nenhum dado encontrado no Supabase');
          }
        } catch (error) {
          console.error('❌ Erro ao recarregar do Supabase:', error);
        }
      },
    }),
    {
      name: 'notion-clone-storage',
      version: 7,
      storage: supabaseStorage,
      migrate: (persistedState: any, version: number) => {
        console.log('✅ Zustand Store - Versão 7 - Dados carregados do Supabase');
        
        // Garantir que todas as páginas têm blocks como array (nunca undefined)
        if (persistedState?.pages) {
          persistedState.pages = persistedState.pages.map((page: any) => ({
            ...page,
            blocks: Array.isArray(page.blocks) ? page.blocks : [],
            databases: Array.isArray(page.databases) ? page.databases : [],
          }));
        }
        
        // Garantir que todos os databases têm rows como array (nunca undefined)
        if (persistedState?.databases) {
          persistedState.databases = persistedState.databases.map((db: any) => ({
            ...db,
            rows: Array.isArray(db.rows) ? db.rows : [],
            fields: Array.isArray(db.fields) ? db.fields : [],
            views: Array.isArray(db.views) ? db.views : [],
          }));
        }
        
        // Garantir que boards existe
        if (!Array.isArray(persistedState?.boards)) {
          persistedState.boards = [];
        }
        
        return persistedState;
      },
    }
  )
);
