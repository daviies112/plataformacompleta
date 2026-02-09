import { Page, Block, Database, RichText } from '@/types/notion';
import { BlockRenderer } from './BlockRenderer';
import { DatabaseView } from './DatabaseView';
import { StoreDatabase } from '@/stores/notionStore';

interface PageViewProps {
  page: Page;
  blocks: Record<string, Block>;
  databases: Record<string, Database>;
  onUpdateDatabase?: (database: Database) => void;
}

export const PageView = ({ page, blocks, databases, onUpdateDatabase }: PageViewProps) => {
  const renderPageIcon = () => {
    if (page.icon) {
      if (page.icon.type === 'emoji') {
        return <span className="text-6xl mb-4">{page.icon.emoji}</span>;
      } else if (page.icon.url) {
        return <img src={page.icon.url} alt="Page icon" className="w-16 h-16 mb-4 rounded" />;
      }
    }
    return null;
  };

  const renderPageCover = () => {
    if (!page.cover) return null;
    
    if (page.cover.type === 'gradient' && page.cover.gradient) {
      return (
        <div 
          className="w-full h-48 mb-8 rounded-lg"
          style={{ background: page.cover.gradient }}
        />
      );
    } else if ((page.cover.type === 'file' || page.cover.type === 'external') && page.cover.url) {
      return (
        <div 
          className="w-full h-48 bg-cover bg-center mb-8 rounded-lg"
          style={{ backgroundImage: `url(${page.cover.url})` }}
        />
      );
    }
    
    return null;
  };

  const convertDatabaseToStore = (database: Database): StoreDatabase => {
    const title = typeof database.title === 'string' 
      ? database.title 
      : database.title[0]?.text?.content || 'Untitled';
    
    return {
      id: database.id,
      title,
      fields: database.fields || [],
      rows: database.rows || [],
      view: database.view || 'table',
      views: database.views,
      currentViewId: database.views?.[0]?.id,
      filters: database.filters,
      sorts: database.sorts,
      icon: typeof database.icon === 'string' ? database.icon : database.icon?.emoji,
      cover: typeof database.cover === 'string' ? database.cover : database.cover?.url,
      description: typeof database.description === 'string' ? database.description : database.description?.[0]?.text?.content,
      locked: database.locked,
    } as StoreDatabase;
  };

  const renderBlock = (blockId: string): React.ReactNode => {
    const block = blocks[blockId];
    if (!block) return null;

    if (block.type === 'database' && block.properties.databaseId) {
      const database = databases[block.properties.databaseId];
      if (database && onUpdateDatabase) {
        const storeDatabase = convertDatabaseToStore(database);
        return (
          <div key={blockId} className="my-6">
            <DatabaseView 
              database={storeDatabase}
            />
          </div>
        );
      }
    }

    const childBlocks = Array.isArray(block.content) 
      ? block.content.map(childId => renderBlock(childId))
      : [];

    return (
      <BlockRenderer key={blockId} block={block} allBlocks={blocks}>
        {childBlocks.length > 0 && <div className="ml-4">{childBlocks}</div>}
      </BlockRenderer>
    );
  };

  const pageTitle = page.title[0]?.text?.content || 'Untitled';

  return (
    <div className="max-w-4xl mx-auto p-8">
      {renderPageCover()}
      {renderPageIcon()}
      <h1 className="text-5xl font-bold mb-8">{pageTitle}</h1>
      <div className="space-y-2">
        {page.content.map(blockId => renderBlock(blockId))}
      </div>
    </div>
  );
};
