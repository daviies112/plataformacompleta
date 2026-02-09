import { useState, useMemo } from "react";
import { ProductCard } from "./ProductCard";
import { FAB } from "./FAB";
import { Input } from "@/features/produto/components/ui/input";
import { Button } from "@/features/produto/components/ui/button";
import { Filter, Download, Upload, Package, CalendarIcon } from "lucide-react";
import type { Product, PrinterSettings } from "@/pages/Index";
import { Badge } from "@/features/produto/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { PrintLabelDialog } from "@/features/produto/components/Printer/PrintLabelDialog";
import { Calendar } from "@/features/produto/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/features/produto/components/ui/popover";
import { format } from "date-fns";
import { ScrollArea } from "@/features/produto/components/ui/scroll-area";

interface MobileProductListProps {
  products: Product[];
  printerSettings: PrinterSettings;
  onAddProduct: () => void;
  onImportProducts: (products: Product[]) => void;
  onEdit?: (product: Product) => void;
}

export const MobileProductList = ({
  products,
  printerSettings,
  onAddProduct,
  onImportProducts,
  onEdit,
}: MobileProductListProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedProductToPrint, setSelectedProductToPrint] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    barcode: "",
    reference: "",
    description: "",
    number: "",
    color: "",
    category: "",
    subcategory: "",
    minPrice: "",
    maxPrice: "",
    minStock: "",
    inStock: false,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchBarcode = !filters.barcode || product.barcode.toLowerCase().includes(filters.barcode.toLowerCase());
      const matchReference = !filters.reference || product.reference.toLowerCase().includes(filters.reference.toLowerCase());
      const matchDescription = !filters.description || product.description.toLowerCase().includes(filters.description.toLowerCase());
      const matchNumber = !filters.number || product.number.toLowerCase().includes(filters.number.toLowerCase());
      const matchColor = !filters.color || product.color.toLowerCase().includes(filters.color.toLowerCase());
      const matchCategory = !filters.category || product.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchSubcategory = !filters.subcategory || product.subcategory.toLowerCase().includes(filters.subcategory.toLowerCase());
      
      const productPrice = parseFloat(product.price.replace(/[^\d,.-]/g, '').replace(',', '.'));
      const matchMinPrice = !filters.minPrice || productPrice >= parseFloat(filters.minPrice.replace(/[^\d,.-]/g, '').replace(',', '.'));
      const matchMaxPrice = !filters.maxPrice || productPrice <= parseFloat(filters.maxPrice.replace(/[^\d,.-]/g, '').replace(',', '.'));
      
      const matchMinStock = !filters.minStock || product.stock >= parseInt(filters.minStock);
      const matchStock = !filters.inStock || product.stock > 0;
      
      const matchStartDate = !filters.startDate || new Date(product.createdAt) >= filters.startDate;
      const matchEndDate = !filters.endDate || new Date(product.createdAt) <= filters.endDate;

      return matchBarcode && matchReference && matchDescription && matchNumber && 
             matchColor && matchCategory && matchSubcategory && matchMinPrice && 
             matchMaxPrice && matchMinStock && matchStock && matchStartDate && matchEndDate;
    });
  }, [products, filters]);

  const activeFiltersCount = Object.values(filters).filter((v) => v !== "" && v !== false).length;

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setFilters({
      barcode: "",
      reference: "",
      description: "",
      number: "",
      color: "",
      category: "",
      subcategory: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      inStock: false,
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Action Bar */}
      <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-3 z-30">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-import">
            <Upload className="w-4 h-4 mr-1" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-export">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
          
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0 relative" data-testid="button-filter">
                <Filter className="w-4 h-4 mr-1" />
                Filtro
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(85vh-140px)] mt-4">
                <div className="space-y-4 pr-4">
                  <div>
                    <Label>Código de Barras</Label>
                    <Input
                      placeholder="Digite o código de barras..."
                      value={filters.barcode}
                      onChange={(e) => setFilters({ ...filters, barcode: e.target.value })}
                      data-testid="input-filter-barcode"
                    />
                  </div>

                  <div>
                    <Label>Referência</Label>
                    <Input
                      placeholder="Digite a referência..."
                      value={filters.reference}
                      onChange={(e) => setFilters({ ...filters, reference: e.target.value })}
                      data-testid="input-filter-reference"
                    />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input
                      placeholder="Buscar por descrição..."
                      value={filters.description}
                      onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                      data-testid="input-filter-description"
                    />
                  </div>

                  <div>
                    <Label>Número</Label>
                    <Input
                      placeholder="Digite o número..."
                      value={filters.number}
                      onChange={(e) => setFilters({ ...filters, number: e.target.value })}
                      data-testid="input-filter-number"
                    />
                  </div>

                  <div>
                    <Label>Cor</Label>
                    <Input
                      placeholder="Digite a cor..."
                      value={filters.color}
                      onChange={(e) => setFilters({ ...filters, color: e.target.value })}
                      data-testid="input-filter-color"
                    />
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Input
                      placeholder="Ex: Brinco, Anel, Colar..."
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      data-testid="input-filter-category"
                    />
                  </div>

                  <div>
                    <Label>Subcategoria</Label>
                    <Input
                      placeholder="Digite a subcategoria..."
                      value={filters.subcategory}
                      onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                      data-testid="input-filter-subcategory"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Preço Mínimo</Label>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        data-testid="input-filter-min-price"
                      />
                    </div>
                    <div>
                      <Label>Preço Máximo</Label>
                      <Input
                        type="text"
                        placeholder="R$ 999,00"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        data-testid="input-filter-max-price"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Estoque Mínimo</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minStock}
                      onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
                      data-testid="input-filter-min-stock"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inStock"
                      checked={filters.inStock}
                      onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
                      className="rounded border-gray-300"
                      data-testid="checkbox-in-stock"
                    />
                    <Label htmlFor="inStock" className="cursor-pointer">Apenas com estoque</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data Inicial</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-start-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.startDate}
                            onSelect={(date) => setFilters({ ...filters, startDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Data Final</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-end-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.endDate}
                            onSelect={(date) => setFilters({ ...filters, endDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    Limpar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setFilterOpen(false)}
                    data-testid="button-apply-filters"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-results-count">
          {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
          {selectedProducts.length > 0 && ` · ${selectedProducts.length} selecionado(s)`}
        </p>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-auto px-4 space-y-3 py-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-products">
              Nenhum produto encontrado
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleSelectProduct}
              onPrint={(product) => {
                setSelectedProductToPrint(product);
                setPrintDialogOpen(true);
              }}
              isSelected={selectedProducts.includes(product.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={onAddProduct} label="Novo Produto" />
      
      {selectedProductToPrint && (
        <PrintLabelDialog
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
