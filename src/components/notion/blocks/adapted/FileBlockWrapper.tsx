import { FileBlock } from '@/components/notion/blocks/FileBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface FileBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const FileBlockWrapper = ({ block, allBlocks }: FileBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <FileBlock block={storeBlock} />;
};
