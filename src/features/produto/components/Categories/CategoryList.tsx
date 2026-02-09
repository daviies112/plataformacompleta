import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { Plus, MoreHorizontal, Upload, Download, Filter, Edit, Eye, Printer, Package } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/pages/Index";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/produto/components/ui/dropdown-menu";

interface CategoryListProps {
  categories: Category[];
  onAddCategory: () => void;
  onImportCategories: (categories: Category[]) => void;
  onEdit: (category: Category) => void;
}

export const CategoryList = ({ categories, onAddCategory, onImportCategories, onEdit }: CategoryListProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    etiqueta: "",
    etiquetaCustomizada: "",
  });

  const clearFilters = () => {
    setFilters({
      nome: "",
      etiqueta: "",
      etiquetaCustomizada: "",
    });
  };

  const hasActiveFilters = filters.nome || filters.etiqueta || filters.etiquetaCustomizada;

  const handleExportExcel = () => {
    if (filteredCategories.length === 0) {
      toast.error("Nenhuma categoria para exportar");
      return;
    }

    const dataToExport = filteredCategories.map(c => ({
      'Categoria': c.nome,
      'Etiqueta': c.etiqueta,
      'Etiqueta Customizada': c.etiquetaCustomizada,
      'Produtos Vinculados': c.produtosVinculados
    }));

    exportToExcel(dataToExport, 'categorias', 'Categorias');
    toast.success(`${filteredCategories.length} categorias exportadas`);
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

      const importedCategories: Category[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        nome: row['Categoria'] || row.nome || '',
        etiqueta: row['Etiqueta'] || row.etiqueta || '',
        etiquetaCustomizada: row['Etiqueta Customizada'] || row.etiquetaCustomizada || '',
        produtosVinculados: Number(row['Produtos Vinculados'] || row.produtosVinculados || 0)
      }));

      onImportCategories(importedCategories);
      toast.success(`${importedCategories.length} categorias importadas`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo");
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchNome = category.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchEtiqueta = category.etiqueta.toLowerCase().includes(filters.etiqueta.toLowerCase());
      const matchEtiquetaCustom = category.etiquetaCustomizada.toLowerCase().includes(filters.etiquetaCustomizada.toLowerCase());
      
      return matchNome && matchEtiqueta && matchEtiquetaCustom;
    });
  }, [categories, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Lista de Categorias</h2>
          
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
              onClick={onAddCategory}
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
                    <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Filtre as categorias pelos campos abaixo
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-nome">Categoria</Label>
                    <Input
                      id="filter-nome"
                      placeholder="Buscar por nome da categoria..."
                      value={filters.nome}
                      onChange={(e) => setFilters(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-etiqueta">Etiqueta</Label>
                    <Input
                      id="filter-etiqueta"
                      placeholder="Buscar por etiqueta..."
                      value={filters.etiqueta}
                      onChange={(e) => setFilters(prev => ({ ...prev, etiqueta: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-etiquetaCustomizada">Etiqueta Customizada</Label>
                    <Input
                      id="filter-etiquetaCustomizada"
                      placeholder="Buscar por etiqueta customizada..."
                      value={filters.etiquetaCustomizada}
                      onChange={(e) => setFilters(prev => ({ ...prev, etiquetaCustomizada: e.target.value }))}
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={clearFilters}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Categoria</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Etiqueta Customizada</TableHead>
                <TableHead>Produtos Vinculados</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{category.nome}</TableCell>
                  <TableCell>{category.etiqueta}</TableCell>
                  <TableCell>{category.etiquetaCustomizada}</TableCell>
                  <TableCell>{category.produtosVinculados}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => onEdit(category)}
                      title="Editar Categoria"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 text-sm text-muted-foreground">
          <span>Linhas por página:</span>
          <select className="border rounded px-2 py-1">
            <option>15</option>
            <option>30</option>
            <option>50</option>
          </select>
          <span>1-8 de 8</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>«</Button>
            <Button variant="outline" size="sm" disabled>‹</Button>
            <Button variant="outline" size="sm">1</Button>
            <Button variant="outline" size="sm" disabled>›</Button>
            <Button variant="outline" size="sm" disabled>»</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
