import { CodeBlockAdvanced } from '@/components/notion/blocks/CodeBlockAdvanced';
import type { Block as NotionBlock } from '@/types/notion';
import { notionBlockToStoreBlock } from '@/lib/blockAdapter';

interface CodeBlockAdvancedWrapperProps {
  block: NotionBlock;
  allBlocks?: Record<string, NotionBlock>;
  onUpdate?: (block: NotionBlock) => void;
  onDelete?: (blockId: string) => void;
}

export const CodeBlockAdvancedWrapper = ({ block, allBlocks, onUpdate, onDelete }: CodeBlockAdvancedWrapperProps) => {
  const storeBlock = notionBlockToStoreBlock(block, allBlocks);
  
  return <CodeBlockAdvanced block={storeBlock} />;
};
