import { EquationBlock } from '@/components/notion/blocks/EquationBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface EquationBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const EquationBlockWrapper = ({ block, allBlocks }: EquationBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <EquationBlock block={storeBlock} />;
};
