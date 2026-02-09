import { CalloutBlock } from '@/components/notion/blocks/CalloutBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface CalloutBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const CalloutBlockWrapper = ({ block, allBlocks }: CalloutBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <CalloutBlock block={storeBlock} />;
};
