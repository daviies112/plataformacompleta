import { useNotionStore } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Link2,
  Copy,
  Trash2,
  Type,
  Maximize,
  Lock,
  Undo,
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { CoverGalleryDialog } from './CoverGalleryDialog';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { MoveToBoardDialog } from './MoveToBoardDialog';

export const PageOptionsMenu = () => {
  const {
    getCurrentPage,
    updatePage,
    duplicatePage,
    deletePage,
    exportData,
    importData,
  } = useNotionStore();
  
  const currentPage = getCurrentPage();
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMoveToBoardDialog, setShowMoveToBoardDialog] = useState(false);

  if (!currentPage) return null;

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para área de transferência');
  };

  const handleDuplicate = () => {
    duplicatePage(currentPage.id);
    toast.success('Página duplicada');
  };

  const handleMoveToTrash = () => {
    if (confirm(`Tem certeza que deseja mover "${currentPage.title}" para a lixeira?`)) {
      deletePage(currentPage.id);
      toast.success('Página movida para lixeira');
    }
  };

  const handleFontChange = (font: 'sans' | 'serif' | 'mono') => {
    updatePage(currentPage.id, { fontStyle: font });
    toast.success(`Fonte alterada para ${font === 'sans' ? 'Padrão' : font === 'serif' ? 'Serifada' : 'Mono'}`);
  };

  const handleToggleSmallText = () => {
    updatePage(currentPage.id, { smallText: !currentPage.smallText });
  };

  const handleToggleFullWidth = () => {
    updatePage(currentPage.id, { fullWidth: !currentPage.fullWidth });
  };

  const handleToggleLock = () => {
    updatePage(currentPage.id, { locked: !currentPage.locked });
    toast.success(currentPage.locked ? 'Página desbloqueada' : 'Página bloqueada');
  };

  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleMoveToBoard = () => {
    setShowMoveToBoardDialog(true);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        importData(data);
        toast.success('Dados importados com sucesso');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAddCover = () => {
    setShowCoverDialog(true);
  };

  const handleSelectCover = (coverUrl: string) => {
    updatePage(currentPage.id, { cover: coverUrl });
    toast.success('Capa adicionada');
  };

  const handleSelectGradient = (gradient: string) => {
    updatePage(currentPage.id, { cover: gradient });
    toast.success('Capa adicionada');
  };

  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updatePage(currentPage.id, { cover: dataUrl });
        toast.success('Capa adicionada do arquivo');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveCover = () => {
    updatePage(currentPage.id, { cover: undefined });
    toast.success('Capa removida');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!currentPage.cover ? (
          <DropdownMenuItem onClick={handleAddCover}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Adicionar capa
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleRemoveCover}>
            <X className="mr-2 h-4 w-4" />
            Remover capa
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Type className="mr-2 h-4 w-4" />
            Estilo de fonte
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleFontChange('sans')}>
              <span className="font-sans font-medium">Padrão</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFontChange('serif')}>
              <span className="font-serif font-medium">Serifada</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFontChange('mono')}>
              <span className="font-mono font-medium">Mono</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          Copiar link
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+Alt+L</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicar
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleMoveToTrash}>
          <Trash2 className="mr-2 h-4 w-4" />
          Mover para a lixeira
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={currentPage.smallText || false}
          onCheckedChange={handleToggleSmallText}
        >
          Texto pequeno
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={currentPage.fullWidth || false}
          onCheckedChange={handleToggleFullWidth}
        >
          <Maximize className="mr-2 h-4 w-4" />
          Largura completa
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={currentPage.locked || false}
          onCheckedChange={handleToggleLock}
        >
          <Lock className="mr-2 h-4 w-4" />
          Bloquear página
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleMoveToBoard}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          Mover para Quadro
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </DropdownMenuItem>
      </DropdownMenuContent>

      <CoverGalleryDialog
        open={showCoverDialog}
        onOpenChange={setShowCoverDialog}
        onSelectCover={handleSelectCover}
        onSelectGradient={handleSelectGradient}
        onUploadFile={handleUploadFile}
      />

      <MoveToBoardDialog
        open={showMoveToBoardDialog}
        onOpenChange={setShowMoveToBoardDialog}
        pageTitle={currentPage.title}
        pageData={exportData()}
      />

      <ExportOptionsDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        pageTitle={currentPage.title}
        pageData={exportData()}
      />
    </DropdownMenu>
  );
};
