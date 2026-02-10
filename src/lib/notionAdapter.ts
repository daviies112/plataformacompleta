import type { Block as NotionBlock, Page as NotionPage, Database as NotionDatabase, RichText, Icon, Cover, DatabaseProperty, DatabaseView, DatabaseRow as NotionDatabaseRow } from '@/types/notion';
import type { StoreBlock as NotionStoreBlock, StorePage as NotionStorePage, Database as NotionStoreDatabase } from '@/stores/notionStore';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

function stringToRichText(text: string): RichText[] {
  return [{
    type: 'text' as const,
    text: {
      content: text,
    },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default' as const,
    },
  }];
}

function richTextToString(richText: RichText[]): string {
  return richText.map(rt => rt.text?.content || '').join('');
}

function stringToIcon(icon?: string): Icon | undefined {
  if (!icon) return undefined;
  return {
    type: 'emoji' as const,
    emoji: icon,
  };
}

function iconToString(icon?: Icon): string {
  if (!icon) return '📄';
  if (icon.type === 'emoji' && icon.emoji) return icon.emoji;
  return '📄';
}

function stringToCover(cover?: string): Cover | undefined {
  if (!cover) return undefined;
  return {
    type: 'external' as const,
    url: cover,
  };
}

function coverToString(cover?: Cover): string | undefined {
  if (!cover) return undefined;
  return cover.url || cover.gradient;
}

function mapStoreTypeToNotionType(storeType: string): NotionBlock['type'] {
  const typeMap: Record<string, NotionBlock['type']> = {
    'text': 'text',
    'page': 'page',
    'h1': 'heading_1',
    'h2': 'heading_2',
    'h3': 'heading_3',
    'bullet': 'bulleted_list',
    'numbered': 'numbered_list',
    'todo': 'todo',
    'toggle': 'toggle',
    'quote': 'quote',
    'divider': 'divider',
    'callout': 'callout',
    'image': 'image',
    'video': 'video',
    'code': 'code',
    'equation': 'equation',
    'bookmark': 'bookmark',
    'file': 'file',
    'table': 'database',
    'board': 'database',
    'gallery': 'database',
    'list': 'database',
    'calendar': 'database',
    'timeline': 'database',
  };
  
  return typeMap[storeType] || 'text';
}

function mapNotionTypeToStoreType(notionType: NotionBlock['type']): NotionStoreBlock['type'] {
  const typeMap: Record<NotionBlock['type'], NotionStoreBlock['type']> = {
    'text': 'text',
    'page': 'page',
    'heading_1': 'h1',
    'heading_2': 'h2',
    'heading_3': 'h3',
    'bulleted_list': 'bullet',
    'numbered_list': 'numbered',
    'todo': 'todo',
    'toggle': 'toggle',
    'quote': 'quote',
    'divider': 'divider',
    'callout': 'callout',
    'image': 'image',
    'video': 'video',
    'code': 'code',
    'equation': 'equation',
    'bookmark': 'bookmark',
    'file': 'file',
    'database': 'table',
  };
  
  return typeMap[notionType] || 'text';
}

// Removed obsolete field type mapping functions since Database types are now unified

export function convertStoreBlockToNotionBlock(storeBlock: NotionStoreBlock): NotionBlock {
  return {
    id: storeBlock.id,
    type: mapStoreTypeToNotionType(storeBlock.type),
    properties: {
      checked: storeBlock.checked,
      color: storeBlock.color as any,
      icon: stringToIcon(storeBlock.icon),
      url: storeBlock.url,
      caption: storeBlock.caption,
      language: storeBlock.language,
      ...storeBlock.properties,
    },
    content: storeBlock.content ? [storeBlock.content] : [],
    parent: null,
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'system',
    lastEditedBy: 'system',
  };
}

export function convertNotionBlockToStoreBlock(notionBlock: NotionBlock): NotionStoreBlock {
  return {
    id: notionBlock.id,
    type: mapNotionTypeToStoreType(notionBlock.type),
    content: notionBlock.content.join('\n'),
    checked: notionBlock.properties.checked,
    language: notionBlock.properties.language,
    url: notionBlock.properties.url,
    caption: notionBlock.properties.caption,
    color: notionBlock.properties.color,
    icon: iconToString(notionBlock.properties.icon),
    properties: notionBlock.properties,
  };
}

export function convertStoreDatabaseToNotionDatabase(storeDb: NotionStoreDatabase): NotionDatabase {
  // Since NotionStore now uses the same structure as Notion, just return with minimal conversion
  return {
    ...storeDb,
    title: typeof storeDb.title === 'string' ? stringToRichText(storeDb.title) : storeDb.title,
    description: storeDb.description && typeof storeDb.description === 'string' 
      ? stringToRichText(storeDb.description) 
      : storeDb.description,
    icon: typeof storeDb.icon === 'string' ? stringToIcon(storeDb.icon) : storeDb.icon,
    cover: typeof storeDb.cover === 'string' ? stringToCover(storeDb.cover) : storeDb.cover,
  } as NotionDatabase;
}

export function convertNotionDatabaseToStoreDatabase(notionDb: NotionDatabase): NotionStoreDatabase {
  // Since NotionStore now uses the same structure as Notion, just return with minimal conversion
  return {
    ...notionDb,
  } as NotionStoreDatabase;
}

export function convertStorePageToNotionPage(storePage: NotionStorePage): NotionPage {
  const content = storePage.blocks.map(block => block.id);

  return {
    id: storePage.id,
    icon: stringToIcon(storePage.icon),
    cover: stringToCover(storePage.cover),
    title: stringToRichText(storePage.title),
    content,
    properties: {},
    parent: storePage.parentId 
      ? { type: 'page' as const, id: storePage.parentId }
      : { type: 'workspace' as const },
    archived: false,
    createdTime: new Date(storePage.createdAt),
    lastEditedTime: new Date(storePage.updatedAt),
  };
}

export function convertNotionPageToStorePage(notionPage: NotionPage): NotionStorePage {
  return {
    id: notionPage.id,
    title: richTextToString(notionPage.title),
    icon: iconToString(notionPage.icon),
    cover: coverToString(notionPage.cover),
    blocks: [],
    databases: [],
    parentId: notionPage.parent.type === 'page' ? notionPage.parent.id : undefined,
    createdAt: notionPage.createdTime.getTime(),
    updatedAt: notionPage.lastEditedTime.getTime(),
  };
}
