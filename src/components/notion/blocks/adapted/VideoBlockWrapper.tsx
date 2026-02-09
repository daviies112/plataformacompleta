import { VideoBlock } from '@/components/notion/blocks/VideoBlock';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface VideoBlockWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
}

export const VideoBlockWrapper = ({ block, allBlocks }: VideoBlockWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <VideoBlock block={storeBlock} />;
};
