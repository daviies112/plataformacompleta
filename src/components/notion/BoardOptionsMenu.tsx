import { useNotionStore } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Link2,
  Copy,
  Trash2,
  Lock,
  Download,
  Upload,
  Image as ImageIcon,
  X,
  Archive,
  Share2,
  Printer,
  Settings,
  Info,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Board } from '@/types/kanban';

interface BoardOptionsMenuProps {
  board: Board;
}

export const BoardOptionsMenu = ({ board }: BoardOptionsMenuProps) => {
  const { updateBoard, deleteBoard, duplicateBoard } = useNotionStore();
  const [showBackgroundDialog, setShowBackgroundDialog] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  const handleCopyLink = () => {
    const url = `${window.location.origin}/board/${board.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do quadro copiado');
  };

  const handleDuplicate = () => {
    duplicateBoard(board.id);
    toast.success('Quadro duplicado');
  };

  const handleMoveToTrash = () => {
    if (confirm(`Tem certeza que deseja deletar o quadro "${board.title}"?`)) {
      deleteBoard(board.id);
      toast.success('Quadro deletado');
    }
  };

  const handleToggleLock = () => {
    toast.info('Funcionalidade de bloquear quadro em desenvolvimento');
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para compartilhar');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Iniciando impressão...');
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(board, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.title}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Quadro exportado como JSON');
  };

  const handleAddBackground = () => {
    setShowBackgroundDialog(true);
  };

  const handleAddBackgroundFromUrl = () => {
    if (backgroundUrl) {
      updateBoard(board.id, { 
        background: { type: 'image', value: backgroundUrl }
      });
      setBackgroundUrl('');
      setShowBackgroundDialog(false);
      toast.success('Fundo adicionado');
    }
  };

  const handleAddBackgroundColor = (color: string) => {
    updateBoard(board.id, { 
      background: { type: 'color', value: color }
    });
    setShowBackgroundDialog(false);
    toast.success('Fundo alterado');
  };

  const handleAddBackgroundFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateBoard(board.id, { 
          background: { type: 'image', value: dataUrl }
        });
        setShowBackgroundDialog(false);
        toast.success('Fundo adicionado do arquivo');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveBackground = () => {
    updateBoard(board.id, { background: undefined });
    toast.success('Fundo removido');
  };

  const handleAddDescription = () => {
    setShowDescriptionDialog(true);
  };

  const handleRemoveDescription = () => {
    updateBoard(board.id, { description: '' });
    toast.success('Descrição removida');
  };

  const handleViewArchived = () => {
    toast.info('Funcionalidade de itens arquivados em desenvolvimento');
  };

  const handleSettings = () => {
    toast.info('Funcionalidade de configurações em desenvolvimento');
  };

  const handleActivity = () => {
    toast.info('Funcionalidade de atividade em desenvolvimento');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Compartilhar
        </DropdownMenuItem>

        {!board.description ? (
          <DropdownMenuItem onClick={handleAddDescription}>
            <Info className="mr-2 h-4 w-4" />
            Sobre este quadro
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleRemoveDescription}>
            <X className="mr-2 h-4 w-4" />
            Remover descrição
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir, exportar e compartilhar
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {!board.background ? (
          <DropdownMenuItem onClick={handleAddBackground}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Alterar fundo
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleRemoveBackground}>
            <X className="mr-2 h-4 w-4" />
            Remover fundo
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          Copiar link
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicar quadro
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleMoveToTrash}>
          <Trash2 className="mr-2 h-4 w-4" />
          Deletar quadro
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleActivity}>
          <FileText className="mr-2 h-4 w-4" />
          Atividade
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleViewArchived}>
          <Archive className="mr-2 h-4 w-4" />
          Itens arquivados
        </DropdownMenuItem>

        <DropdownMenuCheckboxItem
          checked={false}
          onCheckedChange={handleToggleLock}
        >
          <Lock className="mr-2 h-4 w-4" />
          Bloquear quadro
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportJSON}>
          <Download className="mr-2 h-4 w-4" />
          Exportar como JSON
        </DropdownMenuItem>
      </DropdownMenuContent>

      <Dialog open={showBackgroundDialog} onOpenChange={setShowBackgroundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar fundo do quadro</DialogTitle>
            <DialogDescription>
              Escolha uma cor ou adicione uma imagem de fundo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cores</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  '#0079bf', '#d29034', '#519839', '#b04632', '#89609e',
                  '#cd5a91', '#4bbf6b', '#00aecc', '#838c91', '#172b4d'
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleAddBackgroundColor(color)}
                    className="h-12 rounded hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: color }}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL da imagem</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o URL da imagem..."
                  value={backgroundUrl}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddBackgroundFromUrl();
                  }}
                />
                <Button onClick={handleAddBackgroundFromUrl}>Adicionar</Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>
            <Button onClick={handleAddBackgroundFromFile} variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Fazer upload de arquivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sobre este quadro</DialogTitle>
            <DialogDescription>
              Adicione uma descrição ao seu quadro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={board.description || ''}
                onChange={(e) => updateBoard(board.id, { description: e.target.value })}
                placeholder="Descreva seu quadro..."
                rows={4}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
};
