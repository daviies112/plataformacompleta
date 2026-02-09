import { useState, useMemo } from "react";
import { SupplierCard } from "./SupplierCard";
import { FAB } from "./FAB";
import { Input } from "@/features/produto/components/ui/input";
import { Button } from "@/features/produto/components/ui/button";
import { Filter, Download, Upload, Users, Calendar as CalendarIcon } from "lucide-react";
import type { Supplier } from "@/pages/Index";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/features/produto/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/features/produto/lib/utils";
import { ScrollArea } from "@/features/produto/components/ui/scroll-area";

interface MobileSupplierListProps {
  suppliers: Supplier[];
  onAddSupplier: () => void;
  onImportSuppliers: (suppliers: Supplier[]) => void;
  onEdit?: (supplier: Supplier) => void;
}

export const MobileSupplierList = ({
  suppliers,
  onAddSupplier,
  onImportSuppliers,
  onEdit,
}: MobileSupplierListProps) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    cpfCnpj: "",
    cidade: "",
    uf: "",
    email: "",
    telefone: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchNome = !filters.nome || supplier.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchCpfCnpj = !filters.cpfCnpj || supplier.cpfCnpj.includes(filters.cpfCnpj);
      const matchCidade = !filters.cidade || supplier.cidade.toLowerCase().includes(filters.cidade.toLowerCase());
      const matchUf = !filters.uf || supplier.uf.toLowerCase().includes(filters.uf.toLowerCase());
      const matchEmail = !filters.email || supplier.email.toLowerCase().includes(filters.email.toLowerCase());
      const matchTelefone = !filters.telefone || supplier.telefone.includes(filters.telefone);

      return matchNome && matchCpfCnpj && matchCidade && matchUf && matchEmail && matchTelefone;
    });
  }, [suppliers, filters]);

  const activeFiltersCount = 
    Object.entries(filters).filter(([key, value]) => {
      if (key === 'startDate' || key === 'endDate') return value !== undefined;
      return value !== "";
    }).length;

  const handleSelectSupplier = (id: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Action Bar - Only Import, Export, and Filter */}
      <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 z-30">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-import">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="flex-1" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative" data-testid="button-filter">
                <Filter className="w-4 h-4 mr-2" />
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
              <ScrollArea className="h-[calc(85vh-120px)] mt-4">
                <div className="space-y-4 pr-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      placeholder="Buscar por nome..."
                      value={filters.nome}
                      onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                      data-testid="input-filter-nome"
                    />
                  </div>

                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input
                      placeholder="Buscar por CPF ou CNPJ..."
                      value={filters.cpfCnpj}
                      onChange={(e) => setFilters({ ...filters, cpfCnpj: e.target.value })}
                      data-testid="input-filter-cpfCnpj"
                    />
                  </div>

                  <div>
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Ex: São Paulo, Rio de Janeiro..."
                      value={filters.cidade}
                      onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                      data-testid="input-filter-cidade"
                    />
                  </div>
                  
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input
                      placeholder="Ex: SP, RJ, MG..."
                      maxLength={2}
                      value={filters.uf}
                      onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
                      data-testid="input-filter-uf"
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Filtrar por email..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      data-testid="input-filter-email"
                    />
                  </div>

                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="Filtrar por telefone..."
                      value={filters.telefone}
                      onChange={(e) => setFilters({ ...filters, telefone: e.target.value })}
                      data-testid="input-filter-telefone"
                    />
                  </div>

                  <div>
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.startDate && "text-muted-foreground"
                          )}
                          data-testid="button-filter-startDate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Selecione a data"}
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
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.endDate && "text-muted-foreground"
                          )}
                          data-testid="button-filter-endDate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Selecione a data"}
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
              </ScrollArea>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFilters({ 
                    nome: "", 
                    cpfCnpj: "", 
                    cidade: "", 
                    uf: "", 
                    email: "", 
                    telefone: "",
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
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-results-count">
          {filteredSuppliers.length} {filteredSuppliers.length === 1 ? "fornecedor" : "fornecedores"}
          {selectedSuppliers.length > 0 && ` · ${selectedSuppliers.length} selecionado(s)`}
        </p>
      </div>

      {/* Supplier List */}
      <div className="flex-1 overflow-auto px-4 space-y-3 py-3">
        {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-suppliers">
              Nenhum fornecedor encontrado
            </p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onSelect={handleSelectSupplier}
              isSelected={selectedSuppliers.includes(supplier.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={onAddSupplier} label="Novo Fornecedor" />
    </div>
  );
};
