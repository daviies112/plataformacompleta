import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/features/produto/components/ui/dialog";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Progress } from "@/features/produto/components/ui/progress";
import { Upload, FileSpreadsheet, FileArchive, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/pages/Index";

interface ImportWithImagesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: (products: Product[]) => void;
}

export const ImportWithImagesDialog = ({ open, onOpenChange, onImportComplete }: ImportWithImagesDialogProps) => {
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState<{
        imported: number;
        imagesMatched: number;
        imagesUploaded: number;
    } | null>(null);

    const handleImport = async () => {
        if (!excelFile || !zipFile) {
            toast.error("Selecione ambos os arquivos (Excel e ZIP)");
            return;
        }

        const formData = new FormData();
        formData.append('excel', excelFile);
        formData.append('images', zipFile);

        setUploading(true);
        setProgress(10);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            const response = await fetch('/api/produtos/import-with-images', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao importar');
            }

            const result = await response.json();

            if (result.success) {
                setProgress(100);
                setStats({
                    imported: result.imported,
                    imagesMatched: result.imagesMatched,
                    imagesUploaded: result.imagesUploaded
                });

                toast.success(
                    `✅ ${result.imported} produtos importados! ${result.imagesUploaded} imagens associadas.`,
                    { duration: 5000 }
                );

                onImportComplete(result.products);

                // Reset after 2 seconds
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }
        } catch (error: any) {
            console.error('Erro ao importar:', error);
            toast.error(`Erro: ${error.message}`);
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setExcelFile(null);
        setZipFile(null);
        setProgress(0);
        setStats(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Importar Produtos com Imagens
                    </DialogTitle>
                    <DialogDescription>
                        Envie o Excel com os dados dos produtos e o ZIP com as imagens. As imagens serão associadas automaticamente pelo código de barras.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Excel Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="excel" className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            Excel de Produtos
                        </Label>
                        <Input
                            id="excel"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                            disabled={uploading}
                            className="cursor-pointer"
                        />
                        {excelFile && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    {/* ZIP Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="zip" className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4" />
                            ZIP com Imagens
                        </Label>
                        <Input
                            id="zip"
                            type="file"
                            accept=".zip"
                            onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                            disabled={uploading}
                            className="cursor-pointer"
                        />
                        {zipFile && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            As imagens devem ter o nome do código de barras (ex: 5887834020795.jpg)
                        </p>
                    </div>

                    {/* Progress */}
                    {uploading && (
                        <div className="space-y-2 pt-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-sm text-center text-muted-foreground">
                                {progress < 100 ? `Processando... ${progress}%` : 'Concluído!'}
                            </p>
                        </div>
                    )}

                    {/* Stats */}
                    {stats && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium">Resultado da Importação:</p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-primary">{stats.imported}</p>
                                    <p className="text-xs text-muted-foreground">Produtos</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-green-600">{stats.imagesMatched}</p>
                                    <p className="text-xs text-muted-foreground">Matches</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-blue-600">{stats.imagesUploaded}</p>
                                    <p className="text-xs text-muted-foreground">Enviadas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={uploading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!excelFile || !zipFile || uploading}
                    >
                        {uploading ? (
                            <>
                                <Upload className="w-4 h-4 mr-2 animate-spin" />
                                Importando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Importar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
