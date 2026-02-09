import { Database } from '@/types/notion';
import { Board as BoardType, Card, List } from '@/types/kanban';

const extractTitle = (title: string | any[]): string => {
  if (typeof title === 'string') return title;
  if (Array.isArray(title) && title.length > 0 && typeof title[0] === 'object' && 'text' in title[0]) {
    return title.map((rt: any) => rt.text).join('');
  }
  return 'Board sem título';
};

export const databaseToKanbanBoard = (database: Database): BoardType => {
  const statusField = database.fields.find(f => f.type === 'select');
  
  if (!statusField?.options) {
    return {
      id: database.id,
      title: extractTitle(database.title || ''),
      lists: [],
      starred: false,
    };
  }

  const lists: List[] = statusField.options.map((status, index) => {
    const cards: Card[] = database.rows
      .filter(row => row.values[statusField.id] === status)
      .map(row => {
        const titleField = database.fields.find(f => f.type === 'text' || f.name.toLowerCase().includes('título') || f.name.toLowerCase().includes('nome'));
        const descriptionField = database.fields.find(f => f.name.toLowerCase().includes('descrição') || f.name.toLowerCase().includes('description'));
        const dateField = database.fields.find(f => f.type === 'date');
        const checkboxField = database.fields.find(f => f.type === 'checkbox');

        const customFields: any[] = [];
        database.fields.forEach(field => {
          if (field.id !== statusField.id && field.id !== titleField?.id && field.id !== descriptionField?.id && field.id !== dateField?.id && field.id !== checkboxField?.id) {
            if (row.values[field.id]) {
              customFields.push({
                id: field.id,
                name: field.name,
                value: String(row.values[field.id]),
                type: 'text' as const,
              });
            }
          }
        });

        const card: Card = {
          id: row.id,
          title: titleField ? String(row.values[titleField.id] || 'Sem título') : 'Sem título',
          description: descriptionField ? String(row.values[descriptionField.id] || '') : '',
          labels: [],
          members: [],
          attachments: [],
          checklists: [],
          activities: [],
          dueDate: dateField && row.values[dateField.id] ? new Date(row.values[dateField.id] as string) : undefined,
          completed: checkboxField ? Boolean(row.values[checkboxField.id]) : false,
          customFields,
        };

        return card;
      });

    return {
      id: `list-${index}`,
      title: status,
      cards,
      order: index,
    };
  });

  return {
    id: database.id,
    title: extractTitle(database.title || ''),
    lists,
    starred: false,
  };
};

export const kanbanBoardToDatabase = (board: BoardType, originalDatabase: Database): Partial<Database> => {
  const statusField = originalDatabase.fields.find(f => f.type === 'select');
  
  if (!statusField) {
    return {};
  }

  const rows = board.lists.flatMap(list => 
    list.cards.map(card => {
      const titleField = originalDatabase.fields.find(f => f.type === 'text' || f.name.toLowerCase().includes('título') || f.name.toLowerCase().includes('nome'));
      const descriptionField = originalDatabase.fields.find(f => f.name.toLowerCase().includes('descrição') || f.name.toLowerCase().includes('description'));
      const dateField = originalDatabase.fields.find(f => f.type === 'date');
      const checkboxField = originalDatabase.fields.find(f => f.type === 'checkbox');

      const existingRow = originalDatabase.rows.find(r => r.id === card.id) || { id: card.id, values: {} };
      
      const values: Record<string, any> = {
        ...existingRow.values,
        [statusField.id]: list.title,
      };

      if (titleField) values[titleField.id] = card.title;
      if (descriptionField) values[descriptionField.id] = card.description;
      if (dateField && card.dueDate) values[dateField.id] = card.dueDate.toISOString().split('T')[0];
      if (checkboxField) values[checkboxField.id] = card.completed;

      (card.customFields || []).forEach((customField) => {
        const field = originalDatabase.fields.find(f => f.name === customField.name);
        if (field) {
          values[field.id] = customField.value;
        }
      });

      return {
        id: card.id,
        values,
      };
    })
  );

  return {
    title: board.title,
    rows,
  };
};
