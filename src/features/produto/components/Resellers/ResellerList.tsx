import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Filter, MoreHorizontal, Upload, Download, X, Edit, Eye, Printer, FileText } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { toast } from "sonner";
import type { Reseller } from "@/pages/Index";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import { Label } from "@/features/produto/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/produto/components/ui/dropdown-menu";

interface ResellerListProps {
  resellers: Reseller[];
  onAddReseller: () => void;
  onImportResellers: (resellers: Reseller[]) => void;
  onEdit: (reseller: Reseller) => void;
}

export const ResellerList = ({ resellers, onAddReseller, onImportResellers, onEdit }: ResellerListProps) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo: "",
    nivel: "",
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    if (filteredResellers.length === 0) {
      toast.error("Nenhum revendedor para exportar");
      return;
    }

    const dataToExport = filteredResellers.map(r => ({
      'Nome': r.nome,
      'CPF': r.cpf,
      'Telefone': r.telefone,
      'Email': r.email,
      'Tipo': r.tipo,
      'Nível': r.nivel
    }));

    exportToExcel(dataToExport, 'revendedores', 'Revendedores');
    toast.success(`${filteredResellers.length} revendedores exportados`);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromExcel<any>(file);
      
      if (data.length === 0) {
        toast.error("Arquivo vazio");
        return;
      }

      const importedResellers: Reseller[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        nome: row['Nome'] || row.nome || '',
        cpf: row['CPF'] || row.cpf || '',
        telefone: row['Telefone'] || row.telefone || '',
        email: row['Email'] || row.email || '',
        tipo: row['Tipo'] || row.tipo || '',
        nivel: row['Nível'] || row.nivel || ''
      }));

      onImportResellers(importedResellers);
      toast.success(`${importedResellers.length} revendedores importados`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo");
    }
  };

  const clearFilters = () => {
    setFilters({
      nome: "",
      cpf: "",
      telefone: "",
      email: "",
      tipo: "",
      nivel: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  const filteredResellers = useMemo(() => {
    return resellers.filter((reseller) => {
      const matchNome = reseller.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchCpf = reseller.cpf.toLowerCase().includes(filters.cpf.toLowerCase());
      const matchTelefone = reseller.telefone.toLowerCase().includes(filters.telefone.toLowerCase());
      const matchEmail = reseller.email.toLowerCase().includes(filters.email.toLowerCase());
      const matchTipo = reseller.tipo.toLowerCase().includes(filters.tipo.toLowerCase());
      const matchNivel = reseller.nivel.toLowerCase().includes(filters.nivel.toLowerCase());
      
      return matchNome && matchCpf && matchTelefone && matchEmail && matchTipo && matchNivel;
    });
  }, [resellers, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Lista de Revendedores</h2>
          
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportExcel}
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={onAddReseller}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
            
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtro
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      !
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros de Revendedores</SheetTitle>
                  <SheetDescription>
                    Filtre os revendedores por qualquer campo
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-nome">Nome</Label>
                    <Input
                      id="filter-nome"
                      placeholder="Buscar por nome..."
                      value={filters.nome}
                      onChange={(e) => setFilters(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-cpf">CPF</Label>
                    <Input
                      id="filter-cpf"
                      placeholder="Buscar por CPF..."
                      value={filters.cpf}
                      onChange={(e) => setFilters(prev => ({ ...prev, cpf: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-telefone">Telefone</Label>
                    <Input
                      id="filter-telefone"
                      placeholder="Buscar por telefone..."
                      value={filters.telefone}
                      onChange={(e) => setFilters(prev => ({ ...prev, telefone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-email">Email</Label>
                    <Input
                      id="filter-email"
                      placeholder="Buscar por email..."
                      value={filters.email}
                      onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-tipo">Tipo</Label>
                    <Input
                      id="filter-tipo"
                      placeholder="Buscar por tipo..."
                      value={filters.tipo}
                      onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-nivel">Nível</Label>
                    <Input
                      id="filter-nivel"
                      placeholder="Buscar por nível..."
                      value={filters.nivel}
                      onChange={(e) => setFilters(prev => ({ ...prev, nivel: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpar Filtros
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setFilterSheetOpen(false)}
                    >
                      Aplicar
                    </Button>
                  </div>

                  {hasActiveFilters && (
                    <div className="text-sm text-muted-foreground pt-2">
                      {filteredResellers.length} de {resellers.length} revendedores encontrados
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Resellers Table */}
        <div className="border rounded-lg overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Ver Mais</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Telefone 1</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Meta Mensal</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResellers.map((reseller) => (
                <TableRow key={reseller.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleRow(reseller.id)}
                    >
                      {expandedRows.includes(reseller.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{reseller.nome}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-blue-600">{reseller.telefone}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs text-center">
                      R$ 0,00 / R$ 0,00
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date().toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{reseller.nivel}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => toast.info("Pedidos do revendedor em desenvolvimento")}
                    >
                      📋
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="border-green-500 text-green-700 bg-green-50"
                    >
                      ativo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => onEdit(reseller)}
                      title="Editar Revendedor"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
