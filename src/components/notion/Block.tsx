import { useRef, useState, useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';
import { BlockMenu } from './BlockMenu';
import { BlockWrapper } from './BlockWrapper';
import DOMPurify from 'dompurify';
import { CalloutBlock } from './blocks/CalloutBlock';
import { ToggleBlock } from './blocks/ToggleBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { CodeBlockAdvanced } from './blocks/CodeBlockAdvanced';
import { QuoteBlock } from './blocks/QuoteBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { BookmarkBlock } from './blocks/BookmarkBlock';
import { FileBlock } from './blocks/FileBlock';
import { AudioBlock } from './blocks/AudioBlock';
import { EquationBlock } from './blocks/EquationBlock';
import { PageBlock } from './blocks/PageBlock';
import { LinkToPageBlock } from './blocks/LinkToPageBlock';
import { BreadcrumbBlock } from './blocks/BreadcrumbBlock';
import { TableOfContentsBlock } from './blocks/TableOfContentsBlock';
import { TemplateBlock } from './blocks/TemplateBlock';
import { SyncedBlock } from './blocks/SyncedBlock';
import { EmbedBlock } from './blocks/EmbedBlock';
import { PdfBlock } from './blocks/PdfBlock';
import { RichTextToolbar } from './RichTextToolbar';
import { cn } from '@/lib/utils';
import type { Block as BlockType, BaseBlock } from '@/types/notion';
import type { StoreBlock } from '@/stores/notionStore';
import { Checkbox } from '@/components/ui/checkbox';
import { useRichText } from '@/hooks/use-rich-text';

interface BlockProps {
  block: BaseBlock;
  index: number;
}

export const Block = ({ block, index }: BlockProps) => {
  const { updateBlock, deleteBlock, addBlockAfter, addDatabase, updateDatabase, getCurrentPage } = useNotionStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { handleKeyDown: handleRichTextKeyDown, toggleFormat } = useRichText();
  const currentPage = getCurrentPage();
  const isLocked = currentPage?.locked || false;

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      const content = Array.isArray(block.content) ? block.content.join('') : block.content || '';
      if (content) {
        const sanitizedContent = DOMPurify.sanitize(content, {
          ALLOWED_TAGS: ['b', 'i', 'u', 's', 'strong', 'em', 'strike', 'code', 'a'],
          ALLOWED_ATTR: ['href', 'class']
        });
        contentRef.current.innerHTML = sanitizedContent;
      } else {
        contentRef.current.innerHTML = '';
      }
    }
  }, [block.id, block.content]);

  const checkMarkdownShortcuts = (text: string) => {
    const shortcuts: Array<{ pattern: RegExp; type: BlockType['type']; removePrefix?: boolean }> = [
      { pattern: /^###\s/, type: 'h3', removePrefix: true },
      { pattern: /^##\s/, type: 'h2', removePrefix: true },
      { pattern: /^#\s/, type: 'h1', removePrefix: true },
      { pattern: /^[*-]\s/, type: 'bullet', removePrefix: true },
      { pattern: /^1\.\s/, type: 'numbered', removePrefix: true },
      { pattern: /^\[\s?\]\s/, type: 'todo', removePrefix: true },
      { pattern: /^>\s/, type: 'quote', removePrefix: true },
      { pattern: /^```/, type: 'code', removePrefix: true },
      { pattern: /^---$/, type: 'divider', removePrefix: true },
    ];

    for (const shortcut of shortcuts) {
      if (shortcut.pattern.test(text)) {
        if (shortcut.removePrefix && contentRef.current) {
          const newContent = text.replace(shortcut.pattern, '');
          contentRef.current.textContent = newContent;
        }
        updateBlock(block.id, { type: shortcut.type, content: contentRef.current?.textContent || '' });
        return true;
      }
    }
    return false;
  };

  const handleContentChange = () => {
    if (isLocked) return;
    
    if (contentRef.current) {
      const textContent = contentRef.current.textContent || '';
      
      if (checkMarkdownShortcuts(textContent)) {
        setTimeout(() => contentRef.current?.focus(), 0);
        return;
      }

      const rawHTML = contentRef.current.innerHTML || '';
      const sanitizedHTML = DOMPurify.sanitize(rawHTML, {
        ALLOWED_TAGS: ['b', 'i', 'u', 's', 'strong', 'em', 'strike', 'code', 'a'],
        ALLOWED_ATTR: ['href', 'class']
      });
      updateBlock(block.id, { content: sanitizedHTML });

      // Check for slash command
      if (textContent.startsWith('/')) {
        const rect = contentRef.current.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });
        setShowMenu(true);
      } else {
        setShowMenu(false);
      }
    }
  };

  // Renderizar blocos especiais
  if (block.type === 'callout') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <CalloutBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'toggle') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <ToggleBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'image') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <ImageBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'video') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <VideoBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'code') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <CodeBlockAdvanced block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'quote') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <QuoteBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'divider') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <DividerBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'bookmark') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <BookmarkBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'file') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <FileBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'audio') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <AudioBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'equation') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <EquationBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'page') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <PageBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'link_to_page') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <LinkToPageBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'breadcrumb') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <BreadcrumbBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'table_of_contents') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <TableOfContentsBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'template') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <TemplateBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'synced_block') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <SyncedBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'embed') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <EmbedBlock block={block} />
      </BlockWrapper>
    );
  }

  if (block.type === 'pdf') {
    return (
      <BlockWrapper blockId={block.id} index={index}>
        <PdfBlock block={block} />
      </BlockWrapper>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isLocked) return;
    
    handleRichTextKeyDown(e);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Tipos de blocos que devem manter o tipo ao criar um novo bloco
      const blockTypesToMaintain = ['todo', 'bullet', 'numbered', 'h1', 'h2', 'h3'];
      const blockTypeToCreate = blockTypesToMaintain.includes(block.type) ? block.type : 'text';
      
      // Criar novo bloco do mesmo tipo e obter o ID
      const newBlockId = addBlockAfter(block.id, blockTypeToCreate);
      setShowMenu(false);
      
      // Focar automaticamente no novo bloco criado (como no Word)
      if (newBlockId) {
        setTimeout(() => {
          const newBlockElement = document.querySelector(`[data-testid="block-content-${newBlockId}"]`) as HTMLElement;
          if (newBlockElement) {
            newBlockElement.focus();
            
            // Posicionar cursor no início do bloco
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(newBlockElement);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 0);
      }
    }

    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault();
      deleteBlock(block.id);
    }

    if (e.key === 'Escape') {
      setShowMenu(false);
    }
  };

  const handleMenuSelect = (newType: string) => {
    // Database types should create a database, not a block
    const databaseTypes = ['table', 'board', 'gallery', 'list', 'calendar', 'timeline'];
    
    if (databaseTypes.includes(newType)) {
      // Delete the current block and create a database
      deleteBlock(block.id);
      addDatabase();
      const currentPage = useNotionStore.getState().getCurrentPage();
      if (currentPage && currentPage.databases.length > 0) {
        const newDatabase = currentPage.databases[currentPage.databases.length - 1];
        updateDatabase(newDatabase.id, { view: newType as any });
      }
    } else {
      updateBlock(block.id, { type: newType as BlockType['type'], content: '' });
      setTimeout(() => contentRef.current?.focus(), 0);
    }
    setShowMenu(false);
  };

  const getTextColorClass = (color?: string) => {
    switch (color) {
      case 'gray': return 'text-gray-500';
      case 'brown': return 'text-amber-700';
      case 'orange': return 'text-orange-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      case 'blue': return 'text-blue-500';
      case 'purple': return 'text-purple-500';
      case 'pink': return 'text-pink-500';
      case 'red': return 'text-red-500';
      default: return '';
    }
  };

  const getBackgroundColorClass = (color?: string) => {
    switch (color) {
      case 'gray': return 'bg-gray-100 dark:bg-gray-800';
      case 'brown': return 'bg-amber-100 dark:bg-amber-900';
      case 'orange': return 'bg-orange-100 dark:bg-orange-900';
      case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900';
      case 'green': return 'bg-green-100 dark:bg-green-900';
      case 'blue': return 'bg-blue-100 dark:bg-blue-900';
      case 'purple': return 'bg-purple-100 dark:bg-purple-900';
      case 'pink': return 'bg-pink-100 dark:bg-pink-900';
      case 'red': return 'bg-red-100 dark:bg-red-900';
      default: return '';
    }
  };

  const getBlockClassName = () => {
    const storeBlock = block as StoreBlock;
    const baseClass = 'outline-none min-h-[28px] py-1 px-0.5';
    const textColor = getTextColorClass(storeBlock.textColor);
    const bgColor = getBackgroundColorClass(storeBlock.backgroundColor);
    
    let typeClass = '';
    switch (block.type) {
      case 'h1':
        typeClass = 'text-3xl font-bold mt-6 mb-2';
        break;
      case 'h2':
        typeClass = 'text-2xl font-bold mt-4 mb-1';
        break;
      case 'h3':
        typeClass = 'text-xl font-bold mt-3 mb-1';
        break;
      case 'bullet':
        typeClass = 'pl-6 relative before:content-["•"] before:absolute before:left-2';
        break;
      case 'numbered':
        typeClass = 'pl-6';
        break;
    }
    
    return cn(baseClass, typeClass, textColor, bgColor, bgColor && 'px-2 rounded');
  };

  if (block.type === 'todo') {
    const storeBlock = block as StoreBlock;
    const textColor = getTextColorClass(storeBlock.textColor);
    const bgColor = getBackgroundColorClass(storeBlock.backgroundColor);
    
    return (
      <BlockWrapper blockId={block.id} index={index} className="notion-hover rounded px-1">
        <div className={cn('flex items-start gap-2 py-1', bgColor, bgColor && 'px-2 rounded')}>
          <Checkbox
            checked={block.checked}
            onCheckedChange={(checked) => {
              if (!isLocked) {
                updateBlock(block.id, { checked: !!checked });
              }
            }}
            disabled={isLocked}
            className="mt-1.5"
            data-testid={`checkbox-${block.id}`}
          />
          <div
            ref={contentRef}
            contentEditable={!isLocked}
            suppressContentEditableWarning
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 outline-none min-h-[28px]',
              block.checked && 'line-through text-muted-foreground',
              !block.checked && textColor
            )}
            data-placeholder="To-do"
            data-notion-block-editor="true"
            data-testid={`block-content-${block.id}`}
          />
          {showMenu && !isLocked && (
            <BlockMenu
              position={menuPosition}
              onSelect={handleMenuSelect}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </BlockWrapper>
    );
  }

  const content = Array.isArray(block.content) ? block.content.join('') : block.content || '';
  const showPlaceholder = !content.trim();

  return (
    <BlockWrapper blockId={block.id} index={index} className="notion-hover rounded px-1">
      <div className="relative">
        {showPlaceholder && (
          <div className="absolute inset-0 pointer-events-none text-muted-foreground py-1 px-0.5">
            Digite "/" para comandos
          </div>
        )}
        <div
          ref={contentRef}
          contentEditable={!isLocked}
          suppressContentEditableWarning
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          className={getBlockClassName()}
          data-notion-block-editor="true"
          data-testid={`block-content-${block.id}`}
        />
      </div>
      
      {showMenu && !isLocked && (
        <BlockMenu
          position={menuPosition}
          onSelect={handleMenuSelect}
          onClose={() => setShowMenu(false)}
          searchQuery={Array.isArray(block.content) ? block.content.join('') : block.content || ''}
        />
      )}
      
      {!isLocked && <RichTextToolbar onFormat={toggleFormat} />}
    </BlockWrapper>
  );
};
