import { Workspace, Page, Block, Database } from '@/types/notion';
import { kanbanToDatabase } from '@/types/unified';
import { initialBoard } from '@/data/notion/mockData';

export const mockWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'My Workspace',
  icon: { type: 'emoji', emoji: '🏢' },
  pages: ['page-welcome', 'page-docs'],
  databases: ['db-board-1'],
  members: ['user-1']
};

export const mockPages: Record<string, Page> = {
  'page-welcome': {
    id: 'page-welcome',
    icon: { type: 'emoji', emoji: '👋' },
    cover: { type: 'gradient', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    title: [{ 
      type: 'text', 
      text: { content: 'Welcome to Notion + Kanban' }, 
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
    }],
    content: ['block-welcome-1', 'block-welcome-2', 'block-welcome-3', 'block-database-1'],
    properties: {},
    parent: { type: 'workspace', id: 'workspace-1' },
    archived: false,
    createdTime: new Date(),
    lastEditedTime: new Date()
  },
  'page-docs': {
    id: 'page-docs',
    icon: { type: 'emoji', emoji: '📚' },
    title: [{ 
      type: 'text', 
      text: { content: 'Documentation' }, 
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
    }],
    content: ['block-docs-1', 'block-docs-2'],
    properties: {},
    parent: { type: 'workspace', id: 'workspace-1' },
    archived: false,
    createdTime: new Date(),
    lastEditedTime: new Date()
  }
};

export const mockBlocks: Record<string, Block> = {
  'block-welcome-1': {
    id: 'block-welcome-1',
    type: 'text',
    properties: {
      title: [{ 
        type: 'text', 
        text: { content: 'This is a unified workspace combining Notion pages with Kanban boards.' }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }]
    },
    content: [],
    parent: 'page-welcome',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  },
  'block-welcome-2': {
    id: 'block-welcome-2',
    type: 'heading_2',
    properties: {
      title: [{ 
        type: 'text', 
        text: { content: 'Features' }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }]
    },
    content: [],
    parent: 'page-welcome',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  },
  'block-welcome-3': {
    id: 'block-welcome-3',
    type: 'bulleted_list',
    properties: {
      title: [{ 
        type: 'text', 
        text: { content: 'Rich text editing with multiple block types' }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }]
    },
    content: [],
    parent: 'page-welcome',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  },
  'block-database-1': {
    id: 'block-database-1',
    type: 'database',
    properties: {
      databaseId: 'db-board-1'
    },
    content: [],
    parent: 'page-welcome',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  },
  'block-docs-1': {
    id: 'block-docs-1',
    type: 'heading_1',
    properties: {
      title: [{ 
        type: 'text', 
        text: { content: 'Getting Started' }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }]
    },
    content: [],
    parent: 'page-docs',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  },
  'block-docs-2': {
    id: 'block-docs-2',
    type: 'text',
    properties: {
      title: [{ 
        type: 'text', 
        text: { content: 'Use the sidebar to navigate between pages and databases.' }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }]
    },
    content: [],
    parent: 'page-docs',
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  }
};

const convertedDatabase = kanbanToDatabase(initialBoard);
convertedDatabase.id = 'db-board-1';

export const mockDatabases: Record<string, Database> = {
  'db-board-1': convertedDatabase
};
