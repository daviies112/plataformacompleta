import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Filter, MoreHorizontal, Upload, Download, X, Edit, Eye, Printer, FileText } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { toast } from "sonner";
import type { Supplier } from "@/pages/Index";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/produto/components/ui/dropdown-menu";

interface SupplierListProps {
  suppliers: Supplier[];
  onAddSupplier: () => void;
  onImportSuppliers: (suppliers: Supplier[]) => void;
  onEdit: (supplier: Supplier) => void;
}

export const SupplierList = ({ suppliers, onAddSupplier, onImportSuppliers, onEdit }: SupplierListProps) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    nome: "",
    cpfCnpj: "",
    cidade: "",
    uf: "",
    email: "",
    telefone: "",
    startDate: "",
    endDate: "",
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast.error("Nenhum fornecedor para exportar");
      return;
    }

    const dataToExport = filteredSuppliers.map(s => ({
      'Nome': s.nome,
      'CPF/CNPJ': s.cpfCnpj,
      'Razão Social': s.razaoSocial || '',
      'Inscrição Estadual': s.inscricaoEstadual || '',
      'Referência': s.referencia || '',
      'Endereço': s.endereco || '',
      'Número': s.numero || '',
      'Bairro': s.bairro || '',
      'Cidade': s.cidade,
      'UF': s.uf,
      'CEP': s.cep || '',
      'País': s.pais || '',
      'Nome Contato': s.nomeContato || '',
      'Email': s.email,
      'Telefone': s.telefone,
      'Telefone 2': s.telefone2 || '',
      'WhatsApp': s.whatsapp || '',
      'Observações': s.observacoes || ''
    }));

    exportToExcel(dataToExport, 'fornecedores', 'Fornecedores');
    toast.success(`${filteredSuppliers.length} fornecedores exportados`);
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

      const importedSuppliers: Supplier[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        nome: row['Nome'] || row.nome || '',
        cpfCnpj: row['CPF/CNPJ'] || row.cpfCnpj || '',
        razaoSocial: row['Razão Social'] || row.razaoSocial,
        inscricaoEstadual: row['Inscrição Estadual'] || row.inscricaoEstadual,
        referencia: row['Referência'] || row.referencia,
        endereco: row['Endereço'] || row.endereco,
        numero: row['Número'] || row.numero,
        bairro: row['Bairro'] || row.bairro,
        cidade: row['Cidade'] || row.cidade || '',
        uf: row['UF'] || row.uf || '',
        cep: row['CEP'] || row.cep,
        pais: row['País'] || row.pais,
        nomeContato: row['Nome Contato'] || row.nomeContato,
        email: row['Email'] || row.email || '',
        telefone: row['Telefone'] || row.telefone || '',
        telefone2: row['Telefone 2'] || row.telefone2,
        whatsapp: row['WhatsApp'] || row.whatsapp,
        observacoes: row['Observações'] || row.observacoes
      }));

      onImportSuppliers(importedSuppliers);
      toast.success(`${importedSuppliers.length} fornecedores importados`);
      
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
      cpfCnpj: "",
      cidade: "",
      uf: "",
      email: "",
      telefone: "",
      startDate: "",
      endDate: "",
    });
  };

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== "").length;
  }, [filters]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchNome = supplier.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchCpfCnpj = supplier.cpfCnpj.toLowerCase().includes(filters.cpfCnpj.toLowerCase());
      const matchCidade = supplier.cidade.toLowerCase().includes(filters.cidade.toLowerCase());
      const matchUf = supplier.uf.toLowerCase().includes(filters.uf.toLowerCase());
      const matchEmail = supplier.email.toLowerCase().includes(filters.email.toLowerCase());
      const matchTelefone = supplier.telefone.toLowerCase().includes(filters.telefone.toLowerCase());
      
      return matchNome && matchCpfCnpj && matchCidade && matchUf && matchEmail && matchTelefone;
    });
  }, [suppliers, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Lista de Fornecedores</h2>
          
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
              onClick={onAddSupplier}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
            
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <Filter className="w-4 h-4" />
                  Filtro
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtrar Fornecedores</SheetTitle>
                  <SheetDescription>
                    Use os campos abaixo para filtrar a lista de fornecedores
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
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
                    <Label htmlFor="filter-cpfCnpj">CPF/CNPJ</Label>
                    <Input
                      id="filter-cpfCnpj"
                      placeholder="Buscar por CPF/CNPJ..."
                      value={filters.cpfCnpj}
                      onChange={(e) => setFilters(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-cidade">Cidade</Label>
                    <Input
                      id="filter-cidade"
                      placeholder="Buscar por cidade..."
                      value={filters.cidade}
                      onChange={(e) => setFilters(prev => ({ ...prev, cidade: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-uf">UF</Label>
                    <Input
                      id="filter-uf"
                      placeholder="Buscar por estado..."
                      value={filters.uf}
                      onChange={(e) => setFilters(prev => ({ ...prev, uf: e.target.value }))}
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
                    <Label htmlFor="filter-telefone">Telefone</Label>
                    <Input
                      id="filter-telefone"
                      placeholder="Buscar por telefone..."
                      value={filters.telefone}
                      onChange={(e) => setFilters(prev => ({ ...prev, telefone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-startDate">Data Inicial</Label>
                    <Input
                      id="filter-startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-endDate">Data Final</Label>
                    <Input
                      id="filter-endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpar Filtros
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Ver Mais</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone 1</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <>
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleRow(supplier.id)}
                      >
                        {expandedRows.includes(supplier.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{supplier.nome}</TableCell>
                    <TableCell>{supplier.cidade}</TableCell>
                    <TableCell>{supplier.uf}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.telefone}</TableCell>
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
                        onClick={() => onEdit(supplier)}
                        title="Editar Fornecedor"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {expandedRows.includes(supplier.id) && (
                    <TableRow key={`${supplier.id}-details`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Dados Cadastrais</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">CPF/CNPJ:</span> {supplier.cpfCnpj || "—"}</p>
                                <p><span className="font-medium">Razão Social:</span> {supplier.razaoSocial || "—"}</p>
                                <p><span className="font-medium">Inscrição Estadual:</span> {supplier.inscricaoEstadual || "—"}</p>
                                <p><span className="font-medium">Referência:</span> {supplier.referencia || "—"}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Endereço</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Rua:</span> {supplier.endereco || "—"}</p>
                                <p><span className="font-medium">Número:</span> {supplier.numero || "—"}</p>
                                <p><span className="font-medium">Bairro:</span> {supplier.bairro || "—"}</p>
                                <p><span className="font-medium">CEP:</span> {supplier.cep || "—"}</p>
                                <p><span className="font-medium">País:</span> {supplier.pais || "—"}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Contato</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Nome do Contato:</span> {supplier.nomeContato || "—"}</p>
                                <p><span className="font-medium">Telefone 2:</span> {supplier.telefone2 || "—"}</p>
                                <p><span className="font-medium">WhatsApp:</span> {supplier.whatsapp || "—"}</p>
                              </div>
                            </div>
                            
                            {supplier.observacoes && (
                              <div>
                                <h3 className="font-semibold mb-3 text-foreground">Observações</h3>
                                <p className="text-sm">{supplier.observacoes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
