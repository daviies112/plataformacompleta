import { QuoteBlock } from '@/components/notion/blocks/QuoteBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface QuoteBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const QuoteBlockWrapper = ({ block, allBlocks }: QuoteBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <QuoteBlock block={storeBlock} />;
};
