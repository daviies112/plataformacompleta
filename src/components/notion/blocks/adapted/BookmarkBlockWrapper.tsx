import { BookmarkBlock } from '@/components/notion/blocks/BookmarkBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface BookmarkBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const BookmarkBlockWrapper = ({ block, allBlocks }: BookmarkBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <BookmarkBlock block={storeBlock} />;
};
