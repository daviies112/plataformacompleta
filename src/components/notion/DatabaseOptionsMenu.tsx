import { useNotionStore, type StoreDatabase } from '@/stores/notionStore';
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
  RefreshCw,
  FileSpreadsheet,
  Database as DatabaseIcon,
  Smile,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface DatabaseOptionsMenuProps {
  database: StoreDatabase;
}

export const DatabaseOptionsMenu = ({ database }: DatabaseOptionsMenuProps) => {
  const { updateDatabase, deleteDatabase, duplicateDatabase } = useNotionStore();
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const handleCopyLink = () => {
    const url = `${window.location.origin}/database/${database.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do database copiado');
  };

  const handleDuplicate = () => {
    duplicateDatabase(database.id);
    toast.success('Database duplicado');
  };

  const handleMoveToTrash = () => {
    if (confirm(`Tem certeza que deseja deletar o database "${database.title}"?`)) {
      deleteDatabase(database.id);
      toast.success('Database deletado');
    }
  };

  const handleToggleLock = () => {
    updateDatabase(database.id, { locked: !database.locked });
    toast.success(database.locked ? 'Database desbloqueado' : 'Database bloqueado');
  };

  const handleExportCSV = () => {
    const headers = database.fields.map(f => f.name).join(',');
    const rows = database.rows.map(row => 
      database.fields.map(field => {
        const value = row.values[field.id];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database.title}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Database exportado como CSV');
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(database, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database.title}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Database exportado como JSON');
  };

  const handleAddCover = () => {
    setShowCoverDialog(true);
  };

  const handleAddCoverFromUrl = () => {
    if (coverUrl) {
      updateDatabase(database.id, { cover: coverUrl });
      setCoverUrl('');
      setShowCoverDialog(false);
      toast.success('Capa adicionada');
    }
  };

  const handleAddCoverFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateDatabase(database.id, { cover: dataUrl });
        setShowCoverDialog(false);
        toast.success('Capa adicionada do arquivo');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveCover = () => {
    updateDatabase(database.id, { cover: undefined });
    toast.success('Capa removida');
  };

  const handleAddSampleData = () => {
    const sampleData = [
      { [database.fields[0].id]: 'Janeiro', [database.fields[1]?.id]: 65 },
      { [database.fields[0].id]: 'Fevereiro', [database.fields[1]?.id]: 59 },
      { [database.fields[0].id]: 'Março', [database.fields[1]?.id]: 80 },
      { [database.fields[0].id]: 'Abril', [database.fields[1]?.id]: 81 },
      { [database.fields[0].id]: 'Maio', [database.fields[1]?.id]: 56 },
      { [database.fields[0].id]: 'Junho', [database.fields[1]?.id]: 55 },
    ];

    const newRows = sampleData.map((data, index) => ({
      id: `sample-${Date.now()}-${index}`,
      values: data,
    }));

    updateDatabase(database.id, {
      rows: [...database.rows, ...newRows],
    });
    toast.success('Dados de exemplo adicionados (6 linhas)');
  };

  const handleClearFilters = () => {
    updateDatabase(database.id, { filters: [] });
    toast.success('Filtros removidos');
  };

  const handleClearSorts = () => {
    updateDatabase(database.id, { sorts: [] });
    toast.success('Ordenações removidas');
  };

  const handleAddIcon = () => {
    setShowIconDialog(true);
  };

  const handleRemoveIcon = () => {
    updateDatabase(database.id, { icon: '' });
    toast.success('Ícone removido');
  };

  const handleAddDescription = () => {
    setShowDescriptionDialog(true);
  };

  const handleRemoveDescription = () => {
    updateDatabase(database.id, { description: '' });
    toast.success('Descrição removida');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!database.icon ? (
          <DropdownMenuItem onClick={handleAddIcon}>
            <Smile className="mr-2 h-4 w-4" />
            Adicionar ícone
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleRemoveIcon}>
            <X className="mr-2 h-4 w-4" />
            Remover ícone
          </DropdownMenuItem>
        )}

        {!database.cover ? (
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

        {!database.description ? (
          <DropdownMenuItem onClick={handleAddDescription}>
            <FileText className="mr-2 h-4 w-4" />
            Adicionar descrição
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleRemoveDescription}>
            <X className="mr-2 h-4 w-4" />
            Remover descrição
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleAddSampleData}>
          <DatabaseIcon className="mr-2 h-4 w-4" />
          Adicionar dados de exemplo
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          Copiar link
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicar database
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleMoveToTrash}>
          <Trash2 className="mr-2 h-4 w-4" />
          Deletar database
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {(database.filters && database.filters.length > 0) && (
          <DropdownMenuItem onClick={handleClearFilters}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Limpar filtros ({database.filters.length})
          </DropdownMenuItem>
        )}

        {(database.sorts && database.sorts.length > 0) && (
          <DropdownMenuItem onClick={handleClearSorts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Limpar ordenações ({database.sorts.length})
          </DropdownMenuItem>
        )}

        <DropdownMenuCheckboxItem
          checked={database.locked || false}
          onCheckedChange={handleToggleLock}
        >
          <Lock className="mr-2 h-4 w-4" />
          Bloquear database
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar como CSV
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportJSON}>
          <Download className="mr-2 h-4 w-4" />
          Exportar como JSON
        </DropdownMenuItem>
      </DropdownMenuContent>

      <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar capa</DialogTitle>
            <DialogDescription>
              Adicione uma imagem de capa usando um URL ou fazendo upload de um arquivo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL da imagem</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cole o URL da imagem..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCoverFromUrl();
                  }}
                />
                <Button onClick={handleAddCoverFromUrl}>Adicionar</Button>
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
            <Button onClick={handleAddCoverFromFile} variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Fazer upload de arquivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIconDialog} onOpenChange={setShowIconDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ícone da Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ícone (emoji)</Label>
              <Input
                value={database.icon || ''}
                onChange={(e) => updateDatabase(database.id, { icon: e.target.value })}
                placeholder="📊"
              />
              <p className="text-xs text-muted-foreground">Cole um emoji aqui</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descrição da Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={database.description || ''}
                onChange={(e) => updateDatabase(database.id, { description: e.target.value })}
                placeholder="Descreva sua tabela..."
                rows={4}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
};
