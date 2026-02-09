import { useEffect, useState } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { mockPages, mockBlocks, mockDatabases } from '@/data/unifiedMockData';
import type { Page, Block, Database } from '@/types/notion';

const convertStorePageToPage = (storePage: any): Page => {
  return {
    id: storePage.id,
    icon: { type: 'emoji', emoji: storePage.icon },
    cover: storePage.cover ? { type: 'external', url: storePage.cover } : undefined,
    title: [{ 
      type: 'text', 
      text: { content: storePage.title }, 
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
    }],
    content: storePage.blocks.map((b: any) => b.id),
    properties: {},
    parent: { type: 'workspace', id: 'workspace-1' },
    archived: false,
    createdTime: new Date(storePage.createdAt),
    lastEditedTime: new Date(storePage.updatedAt)
  };
};

const convertStoreBlockToBlock = (storeBlock: any, parentId: string): Block => {
  return {
    id: storeBlock.id,
    type: storeBlock.type as any,
    properties: {
      title: storeBlock.content ? [{ 
        type: 'text', 
        text: { content: storeBlock.content }, 
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
      }] : [],
      checked: storeBlock.checked,
      language: storeBlock.language,
      url: storeBlock.url,
      caption: storeBlock.caption,
      ...storeBlock.properties
    },
    content: storeBlock.children?.map((c: any) => c.id) || [],
    parent: parentId,
    createdTime: new Date(),
    lastEditedTime: new Date(),
    createdBy: 'user-1',
    lastEditedBy: 'user-1'
  };
};

export const useNotionData = () => {
  const { pages: storePages, databases: storeDatabases, updateDatabase: updateStoreDatabase } = useNotionStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && storePages.length === 0) {
      const newPages: any[] = [];
      const newDatabases: any[] = [];

      Object.entries(mockPages).forEach(([_, page]) => {
        const storePage = {
          id: page.id,
          title: page.title[0]?.text?.content || 'Untitled',
          icon: page.icon?.emoji || '📄',
          cover: page.cover?.type === 'gradient' ? page.cover.gradient : page.cover?.url,
          blocks: page.content.map(blockId => {
            const block = mockBlocks[blockId];
            return {
              id: block.id,
              type: block.type,
              content: block.properties.title?.[0]?.text?.content || '',
              checked: block.properties.checked,
              properties: block.properties.databaseId ? { databaseId: block.properties.databaseId } : {}
            };
          }),
          databases: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        newPages.push(storePage);
      });

      Object.entries(mockDatabases).forEach(([_, db]) => {
        newDatabases.push(db);
      });

      useNotionStore.setState({ 
        pages: newPages,
        databases: newDatabases
      });

      setInitialized(true);
    }
  }, [initialized, storePages.length]);

  const pages: Record<string, Page> = {};
  storePages.forEach(storePage => {
    pages[storePage.id] = convertStorePageToPage(storePage);
  });

  const blocks: Record<string, Block> = {};
  storePages.forEach(storePage => {
    storePage.blocks.forEach(storeBlock => {
      blocks[storeBlock.id] = convertStoreBlockToBlock(storeBlock, storePage.id);
    });
  });

  const databases: Record<string, Database> = {};
  storeDatabases.forEach(db => {
    databases[db.id] = db;
  });

  const updateDatabase = (database: Database) => {
    updateStoreDatabase(database.id, database);
  };

  const addPage = () => {
    useNotionStore.getState().addPage();
  };

  const updatePage = (pageId: string, updates: any) => {
    useNotionStore.getState().updatePage(pageId, updates);
  };

  return {
    pages,
    databases,
    blocks,
    updateDatabase,
    addPage,
    updatePage,
  };
};
