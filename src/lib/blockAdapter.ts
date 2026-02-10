import type { Block as NotionBlock } from '@/types/notion';
import type { StoreBlock } from '@/stores/notionStore';

/**
 * Converts a Notion Block to a StoreBlock, extracting content based on block type
 * and preserving all metadata including children
 */
export function notionBlockToStoreBlock(block: NotionBlock, allBlocks?: Record<string, NotionBlock>): StoreBlock {
  // Extract content based on block type
  const content = extractContentByType(block);
  
  // Convert children recursively if present
  const children = block.content && allBlocks
    ? block.content.map(childId => {
        const childBlock = allBlocks[childId];
        return childBlock ? notionBlockToStoreBlock(childBlock, allBlocks) : null;
      }).filter(Boolean) as StoreBlock[]
    : undefined;
  
  const storeBlock: StoreBlock = {
    id: block.id,
    type: mapBlockType(block.type),
    content,
    checked: block.properties.checked,
    language: block.properties.language,
    url: block.properties.url,
    caption: block.properties.caption,
    color: block.properties.color,
    icon: block.properties.icon?.emoji,
    properties: { ...block.properties },
    children,
  };

  return storeBlock;
}

/**
 * Extracts content from a block based on its type
 */
function extractContentByType(block: NotionBlock): string {
  // For most text blocks, use title
  const titleContent = block.properties.title?.[0]?.text?.content || '';
  
  switch (block.type) {
    case 'code':
      // Code blocks may store content in rich_text or code property
      return block.properties.rich_text?.[0]?.text?.content 
        || block.properties.code 
        || titleContent;
    
    case 'callout':
      // Callouts use rich_text
      return block.properties.rich_text?.[0]?.text?.content || titleContent;
    
    case 'quote':
      // Quotes use rich_text
      return block.properties.rich_text?.[0]?.text?.content || titleContent;
    
    case 'equation':
      // Equations store expression
      return block.properties.expression || titleContent;
    
    case 'bookmark':
      // Bookmarks use url and may have description
      return block.properties.description || titleContent;
    
    case 'toggle':
      // Toggles use rich_text or title
      return block.properties.rich_text?.[0]?.text?.content || titleContent;
    
    case 'image':
    case 'video':
    case 'file':
      // Media blocks primarily use url and caption
      return block.properties.caption || titleContent;
    
    default:
      // Default: use title/rich_text
      return block.properties.rich_text?.[0]?.text?.content || titleContent;
  }
}

function mapBlockType(notionType: NotionBlock['type']): string {
  const typeMap: Record<string, string> = {
    'heading_1': 'h1',
    'heading_2': 'h2',
    'heading_3': 'h3',
    'text': 'text',
    'bulleted_list': 'bullet',
    'numbered_list': 'numbered',
    'todo': 'todo',
    'quote': 'quote',
    'code': 'code',
    'callout': 'callout',
    'toggle': 'toggle',
    'divider': 'divider',
    'image': 'image',
    'video': 'video',
    'file': 'file',
    'bookmark': 'bookmark',
    'equation': 'equation',
    'page': 'page',
    'link_to_page': 'link_to_page',
    'breadcrumb': 'breadcrumb',
    'table_of_contents': 'table_of_contents',
    'template': 'template',
    'synced_block': 'synced_block',
    'embed': 'embed',
    'pdf': 'pdf',
    'audio': 'audio',
  };

  return typeMap[notionType] || notionType;
}
