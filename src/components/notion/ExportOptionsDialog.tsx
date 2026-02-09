import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
  pageData: string;
}

export const ExportOptionsDialog = ({
  open,
  onOpenChange,
  pageTitle,
  pageData,
}: ExportOptionsDialogProps) => {
  const handleDownload = () => {
    const blob = new Blob([pageData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageTitle}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Página exportada com sucesso');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Página</DialogTitle>
          <DialogDescription>
            Baixar "{pageTitle}" como arquivo JSON
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Baixar como arquivo</h3>
              <p className="text-sm text-foreground/80">
                Salvar a página como arquivo JSON no seu computador
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleDownload} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar Arquivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
