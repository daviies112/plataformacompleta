import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Database, FileJson, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface TableInfo {
  id: string;
  name: string;
}

interface TableStats {
  [key: string]: {
    count: number;
    name: string;
  };
}

export default function ExportData() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<TableStats>({});
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [format, setFormat] = useState<'json' | 'excel'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTablesAndStats();
  }, []);

  const loadTablesAndStats = async () => {
    try {
      setLoadingStats(true);
      
      const [tablesRes, statsRes] = await Promise.all([
        fetch('/api/export/tables'),
        fetch('/api/export/stats')
      ]);

      if (!tablesRes.ok || !statsRes.ok) {
        throw new Error('Falha ao carregar informações das tabelas');
      }

      const tablesData = await tablesRes.json();
      const statsData = await statsRes.json();

      if (tablesData.success) {
        setTables(tablesData.tables);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error loading tables:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar tabelas');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map(t => t.id));
    }
  };

  const handleToggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      setError('Selecione pelo menos uma tabela para exportar');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/export/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: selectedTables,
          format,
          includeMetadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao exportar dados');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.${format === 'json' ? 'json' : 'xlsx'}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao exportar dados');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedRecords = selectedTables.reduce((sum, tableId) => {
    return sum + (stats[tableId]?.count || 0);
  }, 0);

  const groupedTables = tables.reduce((acc, table) => {
    let category = 'Outros';
    
    if (table.id.includes('Config') || table.id.includes('Settings')) {
      category = 'Configurações';
    } else if (table.id.includes('workspace') || table.id.includes('Board') || table.id.includes('Page')) {
      category = 'Workspace';
    } else if (table.id.includes('form') || table.id.includes('lead') || table.id.includes('whatsapp')) {
      category = 'Formulários & WhatsApp';
    } else if (table.id.includes('cached') || table.id.includes('transaction') || table.id.includes('invoice')) {
      category = 'Dados Financeiros';
    } else if (table.id.includes('user') || table.id.includes('client') || table.id.includes('notification')) {
      category = 'Usuários & Notificações';
    } else if (table.id.includes('google') || table.id.includes('pluggy') || table.id.includes('evolution')) {
      category = 'Integrações';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Exportação de Dados
          </h1>
          <p className="text-muted-foreground mt-2">
            Exporte todos os dados da plataforma em formato JSON ou Excel
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Exportação concluída com sucesso! O arquivo foi baixado.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Tabelas</CardTitle>
                <CardDescription>
                  Escolha as tabelas que deseja exportar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={loadingStats}
                    >
                      {selectedTables.length === tables.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      {selectedTables.length} de {tables.length} selecionadas
                    </div>
                  </div>

                  <Separator />

                  {loadingStats ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-6">
                        {Object.entries(groupedTables).map(([category, categoryTables]) => (
                          <div key={category} className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              {category}
                            </h3>
                            <div className="space-y-2">
                              {categoryTables.map((table) => (
                                <div
                                  key={table.id}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      id={table.id}
                                      checked={selectedTables.includes(table.id)}
                                      onCheckedChange={() => handleToggleTable(table.id)}
                                    />
                                    <Label
                                      htmlFor={table.id}
                                      className="cursor-pointer font-medium"
                                    >
                                      {table.name}
                                    </Label>
                                  </div>
                                  <Badge variant="secondary">
                                    {stats[table.id]?.count || 0} registros
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Exportação</CardTitle>
                <CardDescription>
                  Escolha o formato e opções
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Formato do Arquivo</Label>
                  <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'json' | 'excel')}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1">
                        <FileJson className="h-4 w-4" />
                        <div>
                          <div className="font-medium">JSON</div>
                          <div className="text-xs text-muted-foreground">Formato estruturado</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="excel" id="excel" />
                      <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer flex-1">
                        <FileSpreadsheet className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Excel</div>
                          <div className="text-xs text-muted-foreground">Planilha (.xlsx)</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={includeMetadata}
                    onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                  />
                  <Label htmlFor="metadata" className="cursor-pointer">
                    Incluir metadados de exportação
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tabelas selecionadas:</span>
                    <span className="font-semibold">{selectedTables.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de registros:</span>
                    <span className="font-semibold">{totalSelectedRecords.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Formato:</span>
                    <span className="font-semibold uppercase">{format}</span>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleExport}
                  disabled={loading || selectedTables.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Dados
                    </>
                  )}
                </Button>

                {selectedTables.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Selecione pelo menos uma tabela
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
