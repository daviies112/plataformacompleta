import { useCallback } from 'react';

export const useRichText = () => {
  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'e':
          e.preventDefault();
          applyFormat('strikeThrough');
          break;
        case 'k':
          e.preventDefault();
          const url = prompt('Enter URL:');
          if (url) {
            applyFormat('createLink', url);
          }
          break;
      }
    }

    if (modKey && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      applyFormat('strikeThrough');
    }
  }, [applyFormat]);

  const toggleFormat = useCallback((format: string) => {
    applyFormat(format);
  }, [applyFormat]);

  return {
    handleKeyDown,
    toggleFormat,
  };
};
