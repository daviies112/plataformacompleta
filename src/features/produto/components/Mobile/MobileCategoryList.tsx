import { useState, useMemo } from "react";
import { CategoryCard } from "./CategoryCard";
import { FAB } from "./FAB";
import { Input } from "@/features/produto/components/ui/input";
import { Button } from "@/features/produto/components/ui/button";
import { Filter, Download, Upload, Tag, CalendarIcon } from "lucide-react";
import type { Category } from "@/pages/Index";
import { Badge } from "@/features/produto/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { Calendar } from "@/features/produto/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/produto/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/features/produto/lib/utils";

interface MobileCategoryListProps {
  categories: Category[];
  onAddCategory: () => void;
  onImportCategories: (categories: Category[]) => void;
  onEdit?: (category: Category) => void;
}

export const MobileCategoryList = ({
  categories,
  onAddCategory,
  onImportCategories,
  onEdit,
}: MobileCategoryListProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    etiqueta: "",
    etiquetaCustomizada: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchNome = !filters.nome || category.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchEtiqueta = !filters.etiqueta || category.etiqueta.toLowerCase().includes(filters.etiqueta.toLowerCase());
      const matchEtiquetaCustomizada = !filters.etiquetaCustomizada || category.etiquetaCustomizada.toLowerCase().includes(filters.etiquetaCustomizada.toLowerCase());

      return matchNome && matchEtiqueta && matchEtiquetaCustomizada;
    });
  }, [categories, filters]);

  const activeFiltersCount = 
    (filters.nome ? 1 : 0) + 
    (filters.etiqueta ? 1 : 0) + 
    (filters.etiquetaCustomizada ? 1 : 0) + 
    (filters.startDate ? 1 : 0) + 
    (filters.endDate ? 1 : 0);

  const handleSelectCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Actions Bar */}
      <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 z-30">
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
            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    placeholder="Filtrar por nome..."
                    value={filters.nome}
                    onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                    data-testid="input-filter-nome"
                  />
                </div>

                <div>
                  <Label>Tipo de Etiqueta</Label>
                  <Input
                    placeholder="Ex: Modelo fino, Modelo retangular..."
                    value={filters.etiqueta}
                    onChange={(e) => setFilters({ ...filters, etiqueta: e.target.value })}
                    data-testid="input-filter-etiqueta"
                  />
                </div>

                <div>
                  <Label>Etiqueta Customizada</Label>
                  <Input
                    placeholder="Filtrar por etiqueta customizada..."
                    value={filters.etiquetaCustomizada}
                    onChange={(e) => setFilters({ ...filters, etiquetaCustomizada: e.target.value })}
                    data-testid="input-filter-etiqueta-customizada"
                  />
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.startDate && "text-muted-foreground"
                        )}
                        data-testid="button-filter-start-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate ? format(filters.startDate, "PPP") : "Selecione a data"}
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
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.endDate && "text-muted-foreground"
                        )}
                        data-testid="button-filter-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate ? format(filters.endDate, "PPP") : "Selecione a data"}
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
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFilters({ 
                      nome: "", 
                      etiqueta: "", 
                      etiquetaCustomizada: "",
                      startDate: undefined,
                      endDate: undefined
                    })}
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
          {filteredCategories.length} {filteredCategories.length === 1 ? "categoria" : "categorias"}
          {selectedCategories.length > 0 && ` · ${selectedCategories.length} selecionada(s)`}
        </p>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-auto px-4 space-y-3 py-3">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Tag className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-categories">
              Nenhuma categoria encontrada
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onSelect={handleSelectCategory}
              isSelected={selectedCategories.includes(category.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={onAddCategory} label="Nova Categoria" />
    </div>
  );
};
