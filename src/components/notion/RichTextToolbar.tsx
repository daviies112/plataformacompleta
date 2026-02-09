import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextToolbarProps {
  onFormat: (command: string, value?: string) => void;
}

export const RichTextToolbar = ({ onFormat }: RichTextToolbarProps) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setShow(false);
        return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      
      const isInEditable = (node: Node | null): boolean => {
        if (!node) return false;
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.hasAttribute('data-notion-block-editor')) return true;
        }
        return node.parentElement ? isInEditable(node.parentElement) : false;
      };

      if (!isInEditable(anchorNode) || !isInEditable(focusNode)) {
        setShow(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 45,
      });
      setShow(true);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  if (!show) return null;

  const handleLinkClick = () => {
    const url = prompt('Enter URL:');
    if (url) {
      onFormat('createLink', url);
    }
  };

  const handleCodeClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const code = document.createElement('code');
    code.className = 'inline-code';
    range.surroundContents(code);
    selection.removeAllRanges();
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex gap-1 bg-popover border border-border rounded-lg shadow-lg p-1',
        'animate-in fade-in slide-in-from-bottom-2 duration-200'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
      data-testid="rich-text-toolbar"
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('bold')}
        data-testid="button-bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('italic')}
        data-testid="button-italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('underline')}
        data-testid="button-underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('strikeThrough')}
        data-testid="button-strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleCodeClick}
        data-testid="button-code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleLinkClick}
        data-testid="button-link"
      >
        <Link className="h-4 w-4" />
      </Button>
    </div>
  );
};
