import { Block, BlockType } from '@/types/notion';
import { cn } from '@/lib/utils';
import { Code, Video, FileText, Image as ImageIcon, Link, Calculator } from 'lucide-react';
import {
  CodeBlockAdvancedWrapper,
  ImageBlockWrapper,
  VideoBlockWrapper,
  CalloutBlockWrapper,
  ToggleBlockWrapper,
  QuoteBlockWrapper,
  BookmarkBlockWrapper,
  FileBlockWrapper,
  EquationBlockWrapper,
} from './blocks/adapted';

interface BlockRendererProps {
  block: Block;
  allBlocks?: Record<string, Block>;
  children?: React.ReactNode;
}

export const BlockRenderer = ({ block, allBlocks, children }: BlockRendererProps) => {
  const renderContent = () => {
    const textContent = block.properties.title?.[0]?.text?.content || '';
    
    switch (block.type) {
      case 'heading_1':
        return <h1 className="text-3xl font-bold mt-6 mb-4">{textContent}</h1>;
      
      case 'heading_2':
        return <h2 className="text-2xl font-semibold mt-5 mb-3">{textContent}</h2>;
      
      case 'heading_3':
        return <h3 className="text-xl font-semibold mt-4 mb-2">{textContent}</h3>;
      
      case 'text':
        return <p className="my-2">{textContent || '\u00A0'}</p>;
      
      case 'bulleted_list':
        return (
          <li className="ml-6 my-1 list-disc">
            {textContent}
          </li>
        );
      
      case 'numbered_list':
        return (
          <li className="ml-6 my-1 list-decimal">
            {textContent}
          </li>
        );
      
      case 'todo':
        return (
          <div className="flex items-start gap-2 my-1">
            <input 
              type="checkbox" 
              checked={block.properties.checked || false}
              className="mt-1"
              readOnly
            />
            <span className={cn(block.properties.checked && 'line-through text-muted-foreground')}>
              {textContent}
            </span>
          </div>
        );
      
      case 'quote':
        return <QuoteBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'divider':
        return <hr className="my-4 border-border" />;
      
      case 'callout':
        return <CalloutBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'code':
        return <CodeBlockAdvancedWrapper block={block} allBlocks={allBlocks} />;
      
      case 'image':
        return <ImageBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'video':
        return <VideoBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'file':
        return <FileBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'bookmark':
        return <BookmarkBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'equation':
        return <EquationBlockWrapper block={block} allBlocks={allBlocks} />;
      
      case 'toggle':
        return <ToggleBlockWrapper block={block} allBlocks={allBlocks}>{children}</ToggleBlockWrapper>;
      
      case 'database':
        return <div>{children}</div>;
      
      case 'page':
        return <div>{children}</div>;
      
      default:
        return <p className="my-2">{textContent}</p>;
    }
  };

  return <div className="block-content">{renderContent()}</div>;
};
