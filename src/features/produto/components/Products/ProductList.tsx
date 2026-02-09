import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { Checkbox } from "@/features/produto/components/ui/checkbox";
import { Printer, Plus, Filter, Package, Upload, Download, Edit } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { toast } from "sonner";
import type { Product, PrinterSettings } from "@/pages/Index";
import { Calendar } from "@/features/produto/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/features/produto/lib/utils";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import { LabelConfigDialog } from "@/features/produto/components/Printer/LabelConfigDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { formatDateBRT } from "@/features/produto/lib/datetime";

interface ProductListProps {
  products: Product[];
  printerSettings: PrinterSettings;
  onAddProduct: () => void;
  onImportProducts: (products: Product[]) => void;
  onEdit: (product: Product) => void;
}

export const ProductList = ({ products, printerSettings, onAddProduct, onImportProducts, onEdit }: ProductListProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedProductToPrint, setSelectedProductToPrint] = useState<Product | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    barcode: "",
    reference: "",
    description: "",
    number: "",
    color: "",
    category: "",
    subcategory: "",
    price: "",
    stock: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, id]);
    } else {
      setSelectedProducts(prev => prev.filter(pid => pid !== id));
      setSelectAll(false);
    }
  };

  const handleExportExcel = () => {
    const selectedData = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : filteredProducts;

    if (selectedData.length === 0) {
      toast.error("Nenhum produto para exportar");
      return;
    }

    const dataToExport = selectedData.map(p => ({
      'Código de Barras': p.barcode,
      'Referência': p.reference,
      'Descrição': p.description,
      'Número': p.number,
      'Cor': p.color,
      'Categoria': p.category,
      'Subcategoria': p.subcategory,
      'Preço': p.price,
      'Estoque': p.stock,
      'Data Adição': formatDateBRT(p.createdAt)
    }));

    exportToExcel(dataToExport, 'produtos', 'Produtos');
    toast.success(`${selectedData.length} produtos exportados com sucesso`);
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

      const importedProducts: Product[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        barcode: row['Código de Barras'] || row.barcode || '',
        reference: row['Referência'] || row.reference || '',
        description: row['Descrição'] || row.description || '',
        number: row['Número'] || row.number || '',
        color: row['Cor'] || row.color || '',
        category: row['Categoria'] || row.category || '',
        subcategory: row['Subcategoria'] || row.subcategory || '',
        price: row['Preço'] || row.price || 'R$ 0,00',
        stock: Number(row['Estoque'] || row.stock || 0),
        image: row.image || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&h=100&fit=crop",
        createdAt: row['Data Adição'] ? new Date(row['Data Adição']) : new Date()
      }));

      onImportProducts(importedProducts);
      toast.success(`${importedProducts.length} produtos importados com sucesso`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo. Verifique o formato.");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchBarcode = product.barcode.toLowerCase().includes(filters.barcode.toLowerCase());
      const matchReference = product.reference.toLowerCase().includes(filters.reference.toLowerCase());
      const matchDescription = product.description.toLowerCase().includes(filters.description.toLowerCase());
      const matchNumber = product.number.toLowerCase().includes(filters.number.toLowerCase());
      const matchColor = product.color.toLowerCase().includes(filters.color.toLowerCase());
      const matchCategory = product.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchSubcategory = product.subcategory.toLowerCase().includes(filters.subcategory.toLowerCase());
      const matchPrice = product.price.toLowerCase().includes(filters.price.toLowerCase());
      const matchStock = product.stock.toString().includes(filters.stock);
      
      // Filtro de data
      let matchDate = true;
      if (filters.startDate || filters.endDate) {
        const productDate = new Date(product.createdAt);
        productDate.setHours(0, 0, 0, 0);
        
        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = productDate >= start && productDate <= end;
        } else if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          matchDate = productDate >= start;
        } else if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = productDate <= end;
        }
      }
      
      return matchBarcode && matchReference && matchDescription && matchNumber && 
             matchColor && matchCategory && matchSubcategory && matchPrice && 
             matchStock && matchDate;
    });
  }, [products, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Lista de Produtos</h2>
          
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
              className="gap-2"
              onClick={onAddProduct}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtro
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Código de Barras</Label>
                    <Input
                      placeholder="Buscar por código..."
                      value={filters.barcode}
                      onChange={(e) => setFilters({...filters, barcode: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Referência</Label>
                    <Input
                      placeholder="Buscar por referência..."
                      value={filters.reference}
                      onChange={(e) => setFilters({...filters, reference: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      placeholder="Buscar por descrição..."
                      value={filters.description}
                      onChange={(e) => setFilters({...filters, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      placeholder="Buscar por número..."
                      value={filters.number}
                      onChange={(e) => setFilters({...filters, number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <Input
                      placeholder="Buscar por cor..."
                      value={filters.color}
                      onChange={(e) => setFilters({...filters, color: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Input
                      placeholder="Buscar por categoria..."
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Subcategoria</Label>
                    <Input
                      placeholder="Buscar por subcategoria..."
                      value={filters.subcategory}
                      onChange={(e) => setFilters({...filters, subcategory: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Preço</Label>
                    <Input
                      placeholder="Buscar por preço..."
                      value={filters.price}
                      onChange={(e) => setFilters({...filters, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estoque</Label>
                    <Input
                      placeholder="Buscar por estoque..."
                      value={filters.stock}
                      onChange={(e) => setFilters({...filters, stock: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Data Inicial</Label>
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => setFilters({...filters, startDate: date})}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => setFilters({...filters, endDate: date})}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setFilters({
                        barcode: "",
                        reference: "",
                        description: "",
                        number: "",
                        color: "",
                        category: "",
                        subcategory: "",
                        price: "",
                        stock: "",
                        startDate: undefined,
                        endDate: undefined,
                      })}
                    >
                      Limpar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setFilterOpen(false)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {selectedProducts.length} itens selecionados | {filteredProducts.length} produtos encontrados
          </p>
        </div>

        {/* Products Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Cód. de Barras</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Subcategoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Data Adição</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox 
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <img
                      src={product.image}
                      alt={product.description}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <button className="text-blue-600 hover:underline font-mono text-sm">
                      {product.barcode}
                    </button>
                  </TableCell>
                  <TableCell>{product.reference || "-"}</TableCell>
                  <TableCell className="max-w-xs">{product.description}</TableCell>
                  <TableCell>{product.number || "-"}</TableCell>
                  <TableCell>{product.color || "-"}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="font-medium">{product.price}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Package className="w-3 h-3" />
                      {product.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateBRT(product.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onEdit(product)}
                        title="Editar Produto"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          setSelectedProductToPrint(product);
                          setPrintDialogOpen(true);
                        }}
                        title="Configurar Etiqueta"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {selectedProductToPrint && (
        <LabelConfigDialog
          product={selectedProductToPrint}
          printerSettings={printerSettings}
          open={printDialogOpen}
          onOpenChange={(open) => {
            setPrintDialogOpen(open);
            if (!open) setSelectedProductToPrint(null);
          }}
        />
      )}
    </div>
  );
};

