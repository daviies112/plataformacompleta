import { ToggleBlock } from '@/components/notion/blocks/ToggleBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface ToggleBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
  children?: React.ReactNode;
}

export const ToggleBlockWrapper = ({ block, allBlocks, children }: ToggleBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <ToggleBlock block={storeBlock}>{children}</ToggleBlock>;
};
