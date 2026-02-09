import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

interface ResellerData {
    nome: string;
    cpf_cnpj: string;
    email: string;
    contato: string;
    loja: string;
    status?: 'pending' | 'success' | 'error';
    url_assinatura?: string;
    error?: string;
}

export function ResellerImportDialog() {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ResellerData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ResellerData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setResults([]);
        setIsLoading(true);

        try {
            // Importação dinâmica para evitar erro de build se a lib não estiver instalada
            // @ts-ignore
            const XLSX = await import('xlsx');

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);

                    // Mapear colunas (flexibilidade para nomes comuns)
                    const mappedData: ResellerData[] = data.map((row: any) => ({
                        nome: row['Nome'] || row['nome'] || row['Name'] || '',
                        cpf_cnpj: row['CPF/CNPJ'] || row['CPF'] || row['CNPJ'] || row['cpf'] || row['cnpj'] || '',
                        email: row['E-mail'] || row['Email'] || row['email'] || '',
                        contato: row['Contato'] || row['Telefone'] || row['telefone'] || row['celular'] || '',
                        loja: row['Loja'] || row['loja'] || row['Link'] || row['Url'] || ''
                    })).filter((r: ResellerData) => r.nome && r.cpf_cnpj); // Filtrar linhas vazias

                    if (mappedData.length === 0) {
                        setError('Nenhum dado válido encontrado na planilha. Verifique as colunas (Nome, CPF/CNPJ, E-mail, Contato, Loja).');
                    } else {
                        setPreviewData(mappedData);
                    }
                } catch (err) {
                    console.error('Erro ao processar arquivo:', err);
                    setError('Erro ao processar o arquivo. Certifique-se de que é um Excel ou CSV válido.');
                } finally {
                    setIsLoading(false);
                }
            };
            reader.readAsBinaryString(selectedFile);
        } catch (err) {
            console.error('Biblioteca xlsx não encontrada:', err);
            setError('A biblioteca "xlsx" não está instalada. Por favor, contate o administrador.');
            setIsLoading(false);
        }
    };

    const cleanFile = () => {
        setFile(null);
        setPreviewData([]);
        setResults([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Enviar para o backend em lote
            const response = await apiRequest('POST', '/api/assinatura/import-resellers', { resellers: previewData });

            if (!response.ok) {
                throw new Error('Falha na comunicação com o servidor');
            }

            const data = await response.json();

            if (data.success) {
                setResults(data.results);
                const successCount = data.results.filter((r: any) => r.status === 'success').length;
                const errorCount = data.errors?.length || 0;

                toast({
                    title: "Importação Concluída",
                    description: `${successCount} revendedoras importadas com sucesso. ${errorCount} erros.`,
                    variant: errorCount > 0 ? "destructive" : "default"
                });
            } else {
                throw new Error(data.error || 'Erro desconhecido na importação');
            }

        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao importar as revendedoras.');
            toast({
                title: "Erro na Importação",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        // Função simples para gerar CSV de exemplo
        const csvContent = "data:text/csv;charset=utf-8,Nome,CPF/CNPJ,E-mail,Contato,Loja\nExemplo Silva,123.456.789-00,exemplo@email.com,11999999999,https://loja.exemplo.com";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_revendedoras.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) cleanFile();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 px-3 text-gray-400 hover:text-white hover:bg-white/10">
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Revendedoras
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-[#0A0A0A] border-gray-800 text-gray-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileSpreadsheet className="w-5 h-5 text-green-500" />
                        Importação em Massa de Revendedoras
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Carregue uma planilha Excel ou CSV para importar revendedoras, criar contratos e gerar URLs automaticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {!file ? (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors">
                            <Upload className="w-12 h-12 text-gray-500 mb-4" />
                            <Label htmlFor="file-upload" className="mb-2 text-lg font-medium cursor-pointer text-blue-400 hover:text-blue-300">
                                Clique para selecionar o arquivo
                            </Label>
                            <Input
                                id="file-upload"
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <p className="text-sm text-gray-500">Suporta .xlsx, .xls e .csv</p>
                            <Button variant="link" size="sm" onClick={downloadTemplate} className="mt-4 text-gray-400">
                                <Download className="w-3 h-3 mr-1" />
                                Baixar Modelo
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded">
                                        <FileSpreadsheet className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={cleanFile} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                    Remover
                                </Button>
                            </div>

                            {error && (
                                <Alert variant="destructive" className="bg-red-900/20 border-red-900">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Erro</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Prévia dos Dados */}
                            {!error && previewData.length > 0 && results.length === 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-gray-400">Prévia ({previewData.length} registros)</h3>
                                    <ScrollArea className="h-[200px] w-full rounded border border-gray-800 bg-gray-900/30">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-900 sticky top-0">
                                                <tr>
                                                    <th className="p-2 font-medium text-gray-400">Nome</th>
                                                    <th className="p-2 font-medium text-gray-400">CPF/CNPJ</th>
                                                    <th className="p-2 font-medium text-gray-400">Email</th>
                                                    <th className="p-2 font-medium text-gray-400">Contato</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.slice(0, 100).map((row, i) => (
                                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                                                        <td className="p-2">{row.nome}</td>
                                                        <td className="p-2">{row.cpf_cnpj}</td>
                                                        <td className="p-2">{row.email}</td>
                                                        <td className="p-2">{row.contato}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                    <p className="text-xs text-center text-gray-500">Mostrando os primeiros 100 registros.</p>
                                </div>
                            )}

                            {/* Resultados */}
                            {results.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Importação Finalizada
                                    </h3>
                                    <ScrollArea className="h-[300px] w-full rounded border border-gray-800 bg-gray-900/30">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-900 sticky top-0">
                                                <tr>
                                                    <th className="p-2 font-medium text-gray-400">Nome</th>
                                                    <th className="p-2 font-medium text-gray-400">Status</th>
                                                    <th className="p-2 font-medium text-gray-400">URL Gerada</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((row, i) => (
                                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                                                        <td className="p-2">{row.nome}</td>
                                                        <td className="p-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs ${row.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {row.status === 'success' ? 'OK' : 'Erro'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 font-mono text-xs text-blue-300">
                                                            {row.url_assinatura}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                    <Button onClick={cleanFile} className="w-full mt-2" variant="outline">
                                        Nova Importação
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    {!results.length && file && !error && (
                        <Button onClick={handleImport} disabled={isProcessing || previewData.length === 0} className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Importar {previewData.length} Registros
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
