import { ImageBlock } from '@/components/notion/blocks/ImageBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface ImageBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const ImageBlockWrapper = ({ block, allBlocks }: ImageBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <ImageBlock block={storeBlock} />;
};
