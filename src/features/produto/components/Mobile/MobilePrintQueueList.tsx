import { useState, useMemo } from "react";
import { Input } from "@/features/produto/components/ui/input";
import { Button } from "@/features/produto/components/ui/button";
import { Filter, Download, Upload, X, Printer, Package } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { Card } from "@/features/produto/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/produto/components/ui/select";

// Print Queue Item Card Component
interface PrintQueueItemCardProps {
  item: {
    id: string;
    foto: string;
    codigoBarras: string;
    descricao: string;
    categoria: string;
    preco: string;
    qtde: number;
  };
}

const PrintQueueItemCard = ({ item }: PrintQueueItemCardProps) => {
  return (
    <Card className="overflow-hidden transition-all active:scale-[0.98]" data-testid={`card-print-item-${item.id}`}>
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
            {item.foto}
          </div>
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1"
            data-testid={`badge-qtde-${item.id}`}
          >
            {item.qtde}x
          </Badge>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1" data-testid={`text-descricao-${item.id}`}>
            {item.descricao}
          </h3>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono" data-testid={`text-barcode-${item.id}`}>
            {item.codigoBarras}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs" data-testid={`badge-category-${item.id}`}>
              {item.categoria}
            </Badge>
            <p className="text-base font-bold text-primary" data-testid={`text-preco-${item.id}`}>
              {item.preco}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const MobilePrintQueueList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filters, setFilters] = useState({
    categoria: "",
    minQtde: "",
  });

  const printQueueItems = [
    {
      id: "1",
      foto: "🖼️",
      codigoBarras: "9398456559434",
      referencia: "",
      descricao: "PULSEIRA FLOR ZIRCONIA LIGHT ROSE 17+17 MM",
      categoria: "PULSEIRA",
      subcategoria: "",
      preco: "R$ 161,92",
      qtde: 3,
    },
    {
      id: "2",
      foto: "🖼️",
      codigoBarras: "3705653292693",
      referencia: "",
      descricao: "BRACELETE COM 3 ZIRCÔNIAS GRANDES",
      categoria: "BRACELETE",
      subcategoria: "",
      preco: "R$ 192,96",
      qtde: 5,
    },
    {
      id: "3",
      foto: "🖼️",
      codigoBarras: "4316436718584",
      referencia: "",
      descricao: "RELICÁRIO OU DIFUSOR CORAÇÃO COM DETALHES 20MM E C",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 88,83",
      qtde: 16,
    },
    {
      id: "4",
      foto: "🖼️",
      codigoBarras: "5462103993804",
      referencia: "",
      descricao: "PINGENTE FERRADURA CRAVEJADA",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 92,64",
      qtde: 4,
    },
    {
      id: "5",
      foto: "🖼️",
      codigoBarras: "9696864875352",
      referencia: "",
      descricao: "COLAR COM PINGENTE CORAÇÃO LUXO CRAVEJADO DE ZIRC",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 206,56",
      qtde: 2,
    },
    {
      id: "6",
      foto: "🖼️",
      codigoBarras: "6582713684252",
      referencia: "",
      descricao: "PINGENTE ÁRVORE DA VIDA GRANDE",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 147,84",
      qtde: 10,
    },
    {
      id: "7",
      foto: "🖼️",
      codigoBarras: "1766160350339",
      referencia: "",
      descricao: "PINGENTE DE FLOR COM CRISTA",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 66,40",
      qtde: 5,
    },
    {
      id: "8",
      foto: "🖼️",
      codigoBarras: "2848301141019",
      referencia: "",
      descricao: "PULSEIRA INFANTIL MASCULINA TRAMA OVAL",
      categoria: "PULSEIRA",
      subcategoria: "",
      preco: "R$ 83,27",
      qtde: 10,
    },
  ];

  const filteredItems = useMemo(() => {
    let result = printQueueItems;
    
    // Filter by category dropdown
    if (selectedCategory) {
      result = result.filter(item => 
        item.categoria.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Filter by search
    result = result.filter((item) => {
      const matchSearch =
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigoBarras.includes(searchQuery) ||
        item.categoria.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategoria = !filters.categoria || item.categoria.toLowerCase().includes(filters.categoria.toLowerCase());
      const matchMinQtde = !filters.minQtde || item.qtde >= parseInt(filters.minQtde);

      return matchSearch && matchCategoria && matchMinQtde;
    });
    
    return result;
  }, [printQueueItems, selectedCategory, searchQuery, filters]);

  const activeFiltersCount = Object.values(filters).filter((v) => v !== "").length + (selectedCategory ? 1 : 0);

  const totalQtde = filteredItems.reduce((sum, item) => sum + item.qtde, 0);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Search and Filter Bar */}
      <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-3 z-30">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="search"
              placeholder="Buscar itens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pr-10"
              data-testid="input-search-items"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 relative" data-testid="button-filter">
                <Filter className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="anel">ANEL</SelectItem>
                      <SelectItem value="bracelete">BRACELETE</SelectItem>
                      <SelectItem value="brinco">BRINCO</SelectItem>
                      <SelectItem value="colar">COLAR</SelectItem>
                      <SelectItem value="pingente">PINGENTE</SelectItem>
                      <SelectItem value="pulseira">PULSEIRA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quantidade Mínima</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5"
                    value={filters.minQtde}
                    onChange={(e) => setFilters({ ...filters, minQtde: e.target.value })}
                    data-testid="input-filter-min-qtde"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setFilters({ categoria: "", minQtde: "" });
                      setSelectedCategory("");
                    }}
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

        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-import">
            <Upload className="w-4 h-4 mr-1" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-export">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
          <Button size="sm" className="flex-shrink-0" data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-results-count">
          {filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"} · {totalQtde} {totalQtde === 1 ? "etiqueta" : "etiquetas"}
        </p>
      </div>

      {/* Print Queue List */}
      <div className="flex-1 overflow-auto px-4 space-y-3 py-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-items">
              Nenhum item na fila de impressão
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <PrintQueueItemCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
};
