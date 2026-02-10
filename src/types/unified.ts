import { Board as KanbanBoard, List as KanbanList, Card as KanbanCard, Label, Member, CustomField } from '@/types/kanban';
import { Database, DatabaseRow, DatabaseView, DatabaseProperty, Page, Block, Workspace } from '@/types/notion';

export interface UnifiedCard extends KanbanCard {
  databaseRowId?: string;
}

export interface UnifiedList extends KanbanList {
  statusPropertyValue?: string;
}

export interface UnifiedBoard extends KanbanBoard {
  databaseId?: string;
  pageId?: string;
  isNotion?: boolean;
}

export function kanbanToDatabase(board: KanbanBoard): Database {
  const labelProperty: DatabaseProperty = {
    id: 'labels',
    name: 'Labels',
    type: 'multi_select',
    options: []
  };

  const membersProperty: DatabaseProperty = {
    id: 'members',
    name: 'Members',
    type: 'people'
  };

  const dueDateProperty: DatabaseProperty = {
    id: 'dueDate',
    name: 'Due Date',
    type: 'date'
  };

  const statusProperty: DatabaseProperty = {
    id: 'status',
    name: 'Status',
    type: 'select',
    options: board.lists.map(list => ({
      id: list.id,
      name: list.title,
      color: 'blue'
    }))
  };

  const titleProperty: DatabaseProperty = {
    id: 'title',
    name: 'Name',
    type: 'title'
  };

  const descriptionProperty: DatabaseProperty = {
    id: 'description',
    name: 'Description',
    type: 'rich_text'
  };

  const checklistsProperty: DatabaseProperty = {
    id: 'checklists',
    name: 'Checklists',
    type: 'checklists'
  };

  const attachmentsProperty: DatabaseProperty = {
    id: 'attachments',
    name: 'Attachments',
    type: 'attachments'
  };

  const customFieldsProperty: DatabaseProperty = {
    id: 'customFields',
    name: 'Custom Fields',
    type: 'custom_fields'
  };

  const activitiesProperty: DatabaseProperty = {
    id: 'activities',
    name: 'Activities',
    type: 'activities'
  };

  const locationProperty: DatabaseProperty = {
    id: 'location',
    name: 'Location',
    type: 'location'
  };

  const completedProperty: DatabaseProperty = {
    id: 'completed',
    name: 'Completed',
    type: 'checkbox'
  };

  const database: Database = {
    id: `db-${board.id}`,
    title: [{ 
      type: 'text', 
      text: { content: board.title }, 
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
    }],
    properties: [
      titleProperty, 
      statusProperty, 
      labelProperty, 
      membersProperty, 
      dueDateProperty,
      descriptionProperty,
      completedProperty,
      checklistsProperty,
      attachmentsProperty,
      customFieldsProperty,
      activitiesProperty,
      locationProperty
    ],
    views: [
      {
        id: `view-board-${board.id}`,
        type: 'board',
        name: 'Board',
        groupBy: 'status',
        properties: ['title', 'status', 'labels', 'members', 'dueDate', 'description']
      },
      {
        id: `view-table-${board.id}`,
        type: 'table',
        name: 'Table',
        properties: ['title', 'status', 'labels', 'members', 'dueDate', 'description', 'completed', 'checklists']
      },
      {
        id: `view-calendar-${board.id}`,
        type: 'calendar',
        name: 'Calendar',
        properties: ['title', 'status', 'dueDate', 'labels']
      },
      {
        id: `view-timeline-${board.id}`,
        type: 'timeline',
        name: 'Timeline',
        properties: ['title', 'status', 'dueDate', 'members']
      },
      {
        id: `view-dashboard-${board.id}`,
        type: 'dashboard',
        name: 'Dashboard',
        properties: ['title', 'status', 'labels', 'members', 'dueDate', 'completed']
      },
      {
        id: `view-map-${board.id}`,
        type: 'map',
        name: 'Map',
        properties: ['title', 'location', 'status']
      }
    ],
    data: [],
    icon: { type: 'emoji', emoji: '📊' },
    description: []
  };

  board.lists?.forEach(list => {
    list.cards?.forEach(card => {
      const row: DatabaseRow = {
        id: card.id,
        properties: {
          title: { type: 'title', title: [{ type: 'text', text: { content: card.title }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }] },
          status: { type: 'select', select: { id: list.id, name: list.title, color: 'blue' } },
          labels: { type: 'multi_select', multi_select: card.labels.map(l => ({ id: l.id, name: l.name, color: l.color })) },
          members: { type: 'people', people: card.members },
          dueDate: card.dueDate ? { type: 'date', date: { start: card.dueDate.toISOString() } } : null,
          description: card.description,
          completed: card.completed,
          checklists: card.checklists,
          cover: card.cover,
          attachments: card.attachments,
          customFields: card.customFields,
          activities: card.activities,
          location: card.location
        },
        createdTime: new Date(),
        lastEditedTime: new Date(),
        archived: card.archived
      };
      database.data.push(row);
    });
  });

  return database;
}

export function databaseToKanban(database: Database): KanbanBoard {
  const statusProperty = database.properties?.find(p => p.type === 'select' && (p.name === 'Status' || p.id === 'status'));
  
  const lists: KanbanList[] = statusProperty?.options?.map(option => ({
    id: option.id,
    title: option.name,
    cards: [],
    archived: false
  })) || [];

  database.data?.forEach(row => {
    if (row.archived) return;
    
    const statusValue = row.properties.status?.select;
    const listId = statusValue?.id;
    const list = lists.find(l => l.id === listId);
    
    if (list) {
      const card: KanbanCard = {
        id: row.id,
        title: row.properties.title?.title?.[0]?.text?.content || 'Untitled',
        description: row.properties.description,
        labels: row.properties.labels?.multi_select || [],
        dueDate: row.properties.dueDate?.date?.start ? new Date(row.properties.dueDate.date.start) : undefined,
        completed: row.properties.completed || false,
        checklists: row.properties.checklists || [],
        members: row.properties.members?.people || [],
        cover: row.properties.cover,
        attachments: row.properties.attachments || [],
        customFields: row.properties.customFields || [],
        activities: row.properties.activities || [],
        location: row.properties.location,
        archived: row.archived
      };
      list.cards.push(card);
    }
  });

  const board: KanbanBoard = {
    id: database.id.replace('db-', ''),
    title: database.title[0]?.text?.content || 'Untitled Board',
    lists,
    starred: false,
    description: database.description?.[0]?.text?.content
  };

  return board;
}

export interface AppState {
  workspace: Workspace;
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  databases: Record<string, Database>;
  currentPageId: string | null;
  currentView: 'pages' | 'database' | 'board';
}
